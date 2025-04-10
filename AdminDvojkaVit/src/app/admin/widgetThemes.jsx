export const widgetThemePresets = {
  "default": {
    main_title: "Dvojkavit Chat",
    
    // Light Mode Colors
    primary_color_light: "#0070F3", // Blue primary color
    secondary_color_light: "#0EA5E9", // Lighter blue
    background_color_light: "#FFFFFF", // White, matching site background
    text_color_light: "#333333", // Dark gray for readable text
    button_text_color_light: "#FFFFFF", // White text on buttons
    button_bg_color_light: "#0070F3", // Blue buttons
    header_bg_color_light: "#0070F3", // Blue header
    header_text_color_light: "#FFFFFF", // White text on header
    icon_background_color_light: "#0EA5E9", // Lighter blue for icons
    mode_toggle_background_light: "#0070F3", // Blue for toggle
    emoji_bg_color_light: "#FFFFFF", // White for emoji backgrounds

    // Dark Mode Colors
    primary_color_dark: "#0070F3", // Blue for consistency
    secondary_color_dark: "#38BDF8", // Lighter blue for dark mode
    background_color_dark: "#1E1E1E", // Dark gray, similar to the dark sections
    text_color_dark: "#F5F5F5", // Off-white for readability
    button_text_color_dark: "#FFFFFF", // White text on buttons
    button_bg_color_dark: "#0070F3", // Blue buttons
    header_bg_color_dark: "#065091", // Darker blue header
    header_text_color_dark: "#FFFFFF", // White text on header
    icon_background_color_dark: "#38BDF8", // Lighter blue for dark mode icons
    mode_toggle_background_dark: "#065091", // Darker blue for toggle
    emoji_bg_color_dark: "#333333", // Dark gray for emoji backgrounds

    font_family: 'Inter, sans-serif',
    greeting_message: "👋 Hello! How can I help you today?",
    widget_button_text: "Chat with us",
    widget_help_text: "Get instant help",
    widget_padding: '1.25rem',
    message_spacing: '0.75rem',
    input_field_padding: '0.625rem',
    base_font_size: '1rem',
    header_font_weight: '700',
    message_font_weight: '400',
    button_font_weight: '600',
    widget_border_radius: '1.6rem',
    widget_border_style: 'solid',
    widget_border_width: '1px',
    message_bubble_border_radius: '1.2rem',
    message_bubble_border_style: 'none',
    message_bubble_border_width: '0px',
    input_field_border_radius: '0.8rem',
    input_field_border_style: 'solid',
    input_field_border_width: '1px',
    button_border_radius: '0.8rem',
    button_border_style: 'none',
    button_border_width: '0px',
    widget_shadow: '0 5px 15px rgba(0, 112, 243, 0.15)', // Subtle shadow with blue tint
    custom_css: '',
  },
  
  "modern": {
    main_title: "Modern Chat",
    // Light Mode Colors
    primary_color_light: "#A61FF5",
    secondary_color_light: "#C564FA",
    background_color_light: "#F7F7FA",
    text_color_light: "#0F172A",
    button_text_color_light: "#FFFFFF",
    button_bg_color_light: "#A61FF5",
    header_bg_color_light: "#A61FF5",
    header_text_color_light: "#FFFFFF",
    icon_background_color_light: "#C564FA",
    mode_toggle_background_light: "#A61FF5",
    emoji_bg_color_light: "#FFFFFF",

    // Dark Mode Colors
    primary_color_dark: "#C564FA", // Lighter purple for visibility
    secondary_color_dark: "#A61FF5", // Original purple
    background_color_dark: "#1A1A2E", // Dark, almost-black gray
    text_color_dark: "#E0E0E0", // Light gray for readability
    button_text_color_dark: "#FFFFFF", // White text on buttons
    button_bg_color_dark: "#A61FF5", // Same purple as light mode
    header_bg_color_dark: "#A61FF5", // Same purple, consistent header
    header_text_color_dark: "#FFFFFF", // White header text
    icon_background_color_dark: "#C564FA",//complementary color
    mode_toggle_background_dark: "#A61FF5",//same as light mode.
    emoji_bg_color_dark: "#2C2C48", // Slightly lighter dark gray for emoji

    font_family: 'Inter, sans-serif',
    greeting_message: "Hello! Welcome to our modern support chat.",
    widget_button_text: "Chat Now",
    widget_help_text: "Get instant help",
    widget_padding: '1.25rem',
    message_spacing: '0.75rem',
    input_field_padding: '0.625rem',
    base_font_size: '1rem',
    header_font_weight: '700',
    message_font_weight: '400',
    button_font_weight: '600',
    widget_border_radius: '1.6rem',
    widget_border_style: 'solid',
    widget_border_width: '1px',
    message_bubble_border_radius: '1.2rem',
    message_bubble_border_style: 'none',
    message_bubble_border_width: '0px',
    input_field_border_radius: '0.8rem',
    input_field_border_style: 'solid',
    input_field_border_width: '1px',
    button_border_radius: '0.8rem',
    button_border_style: 'none',
    button_border_width: '0px',
    widget_shadow: '0 5px 15px rgba(14, 165, 233, 0.15)',
    custom_css: '',
  },

  "purpleModern": {
    main_title: "Modern Chat",

    // Primary Palette (Purple Scheme)
    primary_color_light: "#6A1B9A",   // Dark Purple
    secondary_color_light: "#9575CD", // Lavender
    background_color_light: "#F0F9FF", // Very Light Blue (like in the image)
    text_color_light: "#333333",       // Very Dark Gray
    button_text_color_light: "#FFFFFF", // White
    button_bg_color_light: "#9575CD",   // Lavender
    header_bg_color_light: "#6A1B9A",   // Dark Purple
    header_text_color_light: "#FFFFFF", // White
    icon_background_color_light: "#FFFFFF",
    mode_toggle_background_light: "#6A1B9A",
    emoji_bg_color_light: "#FFFFFF",

    // Dark Mode - Inverted
    primary_color_dark: "#9575CD",    // Lavender
    secondary_color_dark: "#6A1B9A",  // Dark Purple
    background_color_dark: "#121212",  // Very Dark Gray
    text_color_dark: "#EEEEEE",        // Light Gray
    button_text_color_dark: "#FFFFFF",  // White
    button_bg_color_dark: "#6A1B9A",    // Dark Purple
    header_bg_color_dark: "#9575CD",     // Lavender
    header_text_color_dark: "#FFFFFF",  // White
    icon_background_color_dark: "#6A1B9A",
    mode_toggle_background_dark: "#9575CD",
    emoji_bg_color_dark: "#1E293B",
    font_family: 'Inter, sans-serif', // Or your preferred font
    greeting_message: "Hello! Welcome to our modern support chat.", // Customize
    widget_button_text: "Chat Now",   // Customize
    widget_help_text: "Get instant help", // Customize
    widget_padding: '0rem',
    message_spacing: '0.75rem',
    input_field_padding: '0.625rem',
    base_font_size: '1rem',
    header_font_weight: '700',
    message_font_weight: '400',
    button_font_weight: '600',
    widget_border_radius: '1.6rem',
    widget_border_style: 'solid',
    widget_border_width: '0px',
    message_bubble_border_radius: '1.2rem',
    message_bubble_border_style: 'none',
    message_bubble_border_width: '0px',
    input_field_border_radius: '0.8rem',
    input_field_border_style: 'solid',
    input_field_border_width: '1px',
    button_border_radius: '0.8rem',
    button_border_style: 'none',
    button_border_width: '0px',
    widget_shadow: '0 5px 15px rgba(106, 27, 154, 0.2)', // Purple-toned shadow
    custom_css: '',
  },  

  "minimalist": {
    main_title: "Simple Support",
    // Light Mode Colors
    primary_color_light: "#4B5563",
    secondary_color_light: "#6B7280",
    background_color_light: "#FFFFFF",
    text_color_light: "#374151",
    button_text_color_light: "#FFFFFF",
    button_bg_color_light: "#6B7280",
    header_bg_color_light: "#F9FAFB",
    header_text_color_light: "#374151",
    icon_background_color_light: "#6B7280",
    mode_toggle_background_light: "#4B5563",
    emoji_bg_color_light: "#FFFFFF",

    // Dark Mode Colors
    primary_color_dark: "#D1D5DB",
    secondary_color_dark: "#9CA3AF",
    background_color_dark: "#1F2937",
    text_color_dark: "#E5E7EB",
    button_text_color_dark: "#FFFFFF",
    button_bg_color_dark: "#9CA3AF",
    header_bg_color_dark: "#1F2937",
    header_text_color_dark: "#E5E7EB",
    icon_background_color_dark: "#D1D5DB",
    mode_toggle_background_dark: "#9CA3AF",
    emoji_bg_color_dark: "#374151",

    font_family: 'Segoe UI, sans-serif',
    greeting_message: "Welcome! How can we help you today?",
    widget_button_text: "Need Help?",
    widget_help_text: "Chat with us",
    widget_padding: '1rem',
    message_spacing: '0.5rem',
    input_field_padding: '0.5rem',
    base_font_size: '0.9rem',
    header_font_weight: '700',
    message_font_weight: '400',
    button_font_weight: '500',
    widget_border_radius: '1.6rem',
    widget_border_style: 'solid',
    widget_border_width: '1px',
    message_bubble_border_radius: '0.8rem',
    message_bubble_border_style: 'none',
    message_bubble_border_width: '0px',
    input_field_border_radius: '0.6rem',
    input_field_border_style: 'solid',
    input_field_border_width: '1px',
    button_border_radius: '0.6rem',
    button_border_style: 'none',
    button_border_width: '0px',
    widget_shadow: 'none',
    custom_css: '',
  },

  "corporate": {
    main_title: "Enterprise Support",
    // Light Mode Colors
    primary_color_light: "#3B82F6",
    secondary_color_light: "#60A5FA",
    background_color_light: "#EFF6FF",
    text_color_light: "#1E293B",
    button_text_color_light: "#FFFFFF",
    button_bg_color_light: "#3B82F6",
    header_bg_color_light: "#3B82F6",
    header_text_color_light: "#FFFFFF",
    icon_background_color_light: "#60A5FA",
    mode_toggle_background_light: "#3B82F6",
    emoji_bg_color_light: "#FFFFFF",

    // Dark Mode Colors
    primary_color_dark: "#1D4ED8",
    secondary_color_dark: "#3B82F6",
    background_color_dark: "#1E293B",
    text_color_dark: "#CBD5E0",
    button_text_color_dark: "#FFFFFF",
    button_bg_color_dark: "#3B82F6",
    header_bg_color_dark: "#1D4ED8",
    header_text_color_dark: "#FFFFFF",
    icon_background_color_dark: "#3B82F6",
    mode_toggle_background_dark: "#1D4ED8",
    emoji_bg_color_dark: "#2C3A58",

    font_family: 'Arial, sans-serif',
    greeting_message: "Thank you for contacting our support. How may I assist you?",
    widget_button_text: "Support",
    widget_help_text: "Customer Support",
    widget_padding: '1rem',
    message_spacing: '0.75rem',
    input_field_padding: '0.75rem',
    base_font_size: '1rem',
    header_font_weight: '700',
    message_font_weight: '400',
    button_font_weight: '600',
    widget_border_radius: '0.75rem',
    widget_border_style: 'solid',
    widget_border_width: '1px',
    message_bubble_border_radius: '0.75rem',
    message_bubble_border_style: 'none',
    message_bubble_border_width: '0px',
    input_field_border_radius: '0.5rem',
    input_field_border_style: 'solid',
    input_field_border_width: '1px',
    button_border_radius: '0.5rem',
    button_border_style: 'none',
    button_border_width: '0px',
    widget_shadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    custom_css: '',
  }
}; 