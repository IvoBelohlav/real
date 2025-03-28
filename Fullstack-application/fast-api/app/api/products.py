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
from app.utils.dependencies import get_current_active_customer
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
    current_user: Dict = Depends(get_current_active_customer)
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
        logger.info(f"Generating product suggestions for: {product_name}, language: {language}, user: {current_user['id']}")
        
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
        
        # Fallback with hardcoded suggestions based on category
        logger.warning("Fallback to hardcoded suggestions")
        
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
        fallback = generic_suggestions[lang_key][suggestions_key]
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
    current_user: Dict = Depends(get_current_active_customer)
):
    """Creates a new product."""
    try:
        # MULTI-TENANCY: Use authenticated user's ID
        user_id = current_user["id"]
        
        # Log received data for debugging
        logger.info(f"Received product creation request:")
        logger.info(f"- product_name: {product_name}")
        logger.info(f"- description: {description}")
        logger.info(f"- category: {category}")
        logger.info(f"- business_type: {business_type}")
        logger.info(f"- features: {features}")
        logger.info(f"- target_audience: {target_audience}")
        logger.info(f"- keywords: {keywords}")
        logger.info(f"- pricing: one_time={one_time_price}, monthly={monthly_price}, annual={annual_price}, currency={currency}")
        logger.info(f"- url: {url}")
        logger.info(f"- admin_priority: {admin_priority}")
        logger.info(f"- image_file: {image_file.filename if image_file else None}")
        
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
            "id": str(uuid.uuid4()),
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
            "user_id": user_id,
        }

        # Handle image upload if provided
        if image_file:
            # Ensure the 'static/images' directory exists
            os.makedirs("static/images", exist_ok=True)
            file_location = os.path.join("static/images", image_file.filename)
            saved_path = await save_upload_file(image_file, file_location)
            product_dict['image_url'] = saved_path  # Store the file path

        collection = await mongo.get_product_collection()
        result = await collection.insert_one(product_dict)
        created_product = await collection.find_one({"_id": result.inserted_id})
        
        return Product(**mongo.serialize_mongo_doc(created_product))
    except ValidationError as ve:
        logger.error(f"Validation error creating product: {ve}")
        logger.error(f"Validation error details: {str(ve)}")
        raise HTTPException(status_code=422, detail=f"Validation error: {str(ve)}")
    except Exception as e:
        logger.error(f"Failed to create product: {e}")
        logger.error(f"Exception details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create product: {str(e)}")


@router.get("/products/{product_id}", response_model=Product)
async def get_product(
    product_id: str,
    current_user: Dict = Depends(get_current_active_customer)
):
    """Retrieves a product by its ID."""
    collection = await mongo.get_product_collection()
    try:
        # MULTI-TENANCY: Use authenticated user's ID
        user_id = current_user["id"]
        
        if not ObjectId.is_valid(product_id):
            product = await collection.find_one({"id": product_id})
        else:
            product = await collection.find_one({"_id": ObjectId(product_id)})
            
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
            
        return Product(**mongo.serialize_mongo_doc(product))
    except ValidationError as ve:
        logger.error(f"Validation error retrieving product {product_id}: {ve}")
        
        # Try to fix stock information format
        try:
            # Manually fix problematic fields
            serialized = mongo.serialize_mongo_doc(product)
            
            # Fix stock_information.availability if it's a string
            if 'stock_information' in serialized and isinstance(serialized['stock_information'], dict):
                if 'availability' in serialized['stock_information'] and isinstance(serialized['stock_information']['availability'], str):
                    # Keep it as is - the model now accepts strings
                    pass
            
            return Product(**serialized)
        except Exception as conversion_error:
            logger.error(f"Failed to convert product {product_id}: {conversion_error}")
            raise HTTPException(
                status_code=422, 
                detail=f"Product data validation error: {str(ve)}"
            )
    except Exception as e:
        logger.error(f"Error retrieving product {product_id}: {e}")
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
    current_user: Dict = Depends(get_current_active_customer)
):
    """Lists all products with pagination and filtering."""
    collection = await mongo.get_product_collection()
    
    # MULTI-TENANCY: Use authenticated user's ID
    user_id = current_user["id"]
    
    # Build the filter
    filter_query = {
        "user_id": user_id
    }
    
    if search:
        # Add text search
        filter_query["$or"] = [
            {"product_name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"features": {"$elemMatch": {"$regex": search, "$options": "i"}}},
            {"keywords": {"$elemMatch": {"$regex": search, "$options": "i"}}}
        ]
    
    if category:
        filter_query["category"] = {"$regex": f"^{category}$", "$options": "i"}
    
    if business_type:
        filter_query["business_type"] = {"$regex": f"^{business_type}$", "$options": "i"}
    
    # Add price filtering if provided
    if min_price is not None or max_price is not None:
        price_filter = {}
        
        if min_price is not None:
            price_filter["$gte"] = min_price
        
        if max_price is not None:
            price_filter["$lte"] = max_price
        
        # This is a simplification - in reality we'd need to check different price types
        filter_query["$or"] = filter_query.get("$or", []) + [
            {"pricing.one_time": price_filter},
            {"pricing.monthly": price_filter},
            {"pricing.annual": price_filter}
        ]
    
    try:
        # Get the products with pagination
        products = await collection.find(filter_query).skip(skip).limit(limit).to_list(length=limit)
        
        # Process products with error handling
        result = []
        for product in products:
            try:
                serialized = mongo.serialize_mongo_doc(product)
                product_obj = Product(**serialized)
                result.append(product_obj)
            except ValidationError as ve:
                logger.warning(f"Validation error for product {product.get('_id')}: {ve}")
                
                # Try to create a basic product to include anyway
                try:
                    # Fix stock_information.availability if it's a string
                    if 'stock_information' in serialized and isinstance(serialized['stock_information'], dict):
                        if 'availability' in serialized['stock_information'] and isinstance(serialized['stock_information']['availability'], str):
                            # Keep it as is - the model now accepts strings
                            pass
                        
                    product_obj = Product(**serialized)
                    result.append(product_obj)
                except Exception:
                    # Skip this product if we can't fix it
                    logger.error(f"Skipping invalid product {product.get('_id')}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error listing products: {e}")
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
    current_user: Dict = Depends(get_current_active_customer)
):
    """Updates an existing product."""
    logger.debug(f"Update Product Endpoint - product_id: {product_id}")
    
    collection = await mongo.get_product_collection()
    
    # MULTI-TENANCY: Use authenticated user's ID
    user_id = current_user["id"]
    
    # Check if product exists
    existing_product = None
    if ObjectId.is_valid(product_id):
        existing_product = await collection.find_one({"_id": ObjectId(product_id)})
    
    if not existing_product:
        existing_product = await collection.find_one({"id": product_id})
        
    if not existing_product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Prepare update data
    update_data = {}
    
    # Add fields if provided
    if product_name is not None:
        update_data["product_name"] = product_name
    if description is not None:
        update_data["description"] = description
    if category is not None:
        update_data["category"] = category
    if business_type is not None:
        update_data["business_type"] = business_type
    if features is not None:
        update_data["features"] = features
    if target_audience is not None:
        update_data["target_audience"] = target_audience
    if keywords is not None:
        update_data["keywords"] = keywords
    if url is not None:
        update_data["url"] = url
    if admin_priority is not None:
        update_data["admin_priority"] = admin_priority

    # Handle pricing update
    pricing_update = {}
    if one_time_price is not None:
        pricing_update["one_time"] = str(one_time_price)
    if monthly_price is not None:
        pricing_update["monthly"] = str(monthly_price)
    if annual_price is not None:
        pricing_update["annual"] = str(annual_price)
    if currency is not None:
        pricing_update["currency"] = currency

    if pricing_update:
        update_data["pricing"] = pricing_update

    # Handle image upload if provided
    if image_file:
        try:
            # Ensure directory exists
            os.makedirs("static/images", exist_ok=True)
            file_location = os.path.join("static/images", image_file.filename)
            await save_upload_file(image_file, file_location)
            update_data['image_url'] = file_location
        except Exception as e:
            logger.error(f"Error saving image: {e}")
            raise HTTPException(status_code=500, detail=f"Error saving image: {str(e)}")

    # Update timestamp
    update_data["updated_at"] = datetime.utcnow()

    try:
        # Update the product
        if "_id" in existing_product:
            await collection.update_one({"_id": existing_product["_id"]}, {"$set": update_data})
            updated_product = await collection.find_one({"_id": existing_product["_id"]})
        else:
            await collection.update_one({"id": product_id}, {"$set": update_data})
            updated_product = await collection.find_one({"id": product_id})
            
        # Return updated product
        return Product(**mongo.serialize_mongo_doc(updated_product))
    except ValidationError as ve:
        logger.error(f"Validation error updating product {product_id}: {ve}")
        raise HTTPException(
            status_code=422, 
            detail=f"Product data validation error: {str(ve)}"
        )
    except Exception as e:
        logger.error(f"Error updating product {product_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating product: {str(e)}")


@router.put("/products/{product_id}/json", response_model=Product)
async def update_product_json(
    product_id: str,
    product_data: dict,
):
    """Updates an existing product using JSON data."""
    logger.debug(f"Update Product JSON Endpoint - product_id: {product_id}")
    
    collection = await mongo.get_product_collection()
    
    # Check if product exists
    existing_product = None
    if ObjectId.is_valid(product_id):
        existing_product = await collection.find_one({"_id": ObjectId(product_id)})
    
    if not existing_product:
        existing_product = await collection.find_one({"id": product_id})
        
    if not existing_product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Validate the product data
    try:
        # Prepare update data from the provided JSON
        update_data = {}
        
        # Map fields from the JSON data
        for field in ["product_name", "description", "category", "business_type", 
                      "features", "target_audience", "keywords", "url", "admin_priority"]:
            if field in product_data:
                update_data[field] = product_data[field]
        
        # Handle pricing separately
        if "pricing" in product_data:
            pricing = product_data["pricing"]
            update_data["pricing"] = {}
            
            if "one_time" in pricing:
                update_data["pricing"]["one_time"] = str(pricing["one_time"])
            if "monthly" in pricing:
                update_data["pricing"]["monthly"] = str(pricing["monthly"])
            if "annual" in pricing:
                update_data["pricing"]["annual"] = str(pricing["annual"])
            if "currency" in pricing:
                update_data["pricing"]["currency"] = pricing["currency"]
        
        # Update timestamp
        update_data["updated_at"] = datetime.utcnow()
        
        # Update the product
        if "_id" in existing_product:
            await collection.update_one({"_id": existing_product["_id"]}, {"$set": update_data})
            updated_product = await collection.find_one({"_id": existing_product["_id"]})
        else:
            await collection.update_one({"id": product_id}, {"$set": update_data})
            updated_product = await collection.find_one({"id": product_id})
            
        # Return updated product
        return Product(**mongo.serialize_mongo_doc(updated_product))
    except ValidationError as ve:
        logger.error(f"Validation error updating product {product_id}: {ve}")
        raise HTTPException(
            status_code=422, 
            detail=f"Product data validation error: {str(ve)}"
        )
    except Exception as e:
        logger.error(f"Error updating product {product_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating product: {str(e)}")


@router.delete("/products/{product_id}", status_code=204)
async def delete_product(
    product_id: str,
    current_user: Dict = Depends(get_current_active_customer)
):
    """Deletes a product by its ID."""
    collection = await mongo.get_product_collection()
    try:
        # MULTI-TENANCY: Use authenticated user's ID
        user_id = current_user["id"]
        
        deleted = False
        
        # Try with ObjectId
        if ObjectId.is_valid(product_id):
            result = await collection.delete_one({"_id": ObjectId(product_id)})
            deleted = result.deleted_count > 0
            
        # Try with string ID if not found
        if not deleted:
            result = await collection.delete_one({"id": product_id})
            deleted = result.deleted_count > 0
            
        if not deleted:
            raise HTTPException(status_code=404, detail="Product not found")
            
    except Exception as e:
        logger.error(f"Error deleting product {product_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting product: {str(e)}")


@router.put("/products/{product_id}/upload-image", response_model=Product)
async def upload_product_image(
    product_id: str,
    image_file: UploadFile = File(...),
):
    """Upload or update a product image."""
    logger.debug(f"Upload Product Image Endpoint - product_id: {product_id}")
    
    collection = await mongo.get_product_collection()
    
    # Check if product exists
    existing_product = None
    if ObjectId.is_valid(product_id):
        existing_product = await collection.find_one({"_id": ObjectId(product_id)})
    
    if not existing_product:
        existing_product = await collection.find_one({"id": product_id})
        
    if not existing_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    try:
        # Ensure directory exists
        os.makedirs("static/images", exist_ok=True)
        file_location = os.path.join("static/images", image_file.filename)
        await save_upload_file(image_file, file_location)
        
        # Update image_url in the database
        update_data = {
            "image_url": file_location,
            "updated_at": datetime.utcnow()
        }
        
        # Update the product
        if "_id" in existing_product:
            await collection.update_one({"_id": existing_product["_id"]}, {"$set": update_data})
            updated_product = await collection.find_one({"_id": existing_product["_id"]})
        else:
            await collection.update_one({"id": product_id}, {"$set": update_data})
            updated_product = await collection.find_one({"id": product_id})
            
        # Return updated product
        return Product(**mongo.serialize_mongo_doc(updated_product))
    except Exception as e:
        logger.error(f"Error uploading image for product {product_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading image: {str(e)}")