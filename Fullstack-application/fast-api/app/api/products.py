from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from typing import Optional, List, Dict
from app.models.product import ProductCreate, ProductUpdate, Product, StockInfo
from app.utils import mongo
from app.utils.logging_config import get_module_logger
from bson import ObjectId
import aiofiles
import os
from datetime import datetime
import uuid
from pydantic import BaseModel, ValidationError
from app.api.chat import get_ai_service
# Make sure get_current_active_customer is the correct dependency for product management
# If only logged-in dashboard users manage products, use get_current_user instead.
# Assuming only logged-in dashboard users manage products, use get_current_user or require_active_subscription
# Ensure all necessary dependencies are imported (Corrected import line)
from app.utils.dependencies import require_active_subscription, get_current_active_customer, get_current_user
from app.models.user import SubscriptionTier # Import SubscriptionTier
from fastapi import status # Import status for HTTP codes
import json
import re

router = APIRouter(tags=["products"])
logger = get_module_logger(__name__)

class ProductFieldSuggestions(BaseModel):
    """Response model for AI-generated product field suggestions."""
    target_audience: List[str] = []
    keywords: List[str] = []
    features: List[str] = []
    categories: List[str] = []

# Define suggestions endpoint FIRST, before other endpoints to avoid route conflicts
@router.get("/products/suggestions", response_model=ProductFieldSuggestions)
async def get_product_suggestions(
    product_name: str,
    description: Optional[str] = "",
    category: Optional[str] = "",
    business_type: Optional[str] = "",
    language: str = "en",
    current_user: Dict = Depends(get_current_active_customer) # Or get_current_user if only for dashboard
):
    """Generate AI suggestions for product fields based on provided details.

    Args:
        product_name: The name of the product
        description: Optional product description
        category: Optional product category
        business_type: Optional business type
        language: Language for suggestions (en or cs)
    """
    try:
        # Log the suggestion request
        user_id = current_user.get("id") # Use .get() for safety
        if not user_id:
             raise HTTPException(status_code=401, detail="Could not identify user from token/key")

        logger.info(f"Generating product suggestions for: {product_name}, language: {language}, user: {user_id}")

        # Normalize language parameter
        language = language.lower()
        if language not in ["en", "cs"]:
            language = "en"  # Default to English if not supported

        # Get AI service
        ai_service = await get_ai_service()

        # Create prompt based on language
        if language == "cs":
            prompt = f"""
            Na základě následujících informací o produktu vygeneruj:
            1. Seznam cílových skupin uživatelů (target_audience)
            2. Seznam klíčových slov (keywords)
            3. Seznam funkcí a vlastností (features)
            4. Seznam vhodných kategorií (categories)

            Informace o produktu:
            - Název produktu: {product_name}
            - Popis: {description or 'Žádný popis není dostupný'}
            - Kategorie: {category or 'Není určena'}
            - Typ podnikání: {business_type or 'Není určen'}

            Formátuj svou odpověď jako JSON objekt s následujícími poli:
            {{
                "target_audience": ["cílová skupina 1", "cílová skupina 2", ...],
                "keywords": ["klíčové slovo 1", "klíčové slovo 2", ...],
                "features": ["vlastnost 1", "vlastnost 2", ...],
                "categories": ["kategorie 1", "kategorie 2", ...]
            }}

            Každý seznam by měl obsahovat 3-5 relevantních a specifických položek.
            """
        else:
            prompt = f"""
            Based on the following product information, generate:
            1. A list of target audience groups (target_audience)
            2. A list of keywords (keywords)
            3. A list of features and characteristics (features)
            4. A list of suitable categories (categories)

            Product information:
            - Product name: {product_name}
            - Description: {description or 'No description available'}
            - Category: {category or 'Not specified'}
            - Business type: {business_type or 'Not specified'}

            Format your response as a JSON object with the following fields:
            {{
                "target_audience": ["target group 1", "target group 2", ...],
                "keywords": ["keyword 1", "keyword 2", ...],
                "features": ["feature 1", "feature 2", ...],
                "categories": ["category 1", "category 2", ...]
            }}

            Each list should contain 3-5 relevant and specific items.
            """

        # Get AI response
        response = await ai_service.generate_response(
            query=prompt,
            language=language
        )

        # Extract the response content and parse it as JSON
        content = response.get("response", "")
        logger.debug(f"AI response content: {content[:200]}...")  # Log first 200 chars

        # Extract JSON from the response text
        json_match = re.search(r'\{.*\}', content, re.DOTALL)

        if json_match:
            try:
                json_str = json_match.group(0)
                logger.debug(f"Extracted JSON: {json_str[:200]}...")

                suggestions = json.loads(json_str)
                # Limit the number of suggestions returned
                result = ProductFieldSuggestions(
                    target_audience=suggestions.get("target_audience", [])[:10],
                    keywords=suggestions.get("keywords", [])[:10],
                    features=suggestions.get("features", [])[:10],
                    categories=suggestions.get("categories", [])[:5]
                )

                # Log the result
                logger.info(f"Generated suggestions: target_audience={len(result.target_audience)}, keywords={len(result.keywords)}, features={len(result.features)}, categories={len(result.categories)}")

                return result
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {str(e)}, JSON string: {json_str[:100]}...")
            except ValidationError as ve:
                 logger.error(f"Pydantic validation error on suggestions: {ve}")
                 # Fall through to fallback if validation fails

        # Fallback with hardcoded suggestions based on category
        logger.warning("AI suggestion failed or invalid, falling back to hardcoded suggestions")

        # Basic fallback based on product name and category
        generic_suggestions = {
            "en": {
                "default": {
                    "target_audience": ["Small businesses", "Medium businesses", "Enterprise customers", "Individual users", "Professionals"],
                    "keywords": ["Quality", "Efficient", "Modern", "Reliable", "Value for money", "Innovative"],
                    "features": ["Easy to use", "High-quality", "Customizable", "Fast delivery", "Professional support"],
                    "categories": ["General Products", "Miscellaneous", "Services", "Equipment", "Accessories"]
                },
                "software": {
                    "target_audience": ["IT Departments", "Software Developers", "Business Analysts", "Project Managers", "Small to Medium Enterprises"],
                    "keywords": ["Software", "Application", "Digital", "Cloud", "Solution", "Integration", "Automation"],
                    "features": ["User-friendly interface", "Cloud-based solution", "Customizable settings", "Data security", "Regular updates"],
                    "categories": ["Business Software", "Productivity Tools", "Development Tools", "Analytics Software", "Security Software"]
                },
                "electronics": {
                    "target_audience": ["Tech enthusiasts", "Home users", "Office workers", "Students", "Remote workers"],
                    "keywords": ["Electronic", "Digital", "Smart", "Wireless", "High-performance", "Energy-efficient"],
                    "features": ["Long battery life", "High resolution display", "Fast processor", "Wireless connectivity", "Compact design"],
                    "categories": ["Smartphones", "Laptops", "Tablets", "Smart Home", "Wearables"]
                },
                "bicycle": {
                    "target_audience": ["Sports enthusiasts", "Commuters", "Mountain bikers", "Road cyclists", "Casual riders", "Fitness enthusiasts"],
                    "keywords": ["Bicycle", "Bike", "Cycling", "Mountain bike", "Road bike", "Sports equipment", "Outdoor", "Fitness"],
                    "features": ["Lightweight frame", "Durable construction", "Responsive brakes", "Multiple gears", "Shock absorption", "Comfortable seat"],
                    "categories": ["Mountain Bikes", "Road Bikes", "City Bikes", "Electric Bikes", "Kids Bikes"]
                }
            },
            "cs": {
                "default": {
                    "target_audience": ["Malé podniky", "Střední podniky", "Velké společnosti", "Jednotlivci", "Profesionálové"],
                    "keywords": ["Kvalita", "Efektivní", "Moderní", "Spolehlivý", "Dobrá cena", "Inovativní"],
                    "features": ["Snadné použití", "Vysoká kvalita", "Přizpůsobitelný", "Rychlé dodání", "Profesionální podpora"],
                    "categories": ["Obecné produkty", "Různé", "Služby", "Vybavení", "Příslušenství"]
                },
                "software": {
                    "target_audience": ["IT oddělení", "Vývojáři softwaru", "Obchodní analytici", "Projektoví manažeři", "Malé a střední podniky"],
                    "keywords": ["Software", "Aplikace", "Digitální", "Cloud", "Řešení", "Integrace", "Automatizace"],
                    "features": ["Uživatelsky přívětivé rozhraní", "Cloudové řešení", "Přizpůsobitelná nastavení", "Zabezpečení dat", "Pravidelné aktualizace"],
                    "categories": ["Firemní software", "Nástroje pro produktivitu", "Vývojářské nástroje", "Analytický software", "Bezpečnostní software"]
                },
                "elektronika": {
                    "target_audience": ["Technologičtí nadšenci", "Domácí uživatelé", "Kancelářští pracovníci", "Studenti", "Práce na dálku"],
                    "keywords": ["Elektronický", "Digitální", "Chytrý", "Bezdrátový", "Vysoce výkonný", "Energeticky úsporný"],
                    "features": ["Dlouhá výdrž baterie", "Vysoké rozlišení displeje", "Rychlý procesor", "Bezdrátové připojení", "Kompaktní design"],
                    "categories": ["Smartphony", "Notebooky", "Tablety", "Chytrá domácnost", "Nositelná elektronika"]
                },
                "kolo": {
                    "target_audience": ["Sportovní nadšenci", "Dojíždějící", "Horští cyklisté", "Silniční cyklisté", "Rekreační jezdci", "Fitness nadšenci"],
                    "keywords": ["Jízdní kolo", "Kolo", "Cyklistika", "Horské kolo", "Silniční kolo", "Sportovní vybavení", "Outdoor", "Fitness"],
                    "features": ["Lehký rám", "Odolná konstrukce", "Citlivé brzdy", "Více převodů", "Odpružení", "Pohodlné sedlo"],
                    "categories": ["Horská kola", "Silniční kola", "Městská kola", "Elektrická kola", "Dětská kola"]
                }
            }
        }

        # Try to determine appropriate category from product name or provided category
        suggestions_key = "default"
        product_name_lower = product_name.lower()
        category_lower = category.lower() if category else ""
        lang_key = "cs" if language == "cs" else "en"

        # Check for bike/bicycle terms in Czech or English
        if lang_key == "cs":
            if "kolo" in product_name_lower or "kolo" in category_lower or "cykl" in product_name_lower:
                suggestions_key = "kolo"
            elif "soft" in product_name_lower or "soft" in category_lower or "program" in product_name_lower:
                suggestions_key = "software"
            elif "elektron" in product_name_lower or "elektron" in category_lower:
                suggestions_key = "elektronika"
        else:  # English
            if "bike" in product_name_lower or "bicycle" in product_name_lower or "bike" in category_lower:
                suggestions_key = "bicycle"
            elif "soft" in product_name_lower or "soft" in category_lower or "program" in product_name_lower:
                suggestions_key = "software"
            elif "electron" in product_name_lower or "electron" in category_lower:
                suggestions_key = "electronics"

        # Get fallback suggestions
        fallback = generic_suggestions[lang_key].get(suggestions_key, generic_suggestions[lang_key]["default"])
        result = ProductFieldSuggestions(
            target_audience=fallback["target_audience"],
            keywords=fallback["keywords"],
            features=fallback["features"],
            categories=fallback["categories"]
        )

        logger.info(f"Using fallback suggestions for category: {suggestions_key}")
        return result

    except Exception as e:
        import traceback
        logger.error(f"Error generating product field suggestions: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")

async def save_upload_file(upload_file: UploadFile, destination: str) -> str:
    """Saves the uploaded file to the specified destination."""
    try:
        os.makedirs(os.path.dirname(destination), exist_ok=True)
        async with aiofiles.open(destination, 'wb') as out_file:
            while content := await upload_file.read(1024):  # Reads file in chunks
                await out_file.write(content)
    except Exception as e:
        logger.error(f"Error saving file: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    return destination


@router.post("/products/", response_model=Product, status_code=201)
async def create_product(
    product_name: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    business_type: str = Form(...),
    features: List[str] = Form([]),
    one_time_price: Optional[float] = Form(None),
    monthly_price: Optional[float] = Form(None),
    annual_price: Optional[float] = Form(None),
    currency: str = Form("Kč"),
    target_audience: List[str] = Form([]),
    keywords: List[str] = Form([]),
    url: Optional[str] = Form(None),
    admin_priority: int = Form(0),
    image_file: Optional[UploadFile] = File(None),
    current_user: Dict = Depends(require_active_subscription) # Use JWT auth + active sub check
):
    """Creates a new product (requires active subscription)."""
    try:
        # MULTI-TENANCY: Use authenticated user's ID
        user_id = current_user.get("id")
        if not user_id:
             # This check might be redundant due to the dependency, but good for safety
             raise HTTPException(status_code=401, detail="Could not identify user from token")

        # --- Check Plan Limits ---
        tier_str = current_user.get("subscription_tier", "free")
        try:
            tier = SubscriptionTier(tier_str)
        except ValueError:
            logger.warning(f"Invalid tier '{tier_str}' for user {user_id}, applying free limits.")
            tier = SubscriptionTier.FREE

        # Define limits
        limits = {
            SubscriptionTier.FREE: 0, # Assuming free tier cannot create products
            SubscriptionTier.BASIC: 50,
            SubscriptionTier.PREMIUM: 100,
            SubscriptionTier.ENTERPRISE: 500,
        }
        max_products = limits.get(tier, 0)

        collection = await mongo.get_product_collection()
        current_product_count = await collection.count_documents({"user_id": user_id})

        if current_product_count >= max_products:
            logger.warning(f"User {user_id} (Tier: {tier.value}) tried to create product but reached limit ({max_products})")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, # Use 403 Forbidden for limit exceeded
                detail=f"Maximum number of products ({max_products}) reached for your '{tier.value}' plan."
            )
        # --- End Plan Limits Check ---

        # Log received data for debugging
        logger.info(f"Received product creation request for user {user_id}:")
        logger.info(f"- product_name: {product_name}")
        # ... (rest of logging)

        # Build the pricing dictionary
        pricing = {}
        if one_time_price is not None:
            pricing["one_time"] = str(one_time_price)
        if monthly_price is not None:
            pricing["monthly"] = str(monthly_price)
        if annual_price is not None:
            pricing["annual"] = str(annual_price)
        if currency:
            pricing["currency"] = currency

        # Create the product dictionary directly
        product_dict = {
            "id": str(uuid.uuid4()), # Consider if this should be the primary ID or _id
            "product_name": product_name,
            "description": description,
            "category": category,
            "business_type": business_type,
            "features": features,
            "pricing": pricing,
            "target_audience": target_audience,
            "keywords": keywords,
            "url": url,
            "admin_priority": admin_priority,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "version": 1,
            "user_id": user_id, # Ensure this is always set
        }

        # Handle image upload if provided
        if image_file:
            # Ensure the 'static/images' directory exists
            os.makedirs("static/images", exist_ok=True)
            # Consider using a unique filename to avoid collisions
            unique_filename = f"{uuid.uuid4()}_{image_file.filename}"
            file_location = os.path.join("static/images", unique_filename)
            saved_path = await save_upload_file(image_file, file_location)
            product_dict['image_url'] = saved_path # Store the relative path or full URL

        collection = await mongo.get_product_collection()
        result = await collection.insert_one(product_dict)
        # Fetch using the inserted _id for consistency
        created_product = await collection.find_one({"_id": result.inserted_id})

        if not created_product:
             logger.error(f"Failed to fetch product immediately after insertion for user {user_id}")
             raise HTTPException(status_code=500, detail="Failed to create product")

        return Product(**mongo.serialize_mongo_doc(created_product))
    except ValidationError as ve:
        logger.error(f"Validation error creating product: {ve}")
        raise HTTPException(status_code=422, detail=f"Validation error: {str(ve)}")
    except Exception as e:
        logger.error(f"Failed to create product: {e}", exc_info=True) # Log traceback
        raise HTTPException(status_code=500, detail=f"Failed to create product: {str(e)}")


@router.get("/products/{product_id}", response_model=Product)
async def get_product(
    product_id: str,
    current_user: Dict = Depends(get_current_active_customer) # Or get_current_user
):
    """Retrieves a product by its ID, ensuring it belongs to the user."""
    collection = await mongo.get_product_collection()
    product = None # Initialize product to None
    try:
        # MULTI-TENANCY: Use authenticated user's ID
        user_id = current_user.get("id")
        if not user_id:
             raise HTTPException(status_code=401, detail="Could not identify user from token/key")

        # MARK: Added user_id filter for multi-tenancy
        query_filter = {"user_id": user_id}
        if ObjectId.is_valid(product_id):
            query_filter["_id"] = ObjectId(product_id)
            product = await collection.find_one(query_filter)
        else:
            # Assuming 'id' is a custom string field, check that too
            query_filter_alt = {"id": product_id, "user_id": user_id}
            product = await collection.find_one(query_filter_alt)

        if not product:
            # Log user ID for debugging not found errors
            logger.warning(f"Product {product_id} not found for user {user_id}")
            raise HTTPException(status_code=404, detail="Product not found or access denied")

        # Attempt to validate and return
        return Product(**mongo.serialize_mongo_doc(product))

    except ValidationError as ve:
        logger.error(f"Validation error retrieving product {product_id} for user {user_id}: {ve}")
        # If validation fails AFTER finding the product, it indicates data inconsistency
        # It's generally better to raise 500 here unless specific handling is needed
        raise HTTPException(
            status_code=500, # Internal Server Error due to data inconsistency
            detail=f"Product data validation error: {str(ve)}"
        )
    except HTTPException:
         raise # Re-raise HTTPExceptions (like 404)
    except Exception as e:
        logger.error(f"Error retrieving product {product_id} for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving product: {str(e)}")


@router.get("/products", response_model=List[Product])
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    business_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    current_user: Dict = Depends(get_current_active_customer) # Or get_current_user
):
    """Lists all products for the current user with pagination and filtering."""
    collection = await mongo.get_product_collection()

    # MULTI-TENANCY: Use authenticated user's ID
    user_id = current_user.get("id")
    if not user_id:
         raise HTTPException(status_code=401, detail="Could not identify user from token/key")

    # Build the filter - ALWAYS include user_id
    filter_query = {"user_id": user_id}

    if search:
        # Add text search conditions
        search_regex = {"$regex": search, "$options": "i"}
        filter_query["$or"] = [
            {"product_name": search_regex},
            {"description": search_regex},
            {"features": {"$elemMatch": search_regex}}, # Check elements in array
            {"keywords": {"$elemMatch": search_regex}}  # Check elements in array
        ]

    if category:
        # Use case-insensitive match for category
        filter_query["category"] = {"$regex": f"^{re.escape(category)}$", "$options": "i"}

    if business_type:
        # Use case-insensitive match for business_type
        filter_query["business_type"] = {"$regex": f"^{re.escape(business_type)}$", "$options": "i"}

    # Add price filtering if provided
    # Note: This assumes prices are stored as numbers or strings that can be compared numerically.
    # If prices are strings like "100.00", direct comparison might work, but number type is better.
    price_conditions = []
    if min_price is not None:
        price_conditions.extend([
            {"pricing.one_time": {"$gte": str(min_price)}}, # Assuming stored as string
            {"pricing.monthly": {"$gte": str(min_price)}},
            {"pricing.annual": {"$gte": str(min_price)}}
        ])
    if max_price is not None:
         price_conditions.extend([
            {"pricing.one_time": {"$lte": str(max_price)}},
            {"pricing.monthly": {"$lte": str(max_price)}},
            {"pricing.annual": {"$lte": str(max_price)}}
        ])

    if price_conditions:
        # If other $or conditions exist (from search), add price conditions to them
        # Assuming search AND price match is desired, we add price to $and
        if "$or" in filter_query:
             if "$and" not in filter_query: filter_query["$and"] = []
             # Combine existing $or with price $or under the $and
             filter_query["$and"].append({"$or": filter_query.pop("$or")})
             filter_query["$and"].append({"$or": price_conditions})
        else:
            # If no search, just filter by price
             filter_query["$or"] = price_conditions


    try:
        # Get the products with pagination
        logger.debug(f"Listing products for user {user_id} with filter: {filter_query}")
        products_cursor = collection.find(filter_query).skip(skip).limit(limit)
        products = await products_cursor.to_list(length=limit)

        # Process products with error handling
        result = []
        for product_doc in products:
            try:
                # Ensure _id is handled correctly by serialize_mongo_doc
                serialized = mongo.serialize_mongo_doc(product_doc)
                product_obj = Product(**serialized)
                result.append(product_obj)
            except ValidationError as ve:
                logger.warning(f"Validation error for product {product_doc.get('_id')} for user {user_id}: {ve}")
                # Optionally skip invalid products or return partial data
            except Exception as inner_e:
                 logger.error(f"Unexpected error processing product {product_doc.get('_id')} for user {user_id}: {inner_e}", exc_info=True)


        return result

    except Exception as e:
        logger.error(f"Error listing products for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error listing products: {str(e)}")


@router.put("/products/{product_id}", response_model=Product)
async def update_product(
    product_id: str,
    product_name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    business_type: Optional[str] = Form(None),
    features: Optional[List[str]] = Form(None),
    one_time_price: Optional[float] = Form(None),
    monthly_price: Optional[float] = Form(None),
    annual_price: Optional[float] = Form(None),
    currency: Optional[str] = Form(None),
    target_audience: Optional[List[str]] = Form(None),
    keywords: Optional[List[str]] = Form(None),
    url: Optional[str] = Form(None),
    admin_priority: Optional[int] = Form(None),
    image_file: Optional[UploadFile] = File(None),
    current_user: Dict = Depends(get_current_active_customer) # Or get_current_user
):
    """Updates an existing product, ensuring it belongs to the user."""
    logger.debug(f"Update Product Endpoint - product_id: {product_id}")

    collection = await mongo.get_product_collection()

    # MULTI-TENANCY: Use authenticated user's ID
    user_id = current_user.get("id")
    if not user_id:
         raise HTTPException(status_code=401, detail="Could not identify user from token/key")

    # MARK: Added user_id filter for multi-tenancy check
    # Check if product exists and belongs to the user
    existing_product = None
    query_filter = {"user_id": user_id}
    if ObjectId.is_valid(product_id):
        query_filter["_id"] = ObjectId(product_id)
        existing_product = await collection.find_one(query_filter)
    else:
        # Assuming 'id' is a custom string field
        query_filter["id"] = product_id
        existing_product = await collection.find_one(query_filter)

    if not existing_product:
        logger.warning(f"Update failed: Product {product_id} not found for user {user_id}")
        raise HTTPException(status_code=404, detail="Product not found or access denied")

    # Prepare update data, only including fields that were actually provided
    update_data = {}
    if product_name is not None: update_data["product_name"] = product_name
    if description is not None: update_data["description"] = description
    if category is not None: update_data["category"] = category
    if business_type is not None: update_data["business_type"] = business_type
    if features is not None: update_data["features"] = features # Assumes full replacement
    if target_audience is not None: update_data["target_audience"] = target_audience # Assumes full replacement
    if keywords is not None: update_data["keywords"] = keywords # Assumes full replacement
    if url is not None: update_data["url"] = url
    if admin_priority is not None: update_data["admin_priority"] = admin_priority

    # Handle pricing update - merge with existing pricing
    pricing_update = {}
    if one_time_price is not None: pricing_update["pricing.one_time"] = str(one_time_price)
    if monthly_price is not None: pricing_update["pricing.monthly"] = str(monthly_price)
    if annual_price is not None: pricing_update["pricing.annual"] = str(annual_price)
    if currency is not None: pricing_update["pricing.currency"] = currency
    if pricing_update:
        # Use dot notation for targeted updates within the pricing subdocument
        for key, value in pricing_update.items():
            update_data[key] = value

    # Handle image upload if provided
    if image_file:
        try:
            # Ensure directory exists
            os.makedirs("static/images", exist_ok=True)
            unique_filename = f"{uuid.uuid4()}_{image_file.filename}"
            file_location = os.path.join("static/images", unique_filename)
            await save_upload_file(image_file, file_location)
            update_data['image_url'] = file_location # Store relative path
            # Optionally delete old image file if it exists and is different
        except Exception as e:
            logger.error(f"Error saving image for product {product_id}: {e}")
            # Decide if image error should prevent the rest of the update
            # raise HTTPException(status_code=500, detail=f"Error saving image: {str(e)}")

    # Update timestamp if there are changes
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        # Optionally increment version number
        # update_data["$inc"] = { "version": 1 } # Requires separate $inc operator

    if not update_data:
         # If no actual data fields were provided (only maybe image), still update timestamp?
         # Or return 304 Not Modified? For now, just return existing.
         logger.info(f"No fields to update for product {product_id}, user {user_id}")
         return Product(**mongo.serialize_mongo_doc(existing_product))


    try:
        # MARK: Added user_id filter for multi-tenancy update
        # Update the product, ensuring we only update the one belonging to the user
        update_filter = {"user_id": user_id}
        # Use the correct identifier (_id or id) based on what was found
        if "_id" in existing_product:
             update_filter["_id"] = existing_product["_id"]
        else:
             update_filter["id"] = product_id # Fallback if using custom string id

        update_result = await collection.update_one(update_filter, {"$set": update_data}) # Use $set for provided fields

        if update_result.matched_count == 0:
             # This should ideally not happen due to the check above, but good for safety
             logger.error(f"Update failed: Product {product_id} not found for user {user_id} during update operation.")
             raise HTTPException(status_code=404, detail="Product not found or update failed")

        # Fetch the updated product to return
        updated_product = await collection.find_one(update_filter)
        if not updated_product:
             # Should also not happen if update succeeded
             logger.error(f"Update seemed successful but could not refetch product {product_id} for user {user_id}.")
             raise HTTPException(status_code=404, detail="Failed to retrieve updated product")

        # Return updated product
        return Product(**mongo.serialize_mongo_doc(updated_product))
    except ValidationError as ve:
        logger.error(f"Validation error updating product {product_id}: {ve}")
        raise HTTPException(
            status_code=422,
            detail=f"Product data validation error: {str(ve)}"
        )
    except Exception as e:
        logger.error(f"Error updating product {product_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error updating product: {str(e)}")


@router.put("/products/{product_id}/json", response_model=Product)
async def update_product_json(
    product_id: str,
    product_data: dict, # Assuming product_data is the JSON body
    current_user: Dict = Depends(get_current_active_customer) # MARK: Added dependency injection
):
    """Updates an existing product using JSON data, ensuring it belongs to the user."""
    logger.debug(f"Update Product JSON Endpoint - product_id: {product_id} for user {current_user.get('id')}")

    collection = await mongo.get_product_collection()

    # MULTI-TENANCY: Use authenticated user's ID
    user_id = current_user.get("id")
    if not user_id:
         raise HTTPException(status_code=401, detail="Could not identify user from token/key")

    # MARK: Added user_id filter for multi-tenancy check
    # Check if product exists and belongs to the user
    existing_product = None
    query_filter = {"user_id": user_id}
    if ObjectId.is_valid(product_id):
        query_filter["_id"] = ObjectId(product_id)
        existing_product = await collection.find_one(query_filter)
    else:
        # Assuming 'id' is a custom string field
        query_filter["id"] = product_id
        existing_product = await collection.find_one(query_filter)

    if not existing_product:
        logger.warning(f"Update JSON failed: Product {product_id} not found for user {user_id}")
        raise HTTPException(status_code=404, detail="Product not found or access denied")

    # Validate the product data (optional but recommended)
    try:
        ProductUpdate(**product_data) # Validate against update model if available
    except ValidationError as ve:
         logger.error(f"Validation error in JSON data for product {product_id}: {ve}")
         raise HTTPException(status_code=422, detail=f"Invalid product data: {str(ve)}")

    try:
        # Prepare update data from the provided JSON, only using fields present in the model
        update_data = {}
        allowed_fields = ProductUpdate.__fields__.keys() # Get fields from Pydantic model

        for field in allowed_fields:
            if field in product_data:
                # Special handling for pricing if needed
                if field == "pricing" and isinstance(product_data[field], dict):
                     # Update individual pricing fields using dot notation
                     pricing_dict = product_data[field]
                     if "one_time" in pricing_dict: update_data["pricing.one_time"] = str(pricing_dict["one_time"])
                     if "monthly" in pricing_dict: update_data["pricing.monthly"] = str(pricing_dict["monthly"])
                     if "annual" in pricing_dict: update_data["pricing.annual"] = str(pricing_dict["annual"])
                     if "currency" in pricing_dict: update_data["pricing.currency"] = pricing_dict["currency"]
                else:
                    update_data[field] = product_data[field]

        if not update_data:
            logger.info(f"No valid fields to update in JSON for product {product_id}")
            # Return existing product data if nothing changed
            return Product(**mongo.serialize_mongo_doc(existing_product))

        # Update timestamp
        update_data["updated_at"] = datetime.utcnow()

        # MARK: Added user_id filter for multi-tenancy update
        # Update the product, ensuring we only update the one belonging to the user
        update_filter = {"user_id": user_id}
        # Use the correct identifier based on what was found
        if "_id" in existing_product:
             update_filter["_id"] = existing_product["_id"]
        else:
             update_filter["id"] = product_id # Fallback if using custom string id

        update_result = await collection.update_one(update_filter, {"$set": update_data})

        if update_result.matched_count == 0:
             logger.error(f"Update JSON failed: Product {product_id} not found for user {user_id} during update.")
             raise HTTPException(status_code=404, detail="Product not found or update failed")

        # Fetch the updated product to return
        updated_product = await collection.find_one(update_filter)
        if not updated_product:
             logger.error(f"Update JSON seemed successful but could not refetch product {product_id} for user {user_id}.")
             raise HTTPException(status_code=404, detail="Failed to retrieve updated product")

        # Return updated product
        return Product(**mongo.serialize_mongo_doc(updated_product))

    except Exception as e:
        logger.error(f"Error updating product {product_id} via JSON: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error updating product: {str(e)}")


@router.delete("/products/{product_id}", status_code=204)
async def delete_product(
    product_id: str,
    current_user: Dict = Depends(get_current_active_customer) # Or get_current_user
):
    """Deletes a product by its ID, ensuring it belongs to the user."""
    collection = await mongo.get_product_collection()
    try:
        # MULTI-TENANCY: Use authenticated user's ID
        user_id = current_user.get("id")
        if not user_id:
             raise HTTPException(status_code=401, detail="Could not identify user from token/key")

        # MARK: Added user_id filter for multi-tenancy delete
        delete_filter = {"user_id": user_id}
        if ObjectId.is_valid(product_id):
            delete_filter["_id"] = ObjectId(product_id)
        else:
            delete_filter["id"] = product_id # Assuming 'id' is the custom string field

        result = await collection.delete_one(delete_filter)

        if result.deleted_count == 0:
            logger.warning(f"Delete failed: Product {product_id} not found for user {user_id}")
            raise HTTPException(status_code=404, detail="Product not found or access denied")

        logger.info(f"Deleted product {product_id} for user {user_id}")
        # No content to return on successful delete (status 204)

    except HTTPException:
         raise # Re-raise HTTPExceptions
    except Exception as e:
        logger.error(f"Error deleting product {product_id} for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error deleting product: {str(e)}")


@router.put("/products/{product_id}/upload-image", response_model=Product)
async def upload_product_image(
    product_id: str,
    image_file: UploadFile = File(...),
    current_user: Dict = Depends(get_current_active_customer) # MARK: Added dependency injection
):
    """Upload or update a product image, ensuring the product belongs to the user."""
    logger.debug(f"Upload Product Image Endpoint - product_id: {product_id} for user {current_user.get('id')}")

    collection = await mongo.get_product_collection()

    # MULTI-TENANCY: Use authenticated user's ID
    user_id = current_user.get("id")
    if not user_id:
         raise HTTPException(status_code=401, detail="Could not identify user from token/key")

    # MARK: Added user_id filter for multi-tenancy check
    # Check if product exists and belongs to the user
    existing_product = None
    query_filter = {"user_id": user_id}
    if ObjectId.is_valid(product_id):
        query_filter["_id"] = ObjectId(product_id)
        existing_product = await collection.find_one(query_filter)
    else:
        query_filter["id"] = product_id
        existing_product = await collection.find_one(query_filter)

    if not existing_product:
        logger.warning(f"Image upload failed: Product {product_id} not found for user {user_id}")
        raise HTTPException(status_code=404, detail="Product not found or access denied")

    try:
        # Ensure directory exists
        os.makedirs("static/images", exist_ok=True)
        unique_filename = f"{uuid.uuid4()}_{image_file.filename}"
        file_location = os.path.join("static/images", unique_filename)
        await save_upload_file(image_file, file_location)

        # Update image_url in the database
        update_data = {
            "image_url": file_location, # Store relative path
            "updated_at": datetime.utcnow()
        }

        # MARK: Added user_id filter for multi-tenancy update
        # Update the product, ensuring we only update the one belonging to the user
        update_filter = {"user_id": user_id}
        # Use the correct identifier based on what was found
        if "_id" in existing_product:
             update_filter["_id"] = existing_product["_id"]
        else:
             update_filter["id"] = product_id

        update_result = await collection.update_one(update_filter, {"$set": update_data})

        if update_result.matched_count == 0:
             logger.error(f"Image URL update failed: Product {product_id} not found for user {user_id} during update.")
             # This case should be rare given the check above
             raise HTTPException(status_code=404, detail="Product not found or update failed")

        # Fetch the updated product to return
        updated_product = await collection.find_one(update_filter)
        if not updated_product:
             logger.error(f"Image URL update seemed successful but could not refetch product {product_id} for user {user_id}.")
             raise HTTPException(status_code=404, detail="Failed to retrieve updated product after image upload")

        # Return updated product
        return Product(**mongo.serialize_mongo_doc(updated_product))
    except Exception as e:
        logger.error(f"Error uploading image for product {product_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error uploading image: {str(e)}")
