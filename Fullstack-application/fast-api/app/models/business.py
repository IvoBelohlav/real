from pydantic import BaseModel, Field, validator
from typing import Dict, Any, List, Optional

class BusinessType(BaseModel):
    type: str = Field(..., description="Type of business (e.g., 'retail', 'service')")
    attributes: Dict[str, Any] = Field(default_factory=dict, description="Business-specific attributes")
    query_patterns: List[str] = Field(default_factory=list, description="Regex patterns for recognizing queries related to this business type")
    response_templates: Dict[str, str] = Field(default_factory=dict, description="Templates for generating responses")
    validation_rules: Dict[str, Any] = Field(default_factory=dict, description="Rules for validating product data")
    category_configs: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="Configurations for categories within this business type")
    comparison_config: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Configuration for product comparisons") # NEW FIELD

    @validator('validation_rules')
    def validate_rules(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        # Only enforce required keys if the dictionary is not empty
        if v: # Check if the dictionary has content
            required_rules = ['product_name', 'category']
            for rule in required_rules:
                if rule not in v:
                    # If the dict is not empty but missing a required key, raise error
                    raise ValueError(f"Missing required validation rule: {rule}")
        # Return the original (potentially empty) dictionary if validation passes
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "type": "retail",
                "attributes": {
                    "store_type": "online",
                    "industry": "electronics"
                },
                "query_patterns": [
                    "do you have (.*) in stock",
                    "what is the price of (.*)",
                    "is (.*) available online"
                ],
                "response_templates": {
                    "product_availability": "Yes, the {product} is currently in stock.",
                    "price_inquiry": "The price of {product} is {price}."
                },
                "validation_rules": {
                    "product_name": {"required": True, "type": "string"},
                    "price": {"required": True, "type": "number", "min": 0}
                },
                "category_configs": {
                    "electronics": {
                        "key_features": ["display", "processor", "memory"],
                        "comparison_metrics": ["price_performance", "display_quality"]
                    }
                },
                "comparison_config": { 
                    "key_features": ["feature1", "feature2", "feature3"],
                    "comparison_metrics": ["metric1", "metric2"],
                    "recommendation_template": "{product1} is recommended for its superior {feature1}, while {product2} excels in {feature2}."
                }
            }
        }
