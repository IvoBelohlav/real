import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  // Icons used for potential score explanations (keep if needed later)
  // Check, CheckCheck, TrendingUp, Star, Tag, Award, ThumbsUp, Zap,
  // Package, DollarSign, ShoppingCart, Image,
  ChevronLeft, ChevronRight // Icons used for carousel arrows
} from "lucide-react";
import { themes } from "../../themes"; // Assuming themes are defined elsewhere
import ProductCard from "./ProductCard";
import AccessoryCard from "./AccessoryCard"; // Assuming AccessoryCard component exists
// Removed useQuery/api imports as fetching is expected in the parent
import styles from "./ChatMessage.module.css";

const ChatMessage = ({
  message,
  onMessageDisplayed,
  onRead,
  theme = "light",
  style, // Style overrides from parent (e.g., fonts, base colors)
  onProductClick, // Handler for clicks on products/follow-ups
  widgetConfig // **** EXPECTS widgetConfig AS A PROP ****
}) => {
  const isBot = message.sender === "bot";
  const [isVisible, setIsVisible] = useState(false);
  // const currentTheme = themes[theme] || themes["light"]; // Fallback theme (Not directly used now, colors derived)
  // const [expandedRecommendations, setExpandedRecommendations] = useState(false); // State for potentially expanding recs (if needed)

  // State for product carousel
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  // State for hover effect on follow-up questions
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const carouselRef = useRef(null);

  // --- Color Setup ---
  // Determine colors based on theme, widgetConfig, and potential overrides from `style` prop.
  // It's crucial that widgetConfig is passed correctly as a prop.
  const primaryColor = theme === "light"
    ? style?.primary_color_light || widgetConfig?.primary_color_light || "#E01E26" // Default Lermo Red
    : style?.primary_color_dark || widgetConfig?.primary_color_dark || "#E01E26"; // Default Lermo Red

  const secondaryColor = theme === "light"
    ? style?.secondary_color_light || widgetConfig?.secondary_color_light || "#B61319" // Default Lermo Dark Red
    : style?.secondary_color_dark || widgetConfig?.secondary_color_dark || "#FF4C52"; // Default Lermo Lighter Red for dark mode

  const textColor = theme === "light"
    ? style?.text_color_light || widgetConfig?.text_color_light || "#333333" // Default dark text
    : style?.text_color_dark || widgetConfig?.text_color_dark || "#f5f5f5"; // Default light text

  const backgroundColor = theme === "light"
    ? style?.background_color_light || widgetConfig?.background_color_light || "#ffffff" // Default white
    : style?.background_color_dark || widgetConfig?.background_color_dark || "#2a2a2a"; // Default dark grey

  // Style object passed down to children, includes font sizes etc. from parent `style` prop
  const customStyles = {
    ...style, // Include all parent styles first
    // Ensure core colors derived above are available for children
    primaryColor: primaryColor,
    secondaryColor: secondaryColor,
    textColor: textColor,
    backgroundColor: backgroundColor,
    // Include specific font sizes from style prop or use CSS variables/defaults
    // These will be used inline where needed or passed down to child components like ProductCard
    baseFontSize: style?.base_font_size || 'var(--base-font-size, 16px)',
    largeFontSize: style?.large_font_size || 'var(--large-font-size, 17px)',
    headerFontSize: style?.header_font_size || 'var(--header-font-size, 19px)',
    buttonFontSize: style?.button_font_size || 'var(--button-font-size, 14px)',
    smallFontSize: style?.small_font_size || 'var(--small-font-size, 13px)',
    priceFontSize: style?.price_font_size || 'var(--price-font-size, 18px)',
    timestampFontSize: style?.timestamp_font_size || 'var(--timestamp-font-size, 12px)', // Timestamp specific size

    // Pass down bubble styling customizations if provided in parent `style` prop
    message_bubble_border_radius: style?.message_bubble_border_radius || '1rem',
    message_bubble_border_style: style?.message_bubble_border_style || 'none',
    message_bubble_border_width: style?.message_bubble_border_width || '0px',
    message_bubble_padding: style?.message_bubble_padding || '1rem',
  };

  // Helper to normalize recommendation data (product or accessory)
  // Ensures essential fields exist and provides defaults.
  const normalizeRecommendationData = (product) => {
    if (!product || typeof product !== 'object') {
      console.warn("Attempted to normalize invalid data:", product);
      return null; // Basic validation: return null if input is not a valid object
    }

    // Create a normalized object with prioritized fields and fallbacks
    return {
      // Core fields with fallbacks
      name: product.name || product.product_name || "Produkt",
      description: product.description || product.desc || "Popis není k dispozici.",
      url: product.url || product.product_url ||
           (product.product_id ? `/product/${product.product_id}` : null) ||
           (product._id ? `/product/${product._id}` : null) ||
           "/products", // Sensible fallback URL
      image_url: product.image_url || product.image || null, // Default to null if no image
      price: product.price !== undefined ? product.price : null, // Handle 0 price
      pricing: product.pricing, // Pass pricing object directly
      features: Array.isArray(product.features) ? product.features.filter(f => f && typeof f === 'string') : [], // Ensure features are valid strings

      // Keep all other potential fields (score, why, is_accessory, _id, etc.)
      // This ensures data like 'is_accessory' or 'score' is preserved.
      ...product
    };
  };

  // --- Extract Recommendations ---
  // Safely extract recommendations from various potential locations in the message object.
  let rawRecommendations = [];
  // Skip recommendation extraction for guided chat messages or options
  const isGuidedChatMessage = message && (message.isOption || message.useCase === 'guided');

  if (!isGuidedChatMessage && message && typeof message === 'object') {
      // Consolidate extraction from multiple possible paths
      rawRecommendations = [
          ...(Array.isArray(message.personalized_recommendations) ? message.personalized_recommendations : []),
          ...(message.metadata && Array.isArray(message.metadata.personalized_recommendations) ? message.metadata.personalized_recommendations : []),
          ...(message.metadata && Array.isArray(message.metadata.recommended_products) ? message.metadata.recommended_products : []),
          ...(Array.isArray(message.recommended_products) ? message.recommended_products : []),
          ...(message.metadata && Array.isArray(message.metadata.products) ? message.metadata.products : []), // Check metadata.products
          ...(Array.isArray(message.products) ? message.products : []) // Check message.products directly
      ];
  }

  // Normalize and filter valid recommendations, then sort by priority (admin_priority preferred)
  const normalizedRecommendations = rawRecommendations
    .map(normalizeRecommendationData) // Normalize each item
    .filter(product => product !== null) // Remove any items that failed normalization
    // Sort by priority: higher admin_priority or priority comes first
    .sort((a, b) => (b.admin_priority || b.priority || 0) - (a.admin_priority || a.priority || 0));

  // Determine if there are any recommendations to display
  const hasRecommendations = normalizedRecommendations.length > 0;

  // --- Bot Avatar Logo ---
  // Get logo URL for bot avatar from widgetConfig based on theme.
  // **** THIS RELIES ON THE widgetConfig PROP BEING PASSED CORRECTLY ****
  // console.log("ChatMessage received widgetConfig:", widgetConfig); // <-- Log for debugging if avatar issues persist
  const logoUrl = theme === "light"
    ? widgetConfig?.logo_light_mode // Use optional chaining for safety
    : widgetConfig?.logo_dark_mode;
  // console.log("ChatMessage determined logoUrl:", logoUrl); // <-- Log for debugging


  // --- Effects and Handlers ---

  // Effect for message visibility animation (with typing delay for bot)
  useEffect(() => {
    if (isBot) {
      // Calculate typing delay based on text length
      const baseDelay = 300; // Minimum delay
      const charDelay = 8; // Delay per character
      const maxDelay = 1500; // Maximum delay
      const textLength = message?.text?.length || 0;
      const typingDelay = Math.min(baseDelay + textLength * charDelay, maxDelay);

      // Set timeout to make message visible
      const timer = setTimeout(() => {
        setIsVisible(true);
        onMessageDisplayed?.(); // Callback when message appears
        onRead?.(); // Callback for marking message as read (if applicable)
      }, typingDelay);

      // Cleanup timeout on component unmount or dependency change
      return () => clearTimeout(timer);
    } else {
      // User messages appear immediately
      setIsVisible(true);
      // Optionally call callbacks immediately for user messages if needed
      // onMessageDisplayed?.();
      // onRead?.();
    }
  // Dependencies: only re-run if message identity or callbacks change
  }, [isBot, message, onMessageDisplayed, onRead]); // Note: message dependency might be too broad if object changes unnecessarily

  // --- Dynamic Message Bubble Style ---
  // Generates the style object for the message bubble based on sender, theme, and custom styles.
  const getMessageStyle = () => {
    // Base styles from customStyles prop (includes border radius, width, style, padding)
    const baseStyle = {
        borderRadius: customStyles.message_bubble_border_radius,
        borderStyle: customStyles.message_bubble_border_style,
        borderWidth: customStyles.message_bubble_border_width,
        borderColor: primaryColor, // Use dynamic primary color for border if border is enabled
        padding: customStyles.message_bubble_padding,
        maxWidth: '100%', // Ensure bubble can expand to full width
        width: '100%',    // Take full width of container
        boxSizing: 'border-box' // Include padding in width calculation
    };

    // Apply sender-specific background and text colors
    if (isBot) {
        return {
            ...baseStyle,
            // Bot bubble uses admin-configured colors for bot messages
            backgroundColor: widgetConfig?.bot_message_bg_color || 
                            (theme === "dark" ? "#2a2a2a" : "#ffffff"),
            color: widgetConfig?.bot_message_text_color || 
                 (theme === "dark" ? "#f5f5f5" : "#333333"),
        };
    } else {
        // User bubble uses admin-configured colors for user messages
        return {
            ...baseStyle,
            backgroundColor: widgetConfig?.user_message_bg_color ||
                           (theme === "dark" ? "#404040" : "#f3f4f6"),
            color: widgetConfig?.user_message_text_color || 
                 (theme === "dark" ? "#ffffff" : "#1a1a1a"),
        };
    }
  };

  // --- Carousel Navigation Handlers ---
  const goToNextProduct = () => {
    if (normalizedRecommendations.length > 1) {
      // Cycle to the next product, wrap around to the beginning if at the end
      setCurrentProductIndex((prevIndex) => (prevIndex + 1) % normalizedRecommendations.length);
    }
  };

  const goToPrevProduct = () => {
    if (normalizedRecommendations.length > 1) {
      // Cycle to the previous product, wrap around to the end if at the beginning
      setCurrentProductIndex((prevIndex) => (prevIndex - 1 + normalizedRecommendations.length) % normalizedRecommendations.length);
    }
  };

  // Dot navigation handler: go directly to the clicked product index
  const handleDotClick = (index) => {
      if (index >= 0 && index < normalizedRecommendations.length) {
          setCurrentProductIndex(index);
      }
  };

  // --- Render Functions ---

  // Renders follow-up questions 
  const renderFollowupQuestions = (questions) => {
    // Ensure questions exist and is a non-empty array
    if (!questions || !Array.isArray(questions) || questions.length === 0) return null;

    // Log for debugging
    console.log("Rendering follow-up questions:", questions);
    
    // Filter out any non-string items just in case
    const validQuestions = questions.filter(q => typeof q === 'string' && q.trim() !== '');
    if (validQuestions.length === 0) return null;

    return (
      <motion.div 
        className={styles.followupQuestionsContainer}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        {/* Label for the follow-up questions section */}
        <p className={styles.followupQuestionLabel} style={{ 
          color: theme === "dark" ? "#f5f5f5" : "#333333", 
          fontSize: customStyles.baseFontSize,
          fontWeight: 500,
          marginBottom: '0.5rem',
          marginTop: '0.5rem'
        }}>
          Můžete se také zeptat:
        </p>
        {/* Container for the text suggestions */}
        <div className={styles.followupButtonsContainer}>
          {validQuestions.map((question, index) => (
            <motion.span
              key={index}
              className={styles.followupSuggestion}
              style={{
                color: primaryColor, // Red text color from theme
                fontSize: customStyles.buttonFontSize,
                display: 'block',
                width: 'fit-content',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                // Log the click event for debugging
                console.log(`Click on follow-up question: "${question}"`, e);
                e.stopPropagation(); // Prevent event bubbling
                e.preventDefault(); // Prevent default behavior
                
                // When clicked, directly send this text as a message
                if (onProductClick) {
                  console.log("Calling onProductClick with:", question);
                  onProductClick(question);
                } else {
                  console.warn("No onProductClick handler provided");
                }
              }}
              // Stagger animation for each item
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index + 0.6, duration: 0.3 }}
            >
              {question}
            </motion.span>
          ))}
        </div>
      </motion.div>
    );
  };

  // Renders a single accessory card component
  const renderAccessoryRecommendation = (accessory) => {
    if (!accessory) return null; // Safety check
    // Use accessory._id or name or generate a stable key if needed
    const key = accessory._id || accessory.name || `accessory-${Math.random()}`; // Fallback key

    return (
      <div className={styles.accessoryWrapper} key={key}>
        {/* AccessoryCard component */}
        <AccessoryCard
          accessoryData={accessory} // Pass normalized accessory data
          theme={theme} // Pass current theme
          // Pass necessary colors/styles if AccessoryCard needs them directly
          // (Assuming AccessoryCard might also use widgetConfig/theme or receive colors via props)
          widgetConfig={widgetConfig} // Pass widgetConfig down
          // primaryColor={primaryColor} // Or pass specific colors
          // secondaryColor={secondaryColor}
          // textColor={textColor}
          // backgroundColor={backgroundColor}
          onProductClick={onProductClick} // Pass the click handler
          style={customStyles} // Pass down font sizes and other custom styles
        />
        {/* Optionally display explanation if provided */}
        {accessory.explanation && (
          <p className={styles.accessoryExplanation} style={{ color: textColor }}>
            {accessory.explanation}
          </p>
        )}
      </div>
    );
  };

  // Renders the product carousel with animation and navigation
  const renderProductCarousel = (recommendations) => {
    // Ensure recommendations exist and is a non-empty array
    if (!recommendations || recommendations.length === 0) return null;

    // Get the currently selected product based on index
    const currentProduct = recommendations[currentProductIndex];
    if (!currentProduct) {
        console.error("Current product is undefined in carousel at index:", currentProductIndex);
        return null; // Safety check
    }

    return (
      <div className={styles.productCarousel} ref={carouselRef} style={{ 
        width: '100%', 
        maxWidth: '320px',
        margin: '0.5rem 0',
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        flexDirection: 'column',
        overflow: 'visible',
        alignSelf: 'flex-start',
        padding: 0,
        position: 'relative',
        paddingBottom: '40px' /* Added space for dots below */
      }}>
        {/* Navigation Arrows (only show if more than 1 product) */}
        {recommendations.length > 1 && (
          <>
            <button
              className={`${styles.carouselArrow} ${styles.carouselArrowPrev}`}
              onClick={goToPrevProduct}
              type="button"
              style={{
                backgroundColor: primaryColor,
                color: 'white',
                position: 'absolute',
                left: '-25px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 30
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className={`${styles.carouselArrow} ${styles.carouselArrowNext}`}
              onClick={goToNextProduct}
              type="button"
              style={{
                backgroundColor: primaryColor,
                color: 'white',
                position: 'absolute',
                right: '-25px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 30
              }}
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Product Carousel Items */}
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentProductIndex} // Key change triggers the animation for the current product
            className={styles.carouselItem}
            // Animation properties
            initial={{ opacity: 0.8, x: 30 }} // Start slightly transparent and offset right
            animate={{ opacity: 1, x: 0 }} // Animate to fully opaque and center position
            exit={{ opacity: 0.8, x: -30 }} // Animate out slightly transparent and offset left
            transition={{ duration: 0.3, ease: "easeInOut" }} // Animation timing and easing
            style={{ 
              alignItems: 'flex-start', 
              justifyContent: 'flex-start',
              width: '100%',
              margin: 0,
              alignSelf: 'flex-start'
            }}
          >
            {/* Render the actual Product Card for the current product */}
            <ProductCard
              productData={currentProduct} // Pass the current product data
              widgetConfig={widgetConfig} // Pass config for ProductCard's own color logic
              theme={theme} // Pass theme
              onProductClick={onProductClick} // Pass click handler
              style={{
                ...customStyles, // Pass font styles and other custom styles
                padding: '16px', // Reduced padding
                margin: '0', // Remove auto margin to align left 
                width: '100%',
                minWidth: '250px', // Increased minimum width
                maxWidth: '320px',  // Increased maximum width
                textAlign: 'left', // Left align content
                alignSelf: 'flex-start'
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Carousel Dots Navigation */}
        {recommendations.length > 1 && (
          <div 
            className={styles.carouselDots}
            style={{
              position: 'absolute',
              bottom: '5px', /* Position at bottom with padding */
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              display: 'flex',
              justifyContent: 'center',
              padding: '5px 10px',
              borderRadius: '12px',
              backgroundColor: theme === 'dark' ? 'rgba(40, 40, 40, 0.8)' : 'rgba(255, 255, 255, 0.8)'
            }}
          >
            {recommendations.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`${styles.carouselDot} ${
                  index === currentProductIndex ? styles.carouselDotActive : ""
                }`}
                onClick={() => handleDotClick(index)}
                style={{
                  backgroundColor: index === currentProductIndex ? primaryColor : 
                                  theme === 'dark' ? '#555' : '#ccc',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  margin: '0 5px',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.2s ease'
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // --- Message Content Logic ---

  // Separate product recommendations from accessory recommendations based on 'is_accessory' flag
  const products = normalizedRecommendations.filter(rec => !rec.is_accessory);
  const accessories = normalizedRecommendations.filter(rec => rec.is_accessory);

  // Flags to check if products or accessories exist
  const hasProducts = products.length > 0;
  const hasAccessories = accessories.length > 0;

  // Helper function to render message text with basic markdown-like formatting
  // Uses dangerouslySetInnerHTML for simplicity; consider react-markdown for complex needs.
  const renderMessageText = (text) => {
    if (!text || typeof text !== 'string') return null; // Return null if text is invalid

    // Basic replacements for markdown-like syntax
    const formattedText = text
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>') // Bold + Italic
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')       // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')                   // Italic
        .replace(/~~(.*?)~~/g, '<del>$1</del>')                 // Strikethrough
        // Basic list item styling (requires CSS for .list-item-* classes)
        .replace(/^-\s+(.*?)$/gm, '<span class="list-item-bullet">$1</span>') // Unordered list item (bullet added via CSS ::before)
        .replace(/^(\d+)\.\s+(.*?)$/gm, '<span class="list-item-number">$1. $2</span>'); // Ordered list item

    // Split text by newline characters and render each line within a React Fragment
    return formattedText.split('\n').map((line, i, arr) => (
        <React.Fragment key={i}>
            {/* Use dangerouslySetInnerHTML to render the HTML tags from replacements */}
            <span dangerouslySetInnerHTML={{ __html: line || ' ' /* Use non-breaking space for empty lines */ }}></span>
            {/* Add a <br> tag between lines, except after the last line */}
            {i < arr.length - 1 && <br />}
        </React.Fragment>
    ));
  };

  // --- Construct the final message content JSX ---
  const messageContent = (
    <>
      {/* 1. Main Message Text */}
      {message.text && ( // Only render if text exists
        <div className={styles.messageText} style={{ 
          fontSize: customStyles.largeFontSize, 
          color: textColor,
          textAlign: 'left',
          width: '100%',
          margin: '0',
          padding: '0',
          boxSizing: 'border-box'
        }}>
          {renderMessageText(message.text)}
        </div>
      )}

      {/* 2. Product Carousel Section (if products exist) */}
      {hasProducts && (
        <div className={styles.recommendationSection} style={{ 
          width: '100%', 
          textAlign: 'left',
          alignItems: 'flex-start',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start'
        }}>
          {/* Section Title */}
           <h4
              className={styles.recommendationSectionTitle}
              // Apply dynamic colors inline for title and border
              style={{
                color: primaryColor,
                fontSize: customStyles.headerFontSize,
                borderColor: primaryColor, // Set border color dynamically
                textAlign: 'left',
                width: '100%',
                maxWidth: '320px',
                margin: '10px 0 0.75rem 0'
              }}
            >
              Doporučené produkty
           </h4>
           {/* Render the carousel component */}
          {renderProductCarousel(products)}
        </div>
      )}

      {/* 3. Accessory Recommendations Section (if accessories exist) */}
      {hasAccessories && (
        <div className={styles.recommendationSection}>
           {/* Section Title */}
           <h4
             className={styles.recommendationSectionTitle}
             style={{
               color: primaryColor,
               fontSize: customStyles.headerFontSize,
               borderColor: primaryColor // Set border color dynamically
             }}
            >
              Doporučené příslušenství
           </h4>
           {/* Map over accessories and render each card using the helper function */}
           {accessories.map(renderAccessoryRecommendation)}
        </div>
      )}

      {/* 4. Follow-up Questions (only for bot messages with questions) */}
      {isBot && (message.followup_questions || message.metadata?.followup_questions) && (
        // Render follow-up questions using the helper function, checking both possible locations
        renderFollowupQuestions(message.followup_questions || message.metadata?.followup_questions)
      )}
    </>
  );

  // --- Animation Variants (Define Framer Motion animations) ---
  // Variants for the main message container
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 }, // Initial state (hidden)
    visible: { // Animated state (visible)
      opacity: 1, scale: 1, y: 0,
      transition: { type: "spring", stiffness: 300, damping: 25, mass: 0.8, duration: 0.3 },
    },
    exit: { opacity: 0, scale: 0.9, y: -10, transition: { duration: 0.2 } }, // Exit state
  };

  // Variants for the bot avatar (appears with a pop/rotate effect)
  const botAvatarVariants = {
    hidden: { scale: 0, rotate: -90 },
    visible: {
      scale: 1, rotate: 0,
      transition: { type: "spring", stiffness: 350, damping: 15, duration: 0.4 },
    },
  };

  // Variants for the message content bubble (slides in from side)
  const messageContentVariants = {
    hidden: { opacity: 0, x: isBot ? -15 : 15 }, // Start offset based on sender
    visible: {
      opacity: 1, x: 0, // Animate to center
      transition: { type: "spring", stiffness: 300, damping: 20, delay: 0.05 }, // Slight delay after container appears
    },
  };

  // --- Final JSX Structure ---
  return (
    <AnimatePresence>
      {/* Only render the message if isVisible state is true */}
      {isVisible && (
        <motion.div
          className={`${styles.messageContainer} ${!isBot ? styles.messageContainerReverse : ''}`} // Apply base and reverse class
          variants={containerVariants} // Apply container animation variants
          initial="hidden" // Start in hidden state
          animate="visible" // Animate to visible state
          exit="exit" // Animate to exit state on removal
          layout // Animate layout changes smoothly (e.g., size changes)
          style={{ 
            width: '100%', 
            justifyContent: 'flex-start',
            display: 'flex',
            boxSizing: 'border-box',
            padding: '0 10px',
            overflow: 'visible'
          }}
        >
          {/* === BOT AVATAR (Conditional Rendering) === */}
          {isBot && (
            <motion.div
              variants={botAvatarVariants} // Apply avatar animation variants
              className={styles.botAvatar}
              style={{
                // Use the derived background color for the avatar circle's background
                backgroundColor: backgroundColor,
              }}
            >
              {/* --- Conditional Rendering: Logo Image vs. Fallback Text --- */}
              {logoUrl ? (
                // If logoUrl exists from widgetConfig, render the image
                <img
                  src={logoUrl}
                  alt="Asistent" // Use appropriate alt text
                  className={styles.botAvatarImage}
                  // Basic error handling: hide image if it fails to load
                  onError={(e) => { e.target.style.display = 'none'; e.target.onerror = null; }}
                />
              ) : (
                // If logoUrl is missing, render the "AI" text fallback
                <div
                  className={styles.botAvatarFallback}
                  // Style the fallback text using dynamic colors and font size
                  style={{ color: primaryColor, fontSize: customStyles.baseFontSize }}
                >
                  AI
                </div>
              )}
            </motion.div>
          )}

          {/* === Message Content Area === */}
          <motion.div
            className={`${styles.messageContent} ${!isBot ? styles.messageContentReverse : ''}`} // Apply base and reverse class
            variants={messageContentVariants} // Apply content animation variants
            layout // Animate layout changes smoothly
            style={{
              textAlign: 'left',
              margin: 0,
              alignItems: 'flex-start',
              overflow: 'visible'
            }}
          >
            {/* The main message bubble */}
            <div
              // Apply base bubble class and conditional class if recommendations are present
              className={`${styles.messageBubble} ${hasRecommendations ? styles.messageBubbleWithRecommendations : ''}`}
              style={{
                ...getMessageStyle(),
                // Override styles specifically for message alignment
                textAlign: 'left',
                margin: '0',
                padding: '0.75rem',
                width: 'auto',
                display: 'inline-block',
                alignSelf: 'flex-start',
                overflow: 'visible'
              }}
            >
              {messageContent} {/* Render the constructed message content (text, products, etc.) */}
            </div>
          </motion.div>
          {/* === END Message Content Area === */}

        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatMessage;