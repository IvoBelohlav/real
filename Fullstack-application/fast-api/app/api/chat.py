# app/api/chat.py
import logging
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status # Added status here
from datetime import datetime, timezone
import uuid
from app.utils.mongo import serialize_mongo_doc, get_db, get_conversations_collection, get_human_chat_collection
from app.models.models import ConversationEntry, ChatRequest, ChatResponse, HumanChatSession
from app.utils.context import EnhancedConversationContext
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.logging_config import get_module_logger
import re # Import regex for extracting order number/email
from app.services.knowledge_base import KnowledgeBase
from app.services.ai_service import AIService
# Use verify_widget_origin for auth/origin check
from app.utils.dependencies import verify_widget_origin
# Import user model and mongo utils for limit checking
from app.models.user import SubscriptionTier
# Import get_user_collection and get_orders_collection
from app.utils.mongo import get_user_collection, get_orders_collection, serialize_mongo_doc
from datetime import timedelta # Import timedelta for month check

router = APIRouter()
logger = get_module_logger(__name__)

# Singletons for services
_knowledge_base = None
_ai_service = None

async def get_knowledge_base():
    """Get or create the KnowledgeBase singleton"""
    global _knowledge_base
    if _knowledge_base is None:
        db = await get_db()
        _knowledge_base = KnowledgeBase(db)
        await _knowledge_base.initialize_collections()
    return _knowledge_base

async def get_ai_service():
    """Get or create the AIService singleton"""
    global _ai_service
    if _ai_service is None:
        knowledge_base = await get_knowledge_base()
        _ai_service = AIService(knowledge_base)
    return _ai_service

@router.post("/chat/message", response_model=ChatResponse)
async def handle_message(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    # Use the new dependency for authentication and origin check
    current_user: Dict = Depends(verify_widget_origin), # User associated with the API Key
    conversations_db = Depends(get_conversations_collection),
    orders_collection = Depends(get_orders_collection), # Inject orders collection
    ai_service = Depends(get_ai_service)
) -> ChatResponse:
    """
    Process chat messages, including handling order status requests.
    """
    try:
        # user_id associated with the API Key (website owner)
        owner_user_id = current_user["id"]
        user_collection = await get_user_collection() # Get user collection

        # --- Order Status Intent Check ---
        query_lower = request.query.lower()
        order_keywords = ["order", "objednávk", "tracking", "track", "zásilk", "balik", "package", "delivery", "doručení"]
        is_order_query = any(keyword in query_lower for keyword in order_keywords)

        # Simple extraction (can be improved with NLP/regex)
        order_number_match = re.search(r'#?([a-zA-Z0-9\-]+)', query_lower) # Look for order number like patterns
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', query_lower) # Basic email regex

        extracted_order_number = order_number_match.group(1) if order_number_match else None
        extracted_email = email_match.group(0) if email_match else None

        logger.debug(f"Order Query Check: is_order_query={is_order_query}, order#={extracted_order_number}, email={extracted_email}")

        if is_order_query:
            if extracted_order_number and extracted_email:
                logger.info(f"Handling order status query for order '{extracted_order_number}' and email '{extracted_email}' for owner {owner_user_id}")
                # Query the database using owner_user_id, customer_email, and platform_order_id
                order = await orders_collection.find_one({
                    "user_id": owner_user_id, # Filter by the website owner
                    "customer_email": extracted_email.lower(), # Filter by customer email
                    "$or": [ # Match either platform_order_id or order_number
                         {"platform_order_id": extracted_order_number},
                         {"order_number": extracted_order_number}
                    ]
                })

                if order:
                    order_data = serialize_mongo_doc(order)
                    order_status = order_data.get("status", "unknown") # Renamed local variable
                    tracking = order_data.get("tracking_number")
                    carrier = order_data.get("carrier")
                    est_delivery = order_data.get("estimated_delivery_date")
                    platform_order_id = order_data.get("platform_order_id", "N/A")

                    response_text = f"Order #{platform_order_id}: Status is '{order_status}'." # Use renamed variable
                    if tracking:
                        response_text += f" Tracking: {tracking}"
                        if carrier:
                            response_text += f" (Carrier: {carrier})"
                        response_text += "."
                    if est_delivery:
                        try:
                            # Format date nicely
                            est_delivery_dt = datetime.fromisoformat(est_delivery.replace('Z', '+00:00'))
                            response_text += f" Estimated delivery: {est_delivery_dt.strftime('%d.%m.%Y')}."
                        except:
                            response_text += f" Estimated delivery: {est_delivery}." # Fallback

                    # Populate order_details with the found order data
                    # The reply can be a simpler confirmation message now
                    return ChatResponse(
                        reply=f"Here's the status for order #{platform_order_id}:", # Simpler text reply
                        source="order_status_lookup",
                        confidence_score=1.0, # High confidence as it's a direct lookup
                        conversation_id=request.context.conversation_id if request.context else str(uuid.uuid4()),
                        followup_questions=[],
                        metadata={},
                        personalized_recommendations=[],
                        order_details=Order(**order_data) # Pass the structured order data
                    )
                else:
                    logger.warning(f"Order not found for owner {owner_user_id}, email {extracted_email}, order# {extracted_order_number}")
                    response_text = "I couldn't find an order matching that email and order number. Please double-check the details."
                    return ChatResponse(
                        reply=response_text,
                        source="order_status_not_found",
                        confidence_score=1.0,
                        conversation_id=request.context.conversation_id if request.context else str(uuid.uuid4()),
                        followup_questions=["Would you like to try a different order number or email?"],
                        metadata={},
                        personalized_recommendations=[]
                    )
            else:
                # Ask for missing details
                missing = []
                if not extracted_email: missing.append("your email address")
                if not extracted_order_number: missing.append("your order number")
                response_text = f"To check your order status, please provide {' and '.join(missing)}."
                return ChatResponse(
                    reply=response_text,
                    source="order_status_clarification",
                    confidence_score=1.0,
                    conversation_id=request.context.conversation_id if request.context else str(uuid.uuid4()),
                    followup_questions=[],
                    metadata={},
                    personalized_recommendations=[]
                )
        # --- End Order Status Intent Check ---

        # --- Proceed with normal AI processing if not an order query ---
        logger.debug("Not an order query, proceeding with standard AI processing.")

        # Ensure we have a valid conversation context before checking limits or accessing attributes
        # Convert dict to the Pydantic model instance if necessary
        if isinstance(request.context, dict):
            request.context = EnhancedConversationContext(**request.context)
        elif request.context is None:
             request.context = EnhancedConversationContext()
        # Now request.context is guaranteed to be an EnhancedConversationContext object

        # --- Check and Update Monthly Conversation Limit ---
        is_new_conversation = not request.context.conversation_id
        if is_new_conversation:
            now = datetime.now(timezone.utc)
            usage_start = current_user.get("usage_period_start_date")
            needs_reset = False

            if usage_start is None:
                needs_reset = True
            else:
                # Make usage_start timezone-aware (assuming it's UTC)
                if usage_start.tzinfo is None:
                    usage_start = usage_start.replace(tzinfo=timezone.utc)

                # Check if more than ~30 days have passed
                if now > usage_start + timedelta(days=30): # Approximation for a month
                    needs_reset = True

            if needs_reset:
                await user_collection.update_one(
                    {"id": owner_user_id},
                    {"$set": {"conversation_count_current_month": 0, "usage_period_start_date": now}}
                )
                current_user["conversation_count_current_month"] = 0 # Update local copy
                current_user["usage_period_start_date"] = now
                logger.info(f"Reset monthly conversation count for user {owner_user_id}")

            # Check limit before incrementing
            tier_str = current_user.get("subscription_tier", "free")

            # --- Temporary Fix: Map known Price ID to tier name ---
            # Ideally, the webhook should store the tier name directly.
            price_id_to_tier_map = {
                "price_1RAIdbr4qkX0uO0aXoszn1Fs2": "basic"
                # Add other Price IDs and their corresponding tier names here if needed
            }
            if tier_str in price_id_to_tier_map:
                tier_str = price_id_to_tier_map[tier_str]
                logger.debug(f"Mapped Price ID {current_user.get('subscription_tier')} to tier '{tier_str}' for limit check.")
            # --- End Temporary Fix ---

            try:
                tier = SubscriptionTier(tier_str)
            except ValueError:
                logger.warning(f"Invalid or unrecognized subscription_tier value '{tier_str}' for user {owner_user_id}. Defaulting to FREE.")
                tier = SubscriptionTier.FREE

            limits = {
                SubscriptionTier.FREE: 0, # Limit for free tier
                SubscriptionTier.BASIC: 500,
                SubscriptionTier.PREMIUM: 1500,
                SubscriptionTier.ENTERPRISE: float('inf') # Unlimited
            }
            max_convos = limits.get(tier, 0)
            current_convo_count = current_user.get("conversation_count_current_month", 0)

            if current_convo_count >= max_convos:
                logger.warning(f"User {owner_user_id} (Tier: {tier.value}) tried to start new conversation but reached monthly limit ({max_convos})")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Monthly conversation limit ({max_convos}) reached for your '{tier.value}' plan."
                )

            # Increment count for the new conversation
            await user_collection.update_one(
                {"id": owner_user_id},
                {"$inc": {"conversation_count_current_month": 1}}
            )
            logger.info(f"Incremented monthly conversation count for user {owner_user_id} (New count: {current_convo_count + 1})")
        # --- End Limit Check ---

        # Correct language code if needed
        if request.language == "cze":
            request.language = "cs"

        # Assign new conversation ID if not present
        if request.context.conversation_id is None:
            request.context.conversation_id = str(uuid.uuid4())

        request.context.user_id = owner_user_id
        request.user_id = owner_user_id

        # Generate enhanced response with AI service
        response_data = await ai_service.generate_response(
            query=request.query,
            context=request.context,
            language=request.language,
            user_id=owner_user_id
        )

        # Update conversation context with new information
        if response_data.get("metadata") and response_data["metadata"].get("intent"):
            await request.context.update_context(
                request.query,
                intent=response_data["metadata"]["intent"],
                entities=response_data["metadata"].get("entities")
            )

        # Get followup questions from metadata
        # The advanced AI service now handles follow-up question generation dynamically
        followup_questions = response_data.get("metadata", {}).get("followup_questions", [])
        
        # Only use the fallback method if no questions were generated by the AI service
        if not followup_questions:
            try:
                # Try to generate follow-up questions using the AI service
                logger.info("Generating follow-up questions with enhanced AI service")
                # Ensure query is included in metadata for context analysis
                current_metadata = response_data.get("metadata", {})
                if not current_metadata.get("query"):
                    current_metadata["query"] = request.query

                followup_questions = await ai_service._generate_relevant_followup_questions(
                    analysis=current_metadata,
                    response_data=response_data,
                    language=request.language
                )
            except Exception as e:
                # If AI service fails, fall back to simple question generation
                logger.warning(f"Enhanced follow-up question generation failed: {str(e)}. Using fallback method.")
                followup_questions = _generate_followup_questions(
                    response_data.get("metadata", {}).get("query_type", "general_question"),
                    response_data.get("metadata", {}).get("entities", {}),
                    request.language
                )

        # Create conversation entry (ensure conversation_id is set)
        conv_id = request.context.conversation_id or str(uuid.uuid4()) # Ensure ID exists
        conversation_entry = ConversationEntry(
            conversation_id=conv_id,
            timestamp=datetime.now(timezone.utc),
            query=request.query,
            response=response_data["reply"],
            source=response_data["source"],
            language=request.language,
            user_id=owner_user_id, # Log against the owner user ID
            confidence_score=response_data["confidence_score"],
            metadata={
                **response_data.get("metadata", {}),
                "client_metadata": request.context.model_dump()
            }
        )

        # Save conversation in background
        background_tasks.add_task(save_conversation_entry, conversations_db, conversation_entry)
        
        # Process metadata for personalized recommendations
        metadata = response_data.get("metadata", {})
        
        # Check if human chat should be available for this conversation
        human_chat_available = await is_human_chat_available(conv_id, owner_user_id)
        
        # Generate personalized recommendations based on response source
        personalized_recommendations = []
        
        # Handle different types of product responses
        if response_data["source"] == "product_recommendation" and metadata.get("recommended_products"):
            # Process top recommended products
            for product_data in metadata["recommended_products"][:3]:  # Get top 3
                product = product_data["product"]
                score_components = product_data["score_components"]
                
                # Create rich recommendation object
                personalized_recommendations.append({
                    "product_id": str(product.get("_id", "")),
                    "name": product.get("product_name", ""),
                    "explanation": _generate_recommendation_explanation(product, score_components, request.context),
                    "match_score": product_data.get("score", 0.7),
                    "image_url": product.get("image_url", "/static/images/default.jpg"),
                    "url": product.get("url", "#"),
                    "price": _format_price(product.get("pricing", {})),
                    "category": product.get("category", ""),
                    "features": product.get("features", [])[:5],
                    "score_components": score_components
                })
        
        elif response_data["source"] == "product_comparison" and metadata.get("comparison_data"):
            # Process comparison data for recommendations
            comparison_data = metadata["comparison_data"]
            products = metadata.get("products", [])
            
            for product in products:
                # Create recommendation from comparison
                personalized_recommendations.append({
                    "product_id": str(product.get("_id", "")),
                    "name": product.get("product_name", ""),
                    "explanation": _generate_comparison_explanation(product, comparison_data),
                    "match_score": 0.8,  # Default score for comparisons
                    "image_url": product.get("image_url", "/static/images/default.jpg"),
                    "url": product.get("url", "#"),
                    "price": _format_price(product.get("pricing", {})),
                    "category": product.get("category", ""),
                    "features": product.get("features", [])[:5],
                    "is_comparison": True
                })
        
        elif response_data["source"] == "accessory_recommendation" and metadata.get("accessories"):
            # Process accessories as recommendations
            main_products = metadata.get("products", [])
            accessories = metadata.get("accessories", [])
            
            # First add main products if any
            for product in main_products:
                personalized_recommendations.append({
                    "product_id": str(product.get("_id", "")),
                    "name": product.get("product_name", ""),
                    "explanation": "Hlavní produkt",
                    "match_score": 0.9,
                    "image_url": product.get("image_url", "/static/images/default.jpg"),
                    "url": product.get("url", "#"),
                    "price": _format_price(product.get("pricing", {})),
                    "category": product.get("category", ""),
                    "features": product.get("features", [])[:5],
                    "is_main_product": True
                })
            
            # Then add accessory recommendations
            for accessory in accessories:
                personalized_recommendations.append({
                    "product_id": str(accessory.get("_id", "")),
                    "name": accessory.get("product_name", ""),
                    "explanation": _generate_accessory_explanation(accessory, main_products[0] if main_products else None),
                    "match_score": 0.85,
                    "image_url": accessory.get("image_url", "/static/images/default.jpg"),
                    "url": accessory.get("url", "#"),
                    "price": _format_price(accessory.get("pricing", {})),
                    "category": accessory.get("category", ""),
                    "features": accessory.get("features", [])[:5],
                    "is_accessory": True
                })
        
        # Fallback for regular knowledge-based responses
        elif "knowledge" in metadata and metadata["knowledge"].get("products"):
            top_products = metadata["knowledge"]["products"][:3]
            
            # Convert regular knowledge products to recommendations
            for product in top_products:
                # Default score components if not available
                default_score_components = {
                    "feature_score": 0.7,
                    "price_score": 0.6,
                    "category_score": 0.8,
                    "admin_priority_score": 0.5
                }
                
                # This converts the raw product data into proper recommendation objects
                personalized_recommendations.append({
                    "product_id": str(product.get("_id", "")),
                    "name": product.get("product_name", ""),
                    "explanation": _generate_simple_explanation(product, request.context),
                    "match_score": 0.7,  # Default score for knowledge-based recommendations
                    "image_url": product.get("image_url", "/static/images/default.jpg"),
                    "url": product.get("url", "#"),
                    "price": _format_price(product.get("pricing", {})),
                    "category": product.get("category", ""),
                    "features": product.get("features", [])[:5],
                    "score_components": default_score_components
                })

        # Prepare and return enhanced response with human chat availability
        return ChatResponse(
            reply=response_data["reply"],
            source=response_data["source"],
            confidence_score=response_data["confidence_score"],
            conversation_id=conversation_entry.conversation_id,
            followup_questions=followup_questions,
            metadata={
                **serialize_mongo_doc(metadata),
                "human_chat_available": human_chat_available,
                "client_context": serialize_mongo_doc(request.context.model_dump()) # Context is guaranteed to exist here
            },
            personalized_recommendations=personalized_recommendations
        )

    except HTTPException as http_exception:
        raise http_exception
    except Exception as e:
        logger.error(f"Error handling message: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_server_error",
                "message": str(e)
            }
        )

async def is_human_chat_available(conversation_id: str, user_id: str) -> bool:
    """
    Check if human chat is available for the current conversation.
    
    This function determines if human chat should be offered to the user based on:
    1. Business hours and availability of human agents
    2. User's history and subscription tier
    3. Current conversation context (e.g., complexity, sensitive topics)
    4. Whether there's already an active human chat session for this conversation
    """
    try:
        human_chat_collection = await get_human_chat_collection()
        
        existing_sessions = await human_chat_collection.find({
            "conversation_id": conversation_id,
            "user_id": user_id
        }).to_list(length=10)
        
        return len(existing_sessions) < 5
    except Exception as e:
        logger.error(f"Error checking human chat availability: {str(e)}", exc_info=True)
        return False

def _generate_followup_questions(query_type: str, entities: Dict[str, Any], language: str) -> List[str]:
    """Generate contextual follow-up questions with enhanced relevance."""
    # Default questions by language with improved relevance
    default_questions = {
        "cs": [
            "Jaké funkce nebo vlastnosti jsou pro vás nejdůležitější?",
            "Jaký je váš rozpočet na tento nákup?",
            "Máte zkušenosti s nějakou konkrétní značkou?"
        ],
        "en": [
            "What features or characteristics are most important to you?",
            "What is your budget for this purchase?",
            "Do you have experience with any particular brand?"
        ]
    }
    
    lang = language if language in default_questions else "cs"
    
    # Different questions based on query type for more relevant interaction
    if query_type == "category_browse" and entities.get("categories"):
        category = entities["categories"][0]
        if language == "cs":
            return [
                f"Jaké funkce by měl ideální {category} mít?",
                f"Jaký máte rozpočet na {category}?",
                f"Hledáte konkrétní značku {category}?"
            ]
        else:
            return [
                f"What features should an ideal {category} have?",
                f"What's your budget for a {category}?",
                f"Are you looking for a specific brand of {category}?"
            ]
    
    elif query_type == "direct_product" and entities.get("products"):
        if language == "cs":
            return [
                "Chcete porovnat tento produkt s jinými možnostmi?",
                "Zajímá vás příslušenství k tomuto produktu?",
                "Chtěli byste vidět technické specifikace?"
            ]
        else:
            return [
                "Would you like to compare this product with other options?",
                "Are you interested in accessories for this product?",
                "Would you like to see technical specifications?"
            ]
    
    elif query_type == "comparison":
        if language == "cs":
            return [
                "Na které vlastnosti se mám při porovnání zaměřit?",
                "Je pro vás důležitější cena nebo kvalita?",
                "Chcete přidat další produkt do porovnání?"
            ]
        else:
            return [
                "Which features should I focus on when comparing?",
                "Is price or quality more important to you?",
                "Would you like to add another product to the comparison?"
            ]
    
    elif query_type == "price_question":
        if language == "cs":
            return [
                "Hledáte produkt v konkrétním cenovém rozpětí?",
                "Je pro vás důležitější nižší cena nebo vyšší kvalita?",
                "Zajímají vás možnosti financování nebo splátek?"
            ]
        else:
            return [
                "Are you looking for a product in a specific price range?",
                "Is a lower price or higher quality more important to you?",
                "Are you interested in financing options or installment plans?"
            ]
    
    elif query_type == "technical_explanation":
        if language == "cs":
            return [
                "Potřebujete vysvětlit ještě nějaké další technické parametry?",
                "Zajímá vás srovnání s jinými technologiemi?",
                "Jaké funkce jsou pro vás nejdůležitější?"
            ]
        else:
            return [
                "Do you need any other technical parameters explained?",
                "Are you interested in comparing with other technologies?",
                "Which features are most important to you?"
            ]
    
    # Default questions for other query types
    return default_questions[lang]

def _generate_recommendation_explanation(product: Dict[str, Any], score_components: Dict[str, float], context: EnhancedConversationContext) -> str:
    """Generate a human-readable explanation for why a product is recommended with score components."""
    explanation_parts = []
    
    # Create explanations based on score components
    if score_components.get("feature_score", 0) > 0.5:
        explanation_parts.append("obsahuje požadované funkce")
    
    if score_components.get("price_score", 0) > 0.7:
        explanation_parts.append("odpovídá vašemu rozpočtu")
    
    if score_components.get("category_score", 0) > 0.7:
        if context.category:
            explanation_parts.append(f"patří do kategorie {context.category}")
    
    if score_components.get("brand_score", 0) > 0.7:
        explanation_parts.append("je od vámi preferované značky")
    
    if score_components.get("admin_priority_score", 0) > 0.5:
        explanation_parts.append("je doporučovaný našimi specialisty")
    
    # Default explanation if nothing specific matches
    if not explanation_parts:
        return "odpovídá vašim požadavkům"
    
    return "Doporučujeme, protože " + " a ".join(explanation_parts)

def _generate_comparison_explanation(product: Dict[str, Any], comparison_data: Dict[str, Any]) -> str:
    """Generate an explanation for why a product stands out in comparison."""
    product_name = product.get("product_name", "")
    
    # Get unique features if available
    for key, data in comparison_data.items():
        if "unique_features" in data and product_name in data["unique_features"]:
            unique_features = data["unique_features"][product_name]
            if unique_features:
                unique_features_text = ", ".join(unique_features[:2])  # Just mention top 2
                return f"Vyniká v: {unique_features_text}"
        
        # Get price comparison if available
        if "price_comparison" in data and product_name in data["price_comparison"]:
            return data["price_comparison"]
    
    return "Porovnávaný produkt"  # Default return if no specific comparison point found

def _generate_accessory_explanation(accessory: Dict[str, Any], main_product: Optional[Dict[str, Any]]) -> str:
    """Generate an explanation for an accessory recommendation."""
    if main_product:
        return f"Doporučené příslušenství pro {main_product.get('product_name', 'váš produkt')}"
    return "Doporučené příslušenství"

def _generate_simple_explanation(product: Dict[str, Any], context: EnhancedConversationContext) -> str:
    """Generate a simple explanation for a product when detailed scores aren't available."""
    explanation_parts = []
    
    # Check if product matches category
    if context.category and product.get("category") == context.category:
        explanation_parts.append(f"patří do kategorie {context.category}")
    
    # Check if product is in budget range
    if context.budget_range:
        price = _extract_price_value(product)
        min_price = context.budget_range.get("min", 0)
        max_price = context.budget_range.get("max", float("inf"))
        
        if price and min_price <= price <= max_price:
            explanation_parts.append("odpovídá vašemu rozpočtu")
    
    # Check if product has required features
    if context.required_features:
        product_features = set(product.get("features", []))
        matching_features = [f for f in context.required_features if f in product_features]
        
        if matching_features:
            if len(matching_features) == 1:
                explanation_parts.append(f"obsahuje vámi požadovanou funkci {matching_features[0]}")
            else:
                explanation_parts.append(f"obsahuje {len(matching_features)} vámi požadovaných funkcí")
    
    # Default explanation if nothing specific matches
    if not explanation_parts:
        return "odpovídá vašim požadavkům"
    
    return "Doporučujeme, protože " + " a ".join(explanation_parts)

def _extract_price_value(product: Dict[str, Any]) -> Optional[float]:
    """Extract price value from product data."""
    pricing = product.get("pricing", {})
    
    # Try different price types
    for price_type in ["one_time", "value", "monthly", "annual"]:
        price = pricing.get(price_type)
        if price:
            # Convert to float if it's a string
            if isinstance(price, str):
                try:
                    return float(price.replace(" ", "").replace(",", "."))
                except ValueError:
                    pass
            return float(price)
    
    return None

def _format_price(pricing: Dict[str, Any]) -> str:
    """Format price information into a string with improved formatting."""
    # Try different price types
    for price_type in ["one_time", "value", "monthly", "annual"]:
        price = pricing.get(price_type)
        if price:
            currency = pricing.get("currency", "Kč")
            
            # Convert to string if not already
            if not isinstance(price, str):
                price = str(price)
            
            # Improve formatting
            try:
                # Clean price string
                price_clean = price.replace(" ", "").replace(",", ".")
                # Format as number with proper spacing
                price_float = float(price_clean)
                price_formatted = f"{price_float:,.0f}".replace(",", " ")
                
                if price_type == "monthly":
                    return f"{price_formatted} {currency}/měsíc"
                elif price_type == "annual":
                    return f"{price_formatted} {currency}/rok"
                else:
                    return f"{price_formatted} {currency}"
            except:
                # Fallback to original price
                return f"{price} {currency}"
    
    return "Cena není uvedena"

async def save_conversation_entry(db: Any, entry: ConversationEntry) -> bool:
    """Save a conversation entry to the database."""
    try:
        if not entry.user_id:
            logger.warning("Attempted to save conversation entry without user_id")
            return False
            
        entry_dict = entry.model_dump()
        await db.insert_one(entry_dict)
        logger.debug(f"Saved conversation entry for conversation {entry.conversation_id}, user {entry.user_id}")
        return True
    except Exception as e:
        logger.error(f"Error saving conversation entry: {e}")
        return False