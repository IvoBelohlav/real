import os
from typing import Dict, List, Optional, Any
from openai import AsyncOpenAI, APIError, RateLimitError, APITimeoutError
import logging
from dotenv import load_dotenv
from app.utils.logging_config import get_module_logger

load_dotenv()

# Initialize async client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
logger = get_module_logger(__name__)

class ChatConfig:
    SYSTEM_PROMPTS = {
        "cs": """Jste profesionální chatbot pro DvojkavIT, který pomáhá klientům s jejich digitálními potřebami.

Vaše odpovědi musí být:
- Stručné (max 200 znaků)
- Formální (používejte vykání)
- Přátelské a profesionální
- Vždy v češtině

Při odpovědích na dotazy:
- Zaměřte se na tvorbu webů, e-shopů a digitální řešení
- Zdůrazněte naši expertizu a partnerský přístup
- Zmiňte naše hodnoty: inovace, kreativita, osobní přístup
- Nabídněte komplexní řešení od návrhu po realizaci

Pokud nemáte přesnou odpověď, přiznejte to a navrhněte alternativní otázky.""",
        
        "en": """You are a professional chatbot for an e-commerce store, helping customers with product purchases.

Your responses must be:
- Concise (max 200 characters)
- Formal but friendly
- Professional
- Always in English

When responding to product queries:
- Be as specific as possible
- Mention key product features
- Include pricing information if available
- Recommend similar products when appropriate

If you don't have an accurate answer, acknowledge it and suggest alternative questions."""
    }
    FALLBACK_RESPONSES = {
        "cs": "Omlouvám se, ale momentálně nemohu zpracovat váš požadavek. Zkuste to prosím později.",
        "en": "I apologize, but I cannot process your request at the moment. Please try again later."
    }

    MAX_HISTORY_ITEMS = 5
    DEFAULT_MAX_TOKENS = 500
    TEMPERATURE = 0.7
    TIMEOUT = 30

async def generate_chat_response(
    query: str,
    conversation_history: List[Dict] = None,
    language: str = "cs",
    system_prompt: str = None,
    max_tokens: int = None,
    temperature: float = None
) -> Dict:
    """
    Generate a chat response using OpenAI with optimized settings and error handling.
    
    Args:
        query: User's query text
        conversation_history: Optional list of previous conversation messages
        language: Language code (default: "cs" for Czech)
        system_prompt: Optional custom system prompt
        max_tokens: Optional max tokens limit
        temperature: Optional temperature setting
        
    Returns:
        Dictionary with response data
    """
    try:
        logger.info(f"Processing query: {query} in {language}")

        # Use provided values or defaults
        _system_prompt = system_prompt or ChatConfig.SYSTEM_PROMPTS.get(language, ChatConfig.SYSTEM_PROMPTS["cs"])
        _max_tokens = max_tokens or ChatConfig.DEFAULT_MAX_TOKENS
        _temperature = temperature or ChatConfig.TEMPERATURE

        # Prepare messages with system prompt and limited history
        messages = [{
            "role": "system",
            "content": _system_prompt
        }]

        # Add limited conversation history if provided
        if conversation_history:
            history = conversation_history[-ChatConfig.MAX_HISTORY_ITEMS:]
            for item in history:
                if isinstance(item, dict) and "role" in item and "content" in item:
                    messages.append(item)
                elif isinstance(item, dict) and "user" in item and "assistant" in item:
                    messages.extend([
                        {"role": "user", "content": item["user"]},
                        {"role": "assistant", "content": item["assistant"]}
                    ])

        # Add current query
        messages.append({"role": "user", "content": query})

        logger.debug("Prepared messages for OpenAI API call")

        # Make API call with async client
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=_max_tokens,
            temperature=_temperature,
            presence_penalty=0.6,
            frequency_penalty=0.2,
            timeout=ChatConfig.TIMEOUT
        )

        reply = response.choices[0].message.content.strip()
        logger.info("Successfully generated response")

        return {
            "reply": reply,
            "confidence": 0.9 if response.choices[0].finish_reason == "stop" else 0.7,
            "model": "gpt-3.5-turbo",
            "processing_time": response.usage.total_tokens
        }

    except RateLimitError:
        logger.warning("OpenAI rate limit reached")
        return {
            "reply": ChatConfig.FALLBACK_RESPONSES[language],
            "confidence": 0.0,
            "model": "fallback",
            "error": "rate_limit"
        }

    except APITimeoutError:
        logger.warning("OpenAI API timeout")
        return {
            "reply": ChatConfig.FALLBACK_RESPONSES[language],
            "confidence": 0.0,
            "model": "fallback",
            "error": "timeout"
        }
        
    except APIError as e:
        logger.error(f"OpenAI API error: {str(e)}")
        return {
            "reply": ChatConfig.FALLBACK_RESPONSES[language],
            "confidence": 0.0,
            "model": "fallback",
            "error": "api_error"
        }

    except Exception as e:
        logger.error(f"Unexpected error in generate_chat_response: {str(e)}")
        return {
            "reply": ChatConfig.FALLBACK_RESPONSES[language],
            "confidence": 0.0,
            "model": "fallback",
            "error": "unexpected"
        }

async def analyze_text(
    text: str,
    instructions: str,
    language: str = "cs",
    output_format: str = "json",
    model: str = "gpt-3.5-turbo-1106"
) -> Dict:
    """
    Analyze text using OpenAI API to extract structured information.
    
    Args:
        text: Text to analyze
        instructions: Instructions for the analysis
        language: Language code (default: "cs" for Czech)
        output_format: Desired output format (default: "json")
        model: Model to use (default: "gpt-3.5-turbo-1106")
        
    Returns:
        Dictionary with analysis results
    """
    try:
        logger.info(f"Analyzing text (length: {len(text)}) in {language}")
        
        # Prepare system prompt based on language
        system_prompt = f"""
You are an expert text analysis assistant that extracts structured information.
Analyze the provided text according to the instructions and return the results in {output_format} format.
Be precise and objective in your analysis.
""" if language == "en" else f"""
Jste expertní asistent pro analýzu textu, který extrahuje strukturované informace.
Analyzujte poskytnutý text podle instrukcí a vraťte výsledky ve formátu {output_format}.
Buďte přesní a objektivní ve své analýze.
"""

        # Configure response format
        response_format = {"type": "json_object"} if output_format == "json" else None
        
        # Make API call with async client
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Instructions: {instructions}\n\nText to analyze: {text}"}
            ],
            response_format=response_format,
            temperature=0.3,
            max_tokens=1000
        )
        
        result = response.choices[0].message.content
        logger.info("Successfully analyzed text")
        
        # Try to parse as JSON if output format is json
        if output_format == "json":
            import json
            try:
                return json.loads(result)
            except json.JSONDecodeError:
                logger.warning("Failed to parse result as JSON, returning text")
                return {"text": result}
        
        return {"text": result}
        
    except Exception as e:
        logger.error(f"Error in text analysis: {str(e)}")
        return {"error": str(e)}
    