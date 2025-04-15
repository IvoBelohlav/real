"""
Enhanced AI Service with a hybrid approach that provides:
1. Core E-commerce functionality (tenant isolation, product filtering, database integration)
2. Business-specific logic (product scoring, recommendations, pricing)
3. Streamlined AI interactions for intent/entity recognition and natural language responses

This refactored service follows a hybrid architecture that:
- Keeps the critical infrastructure (database, tenant management, caching)
- Simplifies the AI interaction layer
- Delegates NLP tasks to Gemini while keeping business-specific processing in code
- Focuses on multi-tenancy and proper data delivery to the frontend
"""

import os
import json
import re
import math
from typing import Dict, List, Optional, Any, Tuple
from bson import ObjectId
import google.generativeai as genai
import asyncio
from datetime import datetime
from app.utils.logging_config import get_module_logger
from app.services.knowledge_base import KnowledgeBase
from app.utils.context import EnhancedConversationContext
from app.utils.mongo import get_shop_info

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configure Gemini API 
gemini_api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=gemini_api_key)

# Constants for model selection and retries
MAX_RETRIES = 3
RETRY_DELAY_BASE = 2  # seconds
MAX_RETRY_DELAY = 10  # seconds
MODEL_CASCADE = [
    {'name': 'gemini-2.0-flash-lite', 'desc': 'Gemini 2.0 Flash-Lite model'},
    {'name': 'gemini-1.5-pro', 'desc': 'Gemini 1.5 Pro model (paid tier)'},
    {'name': 'gemini-1.0-pro', 'desc': 'Gemini 1.0 Pro model (paid tier)'}
]

logger = get_module_logger(__name__)

# Custom JSON encoder to handle datetime objects
class EnhancedJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle datetime objects, ObjectId, and infinity values."""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, ObjectId):
            return str(obj)
        # Handle infinity and NaN values
        if isinstance(obj, float):
            if math.isinf(obj):
                return 999999999 if obj > 0 else -999999999
            if math.isnan(obj):
                return None
        return super().default(obj)

def json_safe_dumps(obj):
    """Convert object to JSON string with datetime and infinity handling."""
    return json.dumps(obj, cls=EnhancedJSONEncoder, ensure_ascii=False)

class AIService:
    """
    Enhanced AI service with a hybrid architecture that balances:
    - Business-specific E-commerce logic (product scoring, tenant isolation, caching)
    - Simplified AI integration with Gemini for intent/entity recognition and response generation
    - Multi-tenant data management with proper product formatting for frontend display
    """
    
    def __init__(self, knowledge_base: KnowledgeBase):
        self.knowledge_base = knowledge_base
        self.logger = logger
        self.system_prompts = {}  # Dynamically loaded shop-specific prompts
    
    async def _get_system_prompt(self, language: str = "cs") -> str:
        """
        Get the system prompt for the specified language, dynamically constructed using 
        shop information from the database to personalize the AI behavior.
        
        Args:
            language: Language code (default: "cs" for Czech)
            
        Returns:
            System prompt for AI
        """
        # Check if we already have this prompt loaded
        if language in self.system_prompts:
            return self.system_prompts[language]
            
        # Otherwise, fetch shop info and construct the prompt
        try:
            shop_info = await get_shop_info(language)
            
            if language == "cs":
                prompt = f"""{shop_info['ai_prompt_summary']}

Základní informace:
- Jmenujeme se {shop_info['shop_name']}
- Byli jsme založeni v roce {shop_info['founded_year']}
- Naše webové stránky jsou na {shop_info['website']}
- Kontaktovat nás můžete na {shop_info['primary_email']} nebo telefonicky na {shop_info['primary_phone']}
"""

                # Add services if available
                if shop_info.get('services'):
                    prompt += "\nNaše služby:\n"
                    for service in shop_info['services']:
                        prompt += f"- {service}\n"

                # Add AI facts if available
                if shop_info.get('ai_faq_facts'):
                    prompt += "\nDůležitá fakta:\n"
                    for fact in shop_info['ai_faq_facts']:
                        prompt += f"- {fact}\n"

                # Add voice style if available
                if shop_info.get('ai_voice_style'):
                    prompt += f"\nTón komunikace: {shop_info['ai_voice_style']}\n"
                
                prompt += """
Tvé schopnosti:
- Doporučuješ produkty na základě potřeb zákazníka  
- Porovnáváš výhody a nevýhody různých možností
- Vysvětluješ technické parametry srozumitelným způsobem
- Doporučuješ kompatibilní příslušenství a související služby
- Pomáháš s orientací v e-shopu
- Odpovídáš na otázky o dopravě, platbách, reklamacích a doplňkových službách

Buď vždy přátelský, profesionální a užitečný. Snaž se porozumět skutečným potřebám zákazníka.
Odpovídej stručně a přímo, vždy česky. Pro údaje, které neznáš, upřímně přiznej neznalost.
"""
            else:  # English or other languages
                prompt = f"""{shop_info.get('ai_prompt_summary', f"We are {shop_info['shop_name']}, founded in {shop_info['founded_year']}.")}

Basic information:
- Our name is {shop_info['shop_name']}
- We were founded in {shop_info['founded_year']}
- Our website is at {shop_info['website']}
- You can contact us at {shop_info['primary_email']} or by phone at {shop_info['primary_phone']}
"""

                # Add services if available
                if shop_info.get('services'):
                    prompt += "\nOur services:\n"
                    for service in shop_info['services']:
                        prompt += f"- {service}\n"

                # Add AI facts if available
                if shop_info.get('ai_faq_facts'):
                    prompt += "\nImportant facts:\n"
                    for fact in shop_info['ai_faq_facts']:
                        prompt += f"- {fact}\n"

                # Add voice style if available
                if shop_info.get('ai_voice_style'):
                    prompt += f"\nCommunication style: {shop_info['ai_voice_style']}\n"
                
                prompt += """
Your capabilities:
- Recommend products based on customer needs
- Compare pros and cons of different options
- Explain technical specifications in an accessible way
- Recommend compatible accessories and related services
- Help customers navigate the online store
- Answer questions about shipping, payment methods, refunds, and complementary services

Always be friendly, professional, and helpful. Try to understand the customer's real needs.
Respond concisely and directly. For information you don't know, honestly admit your lack of knowledge.
"""
            
            # Cache the prompt for future use
            self.system_prompts[language] = prompt
            return prompt
            
        except Exception as e:
            self.logger.error(f"Error loading shop info for prompt: {str(e)}")
            
            # Fall back to hardcoded prompts if shop info can't be loaded
            if language == "cs":
                fallback = """Jsme DvojkavIT, nová generace digitálních tvůrců, která vznikla v roce 2024. Spojuje nás vášeň pro online svět a touha dělat věci jinak, lépe. Jako stratégové a vizionáři vytváříme inovativní digitální řešení, která vám pomohou dosáhnout vašich online cílů. Odpovídáme stručně a výstižně, maximálně ve 100 slovech."""
            else:
                fallback = """You are a concise and direct shopping assistant. Answer in a maximum of 60 words."""
                
            self.system_prompts[language] = fallback
            return fallback

    async def extract_entities_with_gemini(self, query: str, context: Optional[EnhancedConversationContext], language: str = "cs") -> Dict[str, Any]:
        """
        Analyze query using Gemini to extract intent and entities.
        This is a streamlined approach where Gemini handles the NLP tasks directly.
        
        Args:
            query: The user's query text
            context: Optional conversation context
            language: Language code (default: "cs" for Czech)
            
        Returns:
            Dictionary with extracted intent and entities, or a fallback structure on error.
            Example: {"intent": "product_recommendation", "entities": {"products": ["kolo"], "price_range": {"min": 5000}}}
        """
        self.logger.info(f"Extracting entities from query: '{query}' in language: {language}")
        
        # Prepare context data for the analysis
        context_data = {}
        if context:
            context_data = {
                "previous_queries": context.previous_queries[-3:] if context.previous_queries else [],
                "previous_intents": context.previous_intents[-3:] if context.previous_intents else [],
                "category": context.category,
                "budget_range": context.budget_range,
                "required_features": context.required_features,
                "attributes": context.attributes
            }

        system_prompt = await self._get_system_prompt(language)
        
        # Define possible intents and entities for the prompt
        possible_intents = ["product_recommendation", "product_comparison", "technical_explanation", "accessory_recommendation", "store_navigation", "shipping_payment", "customer_service", "order_status", "general_question"]
        entity_structure = """
        {
            "products": ["<product name>", ...],
            "categories": ["<category name>", ...],
            "features": ["<feature name>", ...],
            "brands": ["<brand name>", ...],
            "price_range": {"min": <number or null>, "max": <number or null>},
            "comparison": <boolean>,
            "accessories": ["<accessory name>", ...],
            "service_requests": ["<service type>", ...],
            "order_number": "<order number or null>",
            "email": "<email address or null>"
        }
        """

        analysis_instructions = f"""
Analyze the user query considering the conversation context. Identify the primary user intent and extract relevant entities. 
**CRITICAL:** Queries asking generally about products, inventory, or what the shop sells (e.g., "jaké máte produkty?", "what products do you have?", "show me bikes", "do you sell accessories?", "ukaž mi zboží") MUST be classified with the intent 'product_recommendation', even if no specific product name or category is mentioned. Do NOT classify these as 'general_question'.

Possible Intents: {', '.join(possible_intents)}
Entity Structure to Extract: {entity_structure}

User query: "{query}"
Conversation context: {json_safe_dumps(context_data)}

Return ONLY the JSON object containing the 'intent' and 'entities'.
""" if language == "cs" else f"""
Analyze the user query considering the conversation context. Identify the primary user intent and extract relevant entities.

Possible Intents: {', '.join(possible_intents)}
Entity Structure to Extract: {entity_structure}

User query: "{query}"
Conversation context: {json_safe_dumps(context_data)}

Return ONLY the JSON object containing the 'intent' and 'entities'.
"""

        full_prompt = f"{system_prompt}\n\n{analysis_instructions}"
        generation_config = {
            "temperature": 0.1, # Low temperature for factual extraction
            "max_output_tokens": 512,
            "top_p": 0.95,
            "top_k": 40,
            "response_mime_type": "application/json", # Request JSON output directly if supported
        }

    async def extract_entities_with_gemini(self, query: str, context: Optional[EnhancedConversationContext], language: str = "cs") -> Dict[str, Any]:
        """
        Analyze query using Gemini to extract intent and entities.
        
        Args:
            query: The user's query text
            context: Optional conversation context
            language: Language code (default: "cs" for Czech)
            
        Returns:
            Dictionary with extracted intent and entities, or a fallback structure on error.
            Example: {"intent": "product_recommendation", "entities": {"products": ["kolo"], "price_range": {"min": 5000}}}
        """
        self.logger.info(f"Extracting entities from query: '{query}' in language: {language}")
        
        # Prepare context data for the analysis
        context_data = {}
        if context:
            context_data = {
                "previous_queries": context.previous_queries[-3:] if context.previous_queries else [],
                "previous_intents": context.previous_intents[-3:] if context.previous_intents else [],
                "category": context.category,
                "budget_range": context.budget_range,
                "required_features": context.required_features,
                "attributes": context.attributes
            }

        system_prompt = await self._get_system_prompt(language)
        
        # Define possible intents and entities for the prompt
        possible_intents = ["product_recommendation", "product_comparison", "technical_explanation", "accessory_recommendation", "store_navigation", "shipping_payment", "customer_service", "order_status", "general_question"]
        entity_structure = """
        {
            "products": ["<product name>", ...],
            "categories": ["<category name>", ...],
            "features": ["<feature name>", ...],
            "brands": ["<brand name>", ...],
            "price_range": {"min": <number or null>, "max": <number or null>},
            "comparison": <boolean>,
            "accessories": ["<accessory name>", ...],
            "service_requests": ["<service type>", ...],
            "order_number": "<order number or null>",
            "email": "<email address or null>"
        }
        """

        analysis_instructions = f"""
Analyze the user query considering the conversation context. Identify the primary user intent and extract relevant entities. 
**CRITICAL:** Queries asking generally about products, inventory, or what the shop sells (e.g., "jaké máte produkty?", "what products do you have?", "show me bikes", "do you sell accessories?", "ukaž mi zboží") MUST be classified with the intent 'product_recommendation', even if no specific product name or category is mentioned. Do NOT classify these as 'general_question'.

Possible Intents: {', '.join(possible_intents)}
Entity Structure to Extract: {entity_structure}

User query: "{query}"
Conversation context: {json_safe_dumps(context_data)}

Return ONLY the JSON object containing the 'intent' and 'entities'.
""" if language == "cs" else f"""
Analyze the user query considering the conversation context. Identify the primary user intent and extract relevant entities.

Possible Intents: {', '.join(possible_intents)}
Entity Structure to Extract: {entity_structure}

User query: "{query}"
Conversation context: {json_safe_dumps(context_data)}

Return ONLY the JSON object containing the 'intent' and 'entities'.
"""

        full_prompt = f"{system_prompt}\n\n{analysis_instructions}"
        generation_config = {
            "temperature": 0.1, # Low temperature for factual extraction
            "max_output_tokens": 512,
            "top_p": 0.95,
            "top_k": 40,
            "response_mime_type": "application/json", # Request JSON output directly if supported
        }

        # Default fallback structure
        fallback_analysis = {
            "intent": "general_question",
            "entities": {
                "products": [], "categories": [], "features": [], "brands": [],
                "price_range": {"min": None, "max": None}, "comparison": False,
                "accessories": [], "service_requests": [], "order_number": None, "email": None
            },
            "confidence": 0.0 # Indicate low confidence for fallback
        }

        response = None
        retry_count = 0
        last_error = None

        while response is None and retry_count <= MAX_RETRIES:
            try:
                model_info = MODEL_CASCADE[min(retry_count, len(MODEL_CASCADE) - 1)]
                self.logger.info(f"Entity Extraction Try #{retry_count+1} with {model_info['desc']}")
                model = genai.GenerativeModel(model_info['name'])
                
                response = await asyncio.to_thread(
                    model.generate_content,
                    full_prompt,
                    generation_config=generation_config
                )
                
                # Check if response has text part
                if response and hasattr(response, 'text') and response.text:
                    result_text = response.text.strip()
                    try:
                        # Try to parse the JSON response
                        parsed_json = json.loads(result_text)
                        # Basic validation
                        if "intent" in parsed_json and "entities" in parsed_json:
                             # Add confidence score based on successful parsing
                            parsed_json["confidence"] = 0.85 # High confidence for successful AI extraction
                            self.logger.debug(f"Successfully extracted entities: {parsed_json}")
                            return parsed_json
                        else:
                             self.logger.warning(f"Extracted JSON missing required keys: {result_text}")
                             # Fall through to retry or fallback
                    except json.JSONDecodeError:
                        self.logger.warning(f"Failed to parse JSON response for entity extraction: {result_text}")
                        # Fall through to retry or fallback
                else:
                    self.logger.warning(f"Received empty or invalid response from Gemini API (Attempt {retry_count+1})")

            except Exception as e:
                last_error = e
                self.logger.warning(f"Gemini API call failed (attempt {retry_count+1}): {str(e)}")
            
            # Increment retry count and delay
            retry_count += 1
            if retry_count <= MAX_RETRIES:
                delay = min(RETRY_DELAY_BASE * (2 ** (retry_count - 1)), MAX_RETRY_DELAY)
                await asyncio.sleep(delay)

        # If all retries fail
        self.logger.error(f"All Gemini API attempts failed for entity extraction. Last error: {last_error}. Using fallback.")
        return fallback_analysis


    async def generate_response_with_gemini(self, query: str, analysis: Dict[str, Any], relevant_data: List[Dict], context: Optional[EnhancedConversationContext], language: str = "cs") -> str:
        """
        Generate a natural language response using Gemini based on the query, analysis, and retrieved data.
        
        Args:
            query: The original user query.
            analysis: The result from extract_entities_with_gemini.
            relevant_data: List of processed data items (e.g., formatted products) retrieved from KnowledgeBase.
            context: Optional conversation context.
            language: Language code.
            
        Returns:
            The generated natural language response string.
        """
        self.logger.info(f"Generating response for query: '{query}' with intent: {analysis.get('intent')}")

        system_prompt = await self._get_system_prompt(language)
        
        # Prepare context data
        context_data = {}
        if context:
            context_data = {
                "previous_queries": context.previous_queries[-3:] if context.previous_queries else [],
                "previous_intents": context.previous_intents[-3:] if context.previous_intents else [],
                "category": context.category,
                "budget_range": context.budget_range,
                "required_features": context.required_features,
                "attributes": context.attributes
            }

        # Prepare relevant data string
        relevant_data_str = "No specific data found."
        if relevant_data:
            relevant_data_str = f"Found the following relevant information:\n{json_safe_dumps(relevant_data)}"

        response_instructions = f"""
Based on the user's query, the conversation context, and the relevant data found, generate a helpful and natural response in {language}.

User Query: "{query}"
Identified Intent: {analysis.get('intent', 'N/A')}
Extracted Entities: {json_safe_dumps(analysis.get('entities', {}))}
Conversation Context: {json_safe_dumps(context_data)}
Relevant Data Found:
{relevant_data_str}

Instructions:
- Address the user's query directly.
- Incorporate the relevant data naturally into the response.
- Maintain a {language} language and a friendly, professional tone ({system_prompt}).
- Keep the response concise and to the point.
- If relevant data was found, base your response primarily on that data.
- If no relevant data was found, provide a helpful general response or ask clarifying questions.
- Optionally, suggest one relevant follow-up question the user might have.
"""

        full_prompt = f"{system_prompt}\n\n{response_instructions}"
        generation_config = {
            "temperature": 0.6, # Slightly higher temperature for more natural language
            "max_output_tokens": 1024,
            "top_p": 0.95,
            "top_k": 40
        }

        # Fallback response
        fallback_responses = {
            "cs": "Omlouvám se, ale momentálně nemohu odpovědět na váš dotaz. Zkuste to prosím později nebo položte otázku jiným způsobem.",
            "en": "I apologize, but I cannot answer your query at the moment. Please try again later or rephrase your question."
        }
        fallback_reply = fallback_responses.get(language, fallback_responses["cs"])

        response = None
        retry_count = 0
        last_error = None

        while response is None and retry_count <= MAX_RETRIES:
            try:
                model_info = MODEL_CASCADE[min(retry_count, len(MODEL_CASCADE) - 1)]
                self.logger.info(f"Response Generation Try #{retry_count+1} with {model_info['desc']}")
                model = genai.GenerativeModel(model_info['name'])
                
                response = await asyncio.to_thread(
                    model.generate_content,
                    full_prompt,
                    generation_config=generation_config
                )

                if response and hasattr(response, 'text') and response.text:
                    self.logger.debug(f"Successfully generated response: {response.text.strip()}")
                    return response.text.strip()
                else:
                    self.logger.warning(f"Received empty or invalid response from Gemini API for response generation (Attempt {retry_count+1})")

            except Exception as e:
                last_error = e
                self.logger.warning(f"Gemini API call failed during response generation (attempt {retry_count+1}): {str(e)}")

            # Increment retry count and delay
            retry_count += 1
            if retry_count <= MAX_RETRIES:
                delay = min(RETRY_DELAY_BASE * (2 ** (retry_count - 1)), MAX_RETRY_DELAY)
                await asyncio.sleep(delay)

        # If all retries fail
        self.logger.error(f"All Gemini API attempts failed for response generation. Last error: {last_error}. Using fallback response.")
        return fallback_reply
        
    def _create_fallback_analysis(self, query: str, context: Optional[EnhancedConversationContext] = None) -> Dict[str, Any]:
        """
        DEPRECATED - Use extract_entities_with_gemini fallback instead.
        Create a simple rule-based analysis when AI-based analysis fails.
        
        Args:
            query: The user's query text
            context: Optional conversation context
            
        Returns:
            Basic analysis result
        """
        # Create a basic analysis with simple rule-based intent detection
        intent = "general_question"
        query_lower = query.lower()
        
        # Simple keyword-based intent detection
        for intent_type, keywords in self.intent_categories.items():
            for keyword in keywords:
                if keyword in query_lower:
                    intent = intent_type
                    break
            if intent != "general_question":
                break
        
        # Extract any context from previous conversation
        entities = {
            "products": [],
            "categories": [],
            "features": [],
            "brands": [],
            "price_range": {"min": None, "max": None},
            "comparison": False,
            "accessories": [],
            "service_requests": []
        }
        
        # Add any category from context
        if context and context.category:
            entities["categories"].append(context.category)
        
        # Add any features from context
        if context and context.required_features:
            entities["features"].extend(context.required_features)
        
        # Add price range from context
        if context and context.budget_range:
            entities["price_range"] = context.budget_range
        
        return {
            "intent": intent,
            "entities": entities,
            "confidence": 0.5,  # Medium confidence for rule-based detection
            "query_type": "general_question" if intent == "general_question" else intent,
            "sentiment": "neutral",
            "priority": "medium",
            "requires_followup": True,  # More likely to need followup with rule-based analysis
            "suggested_products": []
        }
    
    async def analyze_query(self, 
                         query: str, 
                         language: str = "cs",
                         context: Optional[EnhancedConversationContext] = None
                        ) -> Dict[str, Any]:
        """
        Analyze user query to determine intent, entities, and more.
        
        Args:
            query: The user's query text
            language: Language code (default: "cs" for Czech)
            context: Optional conversation context
            
        Returns:
            Enhanced analysis result
        """
        # Check for references that might indicate an accessory query with context
        has_deictic_reference = False
        deictic_terms = ["tento", "toto", "to", "tomuto", "tohoto", "this", "it", "that"]
        
        for term in deictic_terms:
            if term in query.lower().split():
                has_deictic_reference = True
                break
        
        # Check if there might be an accessory question
        accessory_terms = ["příslušenství", "doplňky", "accessories", "add-ons", "dokoupit", "také potřebuji", "k tomu"]
        has_accessory_terms = any(term in query.lower() for term in accessory_terms)
        
        # Enhance the context detection for accessory recommendations
        if (has_deictic_reference and has_accessory_terms) or \
           (has_deictic_reference and context and context.attributes and "product_references" in context.attributes):
            # Pre-bias the analysis to be more likely accessory-related
            pre_analysis = {
                "intent": "accessory_recommendation",
                "entities": {
                    "products": [],
                    "categories": [],
                    "features": [],
                    "brands": [],
                    "price_range": {"min": None, "max": None},
                    "comparison": False,
                    "accessories": [],
                    "service_requests": []
                },
                "query_type": "recommendation_request",
                "confidence": 0.7
            }
            
            # If there are product references in context, add them to the analysis
            if context and context.attributes and "product_references" in context.attributes:
                pre_analysis["entities"]["products"] = context.attributes["product_references"]
            
            if context and context.category:
                pre_analysis["entities"]["categories"] = [context.category]
            
            # Only use AI for final analysis if we don't have strong deictic references
            if not (has_deictic_reference and len(pre_analysis["entities"]["products"]) > 0):
                try:
                    # Proceed with full AI analysis
                    ai_analysis = await self._enhanced_analysis(query, language, context)
                    
                    # If the AI is uncertain but we have deictic references, bias toward accessory recommendation
                    if ai_analysis["intent"] == "general_question" and has_deictic_reference and has_accessory_terms:
                        ai_analysis["intent"] = "accessory_recommendation"
                        
                    return ai_analysis
                except Exception as e:
                    self.logger.error(f"Error in AI analysis: {str(e)}, using pre-analysis")
                    return pre_analysis
            else:
                # We have strong contextual signals, use the pre-analysis
                return pre_analysis
        
        # Default flow - use enhanced analysis
        try:
            return await self._enhanced_analysis(query, language, context)
        except Exception as e:
            self.logger.error(f"Error in enhanced query analysis: {str(e)}")
            # Return a fallback analysis
            return self._create_fallback_analysis(query, context)

    async def _enhanced_analysis(self, query: str, language: str = "cs", context: Optional[EnhancedConversationContext] = None) -> Dict[str, Any]:
        """
        Perform enhanced analysis of user query using Gemini API.
        
        Args:
            query: The user's query text
            language: Language code (default: "cs" for Czech)
            context: Optional conversation context
            
        Returns:
            Enhanced analysis result
        """
        try:
            self.logger.info(f"Analyzing query: '{query}' in language: {language}")
            
            # Prepare context data for the analysis
            context_data = {}
            if context:
                context_data = {
                    "previous_queries": context.previous_queries[-3:] if context.previous_queries else [],
                    "previous_intents": context.previous_intents[-3:] if context.previous_intents else [],
                    "category": context.category,
                    "budget_range": context.budget_range,
                    "required_features": context.required_features,
                    "attributes": context.attributes  # Include all attributes for richer context
                }
            
            # Get the system prompt
            system_prompt = await self._get_system_prompt(language)
            
            # Expanded analysis instructions for better intent detection
            analysis_instructions = f"""
Proveď hloubkovou analýzu dotazu zákazníka a vrať strukturované informace v JSON formátu.
Extrahuj následující části:

1. Hlavní záměr uživatele (intent) - detailnější než dříve
2. Entity včetně produktů, kategorií, cen, vlastností, značek a preferencí
3. Úroveň jistoty analýzy (confidence)
4. Typ dotazu s rozšířenou kategorizací
5. Sentiment (pozitivní, neutrální, negativní)
6. Prioritu požadavku (vysoká, střední, nízká)

Dotaz uživatele: "{query}"

Kontext konverzace: {json_safe_dumps(context_data)}

Vrať výsledek v přesném JSON formátu:
{{
  "intent": "<intent>",
  "entities": {{
    "products": [],
    "categories": [],
    "features": [],
    "brands": [],
    "price_range": {{"min": null, "max": null}},
    "comparison": false,
    "accessories": [],
    "service_requests": []
  }},
  "confidence": 0.0,
  "query_type": "<type>",
  "sentiment": "<sentiment>",
  "priority": "<priority>",
  "requires_followup": false
}}

Možné hodnoty intent: product_recommendation, product_comparison, technical_explanation, accessory_recommendation, store_navigation, shipping_payment, customer_service, general_question
Možné hodnoty query_type: direct_product, category_browse, comparison, feature_question, price_question, recommendation_request, support_request, navigation_assistance
""" if language == "cs" else """
Perform an in-depth analysis of the customer query and return structured information in JSON format.
Extract the following parts:

1. The main user intent - more detailed than before
2. Entities including products, categories, prices, features, brands, and preferences
3. Confidence level of the analysis
4. Query type with expanded categorization
5. Sentiment (positive, neutral, negative)
6. Request priority (high, medium, low)

User query: "{query}"

Conversation context: {json_safe_dumps(context_data)}

Return the result in exact JSON format:
{
  "intent": "<intent>",
  "entities": {
    "products": [],
    "categories": [],
    "features": [],
    "brands": [],
    "price_range": {"min": null, "max": null},
    "comparison": false,
    "accessories": [],
    "service_requests": []
  },
  "confidence": 0.0,
  "query_type": "<type>",
  "sentiment": "<sentiment>",
  "priority": "<priority>",
  "requires_followup": false
}

Possible intent values: product_recommendation, product_comparison, technical_explanation, accessory_recommendation, store_navigation, shipping_payment, customer_service, general_question
Possible query_type values: direct_product, category_browse, comparison, feature_question, price_question, recommendation_request, support_request, navigation_assistance
"""
            
            # Make API call for enhanced analysis using Gemini model with fallback and retry logic
            full_prompt = f"{system_prompt}\n\n{analysis_instructions}"
            generation_config = {
                "temperature": 0.2,  # Lower temperature for more consistent analysis
                "max_output_tokens": 1024,
                "top_p": 0.95,
                "top_k": 40
            }
            
            # Try with primary model first, with retries and fallbacks
            response = None
            retry_count = 0
            last_error = None
            
            # Additional logic for handling free model retries
            retry_for_free_model = retry_count < FREE_MODEL_MAX_RETRIES and retry_count > 0 and retry_count <= 2
            
            while response is None and (retry_count <= MAX_RETRIES or retry_for_free_model):
                try:
                    # For initial attempt and first few retries on the free model
                    if retry_count == 0 or retry_for_free_model:
                        model_info = MODEL_CASCADE[0]  # Always use the free model for these attempts
                        self.logger.info(f"Try #{retry_count+1} with {model_info['desc']}")
                        model = genai.GenerativeModel(model_info['name'])
                    # For later retries, use the cascade
                    elif retry_count < len(MODEL_CASCADE):
                        model_info = MODEL_CASCADE[retry_count]
                        self.logger.info(f"Trying with {model_info['desc']}")
                        model = genai.GenerativeModel(model_info['name'])
                    else:
                        # If we've gone through all models, use the last one with reduced parameters
                        model_info = MODEL_CASCADE[-1]
                        self.logger.info(f"Final retry with {model_info['desc']}")
                        model = genai.GenerativeModel(model_info['name'])
                        # Reduce token count for lighter load
                        generation_config["max_output_tokens"] = 512
                    
                    # For Gemini API
                    response = await asyncio.to_thread(
                        model.generate_content,
                        full_prompt,
                        generation_config=generation_config
                    )
                    
                except Exception as e:
                    last_error = e
                    retry_count += 1
                    
                    # Log the error with different levels based on retry count
                    if retry_count <= MAX_RETRIES:
                        self.logger.warning(f"API call failed (attempt {retry_count}): {str(e)}. Retrying...")
                        
                        # Implement exponential backoff
                        delay = min(RETRY_DELAY_BASE * (2 ** (retry_count - 1)), MAX_RETRY_DELAY)
                        await asyncio.sleep(delay)
                    else:
                        self.logger.error(f"All API call attempts failed: {str(e)}")
                        
                        # Create a simple fallback analysis result with rule-based intent detection
                        return self._create_fallback_analysis(query, context)
            
            # Parse the response
            result_text = response.text.strip()
            
            try:
                # Try to parse the JSON response
                result = json.loads(result_text)
            except json.JSONDecodeError:
                # If parsing fails, try to extract a JSON object from the text
                self.logger.warning(f"Failed to parse JSON response directly, attempting to extract JSON: {result_text}")
                json_pattern = r'({.*})'
                match = re.search(json_pattern, result_text, re.DOTALL)
                if match:
                    try:
                        result = json.loads(match.group(1))
                    except json.JSONDecodeError:
                        raise ValueError(f"Could not extract valid JSON from response: {result_text}")
                else:
                    raise ValueError(f"No JSON object found in response: {result_text}")
            
            # Perform additional analysis for better entity extraction
            if not result["entities"]["products"] and context and context.category:
                # Try to infer products from context and query
                supplemental_products = await self._infer_products_from_context(query, context)
                if supplemental_products:
                    result["entities"]["products"].extend(supplemental_products)
            
            self.logger.debug(f"Enhanced analysis result: {result}")
            return result
            
        except Exception as e:
            self.logger.error(f"Error in enhanced query analysis: {str(e)}")
            # Return a default analysis in case of error
            return {
                "intent": "general_question",
                "entities": {
                    "products": [],
                    "categories": [],
                    "features": [],
                    "brands": [],
                    "price_range": {"min": None, "max": None},
                    "comparison": False,
                    "accessories": [],
                    "service_requests": []
                },
                "confidence": 0.0,
                "query_type": "general_question",
                "sentiment": "neutral",
                "priority": "medium",
                "requires_followup": False
            }
    
    # --- Keep Helper Methods ---
    # Keep _score_products_for_recommendation, _compute_query_similarity, 
    # _extract_price_value, _format_price, _format_product_data
    # Keep _get_system_prompt

    async def _score_products_for_recommendation(self,
                                            products: List[Dict],
                                            entities: Dict[str, Any],
                                            context: Optional[EnhancedConversationContext] = None
                                           ) -> List[Dict]:
        """
        Score products for recommendation based on user preferences and requirements.
        (Keeping this logic as it's business-specific)
        
        Args:
            products: List of product dictionaries
            entities: Entities extracted from query
            context: Optional conversation context
            
        Returns:
            List of scored products with score components
        """
        scored_products = []
        
        for product in products:
            # Initialize score components
            score_components = {
                "feature_score": 0.0,
                "price_score": 0.0,
                "category_score": 0.0,
                "brand_score": 0.0,
                "semantic_score": 0.0, # This might be hard to calculate without deeper NLP
                "admin_priority_score": 0.0
            }
            
            # Feature matching
            required_features = entities.get("features", [])
            if context and context.required_features:
                required_features.extend(context.required_features)
            
            product_features = set(product.get("features", []))
            if required_features and product_features:
                # Use case-insensitive matching for features
                matching_features = [f for f in required_features if any(
                    feature.lower() in f.lower() or f.lower() in feature.lower() 
                    for feature in product_features
                )]
                if required_features: # Avoid division by zero
                    score_components["feature_score"] = len(matching_features) / len(required_features)
            
            # Price matching
            price_range = entities.get("price_range", {})
            if (not price_range or (price_range.get("min") is None and price_range.get("max") is None)) and context and context.budget_range:
                 price_range = context.budget_range # Use context budget if available and not in entities

            if price_range and (price_range.get("min") is not None or price_range.get("max") is not None):
                product_price = self._extract_price_value(product)
                if product_price is not None: # Check if price extraction was successful
                    min_price = price_range.get("min")
                    max_price = price_range.get("max")
                    
                    # Handle potential infinity values safely
                    if max_price is not None and math.isinf(max_price):
                        max_price = float('inf') # Keep infinity for comparison logic below

                    if min_price is not None and max_price is not None:
                        if min_price <= product_price <= max_price:
                            score_components["price_score"] = 1.0 # Perfect match
                        elif product_price < min_price:
                            # Score based on how far below minimum
                            price_diff_ratio = (min_price - product_price) / min_price if min_price > 0 else 0
                            score_components["price_score"] = max(0, 1 - min(price_diff_ratio, 1)) * 0.8 # Penalize slightly for being too cheap
                        else: # product_price > max_price
                            # Score based on how far above maximum
                            price_diff_ratio = (product_price - max_price) / max_price if max_price > 0 else float('inf')
                            score_components["price_score"] = max(0, 1 - min(price_diff_ratio, 1)) # Penalize more heavily for being too expensive
                    elif min_price is not None and product_price >= min_price:
                        # Only min price specified
                        score_components["price_score"] = 0.8 # Good score if above min
                    elif max_price is not None and product_price <= max_price:
                        # Only max price specified
                        score_components["price_score"] = 0.8 # Good score if below max
            
            # Category matching
            categories = entities.get("categories", [])
            if not categories and context and context.category:
                categories = [context.category]
            
            if categories and product.get("category"):
                product_category_lower = product.get("category").lower()
                # Case-insensitive matching for categories
                if any(category.lower() == product_category_lower for category in categories):
                    score_components["category_score"] = 1.0
                elif any(category.lower() in product_category_lower or product_category_lower in category.lower() for category in categories):
                     score_components["category_score"] = 0.7 # Partial match score

            # Brand matching
            brands = entities.get("brands", [])
            if brands and product.get("brand"):
                product_brand_lower = product.get("brand").lower()
                # Case-insensitive matching for brands
                if any(brand.lower() == product_brand_lower for brand in brands):
                    score_components["brand_score"] = 1.0
                elif any(brand.lower() in product_brand_lower for brand in brands):
                     score_components["brand_score"] = 0.8 # Partial match score

            # Admin priority (if available)
            admin_priority = product.get("admin_priority", 0)
            if admin_priority > 0:
                score_components["admin_priority_score"] = min(admin_priority / 10.0, 1.0) # Normalize priority score (e.g., 1-10 scale)

            # Calculate aggregate score using defined weights
            weights = {
                "feature_score": 0.3,
                "price_score": 0.25,
                "category_score": 0.2,
                "brand_score": 0.1,
                "semantic_score": 0.0, # Set semantic score weight to 0 as it's not calculated
                "admin_priority_score": 0.15 # Slightly increased weight for admin priority
            }
            
            total_score = sum(score_components.get(key, 0) * weight for key, weight in weights.items())
            
            # Add to scored products
            scored_products.append({
                "product": product,
                "score": total_score,
                "score_components": score_components
            })
        
        return scored_products
    
    def _compute_query_similarity(self, query: str, reference: str) -> float:
        """
        Compute simple similarity between query and reference text.
        (Keeping this helper)
        """
        # Normalize texts
        query_norm = query.lower()
        reference_norm = reference.lower()
        
        # Extract words (simple tokenization)
        query_words = set(re.findall(r'\w+', query_norm))
        reference_words = set(re.findall(r'\w+', reference_norm))
        
        # Calculate word overlap (Jaccard similarity)
        if not query_words or not reference_words:
            return 0.0
        
        intersection = query_words.intersection(reference_words)
        union = query_words.union(reference_words)
        
        # Avoid division by zero if union is empty
        return len(intersection) / len(union) if union else 0.0

    def _extract_price_value(self, product: Dict) -> Optional[float]:
        """Extract price value from product data with multiple fallbacks. (Keeping this helper)"""
        pricing = product.get("pricing", {})
        
        # Try different price types
        for price_type in ["one_time", "value", "monthly", "annual"]:
            price = pricing.get(price_type)
            if price is not None: # Check for None explicitly
                # Convert to float if it's a string or int
                if isinstance(price, (str, int)):
                    try:
                        # Handle potential currency symbols or formatting in strings
                        if isinstance(price, str):
                             price_str = re.sub(r'[^\d.,]', '', price).replace(',', '.')
                             return float(price_str)
                        else: # It's an int
                             return float(price)
                    except ValueError:
                        self.logger.warning(f"Could not convert price '{price}' to float for product {product.get('_id')}")
                        pass # Continue to next price type if conversion fails
                elif isinstance(price, float): # Already a float
                     return price
        
        # Fallback: Check top-level price field if pricing dict fails
        top_level_price = product.get("price")
        if top_level_price is not None:
             if isinstance(top_level_price, (str, int)):
                 try:
                     if isinstance(top_level_price, str):
                         price_str = re.sub(r'[^\d.,]', '', top_level_price).replace(',', '.')
                         return float(price_str)
                     else:
                         return float(top_level_price)
                 except ValueError:
                     self.logger.warning(f"Could not convert top-level price '{top_level_price}' to float for product {product.get('_id')}")
             elif isinstance(top_level_price, float):
                 return top_level_price

        self.logger.debug(f"Could not extract price for product {product.get('_id')}")
        return None

    def _format_price(self, product: Dict) -> str:
        """Format price information from a product dictionary. (Keeping this helper)"""
        pricing = product.get("pricing", {})
        price_value = self._extract_price_value(product) # Use the robust extraction method
        
        if price_value is not None:
            currency = pricing.get("currency", "Kč") # Default to CZK
            
            # Determine price type for suffix
            price_type_suffix = ""
            if pricing.get("monthly") is not None:
                price_type_suffix = "/měsíc" if currency == "Kč" else "/month"
            elif pricing.get("annual") is not None:
                price_type_suffix = "/rok" if currency == "Kč" else "/year"

            try:
                # Format the number with non-breaking space as thousands separator for CZK
                separator = " " if currency == "Kč" else ","
                price_formatted = f"{price_value:,.0f}".replace(",", separator)
                return f"{price_formatted} {currency}{price_type_suffix}"
            except Exception as e:
                 self.logger.warning(f"Error formatting price {price_value}: {e}")
                 # Fallback to simple string representation
                 return f"{price_value} {currency}{price_type_suffix}"
        
        return "Cena není uvedena" if currency == "Kč" else "Price not available"


    def _format_product_data(self, product: Dict) -> Dict:
        """
        Format product data for use in prompts and responses. (Keeping this helper)
        
        Args:
            product: Product dictionary
            
        Returns:
            Formatted product data dictionary (simplified for prompts)
        """
        # Extract basic product info, keep it concise for prompts
        formatted = {
            "name": product.get("product_name", "Unknown Product"),
            "category": product.get("category", "N/A"),
            "price": self._format_price(product), # Use the updated formatting
            "features": product.get("features", [])[:5], # Limit features for brevity
            "id": str(product.get("_id", "")) # Ensure ID is string
        }
        
        # Optionally add a snippet of description if needed, but keep it short
        description = product.get("description", "")
        if description:
             formatted["description_snippet"] = (description[:100] + '...') if len(description) > 100 else description

        # Add brand if available
        if product.get("brand"):
            formatted["brand"] = product.get("brand")
            
        return formatted

    # --- DEPRECATED METHODS TO BE REMOVED ---
    # analyze_query, _enhanced_analysis, _create_fallback_analysis
    # generate_response, _handle_..., _retrieve_specialized_knowledge
    # _generate_relevant_followup_questions and its helpers

    # Note: The actual removal will happen via replace_in_file diffs.
    # This section is just for logical separation during thought process.

    async def generate_response(self, 
                            query: str, 
                            context: Optional[EnhancedConversationContext] = None,
                            language: str = "cs", 
                            user_id: Optional[str] = None
                        ) -> Dict[str, Any]:
        """
        Generate an intelligent response with product recommendations,
        comparisons, and personalized information using Gemini API.
        
        Args:
            query: The user's query text
            context: Optional conversation context
            language: The language code (default: "cs" for Czech)
            user_id: Optional user ID to filter products by tenant
            
        Returns:
            Dictionary with enriched response data
        """
        try:
            # Step 1: Analyze the query with enhanced analysis
            analysis = await self.analyze_query(query, language, context)

            # Step 2: Retrieve relevant knowledge based on intent - PASS USER_ID and QUERY HERE
            knowledge = await self._retrieve_specialized_knowledge(query, analysis, context, user_id) # Pass query

            # Step 3: Handle specialized query types
            response_data = {}
            intent = analysis.get("intent", "general_question")
            
            # Pass user_id to handler methods
            if intent == "product_comparison":
                response_data = await self._handle_product_comparison(query, analysis, knowledge, context, language, user_id)
            elif intent == "product_recommendation":
                response_data = await self._handle_product_recommendation(query, analysis, knowledge, context, language, user_id)
            elif intent == "technical_explanation":
                response_data = await self._handle_technical_explanation(query, analysis, knowledge, context, language, user_id)
            elif intent == "accessory_recommendation":
                response_data = await self._handle_accessory_recommendation(query, analysis, knowledge, context, language, user_id)
            elif intent == "shipping_payment" or intent == "customer_service":
                response_data = await self._handle_customer_service(query, analysis, knowledge, context, language, user_id) # Pass user_id if QA becomes tenant-specific
            elif intent == "store_navigation":
                response_data = await self._handle_navigation(query, analysis, knowledge, context, language, user_id) # Pass user_id if navigation depends on tenant data
            else:
                # General questions and fallback
                response_data = await self._generate_general_response(query, analysis, knowledge, context, language, user_id) # Pass user_id if general response needs tenant data
            
            # Step 4: Add follow-up questions for better engagement
            followup_questions = await self._generate_relevant_followup_questions(analysis, response_data, language)
            
            # Get the base response format and add specialized data
            final_response = {
                "reply": response_data.get("reply", ""),
                "confidence_score": response_data.get("confidence", 0.8),
                "source": response_data.get("source", "ai"),
                "metadata": {
                    "intent": analysis.get("intent"),
                    "query_type": analysis.get("query_type"),
                    "entities": analysis.get("entities"),
                    "knowledge": knowledge,
                    "user_id": user_id,  # Include user_id in metadata
                    "followup_questions": followup_questions,
                    "requires_followup": analysis.get("requires_followup", False),
                    "products": response_data.get("products", []),
                    "sentiment": analysis.get("sentiment", "neutral"),
                    "priority": analysis.get("priority", "medium")
                }
            }
            
            # Add any recommended products to the response
            if "recommended_products" in response_data:
                final_response["metadata"]["recommended_products"] = response_data["recommended_products"]
            
            # Add score components for UI display if available
            if "score_components" in response_data:
                final_response["metadata"]["score_components"] = response_data["score_components"]
                
            # Add comparison data if available
            if "comparison_data" in response_data:
                final_response["metadata"]["comparison_data"] = response_data["comparison_data"]
                
            # Add accessories if available
            if "accessories" in response_data:
                final_response["metadata"]["accessories"] = response_data["accessories"]
                
            return final_response
            
        except Exception as e:
            self.logger.error(f"Error generating enhanced response: {str(e)}")
            # Return a fallback response
            fallback_responses = {
                "cs": "Omlouvám se, ale momentálně nemohu odpovědět na váš dotaz. Zkuste to prosím později nebo položte otázku jiným způsobem.",
                "en": "I apologize, but I cannot answer your query at the moment. Please try again later or rephrase your question."
            }
            return {
                "reply": fallback_responses.get(language, fallback_responses["cs"]),
                "confidence_score": 0.0,
                "source": "fallback",
                "metadata": {"error": str(e)}
            }
    
    async def _retrieve_specialized_knowledge(self,
                                        query: str, # Added query parameter
                                        analysis: Dict[str, Any],
                                        context: Optional[EnhancedConversationContext] = None,
                                        user_id: Optional[str] = None
                                        ) -> Dict[str, Any]:
        """
        Retrieve relevant knowledge specialized by intent type, including widget FAQs.

        Args:
            query: The original user query text.
            analysis: The query analysis result.
            context: Optional conversation context.
            user_id: Optional user ID to filter products and FAQs by tenant.

        Returns:
            Dictionary with specialized knowledge.
        """
        knowledge = {
            "products": [],
            "categories": [],
            "qa_items": [],
            "templates": {},
            "phrases": {}
        }
        
        intent = analysis.get("intent", "general_question")
        entities = analysis.get("entities", {})
        
        # Handle product recommendations
        if intent in ["product_recommendation", "product_comparison", "technical_explanation"]:
            # Get products by name from entities
            product_names = entities.get("products", [])
            for product_name in product_names:
                # Pass user_id to filter by tenant
                products = await self.knowledge_base.find_products_by_name(product_name, user_id=user_id)
                if products:
                    knowledge["products"].extend(products)

            # Add this right after getting products by name
            if not knowledge["products"] and "kola" in product_names:
                # If "kola" was identified as a product but no products found, try it as a category
                self.logger.info(f"No products found for 'kola' as product name, trying as category")
                category_products = await self.knowledge_base.find_products_by_category("kola", user_id=user_id, limit=5)
                knowledge["products"].extend(category_products)

                # Also try variations like "Horská kola", "Silniční kola" etc.
                for category_type in ["Horská", "Silniční", "Městská"]:
                    full_category = f"{category_type} kola"
                    self.logger.info(f"Trying category: {full_category}")
                    category_products = await self.knowledge_base.find_products_by_category(full_category, user_id=user_id, limit=2)
                    knowledge["products"].extend(category_products)

            # If no specific products were identified, check categories and features
            if not knowledge["products"]:
                # Use categories from entities or context
                categories = entities.get("categories", [])
                if not categories and context and context.category:
                    categories = [context.category]
                
                # Get features from entities or context
                features = entities.get("features", [])
                if not features and context and context.required_features:
                    features = context.required_features
                
                # Use budget range from entities or context
                price_range = entities.get("price_range", {})
                if (not price_range or (price_range.get("min") is None and price_range.get("max") is None)) and context and context.budget_range:
                    price_range = context.budget_range
                
                # Build advanced query for product search
                search_query = {"category": {"$in": categories}} if categories else {}
                
                if features:
                    search_query["features"] = {"$all": features}
                
                if price_range:
                    price_filter = {}
                    if price_range.get("min") is not None:
                        price_filter["$gte"] = price_range["min"]
                    if price_range.get("max") is not None:
                        price_filter["$lte"] = price_range["max"]
                    
                    if price_filter:
                        search_query["price"] = price_filter
                
                # Get products by advanced search - pass user_id
                if search_query:
                    category_products = await self.knowledge_base.find_products_by_query(search_query, user_id=user_id, limit=5)
                    knowledge["products"].extend(category_products)
                elif categories:
                    # Fallback to simple category search - pass user_id
                    for category in categories:
                        category_products = await self.knowledge_base.find_products_by_category(category, user_id=user_id, limit=5)
                        knowledge["products"].extend(category_products)
        
        # Handle accessory recommendations
        elif intent == "accessory_recommendation":
            # Get main products first
            product_names = entities.get("products", [])
            main_products = []
            
            for product_name in product_names:
                # Pass user_id to filter by tenant
                products = await self.knowledge_base.find_products_by_name(product_name, user_id=user_id)
                if products:
                    main_products.extend(products)
            
            # Add main products to knowledge
            knowledge["products"].extend(main_products)
            
            # Find accessories for each main product
            for product in main_products:
                if product.get("compatible_accessories"):
                    accessory_ids = product.get("compatible_accessories")
                    for accessory_id in accessory_ids:
                        # Pass user_id for accessory lookup too
                        accessory = await self.knowledge_base.find_product_by_id(accessory_id, user_id=user_id)
                        if accessory:
                            knowledge["accessories"] = knowledge.get("accessories", [])
                            knowledge["accessories"].append(accessory)
        
        # Handle customer service and shipping/payment questions
        elif intent in ["customer_service", "shipping_payment", "store_navigation"]:
            # Retrieve QA items related to customer service, shipping, payment
            query_terms = []
            
            if intent == "customer_service":
                query_terms = ["refund", "return", "warranty", "repair", "contact", "help", "service"]
            elif intent == "shipping_payment":
                query_terms = ["shipping", "delivery", "payment", "pay", "cost", "price", "fee"]
            elif intent == "store_navigation":
                query_terms = ["find", "where", "category", "section", "page", "website"]
            
            # Get QA items that match these terms - pass user_id if QA items are tenant-specific
            for term in query_terms:
                qa_items = await self.knowledge_base.find_qa_items_by_keyword(term, user_id=user_id)
                if qa_items:
                    knowledge["qa_items"].extend(qa_items)
        
        # Get category information
        categories = entities.get("categories", [])
        for category in categories:
            category_info = self.knowledge_base.get_category_info(category)
            if category_info:
                knowledge["categories"].append(category_info)
        
        # Get response templates
        template = self.knowledge_base.get_template(intent)
        if template:
            knowledge["templates"][intent] = template

        # Add Widget FAQ retrieval using the original query text
        try:
            if query and user_id: # Ensure query and user_id are available
                widget_faqs = await self.knowledge_base.find_widget_faqs_by_keyword(
                    keyword=query,
                    user_id=user_id,
                    limit=3 # Limit to a few relevant FAQs
                )
                if widget_faqs:
                    # Ensure qa_items exists before extending
                    if "qa_items" not in knowledge:
                        knowledge["qa_items"] = []
                    # Add a source field to distinguish them if needed later
                    for faq in widget_faqs:
                        faq["source_type"] = "widget_faq" # Mark the source
                    knowledge["qa_items"].extend(widget_faqs)
                    self.logger.debug(f"Added {len(widget_faqs)} widget FAQs to knowledge for user {user_id}")
        except Exception as e:
            self.logger.error(f"Error retrieving widget FAQs for knowledge base: {e}")

        return knowledge
    
    async def _handle_product_comparison(self, # Added user_id parameter
                                 query: str,
                                 analysis: Dict[str, Any],
                                 knowledge: Dict[str, Any],
                                 context: Optional[EnhancedConversationContext] = None,
                                 language: str = "cs",
                                 user_id: Optional[str] = None 
                                ) -> Dict[str, Any]:
        """
        Handle product comparison queries with detailed feature comparison.
        
        Args:
            query: The user's query
            analysis: Query analysis results
            knowledge: Retrieved knowledge
            context: Optional conversation context
            language: Language code
            
        Returns:
            Comparison response data
        """
        entities = analysis.get("entities", {})
        products = knowledge.get("products", [])
        
        # Need at least 2 products for comparison
        if len(products) < 2:
            # Try to find more products based on categories and features
            categories = entities.get("categories", [])
            features = entities.get("features", [])
            
            if categories:
                for category in categories:
                    # Pass user_id here
                    more_products = await self.knowledge_base.find_products_by_category(category, user_id=user_id, limit=5)
                    for product in more_products:
                        if product not in products:
                            products.append(product)
            
            # If still not enough, get recommended products for the specific user
            if len(products) < 2:
                # Pass user_id here
                recommended_products = await self.knowledge_base.get_recommended_products(user_id=user_id, limit=2)
                for product in recommended_products:
                    if product not in products:
                        products.append(product)
        
        # Limit to top 2-3 products for comparison
        products = products[:3]
        
        # Generate comparison data
        comparison_data = {}
        if len(products) >= 2:
            # Get detailed comparison between products
            product_pairs = [(a, b) for i, a in enumerate(products) for b in products[i+1:]]
            
            for product1, product2 in product_pairs:
                # Convert ObjectIds to strings before passing to get_product_comparison
                product1_id = str(product1.get("_id")) if product1.get("_id") else None
                product2_id = str(product2.get("_id")) if product2.get("_id") else None
                
                if product1_id and product2_id:
                    # Pass user_id here
                    product_comparison = await self.knowledge_base.get_product_comparison(
                        product1_id, 
                        product2_id,
                        user_id=user_id
                    )
                    
                    key = f"{product1.get('product_name')} vs {product2.get('product_name')}"
                    comparison_data[key] = product_comparison
        
        # Generate comparison text using Gemini
        comparison_context = {
            "products": [self._format_product_data(p) for p in products],
            "comparisons": comparison_data,
            "query": query
        }
        
        system_prompt = await self._get_system_prompt(language)
        comparison_instructions = """
    Vytvoř podrobné porovnání produktů. Zaměř se na:
    1. Klíčové rozdíly mezi produkty
    2. Stručné silné a slabé stránky každého produktu
    3. Který produkt je vhodnější pro jaké použití
    
    4. Cenový rozdíl a poměr cena/výkon
    5. Doporučení podle různých potřeb zákazníka

    Porovnání musí být objektivní, založené na faktech, a upřímné.
    Odpověď má být stručná, dobře strukturovaná a snadno srozumitelná.
    Odpověď má být dobře strukturovaná, snadno srozumitelná, a ne příliš technická.
    """ if language == "cs" else """
    Create a detailed comparison of the products. Focus on:
    1. Key differences between products
    2. Strengths and weaknesses of each product
    3. Which product is more suitable for which use case
    4. Price difference and value for money
    5. Recommendations based on different customer needs

    The comparison must be objective, fact-based, and honest.
    The response should be well-structured, easy to understand, and not overly technical.
    """
        
        try:
            # Create a prompt for Gemini
            full_prompt = f"{system_prompt}\n\n{comparison_instructions}\n\nPorovnej tyto produkty: {json_safe_dumps(comparison_context)}"
            
            # Create a generation config
            generation_config = {
                "temperature": 0.5,
                "max_output_tokens": 1024,
                "top_p": 0.95,
                "top_k": 40
            }
            
            # Apply the same retry and fallback mechanism
            response = None
            retry_count = 0
            last_error = None
            
            while response is None and retry_count <= MAX_RETRIES:
                try:
                    # Select model based on retry count
                    if retry_count < len(MODEL_CASCADE):
                        model_info = MODEL_CASCADE[retry_count]
                        self.logger.info(f"Trying with {model_info['desc']}")
                        model = genai.GenerativeModel(model_info['name'])
                    else:
                        # If we've gone through all models, use the last one with reduced parameters
                        model_info = MODEL_CASCADE[-1]
                        self.logger.info(f"Final retry with {model_info['desc']}")
                        model = genai.GenerativeModel(model_info['name'])
                        # Reduce token count for lighter load
                        generation_config["max_output_tokens"] = 512
                    
                    response = await asyncio.to_thread(
                        model.generate_content,
                        full_prompt,
                        generation_config=generation_config
                    )
                    
                except Exception as e:
                    last_error = e
                    retry_count += 1
                    
                    if retry_count <= MAX_RETRIES:
                        self.logger.warning(f"API call failed (attempt {retry_count}): {str(e)}. Retrying...")
                        delay = min(RETRY_DELAY_BASE * (2 ** (retry_count - 1)), MAX_RETRY_DELAY)
                        await asyncio.sleep(delay)
                    else:
                        self.logger.error(f"All API call attempts failed: {str(e)}")
                        # Fall back to template-based response
                        raise
            
            comparison_text = response.text.strip()
            
            return {
                "reply": comparison_text,
                "confidence": 0.9,
                "source": "product_comparison",
                "products": products,
                "comparison_data": comparison_data
            }
            
        except Exception as e:
            self.logger.error(f"Error generating product comparison: {str(e)}")
            
            # Fallback to simpler comparison if AI fails
            product_names = [p.get("product_name", "Produkt") for p in products]
            
            if language == "cs":
                fallback = f"Tady je porovnání produktů: {', '.join(product_names)}. "
                fallback += "Bohužel nemohu nyní provést detailní porovnání. Zkuste prosím specifikovat, co vás zajímá."
            else:
                fallback = f"Here's a comparison of products: {', '.join(product_names)}. "
                fallback += "Unfortunately, I cannot perform a detailed comparison at the moment. Please try to specify what you're interested in."
            
            return {
                "reply": fallback,
                "confidence": 0.5,
                "source": "product_comparison",
                "products": products
            }
        
    async def _handle_product_recommendation(self,
                                        query: str,
                                        analysis: Dict[str, Any],
                                        knowledge: Dict[str, Any],
                                        context: Optional[EnhancedConversationContext] = None,
                                        language: str = "cs",
                                        user_id: Optional[str] = None  # Add user_id parameter
                                    ) -> Dict[str, Any]:
        """
        Handle product recommendation queries with personalized suggestions.
        
        Args:
            query: The user's query
            analysis: Query analysis results
            knowledge: Retrieved knowledge
            context: Optional conversation context
            language: Language code
            user_id: Optional user ID to filter by tenant
            
        Returns:
            Recommendation response data
        """
        entities = analysis.get("entities", {})
        products = knowledge.get("products", [])
        
        # If no products found, try to find more
        if not products:
            # Try categories from context or analysis
            categories = entities.get("categories", [])
            if not categories and context and context.category:
                categories = [context.category]
            
            # Get products from categories
            if categories:
                for category in categories:
                    # Pass user_id to filter by tenant
                    more_products = await self.knowledge_base.find_products_by_category(category, user_id=user_id, limit=5)
                    products.extend(more_products)
            
            # If still no products, get recommended products
            if not products:
                # Pass user_id to filter by tenant
                products = await self.knowledge_base.get_recommended_products(user_id=user_id, limit=5)
        
        # Score and rank products based on user preferences and requirements
        scored_products = await self._score_products_for_recommendation(
            products, 
            entities, 
            context
        )
        
        # Sort products by score in descending order
        scored_products.sort(key=lambda x: x["score"], reverse=True)
        
        # Limit to top recommendations
        top_products = scored_products[:3]

        personalized_recommendations = []
        for scored_product in top_products:
            product_data = scored_product["product"]
            recommendation_item = {
                "productData": self._format_product_data(product_data),
                "score_components": scored_product["score_components"],
                "explanation": None,
                "is_accessory": False,
                "is_comparison": False
            }
            personalized_recommendations.append(recommendation_item)
        
        # Generate recommendation text
        recommendation_context = {
            "query": query,
            "products": [p["product"] for p in top_products],
            "scores": {p["product"].get("product_name"): p["score_components"] for p in top_products},
            "user_context": context.model_dump() if context else {}
        }
        
        system_prompt = await self._get_system_prompt(language)
        recommendation_instructions = """
    Vytvoř personalizované doporučení produktů. Zaměř se na:
    1. Jak doporučené produkty odpovídají požadavkům zákazníka
    2. Klíčové vlastnosti, které činí produkt vhodným
    3. Proč by si zákazník měl vybrat právě tyto produkty
    4. Stručné vysvětlení výhod jednotlivých produktů

    Buď upřímný, užitečný a zdůrazni to, co je pro zákazníka důležité.
    Nepřehlcuj informacemi, zaměř se na klíčové body.
    """ if language == "cs" else """
    Create personalized product recommendations. Focus on:
    1. How the recommended products meet the customer's requirements
    2. Key features that make the product suitable
    3. Why the customer should choose these products
    4. Brief explanation of the benefits of each product

    Be honest, helpful, and emphasize what's important to the customer.
    Don't overwhelm with information, focus on key points.
    """
        
        try:
            # Create a prompt for Gemini
            full_prompt = f"{system_prompt}\n\n{recommendation_instructions}\n\nDoporuč produkty pro tento dotaz: {json_safe_dumps(recommendation_context)}"
            
            # Create a generation config
            generation_config = {
                "temperature": 0.4,
                "max_output_tokens": 1024,
                "top_p": 0.95,
                "top_k": 40
            }
            
            # Apply the same retry and fallback mechanism
            response = None
            retry_count = 0
            last_error = None
            
            while response is None and retry_count <= MAX_RETRIES:
                try:
                    # Select model based on retry count
                    if retry_count < len(MODEL_CASCADE):
                        model_info = MODEL_CASCADE[retry_count]
                        self.logger.info(f"Trying with {model_info['desc']}")
                        model = genai.GenerativeModel(model_info['name'])
                    else:
                        # If we've gone through all models, use the last one with reduced parameters
                        model_info = MODEL_CASCADE[-1]
                        self.logger.info(f"Final retry with {model_info['desc']}")
                        model = genai.GenerativeModel(model_info['name'])
                        # Reduce token count for lighter load
                        generation_config["max_output_tokens"] = 512
                    
                    response = await asyncio.to_thread(
                        model.generate_content,
                        full_prompt,
                        generation_config=generation_config
                    )
                    
                except Exception as e:
                    last_error = e
                    retry_count += 1
                    
                    if retry_count <= MAX_RETRIES:
                        self.logger.warning(f"API call failed (attempt {retry_count}): {str(e)}. Retrying...")
                        delay = min(RETRY_DELAY_BASE * (2 ** (retry_count - 1)), MAX_RETRY_DELAY)
                        await asyncio.sleep(delay)
                    else:
                        self.logger.error(f"All API call attempts failed: {str(e)}")
                        # Fall back to template-based response
                        raise
            
            recommendation_text = response.text.strip()
            
            return {
                "reply": recommendation_text,
                "confidence": 0.9,
                "source": "product_recommendation",
                "products": [p["product"] for p in top_products],
                "recommended_products": top_products,
                "score_components": {p["product"].get("product_name"): p["score_components"] for p in top_products},
                "personalized_recommendations": personalized_recommendations
            }
            
        except Exception as e:
            self.logger.error(f"Error generating product recommendation: {str(e)}")
            
            # Fallback to simpler recommendation
            product_names = [p["product"].get("product_name", "Produkt") for p in top_products]
            
            if language == "cs":
                fallback = f"Na základě vašeho dotazu doporučuji: {', '.join(product_names)}. "
                if product_names:
                    fallback += f"Zvláště {product_names[0]} by mohl dobře vyhovovat vašim potřebám."
            else:
                fallback = f"Based on your query, I recommend: {', '.join(product_names)}. "
                if product_names:
                    fallback += f"Especially {product_names[0]} could meet your needs well."
            
            return {
                "reply": fallback,
                "confidence": 0.7,
                "source": "product_recommendation",
                "products": [p["product"] for p in top_products],
                "recommended_products": top_products,
                "personalized_recommendations": personalized_recommendations
            }
            
    async def _handle_technical_explanation(self,
                                       query: str,
                                       analysis: Dict[str, Any],
                                       knowledge: Dict[str, Any],
                                       context: Optional[EnhancedConversationContext] = None,
                                       language: str = "cs"
                                      ) -> Dict[str, Any]:
        """
        Handle technical explanation queries with detailed, accessible information.
        
        Args:
            query: The user's query
            analysis: Query analysis results
            knowledge: Retrieved knowledge
            context: Optional conversation context
            language: Language code
            
        Returns:
            Technical explanation response data
        """
        entities = analysis.get("entities", {})
        products = knowledge.get("products", [])
        
        # Extract features/specs to explain
        features = entities.get("features", [])
        
        # If no specific products, try to find some based on categories
        if not products and features:
            categories = entities.get("categories", [])
            if not categories and context and context.category:
                categories = [context.category]
            
            if categories:
                for category in categories:
                    category_products = await self.knowledge_base.find_products_by_category(category, limit=2)
                    products.extend(category_products)
        
        # Generate technical explanation
        tech_context = {
            "query": query,
            "features": features,
            "products": [self._format_product_data(p) for p in products],
            "user_context": context.model_dump() if context else {}
        }
        
        system_prompt = await self._get_system_prompt(language)
        tech_instructions = """
Vytvoř podrobné a přístupné vysvětlení technických vlastností. Zaměř se na:
1. Srozumitelné vysvětlení technických konceptů bez zbytečného žargonu
2. Praktický význam technických parametrů pro uživatele
3. Jak technické vlastnosti ovlivňují reálné používání produktu
4. Porovnání parametrů v kontextu trhu (co je nadprůměrné, průměrné, podprůměrné)

Vysvětlení musí být informativní, ale ne přehnaně technické.
Používej analogie a praktické příklady, aby vysvětlení bylo srozumitelné každému.
""" if language == "cs" else """
Create a detailed and accessible explanation of technical features. Focus on:
1. Understandable explanation of technical concepts without unnecessary jargon
2. Practical significance of technical parameters for users
3. How technical features affect real-world product use
4. Comparison of parameters in market context (what's above average, average, below average)

The explanation must be informative but not overly technical.
Use analogies and practical examples to make the explanation understandable to everyone.
"""
        
        try:
            # Create a prompt for Gemini
            full_prompt = f"{system_prompt}\n\n{tech_instructions}\n\nVysvětli technické vlastnosti: {json_safe_dumps(tech_context)}"
            
            # Create a generation config
            generation_config = {
                "temperature": 0.3,
                "max_output_tokens": 1024,
                "top_p": 0.95,
                "top_k": 40
            }
            
            # Apply the same retry and fallback mechanism
            response = None
            retry_count = 0
            last_error = None
            
            while response is None and retry_count <= MAX_RETRIES:
                try:
                    # Select model based on retry count
                    if retry_count < len(MODEL_CASCADE):
                        model_info = MODEL_CASCADE[retry_count]
                        self.logger.info(f"Trying with {model_info['desc']}")
                        model = genai.GenerativeModel(model_info['name'])
                    else:
                        # If we've gone through all models, use the last one with reduced parameters
                        model_info = MODEL_CASCADE[-1]
                        self.logger.info(f"Final retry with {model_info['desc']}")
                        model = genai.GenerativeModel(model_info['name'])
                        # Reduce token count for lighter load
                        generation_config["max_output_tokens"] = 512
                    
                    response = await asyncio.to_thread(
                        model.generate_content,
                        full_prompt,
                        generation_config=generation_config
                    )
                    
                except Exception as e:
                    last_error = e
                    retry_count += 1
                    
                    if retry_count <= MAX_RETRIES:
                        self.logger.warning(f"API call failed (attempt {retry_count}): {str(e)}. Retrying...")
                        delay = min(RETRY_DELAY_BASE * (2 ** (retry_count - 1)), MAX_RETRY_DELAY)
                        await asyncio.sleep(delay)
                    else:
                        self.logger.error(f"All API call attempts failed: {str(e)}")
                        # Fall back to template-based response
                        raise
            
            explanation_text = response.text.strip()
            
            return {
                "reply": explanation_text,
                "confidence": 0.9,
                "source": "technical_explanation",
                "products": products,
                "features_explained": features
            }
            
        except Exception as e:
            self.logger.error(f"Error generating technical explanation: {str(e)}")
            
            # Fallback explanation
            feature_text = ", ".join(features) if features else "technické vlastnosti"
            
            if language == "cs":
                fallback = f"Rád bych vám vysvětlil {feature_text}, ale momentálně nemám dostatek informací. "
                fallback += "Můžete prosím upřesnit, které technické parametry vás zajímají?"
            else:
                fallback = f"I'd like to explain {feature_text} to you, but I don't have enough information at the moment. "
                fallback += "Could you please specify which technical parameters you're interested in?"
            
            return {
                "reply": fallback,
                "confidence": 0.5,
                "source": "technical_explanation",
                "products": products,
                "features_explained": features
            }
    
    async def _handle_accessory_recommendation(self,
                                          query: str,
                                          analysis: Dict[str, Any],
                                          knowledge: Dict[str, Any],
                                          context: Optional[EnhancedConversationContext] = None,
                                          language: str = "cs"
                                         ) -> Dict[str, Any]:
        """
        Handle accessory recommendation queries by finding compatible products.
        
        Args:
            query: The user's query
            analysis: Query analysis results
            knowledge: Retrieved knowledge
            context: Optional conversation context
            language: Language code
            
        Returns:
            Accessory recommendation response data
        """
        entities = analysis.get("entities", {})
        products = knowledge.get("products", [])
        accessories = knowledge.get("accessories", [])
        complementary_services = knowledge.get("services", [])
        
        # Extract products from context if not explicitly mentioned in current query
        if not products and context:
            # If we have a product reference in context, use it
            if context.attributes and "product_references" in context.attributes:
                for product_ref in context.attributes["product_references"]:
                    referenced_products = await self.knowledge_base.find_products_by_name(product_ref)
                    products.extend(referenced_products)
            
            # If we have a product_id directly, use that
            if context.last_product_id:
                product = await self.knowledge_base.find_product_by_id(context.last_product_id)
                if product and product not in products:
                    products.append(product)
            
            # If we're viewing a specific product (from deictic references like "this" or "it")
            if hasattr(context, 'current_view') and context.current_view and context.current_view.startswith('product:'):
                product_id = context.current_view.split(':')[1]
                if product_id:
                    product = await self.knowledge_base.find_product_by_id(product_id)
                    if product and product not in products:
                        products.append(product)
        
        # If no accessories were found directly, try to find them
        if not accessories and products:
            for product in products:
                if product.get("compatible_accessories"):
                    accessory_ids = product.get("compatible_accessories")
                    for accessory_id in accessory_ids:
                        accessory = await self.knowledge_base.find_product_by_id(accessory_id)
                        if accessory:
                            accessories.append(accessory)
                
                # If no explicit compatible accessories, try to find by category matching
                if not accessories and product.get("category"):
                    product_category = product.get("category")
                    # Map product categories to accessory categories
                    accessory_categories = {
                        "smartphone": ["phone_case", "screen_protector", "charger", "headphones"],
                        "notebook": ["laptop_bag", "mouse", "keyboard", "docking_station"],
                        "televize": ["tv_mount", "hdmi_cable", "remote_control", "soundbar"],
                        "kolo": ["helmet", "bike_lock", "bike_light", "pump", "bike_basket", "bike_rack", "water_bottle"],
                        # Add more mappings as needed
                    }
                    
                    if product_category in accessory_categories:
                        for acc_category in accessory_categories[product_category]:
                            category_accessories = await self.knowledge_base.find_products_by_category(acc_category, limit=2)
                            accessories.extend(category_accessories)
        
        # Find complementary services based on product category
        if not complementary_services and products:
            for product in products:
                product_category = product.get("category")
                # Map product categories to complementary services
                service_categories = {
                    "smartphone": ["phone_insurance", "screen_repair", "data_transfer", "setup_assistance"],
                    "notebook": ["extended_warranty", "data_backup", "software_installation", "technical_support"],
                    "televize": ["wall_mounting", "calibration", "smart_setup", "cable_management"],
                    "kolo": ["bike_fitting", "maintenance_plan", "bike_assembly", "bike_insurance"],
                    # Add more mappings as needed
                }
                
                if product_category in service_categories:
                    for service_category in service_categories[product_category]:
                        category_services = await self.knowledge_base.find_services_by_category(service_category, limit=2)
                        complementary_services.extend(category_services)
        
        # Generate accessory recommendation
        accessory_context = {
            "query": query,
            "main_products": [self._format_product_data(p) for p in products],
            "accessories": [self._format_product_data(a) for a in accessories],
            "complementary_services": complementary_services,
            "user_context": context.model_dump() if context else {}
        }
        
        system_prompt = await self._get_system_prompt(language)
        accessory_instructions = """
Doporuč vhodné příslušenství a doplňkové služby pro dané produkty. Zaměř se na:
1. Kompatibilitu příslušenství s hlavními produkty
2. Jak příslušenství rozšiřuje nebo zlepšuje funkčnost produktu
3. Které příslušenství je nezbytné a které volitelné
4. Jakou přidanou hodnotu příslušenství poskytuje
5. Jaké doplňkové služby jsou k dispozici (např. pojištění, servis, montáž, atd.)

Vysvětli, proč by si zákazník měl dané příslušenství a služby pořídit.
Uveď konkrétní příklady využití a výhod.

Pokud zákazník použije neurčitý odkaz jako "tento" nebo "to", využij kontext konverzace.
""" if language == "cs" else """
Recommend suitable accessories and complementary services for the given products. Focus on:
1. Compatibility of accessories with main products
2. How accessories extend or improve product functionality
3. Which accessories are essential and which are optional
4. What added value the accessories provide
5. What complementary services are available (e.g. insurance, maintenance, assembly, etc.)

Explain why the customer should purchase the accessories and services.
Provide specific examples of use and benefits.

If the customer uses vague references like "this" or "it", use the conversation context.
"""
        
        try:
            # Create a prompt for Gemini
            full_prompt = f"{system_prompt}\n\n{accessory_instructions}\n\nDoporuč příslušenství a služby: {json_safe_dumps(accessory_context)}"
            
            # Create a generation config
            generation_config = {
                "temperature": 0.4,
                "max_output_tokens": 1024,
                "top_p": 0.95,
                "top_k": 40
            }
            
            # Apply the same retry and fallback mechanism
            response = None
            retry_count = 0
            last_error = None
            
            while response is None and retry_count <= MAX_RETRIES:
                try:
                    # Select model based on retry count
                    if retry_count < len(MODEL_CASCADE):
                        model_info = MODEL_CASCADE[retry_count]
                        self.logger.info(f"Trying with {model_info['desc']}")
                        model = genai.GenerativeModel(model_info['name'])
                    else:
                        # If we've gone through all models, use the last one with reduced parameters
                        model_info = MODEL_CASCADE[-1]
                        self.logger.info(f"Final retry with {model_info['desc']}")
                        model = genai.GenerativeModel(model_info['name'])
                        # Reduce token count for lighter load
                        generation_config["max_output_tokens"] = 512
                    
                    response = await asyncio.to_thread(
                        model.generate_content,
                        full_prompt,
                        generation_config=generation_config
                    )
                    
                except Exception as e:
                    last_error = e
                    retry_count += 1
                    
                    if retry_count <= MAX_RETRIES:
                        self.logger.warning(f"API call failed (attempt {retry_count}): {str(e)}. Retrying...")
                        delay = min(RETRY_DELAY_BASE * (2 ** (retry_count - 1)), MAX_RETRY_DELAY)
                        await asyncio.sleep(delay)
                    else:
                        self.logger.error(f"All API call attempts failed: {str(e)}")
                        # Fall back to template-based response
                        raise
            
            recommendation_text = response.text.strip()
            
            # Store product references in context for future use
            if context and products:
                if not context.attributes:
                    context.attributes = {}
                
                product_references = context.attributes.get("product_references", [])
                for product in products:
                    product_name = product.get("product_name", "")
                    if product_name and product_name not in product_references:
                        product_references.append(product_name)
                
                context.attributes["product_references"] = product_references
                
                # Store the last product id for easy reference
                if products:
                    context.last_product_id = products[0].get("id")
            
            return {
                "reply": recommendation_text,
                "confidence": 0.9,
                "source": "accessory_recommendation",
                "products": products,
                "accessories": accessories,
                "complementary_services": complementary_services
            }
            
        except Exception as e:
            self.logger.error(f"Error generating accessory recommendation: {str(e)}")
            
            # Fallback recommendation
            product_names = [p.get("product_name", "produkt") for p in products]
            accessory_names = [a.get("product_name", "příslušenství") for a in accessories]
            service_names = [s.get("service_name", "služba") for s in complementary_services]
            
            if language == "cs":
                fallback = f"Pro {', '.join(product_names) if product_names else 'váš produkt'} "
                fallback += f"doporučuji {', '.join(accessory_names) if accessory_names else 'vhodné příslušenství'}. "
                
                if service_names:
                    fallback += f"Také máme k dispozici tyto doplňkové služby: {', '.join(service_names)}."
                
                if not (accessory_names or service_names):
                    fallback = "Bohužel momentálně nemohu doporučit vhodné příslušenství ani služby. Prosím, upřesněte váš dotaz nebo hlavní produkt."
            else:
                fallback = f"For {', '.join(product_names) if product_names else 'your product'} "
                fallback += f"I recommend {', '.join(accessory_names) if accessory_names else 'suitable accessories'}. "
                
                if service_names:
                    fallback += f"We also offer these complementary services: {', '.join(service_names)}."
                
                if not (accessory_names or service_names):
                    fallback = "Unfortunately, I cannot recommend suitable accessories or services at the moment. Please clarify your query or main product."
            
            return {
                "reply": fallback,
                "confidence": 0.6,
                "source": "accessory_recommendation",
                "products": products,
                "accessories": accessories,
                "complementary_services": complementary_services
            }
    
    async def _handle_customer_service(self,
                                   query: str,
                                   analysis: Dict[str, Any],
                                   knowledge: Dict[str, Any],
                                   context: Optional[EnhancedConversationContext] = None,
                                   language: str = "cs"
                                  ) -> Dict[str, Any]:
        """
        Handle customer service queries by providing helpful information.
        
        Args:
            query: The user's query
            analysis: Query analysis results
            knowledge: Retrieved knowledge
            context: Optional conversation context
            language: Language code
            
        Returns:
            Customer service response data
        """
        # Extract relevant QA items
        qa_items = knowledge.get("qa_items", [])
        
        # Find most relevant QA item
        best_match = None
        best_score = 0
        
        if qa_items:
            for item in qa_items:
                # Simple matching score based on term frequency
                score = self._compute_query_similarity(query, item.get("question", ""))
                if score > best_score:
                    best_score = score
                    best_match = item
        
        # If we have a good match, use its answer
        if best_match and best_score > 0.5:
            return {
                "reply": best_match.get("answer", ""),
                "confidence": best_score,
                "source": "qa_database",
                "qa_item": best_match
            }
        
        # Otherwise, generate a response with AI
        service_context = {
            "query": query,
            "related_qa": [q.get("question") + ": " + q.get("answer") for q in qa_items[:3]],
            "user_context": context.model_dump() if context else {}
        }
        
        system_prompt = await self._get_system_prompt(language)
        service_instructions = """
Odpověz na dotaz zákazníka týkající se zákaznického servisu, dopravy, plateb, reklamací nebo vrácení zboží. Zaměř se na:
1. Poskytnutí přesných a užitečných informací
2. Jasné vysvětlení procesů a postupů
3. Empatické porozumění problému zákazníka
4. Praktické kroky, které může zákazník podniknout

Odpověď musí být vstřícná, profesionální a řešení musí být snadno realizovatelné.
Pokud nemáš přesné informace, doporuč zákazníkovi, jak je získat.
""" if language == "cs" else """
Respond to a customer query regarding customer service, shipping, payments, complaints, or returns. Focus on:
1. Providing accurate and useful information
2. Clear explanation of processes and procedures
3. Empathetic understanding of the customer's problem
4. Practical steps the customer can take

The response must be friendly, professional, and the solution must be easily implementable.
If you don't have accurate information, recommend how the customer can obtain it.
"""
        
        try:
            # Create a prompt for Gemini
            full_prompt = f"{system_prompt}\n\n{service_instructions}\n\nOdpověz na dotaz k zákaznickému servisu: {json_safe_dumps(service_context)}"
            
            # Create a generation config
            generation_config = {
                "temperature": 0.3,
                "max_output_tokens": 1024,
                "top_p": 0.95,
                "top_k": 40
            }
            
            # Apply the same retry and fallback mechanism
            response = None
            retry_count = 0
            last_error = None
            
            while response is None and retry_count <= MAX_RETRIES:
                try:
                    # Select model based on retry count
                    if retry_count < len(MODEL_CASCADE):
                        model_info = MODEL_CASCADE[retry_count]
                        self.logger.info(f"Trying with {model_info['desc']}")
                        model = genai.GenerativeModel(model_info['name'])
                    else:
                        # If we've gone through all models, use the last one with reduced parameters
                        model_info = MODEL_CASCADE[-1]
                        self.logger.info(f"Final retry with {model_info['desc']}")
                        model = genai.GenerativeModel(model_info['name'])
                        # Reduce token count for lighter load
                        generation_config["max_output_tokens"] = 512
                    
                    response = await asyncio.to_thread(
                        model.generate_content,
                        full_prompt,
                        generation_config=generation_config
                    )
                    
                except Exception as e:
                    last_error = e
                    retry_count += 1
                    
                    if retry_count <= MAX_RETRIES:
                        self.logger.warning(f"API call failed (attempt {retry_count}): {str(e)}. Retrying...")
                        delay = min(RETRY_DELAY_BASE * (2 ** (retry_count - 1)), MAX_RETRY_DELAY)
                        await asyncio.sleep(delay)
                    else:
                        self.logger.error(f"All API call attempts failed: {str(e)}")
                        # Fall back to template-based response
                        raise
            
            service_text = response.text.strip()
            
            return {
                "reply": service_text,
                "confidence": 0.8,
                "source": "customer_service",
                "qa_items": qa_items[:3]
            }
            
        except Exception as e:
            self.logger.error(f"Error generating customer service response: {str(e)}")
            
            # Fallback response
            if language == "cs":
                fallback = "Pro detailní informace o tomto tématu vás prosím odkážu na náš zákaznický servis na info@example.com nebo telefonicky na +420 123 456 789."
            else:
                fallback = "For detailed information on this topic, please contact our customer service at info@example.com or by phone at +420 123 456 789."
            
            return {
                "reply": fallback,
                "confidence": 0.5,
                "source": "customer_service"
            }
    
    async def _handle_navigation(self,
                             query: str,
                             analysis: Dict[str, Any],
                             knowledge: Dict[str, Any],
                             context: Optional[EnhancedConversationContext] = None,
                             language: str = "cs"
                            ) -> Dict[str, Any]:
        """
        Handle navigation queries by helping users find content on the website.
        
        Args:
            query: The user's query
            analysis: Query analysis results
            knowledge: Retrieved knowledge
            context: Optional conversation context
            language: Language code
            
        Returns:
            Navigation response data
        """
        entities = analysis.get("entities", {})
        qa_items = knowledge.get("qa_items", [])
        
        # Extract navigation targets
        categories = entities.get("categories", [])
        products = entities.get("products", [])
        features = entities.get("features", [])
        
        # Generate navigation assistance
        nav_context = {
            "query": query,
            "categories": categories,
            "products": products,
            "features": features,
            "related_qa": [q.get("question") + ": " + q.get("answer") for q in qa_items[:3]],
            "user_context": context.model_dump() if context else {}
        }
        
        system_prompt = await self._get_system_prompt(language)
        nav_instructions = """
Pomoz zákazníkovi s navigací na e-shopu. Zaměř se na:
1. Přesné pokyny, kde požadovaný obsah najít
2. Jasné kroky k dosažení cíle
3. Alternativní způsoby, jak se k obsahu dostat
4. Stručná a přímá navigační pomoc

Pokud nemáš přesné informace o struktuře e-shopu, poskytni obecnější navigační rady.
Buď konkrétní, ale zároveň flexibilní, aby zákazník mohl navigační rady snadno následovat.
""" if language == "cs" else """
Help the customer navigate the e-shop. Focus on:
1. Precise instructions on where to find the requested content
2. Clear steps to reach the goal
3. Alternative ways to access the content
4. Concise and direct navigation assistance

If you don't have exact information about the e-shop structure, provide more general navigation advice.
Be specific but also flexible so the customer can easily follow the navigation tips.
"""
        
        try:
            # Create a prompt for Gemini
            full_prompt = f"{system_prompt}\n\n{nav_instructions}\n\nPomoz s navigací na e-shopu: {json_safe_dumps(nav_context)}"
            
            # Create a generation config
            generation_config = {
                "temperature": 0.3,
                "max_output_tokens": 1024,
                "top_p": 0.95,
                "top_k": 40
            }
            
            # Call Gemini API
            model = genai.GenerativeModel('gemini-1.5-pro')
            response = await asyncio.to_thread(
                model.generate_content,
                full_prompt,
                generation_config=generation_config
            )
            
            nav_text = response.text.strip()
            
            return {
                "reply": nav_text,
                "confidence": 0.8,
                "source": "navigation_assistance",
                "navigation_targets": {
                    "categories": categories,
                    "products": products,
                    "features": features
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error generating navigation assistance: {str(e)}")
            
            # Fallback navigation assistance
            if categories:
                target = categories[0]
            elif products:
                target = products[0]
            else:
                target = "požadovaný obsah" if language == "cs" else "the requested content"
            
            if language == "cs":
                fallback = f"Pro nalezení {target} se podívejte do hlavního menu našeho e-shopu a vyberte odpovídající kategorii. "
                fallback += "Případně můžete využít vyhledávací pole v horní části webu."
            else:
                fallback = f"To find {target}, look in the main menu of our e-shop and select the corresponding category. "
                fallback += "Alternatively, you can use the search box at the top of the website."
            
            return {
                "reply": fallback,
                "confidence": 0.6,
                "source": "navigation_assistance"
            }
    
    async def _generate_general_response(self,
                                    query: str,
                                    analysis: Dict[str, Any],
                                    knowledge: Dict[str, Any],
                                    context: Optional[EnhancedConversationContext] = None,
                                    language: str = "cs",
                                    user_id: Optional[str] = None  # Add user_id parameter
                                    ) -> Dict[str, Any]:
        """
        Generate a general response for queries that don't fit specialized categories.
        
        Args:
            query: The user's query
            analysis: Query analysis results
            knowledge: Retrieved knowledge
            context: Optional conversation context
            language: Language code
            user_id: Optional user ID to filter by tenant
            
        Returns:
            General response data
        """
        qa_items = knowledge.get("qa_items", [])
        products = knowledge.get("products", [])
        
        # Find best QA match first
        best_match = None
        best_score = 0
        
        if qa_items:
            for item in qa_items:
                score = self._compute_query_similarity(query, item.get("question", ""))
                if score > best_score:
                    best_score = score
                    best_match = item
        
        # If we have a good match, use its answer
        if best_match and best_score > 0.6:
            return {
                "reply": best_match.get("answer", ""),
                "confidence": best_score,
                "source": "qa_database",
                "qa_item": best_match
            }
        
        # Otherwise, generate a response with AI
        # Create a JSON-safe context dictionary
        user_context_data = context.model_dump() if context else {}
        
        response_context = {
            "query": query,
            "products": [self._format_product_data(p) for p in products[:2]],
            "related_qa": [q.get("question") + ": " + q.get("answer") for q in qa_items[:3]],
            "user_context": user_context_data
        }
        
        system_prompt = await self._get_system_prompt(language)
        general_instructions = """
    Odpověz na obecný dotaz zákazníka. Zaměř se na:
    1. Poskytnutí užitečných informací, které přímo odpovídají na dotaz
    2. Stručnost a jasnost
    3. Přátelský, ale profesionální tón
    4. Pokud je to relevantní, zmínku o produktech

    Odpověď má být informativní, ale ne příliš dlouhá.
    Pokud nemáš přesné informace, nabídni alternativní odpověď nebo způsob, jak se k informaci dostat.
    """ if language == "cs" else """
    Respond to a general customer query. Focus on:
    1. Providing useful information that directly answers the query
    2. Brevity and clarity
    3. Friendly but professional tone
    4. If relevant, mention of products

    The response should be informative but not too long.
    If you don't have accurate information, offer an alternative answer or way to get the information.
    """
        
        try:
            # Create a prompt for Gemini
            full_prompt = f"{system_prompt}\n\n{general_instructions}\n\nOdpověz na obecný dotaz: {json_safe_dumps(response_context)}"
            
            # Create a generation config
            generation_config = {
                "temperature": 0.5,
                "max_output_tokens": 1024,
                "top_p": 0.95,
                "top_k": 40
            }
            
            # Call Gemini API
            model = genai.GenerativeModel('gemini-1.5-pro')
            response = await asyncio.to_thread(
                model.generate_content,
                full_prompt,
                generation_config=generation_config
            )
            
            general_text = response.text.strip()
            
            return {
                "reply": general_text,
                "confidence": 0.7,
                "source": "general_qa",
                "products": products[:2],
                "qa_items": qa_items[:3]
            }
            
        except Exception as e:
            self.logger.error(f"Error generating general response: {str(e)}")
            
            # Fallback general response
            if language == "cs":
                fallback = "Omlouvám se, ale na tuto otázku nemohu momentálně odpovědět. Můžete prosím položit otázku jinak nebo se zeptat na něco jiného?"
            else:
                fallback = "I'm sorry, but I cannot answer this question at the moment. Could you please rephrase the question or ask about something else?"
            
            return {
                "reply": fallback,
                "confidence": 0.4,
                "source": "fallback"
            }
    
    async def _score_products_for_recommendation(self,
                                            products: List[Dict],
                                            entities: Dict[str, Any],
                                            context: Optional[EnhancedConversationContext] = None
                                           ) -> List[Dict]:
        """
        Score products for recommendation based on user preferences and requirements.
        
        Args:
            products: List of product dictionaries
            entities: Entities extracted from query
            context: Optional conversation context
            
        Returns:
            List of scored products with score components
        """
        scored_products = []
        
        for product in products:
            # Initialize score components
            score_components = {
                "feature_score": 0.0,
                "price_score": 0.0,
                "category_score": 0.0,
                "brand_score": 0.0,
                "semantic_score": 0.0,
                "admin_priority_score": 0.0
            }
            
            # Feature matching
            required_features = entities.get("features", [])
            if context and context.required_features:
                required_features.extend(context.required_features)
            
            product_features = set(product.get("features", []))
            if required_features and product_features:
                matching_features = [f for f in required_features if any(
                    feature.lower() in f.lower() or f.lower() in feature.lower() 
                    for feature in product_features
                )]
                if required_features:
                    score_components["feature_score"] = len(matching_features) / len(required_features)
            
            # Price matching
            price_range = entities.get("price_range", {})
            if not price_range and context and context.budget_range:
                price_range = context.budget_range
            
            if price_range:
                product_price = self._extract_price_value(product)
                if product_price:
                    min_price = price_range.get("min")
                    max_price = price_range.get("max")
                    
                    # Handle infinity values before comparison
                    if max_price is not None and math.isinf(max_price):
                        max_price = float('1e9')  # Use a large number instead of infinity
                    
                    if min_price is not None and max_price is not None:
                        if min_price <= product_price <= max_price:
                            # Perfect price match
                            score_components["price_score"] = 1.0
                        elif product_price < min_price:
                            # Below minimum price (might be good for budget)
                            price_diff_ratio = min_price / product_price if product_price > 0 else 0
                            score_components["price_score"] = max(0, 1 - min(price_diff_ratio, 1))
                        else:
                            # Above maximum price
                            price_diff_ratio = product_price / max_price if max_price > 0 else float('inf')
                            score_components["price_score"] = max(0, 1 - min(price_diff_ratio - 1, 1))
                    elif min_price is not None and product_price >= min_price:
                        score_components["price_score"] = 0.8
                    elif max_price is not None and product_price <= max_price:
                        score_components["price_score"] = 0.8
            
            # Category matching
            categories = entities.get("categories", [])
            if not categories and context and context.category:
                categories = [context.category]
            
            if categories and product.get("category"):
                if product.get("category") in categories:
                    score_components["category_score"] = 1.0
                elif any(category.lower() in product.get("category").lower() 
                       or product.get("category").lower() in category.lower() for category in categories):
                    score_components["category_score"] = 0.7
            
            # Brand matching
            brands = entities.get("brands", [])
            if brands and product.get("brand"):
                if product.get("brand") in brands:
                    score_components["brand_score"] = 1.0
                elif any(brand.lower() in product.get("brand").lower() for brand in brands):
                    score_components["brand_score"] = 0.8
            
            # Admin priority (if available)
            admin_priority = product.get("admin_priority", 0)
            if admin_priority > 0:
                score_components["admin_priority_score"] = min(admin_priority / 10, 1.0)
            
            # Calculate aggregate score
            weights = {
                "feature_score": 0.3,
                "price_score": 0.25,
                "category_score": 0.2,
                "brand_score": 0.1,
                "semantic_score": 0.05,
                "admin_priority_score": 0.1
            }
            
            total_score = sum(score * weights[key] for key, score in score_components.items())
            
            # Add to scored products
            scored_products.append({
                "product": product,
                "score": total_score,
                "score_components": score_components
            })
        
        return scored_products
    
    def _compute_query_similarity(self, query: str, reference: str) -> float:
        """
        Compute simple similarity between query and reference text.
        
        Args:
            query: User query
            reference: Reference text
            
        Returns:
            Similarity score between 0 and 1
        """
        # Normalize texts
        query_norm = query.lower()
        reference_norm = reference.lower()
        
        # Extract words (simple tokenization)
        query_words = set(re.findall(r'\w+', query_norm))
        reference_words = set(re.findall(r'\w+', reference_norm))
        
        # Calculate word overlap (Jaccard similarity)
        if not query_words or not reference_words:
            return 0.0
        
        intersection = query_words.intersection(reference_words)
        union = query_words.union(reference_words)
        
        return len(intersection) / len(union)
    
    def _extract_price_value(self, product: Dict) -> Optional[float]:
        """Extract price value from product data with multiple fallbacks."""
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
    
    def _format_price(self, product: Dict) -> str:
        """Format price information from a product dictionary."""
        pricing = product.get("pricing", {})
        
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
    
    def _format_product_data(self, product: Dict) -> Dict:
        """
        Format product data for use in prompts and responses.
        
        Args:
            product: Product dictionary
            
        Returns:
            Formatted product data dictionary
        """
        # Extract basic product info
        formatted = {
            "name": product.get("product_name", ""),
            "description": product.get("description", ""),
            "category": product.get("category", ""),
            "price": self._format_price(product),
            "features": product.get("features", []),
            "id": str(product.get("_id", ""))
        }
        
        # Add technical specifications if available
        if product.get("technical_specifications"):
            formatted["specs"] = product.get("technical_specifications")
        
        # Add pros and cons if available
        if product.get("pros"):
            formatted["pros"] = product.get("pros")
        if product.get("cons"):
            formatted["cons"] = product.get("cons")
        
        return formatted
    
    async def _generate_relevant_followup_questions(self, 
                                          analysis: Dict[str, Any],
                                          response_data: Dict[str, Any],
                                          language: str = "cs"
                                         ) -> List[str]:
        """
        Generate intelligent follow-up questions based on query analysis, response data, and available product information.
        
        Args:
            analysis: Query analysis results
            response_data: Response data generated by the AI
            language: Language code
            
        Returns:
            List of contextually relevant follow-up questions
        """
        intent = analysis.get("intent", "general_question")
        entities = analysis.get("entities", {})
        products = response_data.get("products", [])
        knowledge_items = response_data.get("qa_items", [])
        
        # Extract original query from analysis to understand context better
        original_query = analysis.get("query", "")
        ai_response_text = response_data.get("response", "")
        
        # First try to use Gemini API to generate follow-up questions
        try:
            # Prepare prompt for the API
            if language == "cs":
                prompt = f"""
                Uživatel se zeptal: "{original_query}"
                
                AI odpověděla: "{ai_response_text}"
                
                Na základě této konverzace vygeneruj 3 přirozené návazující otázky, které by mohl uživatel položit.
                Otázky musí být vysoce relevantní k obsahu konverzace - pokud se mluví o webových stránkách, webhostingu nebo 
                službách, zaměř se na otázky o cenách, podmínkách, délce poskytování nebo technických detailech služeb.
                
                Otázky musí vypadat, jako by je psal sám uživatel - měly by být v 1. osobě (např. "Jaký je...", "Kolik stojí...", "Můžu...").
                Otázky napište česky a formulujte je jako přímé dotazy.
                
                Odpovězte pouze seznamem 3 otázek, každá na samostatném řádku. Nic jiného nepřidávejte.
                """
            else:
                prompt = f"""
                User asked: "{original_query}"
                
                AI responded: "{ai_response_text}"
                
                Based on this conversation, generate 3 natural follow-up questions that the user might ask.
                Questions must be highly relevant to the conversation content - if the conversation is about websites, web hosting or 
                services, focus on questions about pricing, terms, service duration or technical details of the services.
                
                The questions should look like the user wrote them - they should be in 1st person (e.g., "What is...", "How much does...", "Can I...").
                
                Respond with only a list of 3 questions, one per line. Don't add anything else.
                """
            
            # Add context about products if available
            if products:
                product_info = ", ".join([p.get("name", "") for p in products[:3]])
                if language == "cs":
                    prompt += f"\n\nKontext: V odpovědi se zmiňují tyto produkty: {product_info}."
                else:
                    prompt += f"\n\nContext: The response mentions these products: {product_info}."
            
            # Add context about the intent if available
            if intent and intent != "general_question":
                intent_map = {
                    "product_recommendation": "doporučení produktu" if language == "cs" else "product recommendation",
                    "product_comparison": "porovnání produktů" if language == "cs" else "product comparison",
                    "technical_explanation": "technické vysvětlení" if language == "cs" else "technical explanation",
                    "customer_service": "zákaznický servis" if language == "cs" else "customer service"
                }
                mapped_intent = intent_map.get(intent, intent)
                if language == "cs":
                    prompt += f"\n\nKontext: Záměr uživatele je {mapped_intent}."
                else:
                    prompt += f"\n\nContext: The user's intent is {mapped_intent}."
            
            # Call Gemini API to generate questions
            try:
                model = genai.GenerativeModel('gemini-1.5-pro')
                response = await model.generate_content_async(prompt)
                if response and response.text:
                    # Process response to get individual questions
                    questions = [q.strip() for q in response.text.strip().split('\n') if q.strip()]
                    # Only keep questions that end with a question mark for quality control
                    questions = [q for q in questions if q.endswith('?')]
                    # Return 2-3 questions
                    if questions and len(questions) >= 2:
                        return questions[:3]  # Return up to 3 questions
            except Exception as e:
                self.logger.error(f"Error with Gemini API: {str(e)}")
                # Fall through to backup method
                
            # If Gemini fails, try OpenAI as backup
            try:
                response = await openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You generate natural follow-up questions based on user conversations."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=150,
                    temperature=0.7
                )
                if response and response.choices:
                    content = response.choices[0].message.content
                    questions = [q.strip() for q in content.strip().split('\n') if q.strip()]
                    questions = [q for q in questions if q.endswith('?')]
                    if questions and len(questions) >= 2:
                        return questions[:3]
            except Exception as e:
                self.logger.error(f"Error with OpenAI API: {str(e)}")
                # Fall through to backup method
        
        except Exception as e:
            self.logger.error(f"Error generating AI-based follow-up questions: {str(e)}")
            # Fall through to traditional method
        
        # Fallback to traditional method if API approach failed
        # Track all potential follow-up questions
        potential_questions = []
        
        # Weight factors for question relevance scoring
        context_matching_score = 0.5  # Increased to prioritize context
        knowledge_base_score = 0.4    # Increased for product relevance
        intent_relevance_score = 0.3
        
        try:
            # Advanced context analysis - extract keywords from original query
            query_keywords = self._extract_query_keywords(original_query, language)
            
            # 1. Generate intent-specific questions with higher context awareness
            intent_questions = await self._generate_intent_aware_questions(intent, entities, query_keywords, language)
            for question in intent_questions:
                potential_questions.append({
                    "question": question,
                    "score": intent_relevance_score + 0.1,  # Slightly higher score for new method
                    "type": "intent_based"
                })
                
            # 2. Generate questions based on missing information in user context
            if entities:
                context_questions = await self._generate_context_filling_questions(entities, analysis, language)
                for question, score in context_questions:
                    potential_questions.append({
                        "question": question,
                        "score": context_matching_score * score,  # Apply the base weight and the specific score
                        "type": "context_filling"
                    })
                
            # 3. Generate product-specific questions if products exist in response
            if products:
                product_questions = await self._generate_product_specific_questions(products, entities, language)
                for question, score in product_questions:
                    potential_questions.append({
                        "question": question,
                        "score": knowledge_base_score * score,
                        "type": "product_specific" 
                    })
                    
                # Add new category-aware product questions
                if "category" in entities and entities["category"]:
                    category_questions = self._generate_category_specific_questions(entities["category"], language)
                    for question, score in category_questions:
                        potential_questions.append({
                            "question": question,
                            "score": knowledge_base_score * score * 1.2,  # Higher priority for category questions
                            "type": "category_specific"
                        })
                
            # 4. Generate knowledge-base specific questions from QA items
            if knowledge_items:
                kb_questions = self._generate_kb_questions(knowledge_items, language)
                for question, score in kb_questions:
                    potential_questions.append({
                        "question": question,
                        "score": knowledge_base_score * score,
                        "type": "knowledge_based"
                    })
                    
            # 5. Handle the case of recommendations specifically
            if intent == "product_recommendation" and "recommended_products" in response_data:
                rec_questions = self._generate_recommendation_followups(
                    response_data["recommended_products"],
                    language
                )
                for question, score in rec_questions:
                    potential_questions.append({
                        "question": question, 
                        "score": 0.8 * score,  # High priority for recommendation follow-ups
                        "type": "recommendation"
                    })
                    
            # 6. NEW: Generate questions based on detected use case
            use_case_questions = self._generate_use_case_questions(original_query, intent, entities, language)
            for question, score in use_case_questions:
                potential_questions.append({
                    "question": question,
                    "score": 0.75 * score,  # High priority for use case questions
                    "type": "use_case"
                })
                
            # Sort questions by score and ensure diversity
            if potential_questions:
                # Sort by score (descending)
                potential_questions.sort(key=lambda x: x["score"], reverse=True)
                
                # Ensure diversity by taking top questions but also considering type diversity
                selected_questions = []
                
                # First, take the top overall question
                if potential_questions:
                    selected_questions.append(potential_questions[0]["question"])
                    question_types_used = {potential_questions[0]["type"]}
                    
                # Then try to get questions of different types
                for q in potential_questions[1:]:
                    if len(selected_questions) >= 3:
                        break
                        
                    # If we haven't used this question type yet, prioritize it
                    if q["type"] not in question_types_used:
                        selected_questions.append(q["question"])
                        question_types_used.add(q["type"])
                
                # If we still need more questions, add highest-scored remaining ones
                remaining_slots = 3 - len(selected_questions)
                if remaining_slots > 0:
                    for q in potential_questions:
                        if q["question"] not in selected_questions and len(selected_questions) < 3:
                            selected_questions.append(q["question"])
                
                return selected_questions
        
            # If we couldn't generate any meaningful questions, fall back to generic ones
            return self._get_generic_followup_questions(language)
                
        except Exception as e:
            self.logger.error(f"Error generating follow-up questions: {str(e)}")
            # Fallback to simple generic questions
            return self._get_generic_followup_questions(language)
    
    def _extract_query_keywords(self, query: str, language: str = "cs") -> List[str]:
        """Extract important keywords from the user query."""
        if not query:
            return []
            
        # Simple stopword removal (would be better with a proper NLP library)
        stopwords_cs = ["a", "v", "na", "se", "je", "to", "jak", "pro", "s", "i", "nebo", "co", "bych", "jsem", "by"]
        stopwords_en = ["the", "a", "is", "in", "for", "or", "and", "how", "what", "i", "would", "am", "with"]
        
        stopwords = stopwords_cs if language == "cs" else stopwords_en
        
        # Simple word tokenization and filtering
        words = query.lower().replace("?", "").replace("!", "").replace(".", "").split()
        keywords = [word for word in words if word not in stopwords and len(word) > 2]
        
        return keywords
        
    async def _generate_intent_aware_questions(self, 
                                     intent: str, 
                                     entities: Dict[str, Any],
                                     keywords: List[str],
                                     language: str = "cs"
                                    ) -> List[str]:
        """Generate questions that are aware of intent and extracted keywords."""
        # Get standard intent questions first
        base_questions = self._get_intent_specific_questions(intent, language)
        
        # If we don't have many keywords or entities, return the base questions
        if len(keywords) < 2 and not entities:
            return base_questions
            
        result_questions = []
        
        # Enhance with keyword/entity awareness
        if intent == "product_recommendation":
            if language == "cs":
                if any(kw in keywords for kw in ["cena", "peníze", "rozpočet", "levný", "drahý"]):
                    result_questions.append("Jaký je váš cenový rozpočet na tento nákup?")
                    
                if any(kw in keywords for kw in ["vlastnost", "funkce", "parametr"]):
                    result_questions.append("Které konkrétní vlastnosti jsou pro vás nejdůležitější?")
                    
                if "značka" in keywords or "brand" in keywords:
                    result_questions.append("Máte preferovanou značku?")
                    
                # Get category-specific questions if available
                if "category" in entities and entities["category"]:
                    category = entities["category"]
                    if category == "kolo":
                        result_questions.append("Budete kolo používat spíše ve městě nebo v terénu?")
                    elif category == "notebook":
                        result_questions.append("Budete notebook používat spíše na práci nebo na hry?")
                    elif category == "telefon" or category == "smartphone":
                        result_questions.append("Je pro vás důležitější výdrž baterie nebo výkon?")
            else:
                # English versions
                if any(kw in keywords for kw in ["price", "money", "budget", "cheap", "expensive"]):
                    result_questions.append("What is your price budget for this purchase?")
                    
                if any(kw in keywords for kw in ["feature", "function", "parameter"]):
                    result_questions.append("Which specific features are most important to you?")
                    
                if "brand" in keywords:
                    result_questions.append("Do you have a preferred brand?")
        
        elif intent == "product_comparison":
            if language == "cs":
                if any(kw in keywords for kw in ["cena", "peníze", "rozpočet", "levný", "drahý"]):
                    result_questions.append("Při porovnání, je pro vás důležitější cena nebo kvalita?")
                    
                if any(kw in keywords for kw in ["výkon", "rychlost", "procesor"]):
                    result_questions.append("Jak vysoký výkon potřebujete pro vaše použití?")
            else:
                if any(kw in keywords for kw in ["price", "money", "budget", "cheap", "expensive"]):
                    result_questions.append("When comparing, is price or quality more important to you?")
                    
                if any(kw in keywords for kw in ["performance", "speed", "processor"]):
                    result_questions.append("How much performance do you need for your use case?")
        
        # Combine with base questions, but keep the enhanced ones at the top
        combined_questions = result_questions + [q for q in base_questions if q not in result_questions]
        
        # Return top 3 questions
        return combined_questions[:3]
        
    def _generate_category_specific_questions(self, category: str, language: str = "cs") -> List[Tuple[str, float]]:
        """Generate questions specific to product category."""
        questions = []
        
        if language == "cs":
            if category == "kolo":
                questions.extend([
                    ("Jaký je váš cenový rozpočet na tento nákup?", 0.9),
                    ("Na které funkce se mám při porovnání zaměřit?", 0.85),
                    ("Které konkrétní vlastnosti kolo jsou pro vás nejdůležitější?", 0.95)
                ])
            elif category == "notebook" or category == "laptop":
                questions.extend([
                    ("Jaký je váš cenový rozpočet na tento nákup?", 0.9),
                    ("Budete notebook používat spíše na práci nebo na hry?", 0.95),
                    ("Je pro vás důležitější výkon nebo výdrž baterie?", 0.9)
                ])
            elif category == "telefon" or category == "smartphone":
                questions.extend([
                    ("Jaký je váš cenový rozpočet na tento nákup?", 0.9),
                    ("Je pro vás důležitější fotoaparát nebo výdrž baterie?", 0.95),
                    ("Preferujete konkrétní značku nebo operační systém?", 0.9)
                ])
            elif category == "televize" or category == "tv":
                questions.extend([
                    ("Jaký je váš cenový rozpočet na tento nákup?", 0.9),
                    ("Jak velkou úhlopříčku hledáte?", 0.95),
                    ("Je pro vás důležitá kvalita obrazu nebo chytré funkce?", 0.9)
                ])
        else:
            # English versions
            if category == "bike" or category == "bicycle":
                questions.extend([
                    ("What is your price budget for this purchase?", 0.9),
                    ("Which features should I focus on when comparing?", 0.85),
                    ("Which specific bike features are most important to you?", 0.95)
                ])
            elif category == "notebook" or category == "laptop":
                questions.extend([
                    ("What is your price budget for this purchase?", 0.9),
                    ("Will you use the laptop more for work or for gaming?", 0.95),
                    ("Is performance or battery life more important to you?", 0.9)
                ])
        
        return questions
        
    def _generate_use_case_questions(self, 
                           query: str, 
                           intent: str, 
                           entities: Dict[str, Any],
                           language: str = "cs"
                          ) -> List[Tuple[str, float]]:
        """Generate questions based on detected use case from the query."""
        questions = []
        
        # Look for use case indicators in the query
        query_lower = query.lower()
        
        if language == "cs":
            # Czech use cases
            if any(term in query_lower for term in ["dítě", "děti", "dětské", "junior"]):
                if "category" in entities:
                    if entities["category"] == "kolo":
                        questions.append(("Jak staré je vaše dítě?", 0.95))
                        questions.append(("Jakou má vaše dítě výšku?", 0.9))
                    elif entities["category"] in ["telefon", "smartphone"]:
                        questions.append(("Chcete přidat rodičovskou kontrolu?", 0.95))
                        questions.append(("Je odolnost důležitým faktorem?", 0.9))
                else:
                    questions.append(("Pro jak staré dítě hledáte produkt?", 0.9))
            
            # Price sensitivity
            if any(term in query_lower for term in ["levný", "levně", "nejlevnější", "slevy", "cena", "akce"]):
                questions.append(("Jaký je váš maximální rozpočet?", 0.95))
                questions.append(("Je pro vás důležitější cena nebo kvalita?", 0.9))
            
            # Professional use
            if any(term in query_lower for term in ["práce", "pracovní", "profesionální", "kancelář"]):
                if "category" in entities:
                    if entities["category"] in ["notebook", "laptop"]:
                        questions.append(("Potřebujete notebook s dlouhou výdrží baterie?", 0.95))
                        questions.append(("Jaké programy budete na notebooku používat?", 0.9))
                    elif entities["category"] in ["telefon", "smartphone"]:
                        questions.append(("Potřebujete telefon s podporou firemních aplikací?", 0.9))
                else:
                    questions.append(("Jaké specifické pracovní úkoly budete s produktem provádět?", 0.9))
        else:
            # English use cases
            if any(term in query_lower for term in ["child", "children", "kid", "junior"]):
                if "category" in entities:
                    if entities["category"] == "bike" or entities["category"] == "bicycle":
                        questions.append(("How old is your child?", 0.95))
                        questions.append(("How tall is your child?", 0.9))
                    elif entities["category"] in ["phone", "smartphone"]:
                        questions.append(("Do you want to add parental controls?", 0.95))
                        questions.append(("Is durability an important factor?", 0.9))
                else:
                    questions.append(("For what age child are you looking for a product?", 0.9))
            
            # Price sensitivity
            if any(term in query_lower for term in ["cheap", "cheapest", "discount", "price", "deal"]):
                questions.append(("What is your maximum budget?", 0.95))
                questions.append(("Is price or quality more important to you?", 0.9))
            
            # Professional use
            if any(term in query_lower for term in ["work", "professional", "office", "business"]):
                if "category" in entities:
                    if entities["category"] in ["notebook", "laptop"]:
                        questions.append(("Do you need a laptop with long battery life?", 0.95))
                        questions.append(("What programs will you be using on the laptop?", 0.9))
                    elif entities["category"] in ["phone", "smartphone"]:
                        questions.append(("Do you need a phone with support for business applications?", 0.9))
                else:
                    questions.append(("What specific work tasks will you be performing with the product?", 0.9))
        
        return questions
    
    def _get_intent_specific_questions(self, intent: str, language: str = "cs") -> List[str]:
        """Get pre-defined follow-up questions for specific intents."""
        # Use the existing intent-based questions as a foundation
        if intent == "product_recommendation":
            if language == "cs":
                return [
                    "Jaké technické parametry vás nejvíce zajímají?",
                    "Máte konkrétní cenový rozpočet?",
                    "Potřebujete i nějaké příslušenství?"
                ]
            else:
                return [
                    "Which technical parameters are you most interested in?",
                    "Do you have a specific price budget?",
                    "Do you need any accessories?"
                ]
        
        # Product comparison follow-ups
        elif intent == "product_comparison":
            if language == "cs":
                return [
                    "Na které funkce se mám při porovnání zaměřit?",
                    "Je pro vás důležitější cena nebo kvalita?",
                    "Máte zájem o podrobnější porovnání technických specifikací?"
                ]
            else:
                return [
                    "Which features should I focus on when comparing?",
                    "Is price or quality more important to you?",
                    "Are you interested in a more detailed comparison of technical specifications?"
                ]
        
        # Continue with other intent types as in the original method
        # ... [existing code for other intent types]
        # Technical explanation follow-ups
        elif intent == "technical_explanation":
            if language == "cs":
                return [
                    "Mám vám vysvětlit ještě nějaké další technické parametry?",
                    "Zajímá vás, jak tyto funkce ovlivňují běžné používání?",
                    "Chcete vědět, jaké alternativní technologie jsou dostupné?"
                ]
            else:
                return [
                    "Should I explain any other technical parameters?",
                    "Are you interested in how these features affect everyday use?",
                    "Would you like to know what alternative technologies are available?"
                ]
        
        # Accessory recommendation follow-ups
        elif intent == "accessory_recommendation":
            if language == "cs":
                return [
                    "Hledáte spíše nezbytné nebo volitelné příslušenství?",
                    "Máte konkrétní rozpočet na příslušenství?",
                    "Je pro vás důležitá konkrétní značka příslušenství?"
                ]
            else:
                return [
                    "Are you looking for essential or optional accessories?",
                    "Do you have a specific budget for accessories?",
                    "Is a specific brand of accessories important to you?"
                ]
        
        # Customer service follow-ups
        elif intent in ["customer_service", "shipping_payment"]:
            if language == "cs":
                return [
                    "Potřebujete další informace o záruce nebo reklamacích?",
                    "Mám vám vysvětlit procesální postup?",
                    "Zajímají vás konkrétní platební možnosti?"
                ]
            else:
                return [
                    "Do you need more information about warranty or complaints?",
                    "Should I explain the procedural process?",
                    "Are you interested in specific payment options?"
                ]
        
        # General questions follow-ups
        else:
            return self._get_generic_followup_questions(language)

    def _get_generic_followup_questions(self, language: str = "cs") -> List[str]:
        """Get generic follow-up questions when specific ones can't be generated."""
        if language == "cs":
            return [
                "Jaké jsou cenové podmínky vašich služeb?",
                "Jak mohu objednat vaše služby nebo produkty?",
                "Nabízíte nějaké speciální slevy nebo akce?"
            ]
        else:
            return [
                "What are the pricing conditions for your services?",
                "How can I order your services or products?",
                "Do you offer any special discounts or promotions?"
            ]

    async def _generate_context_filling_questions(self, 
                                       entities: Dict[str, Any], 
                                       analysis: Dict[str, Any],
                                       language: str = "cs"
                                      ) -> List[Tuple[str, float]]:
        """
        Generate questions to fill gaps in user context.
        
        Args:
            entities: Extracted entities from query
            analysis: Complete query analysis
            language: Language code
            
        Returns:
            List of (question, relevance_score) tuples
        """
        questions = []
        
        # Check for missing price range when discussing products
        if (not entities.get("price_range") or 
            (entities.get("price_range", {}).get("min") is None and 
             entities.get("price_range", {}).get("max") is None)):
            
            if language == "cs":
                questions.append((
                    "Jaký je váš cenový rozpočet na tento nákup?", 
                    0.9 if analysis.get("intent") in ["product_recommendation", "product_comparison"] else 0.6
                ))
            else:
                questions.append((
                    "What is your budget for this purchase?", 
                    0.9 if analysis.get("intent") in ["product_recommendation", "product_comparison"] else 0.6
                ))
        
        # Check for missing features when discussing products
        if not entities.get("features") and analysis.get("intent") in ["product_recommendation", "technical_explanation"]:
            if language == "cs":
                questions.append((
                    "Jaké konkrétní funkce nebo vlastnosti jsou pro vás nejdůležitější?", 
                    0.85
                ))
            else:
                questions.append((
                    "What specific features or characteristics are most important to you?", 
                    0.85
                ))
        
        # Check for missing brand preferences
        if not entities.get("brands") and entities.get("products"):
            if language == "cs":
                questions.append((
                    "Preferujete konkrétní značku produktu?", 
                    0.7
                ))
            else:
                questions.append((
                    "Do you prefer a specific brand?", 
                    0.7
                ))
        
        # Check for missing category when no specific products mentioned
        if not entities.get("categories") and not entities.get("products"):
            if language == "cs":
                questions.append((
                    "V jaké kategorii produktů hledáte?", 
                    0.8
                ))
            else:
                questions.append((
                    "In which product category are you looking?", 
                    0.8
                ))
        
        # If purpose/use case is missing for technical products
        if entities.get("products") or entities.get("categories"):
            # Look for purpose-related tokens in the query text
            purpose_tokens = ["pro", "za účelem", "používat", "potřebuji na", "for", "purpose", "use", "need it for"]
            has_purpose = False
            
            query = analysis.get("query", "")
            if query:
                for token in purpose_tokens:
                    if token in query.lower():
                        has_purpose = True
                        break
            
            if not has_purpose:
                if language == "cs":
                    questions.append((
                        "K jakému účelu budete produkt používat?", 
                        0.75
                    ))
                else:
                    questions.append((
                        "For what purpose will you be using the product?", 
                        0.75
                    ))
        
        return questions

    async def _generate_product_specific_questions(self, 
                                        products: List[Dict], 
                                        entities: Dict[str, Any],
                                        language: str = "cs"
                                       ) -> List[Tuple[str, float]]:
        """
        Generate follow-up questions specific to products in the response.
        
        Args:
            products: List of product dictionaries
            entities: Extracted entities from query
            language: Language code
            
        Returns:
            List of (question, relevance_score) tuples
        """
        questions = []
        
        if not products:
            return questions
        
        # Extract product features to mention
        all_features = set()
        for product in products:
            if product.get("features"):
                all_features.update(product.get("features", []))
        
        # Get most common categories among products
        categories = {}
        for product in products:
            category = product.get("category")
            if category:
                categories[category] = categories.get(category, 0) + 1
        
        # If we have multiple products from same category, ask about distinguishing features
        if len(products) > 1 and len(categories) == 1:
            category = list(categories.keys())[0]
            if language == "cs":
                questions.append((
                    f"Které konkrétní vlastnosti {category} jsou pro vás nejdůležitější?", 
                    0.9
                ))
            else:
                questions.append((
                    f"Which specific {category} features are most important to you?", 
                    0.9
                ))
        
        # If we have products with accessories, ask about accessories
        has_accessories = False
        for product in products:
            if product.get("compatible_accessories"):
                has_accessories = True
                break
        
        if has_accessories:
            if language == "cs":
                questions.append((
                    "Máte zájem i o příslušenství k těmto produktům?", 
                    0.8
                ))
            else:
                questions.append((
                    "Are you also interested in accessories for these products?", 
                    0.8
                ))
        
        # If there are technical specifications, ask about technical details
        has_tech_specs = False
        for product in products:
            if product.get("technical_specifications"):
                has_tech_specs = True
                break
        
        if has_tech_specs and "features" not in entities:
            if language == "cs":
                questions.append((
                    "Zajímají vás některé technické specifikace podrobněji?", 
                    0.85
                ))
            else:
                questions.append((
                    "Are you interested in more details about certain technical specifications?", 
                    0.85
                ))
        
        # Product use case question if there are specialized products
        specialized_categories = ["nástroj", "tool", "professional", "profi", "enterprise", "gaming"]
        for product in products:
            category = product.get("category", "").lower()
            if any(spec in category for spec in specialized_categories):
                if language == "cs":
                    questions.append((
                        "K jakému konkrétnímu účelu budete produkt používat?", 
                        0.8
                    ))
                else:
                    questions.append((
                        "For what specific purpose will you be using the product?", 
                        0.8
                    ))
                break
        
        return questions

    def _generate_kb_questions(self, 
                      knowledge_items: List[Dict], 
                      language: str = "cs"
                     ) -> List[Tuple[str, float]]:
        """
        Generate follow-up questions based on knowledge base items.
        
        Args:
            knowledge_items: List of QA item dictionaries
            language: Language code
            
        Returns:
            List of (question, relevance_score) tuples
        """
        questions = []
        
        for item in knowledge_items:
            # Check if the QA item has related questions
            related_questions = item.get("related_questions", [])
            if related_questions:
                for question in related_questions[:2]:  # Limit to 2 per item
                    questions.append((question, 0.9))  # High score for DB-sourced questions
        
        # If no related questions found but we have categories
        categories = set()
        for item in knowledge_items:
            if item.get("category"):
                categories.add(item.get("category"))
        
        # Generate questions based on knowledge categories
        for category in categories:
            if category == "shipping":
                if language == "cs":
                    questions.append((
                        "Zajímají vás další možnosti dopravy?", 
                        0.8
                    ))
                else:
                    questions.append((
                        "Are you interested in other shipping options?", 
                        0.8
                    ))
            elif category == "payment":
                if language == "cs":
                    questions.append((
                        "Chcete znát dostupné platební metody?", 
                        0.8
                    ))
                else:
                    questions.append((
                        "Would you like to know the available payment methods?", 
                        0.8
                    ))
            elif category == "warranty":
                if language == "cs":
                    questions.append((
                        "Potřebujete více informací o zárukách a reklamacích?", 
                        0.8
                    ))
                else:
                    questions.append((
                        "Do you need more information about warranties and returns?", 
                        0.8
                    ))
        
        return questions

    def _generate_recommendation_followups(self, 
                                  recommendations: List[Dict], 
                                  language: str = "cs"
                                 ) -> List[Tuple[str, float]]:
        """
        Generate follow-up questions for product recommendations.
        
        Args:
            recommendations: List of recommended product dictionaries
            language: Language code
            
        Returns:
            List of (question, relevance_score) tuples
        """
        questions = []
        
        if not recommendations:
            return questions
        
        # If there are multiple recommendations, ask about preference
        if len(recommendations) > 1:
            product_names = [r["product"].get("product_name", "product") for r in recommendations[:2]]
            if language == "cs":
                questions.append((
                    f"Který z produktů vás zaujal více: {product_names[0]} nebo {product_names[1]}?", 
                    0.95  # Very high relevance
                ))
            else:
                questions.append((
                    f"Which product interests you more: {product_names[0]} or {product_names[1]}?", 
                    0.95
                ))
        
        # Ask about features or price
        features_or_price = []
        for r in recommendations:
            # Check if score components exist and which is higher
            score_components = r.get("score_components", {})
            feature_score = score_components.get("feature_score", 0)
            price_score = score_components.get("price_score", 0)
            
            if feature_score > price_score:
                features_or_price.append("features")
            else:
                features_or_price.append("price")
        
        # Count which is more common
        features_count = features_or_price.count("features")
        price_count = features_or_price.count("price")
        
        # Ask about the less represented aspect
        if features_count < price_count:
            if language == "cs":
                questions.append((
                    "Jak důležité jsou pro vás další funkce oproti ceně?", 
                    0.9
                ))
            else:
                questions.append((
                    "How important are additional features compared to price for you?", 
                    0.9
                ))
        else:
            if language == "cs":
                questions.append((
                    "Je pro vás cena důležitějším faktorem než funkce produktu?", 
                    0.9
                ))
            else:
                questions.append((
                    "Is price a more important factor for you than product features?", 
                    0.9
                ))
        
        return questions
    
    async def _infer_products_from_context(self, 
                                      query: str, 
                                      context: EnhancedConversationContext
                                     ) -> List[str]:
        """
        Infer likely product references from context and query.
        
        Args:
            query: User query
            context: Conversation context
            
        Returns:
            List of inferred product names
        """
        # Start with empty list
        inferred_products = []
        
        # Use category to infer product domain
        if context.category:
            # Check if the query contains terms that are likely product references
            category_terms = {
                "smartphone": ["telefon", "mobil", "smartphone", "iphone", "samsung", "xiaomi"],
                "notebook": ["notebook", "laptop", "počítač", "macbook", "lenovo", "hp", "dell"],
                "televize": ["televize", "tv", "televizor", "smart tv", "led", "oled"],
                "kolo": ["kolo", "bicykl", "bike", "elektrokolo"],
                # Add more as needed
            }
            
            # Match terms to the current category
            if context.category in category_terms:
                relevant_terms = category_terms[context.category]
                # Check if any terms exist in the query
                for term in relevant_terms:
                    if term.lower() in query.lower():
                        inferred_products.append(term)
        
        # If we already have previous references to products in the context
        if context.attributes and "product_references" in context.attributes:
            inferred_products.extend(context.attributes["product_references"])
        
        # Return unique inferred products
        return list(set(inferred_products))

# --- End of AIService Class ---
