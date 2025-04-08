from pydantic import BaseModel, Field, HttpUrl, validator
from typing import Optional, Dict
import base64

class WidgetConfig(BaseModel):
    user_id: Optional[str] = Field(None, description="The ID of the user this config belongs to")
    id: int = 1 # This might need adjustment depending on how IDs are managed (e.g., if it's DB generated)
    logo_light_mode: Optional[str] = Field(
        None,
        description="URL or Base64 encoded string of the logo for light mode"
    )
    logo_dark_mode: Optional[str] = Field(
        None,
        description="URL or Base64 encoded string of the logo for dark mode"
    )
    main_title: str = Field(
        "Main Title",
        description="Main title displayed in the widget header"
    )
    primary_color_light: str = Field(
        "#9400d3",
        description="Primary color for the widget in light mode (hex code)"
    )
    secondary_color_light: str = Field(
        "#800080",
        description="Secondary color for the widget in light mode (hex code)"
    )
    background_color_light: str = Field(
        "#f3e6ff",
        description="Background color for the widget in light mode (hex code)"
    )
    text_color_light: str = Field(
        "#4b0082",
        description="Text color for the widget in light mode (hex code)"
    )
    button_text_color_light: str = Field(
        "#FFFFFF",
        description="Button text color for the widget in light mode (hex code)"
    )
    button_bg_color_light: str = Field(
        "#9400d3",
        description="Button background color for the widget in light mode (hex code)"
    )
    primary_color_dark: str = Field(
        "#9400d3",
        description="Primary color for the widget in dark mode (hex code)"
    )
    secondary_color_dark: str = Field(
        "#800080",
        description="Secondary color for the widget in dark mode (hex code)"
    )
    background_color_dark: str = Field(
        "#2a0047",
        description="Background color for the widget in dark mode (hex code)"
    )
    text_color_dark: str = Field(
        "#e6ccff",
        description="Text color for the widget in dark mode (hex code)"
    )
    button_text_color_dark: str = Field(
        "#FFFFFF",
        description="Button text color for the widget in dark mode (hex code)"
    )
    button_bg_color_dark: str = Field(
        "#9400d3",
        description="Button background color for the widget in dark mode (hex code)"
    )   
    font_family: str = Field(
        "Inter, sans-serif",
        description="Font family for the widget"
    )
    greeting_message: str = Field(
        "👋 Hey there! How can I assist you today?",
        description="Initial greeting message in the guided mode"
    )
    widget_button_text: str = Field(
        "We are here!",
        description="Text displayed on the collapsed widget button"
    )
    widget_help_text: str = Field(
        "Need help? Chat now",
        description="Text displayed on the collapsed widget button"
    )
    header_bg_color: Optional[str] = Field(None, description="Header background color for light mode (hex)")
    header_text_color: Optional[str] = Field(None, description="Header text color for light mode (hex)")
    header_bg_color_dark: Optional[str] = Field(None, description="Header background color for dark mode (hex)") # Dark mode header bg
    header_text_color_dark: Optional[str] = Field(None, description="Header text color for dark mode (hex)") # Dark mode header text
    icon_background_color_light: Optional[str] = Field(
        None,
        description="Icon background color for light mode (hex)"
    )
    icon_background_color_dark: Optional[str] = Field(
        None,
        description="Icon background color for dark mode (hex)"
    )
    mode_toggle_background_light: Optional[str] = Field(
        None,
        description="Mode toggle background for light mode (hex)"
    )
    mode_toggle_background_dark: Optional[str] = Field(
        None,
        description="Mode toggle background for dark mode (hex)"
    )
    widget_padding: Optional[str] = Field("1rem", description="Widget padding")
    message_spacing: Optional[str] = Field("0.5rem", description="Spacing between messages")
    input_field_padding: Optional[str] = Field("0.5rem", description="Input field padding")
    base_font_size: Optional[str] = Field("1rem", description="Base font size for widget text")
    header_font_weight: Optional[str] = Field("bold", description="Font weight for header text")
    message_font_weight: Optional[str] = Field("normal", description="Font weight for message text")
    button_font_weight: Optional[str] = Field("bold", description="Font weight for button text")
    widget_border_radius: Optional[str] = Field("1.5rem", description="Widget border radius")
    widget_border_style: Optional[str] = Field("none", description="Widget border style")
    widget_border_width: Optional[str] = Field("0px", description="Widget border width")
    message_bubble_border_radius: Optional[str] = Field("1rem", description="Message bubble border radius")
    message_bubble_border_style: Optional[str] = Field("none", description="Message bubble border style")
    message_bubble_border_width: Optional[str] = Field("0px", description="Message bubble border width")
    input_field_border_radius: Optional[str] = Field("0.5rem", description="Input field border radius")
    input_field_border_style: Optional[str] = Field("solid", description="Input field border style")
    input_field_border_width: Optional[str] = Field("1px", description="Input field border width")
    button_border_radius: Optional[str] = Field("0.5rem", description="Button border radius")
    button_border_style: Optional[str] = Field("none", description="Button border style")
    button_border_width: Optional[str] = Field("0px", description="Button border width")
    widget_shadow: Optional[str] = Field("0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", description="Widget shadow (CSS box-shadow)")
    custom_css: Optional[str] = Field(None, description="Custom CSS to override widget styles")

    class Config:
        json_schema_extra = {
            "example": {
                "_id": {"$oid": "67a0f76f78563d543211d971"},
                "id": 1,
                "background_color": "#000000",
                "button_text_color": "#FFFFFF",
                "company_description": "Need assistance? We are here to help!",
                "font_family": "Inter, sans-serif",
                "greeting_message": "👋Zdravím! Jak vám mohu dnes pomoci?",
                "header_bg_color": "#F472B6",
                "header_text_color": "#FFFFFF",
                "logo_dark_mode": "www.dvojka.cz/wp-content/uploads/2023/04/logo-dvojka-it-1.png",
                "logo_light_mode": "www.dvojka.cz/wp-content/uploads/2023/04/logo-dvojka-it-1.png",
                "main_title": "Dvojka v IT",
                "primary_color": "#4299e1",
                "secondary_color": "#2b6cb0",
                "text_color": "#2d3748",
                "background_color_dark": "#1A1A2E",
                "background_color_light": "#F7F7FA",
                "button_text_color_dark": "#FFFFFF",
                "button_text_color_light": "#FFFFFF",
                "logo": "",
                "primary_color_dark": "#C564FA",
                "primary_color_light": "#A61FF5",
                "secondary_color_dark": "#A61FF5",
                "secondary_color_light": "#C564FA",
                "text_color_dark": "#E0E0E0",
                "text_color_light": "#0F172A",
                "widget_button_text": "Potřebujete pomoc?",
                "widget_help_text": "Ai assistant",
                "base_font_size": "1rem",
                "button_border_radius": "0.8rem",
                "button_border_style": "none",
                "button_border_width": "0px",
                "button_font_weight": "600",
                "custom_css": "",
                "header_font_weight": "700",
                "input_field_border_radius": "0.8rem",
                "input_field_border_style": "solid",
                "input_field_border_width": "1px",
                "input_field_padding": "0.625rem",
                "message_bubble_border_radius": "1.2rem",
                "message_bubble_border_style": "none",
                "message_bubble_border_width": "0px",
                "message_font_weight": "400",
                "message_spacing": "0.75rem",
                "widget_border_radius": "1.5rem",
                "widget_border_style": "solid",
                "widget_border_width": "1px",
                "widget_padding": "1.5rem",
                "widget_shadow": "0 5px 15px rgba(14, 165, 233, 0.15)",
                "header_bg_color_dark": "#A61FF5",
                "header_text_color_dark": "#FFFFFF",
                "icon_background_color_dark": "#c604fb",
                "icon_background_color_light": "#C564FA",
                "mode_toggle_background_dark": "#A61FF5",
                "mode_toggle_background_light": "#A61FF5",
                "button_bg_color_dark": "#a61ff5",
                "button_bg_color_light": "#ffffff"
            }
        }
