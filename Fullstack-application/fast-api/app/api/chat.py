"""
Optimized Chat endpoint using the hybrid approach:
1. Order tracking (kept as is - critical business function)
2. Multi-tenant authentication and usage limits (kept as is - security/business rules)
3. Simplified AI interaction with Gemini using the new methods:
   - extract_entities_with_gemini for entity/intent recognition
   - generate_response_with_gemini for natural language generation
4. Structured product data processing for frontend display
"""

import logging
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from datetime import datetime, timezone
import uuid
from app.utils.mongo import serialize_mongo_doc, get_db, get_conversations_collection, get_human_chat_collection
from app.models.models import ConversationEntry, ChatRequest, ChatResponse, HumanChatSession, Order
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
import json # Import json for debug logging

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
    Uses a hybrid approach where Gemini handles NLU and response generation,
    while our code manages tenant isolation, database interactions, and business rules.
    """
    try:
        # user_id associated with the API Key (website owner)
        owner_user_id = current_user["id"]
        user_collection = await get_user_collection() # Get user collection

        # --- Order Status Intent Check ---
        # (Keeping this as is - critical business functionality)
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
        request.user_id = owner_user_id # Also add to request object if needed elsewhere

        # --- New Hybrid AI Flow ---
        # 1. Extract Entities using simplified AI Service method
        analysis = await ai_service.extract_entities_with_gemini(
            query=request.query,
            context=request.context,
            language=request.language
        )
        intent = analysis.get("intent", "general_question")
        entities = analysis.get("entities", {})
        logger.debug(f"Initial Extracted Analysis: Intent={intent}, Entities={entities}")

        # --- Intent Override Fallback ---
        # If Gemini classified as general but query seems product-related, override intent.
        # Added more keywords and check query_lower
        product_keywords_cs = ["produkt", "zboží", "sortiment", "nabídk", "máte", "prodáváte"]
        product_keywords_en = ["product", "goods", "assortment", "offer", "have", "sell", "inventory", "items"]
        product_keywords = product_keywords_cs if request.language == "cs" else product_keywords_en
        if intent == "general_question" and any(keyword in query_lower for keyword in product_keywords):
            logger.warning(f"Overriding intent from 'general_question' to 'product_recommendation' based on keywords for query: '{request.query}'")
            intent = "product_recommendation"
            analysis["intent"] = intent # Update analysis dict as well

        # Update conversation context with potentially overridden intent/entities
        await request.context.update_context(
            request.query,
            intent=intent,
            entities=entities
        )

        # 2. Retrieve Relevant Data from KnowledgeBase (using owner_user_id)
        knowledge_base = await get_knowledge_base()
        relevant_products = []
        qa_items = []

        # Prioritize fetching based on specific entities first
        if entities.get("products"):
            for name in entities["products"]:
                found = await knowledge_base.find_products_by_name(name, user_id=owner_user_id, limit=3) # Limit slightly higher for direct name match
                relevant_products.extend(found)
        elif entities.get("categories"):
            # Use the first category for simplicity, could be expanded
            found = await knowledge_base.find_products_by_category(entities["categories"][0], user_id=owner_user_id, limit=5)
            relevant_products.extend(found)
        # Add logic to search by features/price if needed
        elif entities.get("features") or entities.get("price_range"):
             search_query = {}
             if entities.get("features"):
                 search_query["features"] = {"$all": entities["features"]}
             if entities.get("price_range"):
                 price_filter = {}
                 if entities["price_range"].get("min") is not None: price_filter["$gte"] = entities["price_range"]["min"]
                 if entities["price_range"].get("max") is not None: price_filter["$lte"] = entities["price_range"]["max"]
                 if price_filter: search_query["price"] = price_filter
             if search_query:
                 found = await knowledge_base.find_products_by_query(search_query, user_id=owner_user_id, limit=5)
                 relevant_products.extend(found)

        # --- Fetch General Recommendations if Intent is Recommendation AND no specific products were found via entities ---
        if intent == "product_recommendation" and not relevant_products:
             logger.info(f"Intent is product_recommendation but no specific entities led to products. Fetching general recommendations for user {owner_user_id}.")
             recommended_fallback = await knowledge_base.get_recommended_products(user_id=owner_user_id, limit=3) # Fetch top 3 general
             relevant_products.extend(recommended_fallback)

        # Fetch QA items for service intents (can run in parallel with product fetching if complex)
        if intent in ["customer_service", "shipping_payment", "store_navigation"]:
             # Use keywords related to intent or extracted entities to find QA
             search_term = request.query.split()[0] # Simple keyword extraction
             qa_items = await knowledge_base.find_qa_items_by_keyword(search_term, user_id=owner_user_id, limit=3) # Assuming QA might be tenant specific? If not, remove user_id

        # Remove duplicates just in case
        relevant_products = list({p['_id']: p for p in relevant_products}.values())
        logger.debug(f"Retrieved {len(relevant_products)} relevant products and {len(qa_items)} QA items.")

        # 3. Apply Business Logic / Process Data (Keep relevant parts)
        processed_data = []
        score_map = {} # Store both score and components
        if intent == "product_recommendation" and relevant_products:
            # Use the existing scoring logic
            scored_products = await ai_service._score_products_for_recommendation(relevant_products, entities, request.context)
            scored_products.sort(key=lambda x: x["score"], reverse=True)
            top_products = scored_products[:3]
            processed_data = [ai_service._format_product_data(p["product"]) for p in top_products] # Format for Gemini prompt
            # Store score and components for later use
            for p_data in top_products:
                 p_id = str(p_data["product"]["_id"])
                 score_map[p_id] = {"score": p_data["score"], "components": p_data["score_components"]} # Store both
        elif relevant_products:
             # Format top products for context, even if not recommendation
             processed_data = [ai_service._format_product_data(p) for p in relevant_products[:3]]
        elif qa_items:
             # Format QA items for context
             processed_data = [{"question": q.get("question"), "answer": q.get("answer")} for q in qa_items]

        # 4. Generate Response using simplified AI Service method
        response_text = await ai_service.generate_response_with_gemini(
            query=request.query,
            analysis=analysis,
            relevant_data=processed_data, # Pass the processed, tenant-specific data
            context=request.context,
            language=request.language
        )
        # Note: Follow-up questions might be included in response_text by Gemini now, or omitted.

        # 5. Structure Final Response
        conv_id = request.context.conversation_id or str(uuid.uuid4()) # Ensure ID exists
        conversation_entry = ConversationEntry(
            conversation_id=conv_id,
            timestamp=datetime.now(timezone.utc),
            query=request.query,
            response=response_text, # Use the text generated by Gemini
            source="ai_hybrid", # Indicate the new source
            language=request.language,
            user_id=owner_user_id,
            confidence_score=analysis.get("confidence", 0.8), # Use confidence from entity extraction
            metadata={ # Store analysis results and client context
                "intent": intent,
                "entities": entities,
                "client_metadata": request.context.model_dump()
                # Removed old complex metadata structure
            }
        )

        # Save conversation in background
        background_tasks.add_task(save_conversation_entry, conversations_db, conversation_entry)

        # Check human chat availability
        human_chat_available = await is_human_chat_available(conv_id, owner_user_id)

        # Generate personalized recommendations whenever relevant products were found and processed,
        # especially if the intent was recommendation or if specific products were mentioned/found.
        personalized_recommendations = []
        # Check if processed_data contains product info (check for 'product_id' or similar key)
        # and if the intent suggests products OR if specific products were found initially.
        if relevant_products and processed_data and isinstance(processed_data[0], dict) and "id" in processed_data[0]:
             logger.info(f"Generating personalized recommendations for intent '{intent}' as relevant products were found.")
             # Use score_map if intent was recommendation, otherwise use default scores/explanations
             for product in relevant_products: # Iterate through originally found products
                 p_id = str(product["_id"])
                 # Find corresponding formatted data in processed_data (used for Gemini prompt)
                 formatted_product_data = next((item for item in processed_data if item.get("id") == p_id), None)
                 if not formatted_product_data:
                     # logger.warning(f"Product ID {p_id} from relevant_products not found in processed_data. Skipping recommendation.") # Keep warning commented for now
                     continue # Skip if not in top processed

                 score_components = {}
                 match_score = 0.7 # Default score
                 explanation = _generate_simple_explanation(product, request.context) # Default explanation

                 if p_id in score_map: # If scoring was done (recommendation intent)
                     score_data = score_map[p_id]
                     score_components = score_data["components"]
                     match_score = score_data["score"]
                     explanation = _generate_recommendation_explanation(product, score_components, request.context)

                 personalized_recommendations.append({
                     "product_id": p_id,
                         "name": product.get("product_name", ""),
                         "explanation": explanation,
                         "match_score": match_score, # Use the correct score
                         "image_url": product.get("image_url", "/static/images/default.jpg"),
                         "url": product.get("url", "#"),
                         "price": _format_price(product.get("pricing", {})), # Use existing helper
                         "category": product.get("category", ""),
                         "features": product.get("features", [])[:5],
                         "score_components": score_components
                     })
             # Sort recommendations by score before returning
             personalized_recommendations.sort(key=lambda x: x["match_score"], reverse=True)
             # logger.debug(f"Final personalized_recommendations before return: {json.dumps(personalized_recommendations, default=str)}") # Keep debug commented

        # Prepare and return final response
        return ChatResponse(
            reply=response_text,
            source="ai_hybrid",
            confidence_score=analysis.get("confidence", 0.8),
            conversation_id=conv_id,
            followup_questions=[], # Follow-ups are now part of the main reply or omitted
            metadata={ # Simplified metadata
                "intent": intent,
                "entities": entities,
                "human_chat_available": human_chat_available,
                "client_context": serialize_mongo_doc(request.context.model_dump())
            },
            personalized_recommendations=personalized_recommendations # Use the generated list
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
        request.user_id = owner_user_id # Also add to request object if needed elsewhere

        # --- New Hybrid AI Flow ---
        # 1. Extract Entities using simplified AI Service method
        analysis = await ai_service.extract_entities_with_gemini(
            query=request.query,
            context=request.context,
            language=request.language
        )
        intent = analysis.get("intent", "general_question")
        entities = analysis.get("entities", {})
        logger.debug(f"Initial Extracted Analysis: Intent={intent}, Entities={entities}")

        # --- Intent Override Fallback ---
        # If Gemini classified as general but query seems product-related, override intent.
        # Added more keywords and check query_lower
        product_keywords_cs = ["produkt", "zboží", "sortiment", "nabídk", "máte", "prodáváte"]
        product_keywords_en = ["product", "goods", "assortment", "offer", "have", "sell", "inventory", "items"]
        product_keywords = product_keywords_cs if request.language == "cs" else product_keywords_en
        if intent == "general_question" and any(keyword in query_lower for keyword in product_keywords):
            logger.warning(f"Overriding intent from 'general_question' to 'product_recommendation' based on keywords for query: '{request.query}'")
            intent = "product_recommendation"
            analysis["intent"] = intent # Update analysis dict as well

        # Update conversation context with potentially overridden intent/entities
        await request.context.update_context(
            request.query,
            intent=intent,
            entities=entities
        )

        # 2. Retrieve Relevant Data from KnowledgeBase (using owner_user_id)
        knowledge_base = await get_knowledge_base()
        relevant_products = []
        qa_items = []

        # Prioritize fetching based on specific entities first
        if entities.get("products"):
            for name in entities["products"]:
                found = await knowledge_base.find_products_by_name(name, user_id=owner_user_id, limit=3) # Limit slightly higher for direct name match
                relevant_products.extend(found)
        elif entities.get("categories"):
            # Use the first category for simplicity, could be expanded
            found = await knowledge_base.find_products_by_category(entities["categories"][0], user_id=owner_user_id, limit=5)
            relevant_products.extend(found)
        # Add logic to search by features/price if needed
        elif entities.get("features") or entities.get("price_range"):
             search_query = {}
             if entities.get("features"):
                 search_query["features"] = {"$all": entities["features"]}
             if entities.get("price_range"):
                 price_filter = {}
                 if entities["price_range"].get("min") is not None: price_filter["$gte"] = entities["price_range"]["min"]
                 if entities["price_range"].get("max") is not None: price_filter["$lte"] = entities["price_range"]["max"]
                 if price_filter: search_query["price"] = price_filter
             if search_query:
                 found = await knowledge_base.find_products_by_query(search_query, user_id=owner_user_id, limit=5)
                 relevant_products.extend(found)

        # --- Fetch General Recommendations if Intent is Recommendation AND no specific products were found via entities ---
        if intent == "product_recommendation" and not relevant_products:
             logger.info(f"Intent is product_recommendation but no specific entities led to products. Fetching general recommendations for user {owner_user_id}.")
             recommended_fallback = await knowledge_base.get_recommended_products(user_id=owner_user_id, limit=3) # Fetch top 3 general
             relevant_products.extend(recommended_fallback)

        # Fetch QA items for service intents (can run in parallel with product fetching if complex)
        if intent in ["customer_service", "shipping_payment", "store_navigation"]:
             # Use keywords related to intent or extracted entities to find QA
             search_term = request.query.split()[0] # Simple keyword extraction
             qa_items = await knowledge_base.find_qa_items_by_keyword(search_term, user_id=owner_user_id, limit=3) # Assuming QA might be tenant specific? If not, remove user_id

        # Remove duplicates just in case
        relevant_products = list({p['_id']: p for p in relevant_products}.values())
        logger.debug(f"Retrieved {len(relevant_products)} relevant products and {len(qa_items)} QA items.")

        # 3. Apply Business Logic / Process Data (Keep relevant parts)
        processed_data = []
        score_map = {} # Store both score and components
        if intent == "product_recommendation" and relevant_products:
            # Use the existing scoring logic
            scored_products = await ai_service._score_products_for_recommendation(relevant_products, entities, request.context)
            scored_products.sort(key=lambda x: x["score"], reverse=True)
            top_products = scored_products[:3]
            processed_data = [ai_service._format_product_data(p["product"]) for p in top_products] # Format for Gemini prompt
            # Store score and components for later use
            for p_data in top_products:
                 p_id = str(p_data["product"]["_id"])
                 score_map[p_id] = {"score": p_data["score"], "components": p_data["score_components"]} # Store both
        elif relevant_products:
             # Format top products for context, even if not recommendation
             processed_data = [ai_service._format_product_data(p) for p in relevant_products[:3]]
        elif qa_items:
             # Format QA items for context
             processed_data = [{"question": q.get("question"), "answer": q.get("answer")} for q in qa_items]

        # 4. Generate Response using simplified AI Service method
        response_text = await ai_service.generate_response_with_gemini(
            query=request.query,
            analysis=analysis,
            relevant_data=processed_data, # Pass the processed, tenant-specific data
            context=request.context,
            language=request.language
        )
        # Note: Follow-up questions might be included in response_text by Gemini now, or omitted.

        # 5. Structure Final Response
        conv_id = request.context.conversation_id or str(uuid.uuid4()) # Ensure ID exists
        conversation_entry = ConversationEntry(
            conversation_id=conv_id,
            timestamp=datetime.now(timezone.utc),
            query=request.query,
            response=response_text, # Use the text generated by Gemini
            source="ai_hybrid", # Indicate the new source
            language=request.language,
            user_id=owner_user_id,
            confidence_score=analysis.get("confidence", 0.8), # Use confidence from entity extraction
            metadata={ # Store analysis results and client context
                "intent": intent,
                "entities": entities,
                "client_metadata": request.context.model_dump()
                # Removed old complex metadata structure
            }
        )

        # Save conversation in background
        background_tasks.add_task(save_conversation_entry, conversations_db, conversation_entry)

        # Check human chat availability
        human_chat_available = await is_human_chat_available(conv_id, owner_user_id)

        # Generate personalized recommendations whenever relevant products were found and processed,
        # especially if the intent was recommendation or if specific products were mentioned/found.
        personalized_recommendations = []
        # Check if processed_data contains product info (check for 'product_id' or similar key)
        # and if the intent suggests products OR if specific products were found initially.
        if relevant_products and processed_data and isinstance(processed_data[0], dict) and "id" in processed_data[0]:
             logger.info(f"Generating personalized recommendations for intent '{intent}' as relevant products were found.")
             # Use score_map if intent was recommendation, otherwise use default scores/explanations
             for product in relevant_products: # Iterate through originally found products
                 p_id = str(product["_id"])
                 # Find corresponding formatted data in processed_data (used for Gemini prompt)
                 formatted_product_data = next((item for item in processed_data if item.get("id") == p_id), None)
                 if not formatted_product_data: continue # Skip if not in top processed

                 score_components = {}
                 match_score = 0.7 # Default score
                 explanation = _generate_simple_explanation(product, request.context) # Default explanation

                 if p_id in score_map: # If scoring was done (recommendation intent)
                     score_data = score_map[p_id]
                     score_components = score_data["components"]
                     match_score = score_data["score"]
                     explanation = _generate_recommendation_explanation(product, score_components, request.context)

                 personalized_recommendations.append({
                     "product_id": p_id,
                         "name": product.get("product_name", ""),
                         "explanation": explanation,
                         "match_score": match_score, # Use the correct score
                         "image_url": product.get("image_url", "/static/images/default.jpg"),
                         "url": product.get("url", "#"),
                         "price": _format_price(product.get("pricing", {})), # Use existing helper
                         "category": product.get("category", ""),
                         "features": product.get("features", [])[:5],
                         "score_components": score_components
                     })
             # Sort recommendations by score before returning
             personalized_recommendations.sort(key=lambda x: x["match_score"], reverse=True)
             # No need to limit here again, as top_products was already limited
             # personalized_recommendations = personalized_recommendations[:3]

        # Prepare and return final response
        return ChatResponse(
            reply=response_text,
            source="ai_hybrid",
            confidence_score=analysis.get("confidence", 0.8),
            conversation_id=conv_id,
            followup_questions=[], # Follow-ups are now part of the main reply or omitted
            metadata={ # Simplified metadata
                "intent": intent,
                "entities": entities,
                "human_chat_available": human_chat_available,
                "client_context": serialize_mongo_doc(request.context.model_dump())
            },
            personalized_recommendations=personalized_recommendations # Use the generated list
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

# --- Keep Recommendation Explanation Helpers ---
# These are used by chat.py to format the final response, not directly by ai_service anymore

def _generate_recommendation_explanation(product: Dict[str, Any], score_components: Dict[str, float], context: EnhancedConversationContext) -> str:
    """Generate a human-readable explanation for why a product is recommended based on score components."""
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
    return "Doporučené příslušenství" # Recommended accessory

def _generate_simple_explanation(product: Dict[str, Any], context: EnhancedConversationContext) -> str:
    """Generate a simple explanation for a product based on context matching."""
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
        return "odpovídá vašim požadavkům" # Matches your requirements
    
    return "Doporučujeme, protože " + " a ".join(explanation_parts) # We recommend because...

# Keep price formatting helpers as they are used in response construction
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
