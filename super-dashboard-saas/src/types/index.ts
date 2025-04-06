// Shared TypeScript interfaces

export interface User {
  id: string; // Or ObjectId as string from MongoDB
  email: string;
  is_active?: boolean; // Optional fields based on your backend model
  is_verified?: boolean;
  subscription_tier?: string; // Added subscription tier
  subscription_status?: string; // Added subscription status
  is_super_admin?: boolean; // Added for super admin check
  company_name?: string | null; // Added based on UserProfile
  api_key?: string | null; // Added based on UserProfile
  created_at?: string; // Added based on UserProfile (ISO date string)
  // Add any other relevant user fields returned by your /users/me endpoint
}

// Matches the backend Pydantic UserProfile model
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  company_name?: string | null;
  subscription_tier: string; // Reflects the plan level (e.g., 'free', 'basic')
  subscription_status: string; // Reflects the activity status (e.g., 'active', 'inactive')
  subscription_end_date?: string | null; // ISO date string
  api_key?: string | null;
  created_at: string; // ISO date string
  is_super_admin: boolean; // Added for super admin view
}

// Matches the backend Pydantic model in Fullstack-application/fast-api/app/models/widget_config.py
// Optional fields allow fetching partial data or using defaults.
export interface WidgetConfig {
  user_id?: string; // Added user_id, optional on frontend input
  isEnabled?: boolean; // Added based on form, might not be in backend model directly yet
  logo_light_mode?: string | null;
  logo_dark_mode?: string | null;
  main_title?: string;
  primary_color_light?: string;
  secondary_color_light?: string;
  background_color_light?: string;
  text_color_light?: string;
  button_text_color_light?: string;
  button_bg_color_light?: string;
  primary_color_dark?: string;
  secondary_color_dark?: string;
  background_color_dark?: string;
  text_color_dark?: string;
  button_text_color_dark?: string;
  button_bg_color_dark?: string;
  font_family?: string;
  greeting_message?: string; // Corresponds to frontend 'behavior.greeting'
  widget_button_text?: string;
  widget_help_text?: string;
  header_bg_color?: string | null;
  header_text_color?: string | null;
  header_bg_color_dark?: string | null;
  header_text_color_dark?: string | null;
  icon_background_color_light?: string | null;
  icon_background_color_dark?: string | null;
  mode_toggle_background_light?: string | null;
  mode_toggle_background_dark?: string | null;
  widget_padding?: string | null;
  message_spacing?: string | null;
  input_field_padding?: string | null;
  base_font_size?: string | null;
  header_font_weight?: string | null;
  message_font_weight?: string | null;
  button_font_weight?: string | null;
  widget_border_radius?: string | null;
  widget_border_style?: string | null;
  widget_border_width?: string | null;
  message_bubble_border_radius?: string | null;
  message_bubble_border_style?: string | null;
  message_bubble_border_width?: string | null;
  input_field_border_radius?: string | null;
  input_field_border_style?: string | null;
  input_field_border_width?: string | null;
  button_border_radius?: string | null;
  button_border_style?: string | null;
  button_border_width?: string | null;
  widget_shadow?: string | null;
  custom_css?: string | null;
  // Note: Frontend form had nested 'appearance' and 'behavior'.
  // Backend model is flat. We'll adapt the form to use the flat structure.
  // Note: Frontend form had nested 'appearance' and 'behavior'.
  // Backend model is flat. We'll adapt the form to use the flat structure.
  // 'position' and 'autoOpenDelay' from the old frontend form are not in the backend model.
}

// Matches the backend Pydantic model in Fullstack-application/fast-api/app/models/widget_faq_models.py
export interface WidgetFAQItem {
  id: string; // MongoDB ObjectId as string
  question: string;
  answer: string;
  keywords?: string[]; // Optional on fetch, default []
  category?: string | null;
  language?: string; // Default 'cs' in backend
  created_at?: string; // ISO date string
  updated_at?: string | null; // ISO date string
  active?: boolean; // Default true
  show_in_widget?: boolean; // Default true
  widget_order?: number | null;
  frequency?: number; // Default 0
  source?: string | null;
  full_content?: string | null;
  user_id?: string; // Added by backend based on auth
}

// For creating/updating FAQs (matches WidgetFAQCreate Pydantic model)
export interface WidgetFAQCreate {
  question: string;
  answer: string;
  keywords?: string[];
  category?: string | null;
  language?: string;
  show_in_widget?: boolean;
  widget_order?: number | null;
  active?: boolean; // Included as per backend model
}

// Matches the backend Pydantic model in Fullstack-application/fast-api/app/models/guided_chat.py
export interface BotResponse {
  text: string;
  followUp?: string | null; // ID of the next flow after bot response
}

export interface GuidedChatOption {
  id: string; // UUID string
  text: string;
  icon: string; // Emoji or icon identifier
  next_flow?: string | null; // ID of the flow to transition to
  order: number;
  bot_response?: BotResponse | string | null; // Can be simple string or structured response
}

export interface GuidedChatFlow {
  id: string; // UUID string
  name: string;
  options: GuidedChatOption[];
  user_id?: string; // Added by backend
  language?: string; // Default 'cze' in backend
  active?: boolean; // Default true
}

// Matches the backend Pydantic model in Fullstack-application/fast-api/app/models/product.py

export interface PriceInfo {
  one_time?: string | number | null; // Allow string for input, number/null for data
  monthly?: string | number | null;
  annual?: string | number | null;
  currency?: string; // Default 'Kč' in backend
}

export interface StockInfo {
  quantity?: number | null;
  availability?: number | string | null; // Flexible type
  status?: string | null;
}

export interface Product {
  id: string; // Custom UUID or MongoDB ObjectId as string
  product_name: string;
  description: string;
  category: string;
  business_type: string;
  features?: string[];
  pricing?: PriceInfo;
  target_audience?: string[];
  keywords?: string[];
  url?: string | null;
  image_url?: string | null;
  stock_information?: StockInfo | null;
  admin_priority?: number; // Default 0
  created_at?: string; // ISO date string
  updated_at?: string; // ISO date string
  version?: number; // Default 1
  user_id?: string; // Added by backend
}

// For creating products (maps to form data, image handled separately)
export interface ProductCreate {
  product_name: string;
  description: string;
  category: string;
  business_type: string;
  features?: string[];
  pricing?: PriceInfo; // Use PriceInfo for structure
  target_audience?: string[];
  keywords?: string[];
  url?: string | null;
  admin_priority?: number;
  stock_information?: StockInfo | null;
  // image_url is set after upload, not part of create payload directly
}

// For updating products (all fields optional)
export interface ProductUpdate {
  product_name?: string;
  description?: string;
  category?: string;
  business_type?: string;
  features?: string[];
  pricing?: PriceInfo;
  target_audience?: string[];
  keywords?: string[];
  url?: string | null;
  image_url?: string | null; // Can be updated if image is deleted/changed
  admin_priority?: number;
  stock_information?: StockInfo | null;
}

// Matches the backend Pydantic model in Fullstack-application/fast-api/app/models/shop_info.py

export interface Address {
  street: string;
  city: string;
  postal_code: string;
  country: string;
  is_headquarters?: boolean; // Default false
  opening_hours?: Record<string, string> | null; // e.g., { monday: "9:00-17:00" }
  phone?: string | null;
  email?: string | null;
  maps_url?: string | null; // Pydantic HttpUrl becomes string
}

export interface SocialMedia {
  platform: string;
  url: string; // Pydantic HttpUrl becomes string
  username?: string | null;
  display_name?: string | null;
}

export interface AboutSection {
  title: string;
  paragraphs: string[];
  image_url?: string | null; // Pydantic HttpUrl becomes string
}

export interface ShopInfo {
  id?: string; // Added by backend or default factory
  shop_name: string;
  legal_name?: string | null;
  tagline?: string | null;
  description_short: string;
  description_long: string;
  primary_email: string; // Pydantic EmailStr becomes string
  support_email?: string | null;
  sales_email?: string | null;
  primary_phone: string;
  support_phone?: string | null;
  sales_phone?: string | null;
  website: string; // Pydantic HttpUrl becomes string
  founded_year: number;
  addresses?: Address[];
  social_media?: SocialMedia[];
  about_sections?: AboutSection[];
  business_hours?: Record<string, string>; // e.g., { monday: "9:00-17:00" }
  business_type: string;
  services?: string[];
  shipping_policy?: string | null;
  payment_methods?: string[];
  return_policy?: string | null;
  warranty_info?: string | null;
  keywords?: string[];
  created_at?: string; // ISO date string
  updated_at?: string; // ISO date string
  language?: string; // Default 'cs'
  user_id?: string; // Added by backend
  ai_prompt_summary: string;
  ai_faq_facts?: string[];
  ai_voice_style?: string | null;
}

// For updating shop info (all fields optional)
export type ShopInfoUpdate = Partial<Omit<ShopInfo, 'id' | 'created_at' | 'updated_at' | 'user_id'>>;

// Matches the backend Pydantic model in Fullstack-application/fast-api/app/models/business.py
export interface BusinessType {
  id?: string; // Assuming MongoDB _id will be added and converted
  type: string;
  attributes?: Record<string, any>; // Generic object for flexibility
  query_patterns?: string[];
  response_templates?: Record<string, string>;
  validation_rules?: Record<string, any>; // Generic object for validation rules
  category_configs?: Record<string, Record<string, any>>; // Nested config objects
  comparison_config?: Record<string, any> | null;
  user_id?: string; // Added by backend
}

// For creating/updating Business Types (simplified for now, might need refinement)
export type BusinessTypeCreateUpdate = Omit<BusinessType, 'id' | 'user_id'>;

// Matches the backend Pydantic model in Fullstack-application/fast-api/app/models/contact_admin_models.py
export interface ContactSubmission {
  _id?: string; // Use _id if that's what the backend returns before serialization
  id?: string; // Or id after serialization
  email: string;
  phone?: string | null;
  message: string;
  submittedAt?: string; // ISO date string
  completed?: boolean; // Default false
  user_id?: string; // Added by backend
}

// Represents a single message within a conversation log
export interface ConversationMessage {
    sender: 'user' | 'bot' | 'agent'; // Type of sender
    text: string; // Message content
    timestamp: string; // ISO date string
    // Add any other relevant message fields, e.g., message_id, metadata
}

// Represents a conversation log entry fetched from the backend
export interface ConversationLog {
    id: string; // Or _id depending on serialization
    user_id: string;
    session_id: string; // Unique identifier for the chat session
    messages: ConversationMessage[]; // Array of messages
    start_time: string; // ISO date string
    end_time?: string | null; // ISO date string
    metadata?: Record<string, any>; // Any extra info like browser, IP (handle privacy)
    // Add other fields like user rating, tags, etc. if available
}

// Structure of the response from the /conversations endpoint
export interface ConversationsResponse {
    conversations: ConversationLog[];
    total: number;
}

// Matches the backend Pydantic model InvoiceItem in Fullstack-application/fast-api/app/api/payments.py
export interface Invoice {
  id: string;
  created: string; // ISO date string (converted from timestamp in backend)
  amount_due: number; // Amount in the primary currency unit (e.g., dollars)
  currency: string;
  status: string; // e.g., 'paid', 'open', 'draft', 'uncollectible', 'void'
  invoice_pdf?: string | null; // URL to download the invoice PDF
  hosted_invoice_url?: string | null; // URL to view the invoice online
}

// Add other shared interfaces here later, e.g., for Subscription, Domain, etc.
