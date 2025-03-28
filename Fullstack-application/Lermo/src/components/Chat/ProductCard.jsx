import React, { useState, useEffect } from 'react';
import {
  CheckCheck,
  Package,
  ArrowRight,
} from 'lucide-react';
import styles from './ProductCard.module.css';

const ProductCard = ({
  productData,
  widgetConfig,
  theme = "light",
  onProductClick,
  style // Accept style overrides, e.g., fonts from ChatMessage
}) => {
  const [imageError, setImageError] = useState(false);

  // Define state for dynamic colors
  const [primaryColor, setPrimaryColor] = useState("#E01E26"); // Lermo Red default
  const [secondaryColor, setSecondaryColor] = useState("#B61319"); // Lermo Dark Red default
  const [textColor, setTextColor] = useState(theme === "light" ? "#333333" : "#f5f5f5");
  const [backgroundColor, setBackgroundColor] = useState(theme === "light" ? "#ffffff" : "#2a2a2a");

  // Set up colors based on theme and widgetConfig
  useEffect(() => {
    let confPrimaryLight = "#E01E26";
    let confPrimaryDark = "#E01E26";
    let confSecondaryLight = "#B61319";
    let confSecondaryDark = "#FF4C52"; // A lighter red for dark mode contrast
    let confTextLight = "#333333";
    let confTextDark = "#f5f5f5";
    let confBgLight = "#ffffff";
    let confBgDark = "#2a2a2a";

    if (widgetConfig) {
        confPrimaryLight = widgetConfig.primary_color_light || confPrimaryLight;
        confPrimaryDark = widgetConfig.primary_color_dark || confPrimaryDark;
        confSecondaryLight = widgetConfig.secondary_color_light || confSecondaryLight;
        confSecondaryDark = widgetConfig.secondary_color_dark || confSecondaryDark;
        confTextLight = widgetConfig.text_color_light || confTextLight;
        confTextDark = widgetConfig.text_color_dark || confTextDark;
        confBgLight = widgetConfig.background_color_light || confBgLight;
        confBgDark = widgetConfig.background_color_dark || confBgDark;
    }

    if (theme === "light") {
        setPrimaryColor(confPrimaryLight);
        setSecondaryColor(confSecondaryLight);
        setTextColor(confTextLight);
        setBackgroundColor(confBgLight);
    } else {
        setPrimaryColor(confPrimaryDark);
        setSecondaryColor(confSecondaryDark);
        setTextColor(confTextDark);
        setBackgroundColor(confBgDark);
    }
  }, [widgetConfig, theme]);

  if (!productData) {
    console.error("ProductCard received undefined productData");
    return null;
  }

  // Debugging (keep minimal in production)
  // console.log("ProductCard DATA:", productData?.name, { theme, primaryColor, secondaryColor });

  // Create a clean display product with defaults
  const displayProduct = {
    name: productData.name || productData.product_name || "Produkt",
    description: productData.description || productData.desc || "Klikněte pro více informací o produktu.",
    image_url: productData.image_url || productData.image || null,
    url: productData.url || productData.product_url ||
         (productData.product_id ? `/product/${productData.product_id}` : null) ||
         (productData._id ? `/product/${productData._id}` : "/products"),
    price: productData.price || null,
    pricing: productData.pricing || null,
    features: Array.isArray(productData.features) ?
              productData.features.filter(f => f && typeof f === 'string') : []
  };

  // Get correct theme-based class name for base card style
  const cardBaseClass = theme === "dark" ? styles.cardDark : styles.cardLight;

  // Format price
  const formatPrice = (price) => {
    if (price === null || price === undefined) return null;
    if (typeof price === 'string') return price; // Assume pre-formatted
    if (typeof price === 'number') {
      return new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0
      }).format(price);
    }
    return null;
  };

  // Get price display value
  const getDisplayPrice = () => {
    if (displayProduct.pricing) {
      const priceValue = displayProduct.pricing.one_time || displayProduct.pricing.value;
      if (priceValue !== null && priceValue !== undefined) return formatPrice(priceValue);
    }
    if (displayProduct.price !== null && displayProduct.price !== undefined) {
      return formatPrice(displayProduct.price);
    }
    return null;
  };

  const displayPrice = getDisplayPrice();

  // Handle image error
  const handleImageError = () => {
    console.warn(`Product image failed to load: ${displayProduct.image_url}`);
    setImageError(true);
  };

  // Handle click
  const handleProductClick = (e) => {
    e.preventDefault();
    const targetUrl = displayProduct.url || "#";
    console.log("Product link clicked:", { name: displayProduct.name, url: targetUrl });

    if (onProductClick) {
      onProductClick(productData); // Pass original data back
    } else if (targetUrl !== "#") {
        if (targetUrl.startsWith('http')) {
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
        } else {
            window.location.href = targetUrl;
        }
    } else {
        // Optional: Fallback action if no URL and no handler
        console.log("No URL or click handler for product:", displayProduct.name);
    }
  };

  // Placeholder image URL using primary color (Adjusted dimensions slightly)
  const encodedProductName = encodeURIComponent(displayProduct.name);
  const placeholderImageUrl = `https://via.placeholder.com/450x250/${primaryColor.replace('#', '')}/${backgroundColor.replace('#', '')}?text=${encodedProductName}`;

  // --- Inline Styles using dynamic theme colors ---

  // Base card style including dynamic border/bg/text color
  const cardStyle = {
    ...style, // Apply overrides from props first
    backgroundColor: backgroundColor,
    color: textColor,
    borderColor: primaryColor, // Use dynamic primary color for border
    boxSizing: 'border-box'  // Ensure padding is included in dimensions
  };

  // Style for price (using secondary color)
  const priceStyle = {
    fontSize: '18px', // Use passed font size or default
    fontWeight: 700, // Bold pricing
    color: secondaryColor, // Use the determined price color
    margin: '10px auto', // Center with auto horizontal margins
    textAlign: 'center !important', // Force center alignment
    width: '100%',
    display: 'block',
  };

  // Style for the "Zobrazit detail" link/button
  const linkStyle = {
    display: 'flex', // Changed to flex for better alignment
    alignItems: 'center',
    justifyContent: 'center', // Center content horizontally
    gap: '5px', // Slightly increased gap
    padding: '10px 12px', // Increased vertical padding
    width: 'auto', // Auto width
    maxWidth: '160px', // Reduced max width
    borderRadius: '6px',
    fontSize: '13px', // Smaller font size
    fontWeight: 600, // Made text slightly bolder
    textDecoration: 'none',
    color: 'white', // Text color is always white for contrast
    backgroundColor: primaryColor, // Use dynamic primary color
    border: 'none', // Ensure no default border
    cursor: 'pointer',
    transition: 'background-color 0.2s ease', // Transition only background
    margin: '0 auto', // Center the button
  };

  // Hover style for the link (using secondary color)
  const linkHoverStyle = {
    backgroundColor: secondaryColor, // Use dynamic secondary color on hover
  };

  // Footer container style
  const footerStyle = {
    display: 'flex',
    justifyContent: 'center', // Center the button
    marginTop: 'auto',
    paddingTop: '15px',
    borderTop: `1px solid ${theme === 'dark' ? '#444' : '#eee'}`,
    width: '100%',
  };

  return (
    // Apply base theme class AND dynamic inline styles
    <div className={`${styles.card} ${cardBaseClass}`} style={cardStyle}>

      {/* Image or Placeholder - Rendered first */}
      {!imageError && displayProduct.image_url ? (
        <div style={{ 
          width: '100%', 
          height: '180px', 
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '20px'
        }}>
          <img
            src={displayProduct.image_url}
            alt={displayProduct.name}
            className={styles.productImage}
            style={{ objectFit: 'contain', objectPosition: 'center' }} // Changed to contain instead of cover
            onError={handleImageError}
          />
        </div>
      ) : (
        <div
          className={styles.placeholderImage}
          style={{ 
            borderColor: primaryColor,
            height: '180px',
            marginBottom: '20px'
          }} // Dynamic border color for placeholder
        >
          <img
            src={placeholderImageUrl}
            alt={displayProduct.name}
            className={styles.placeholderImgContent}
            // Optional: Add onError for the placeholder itself if needed
          />
        </div>
      )}

      {/* Product Info: Name and Price */}
      <div className={styles.productInfo} style={{ alignItems: 'center', textAlign: 'center' }}>
        <h3 className={styles.productName} style={{ color: textColor, textAlign: 'left', alignSelf: 'flex-start', width: '100%' }}>
          {displayProduct.name}
        </h3>
        {displayPrice && (
          // Apply dynamic price style inline
          <div className={styles.priceContainer} style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            margin: '10px auto',
            textAlign: 'center'
          }}>
            <span style={{
              fontSize: '18px',
              fontWeight: 700,
              color: secondaryColor,
              textAlign: 'center',
              display: 'block'
            }}>
              {displayPrice}
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      {displayProduct.description && (
        <p className={styles.description} style={{ color: theme === 'dark' ? '#ccc' : '#555' }}>
          {displayProduct.description}
        </p>
      )}

      {/* Features */}
      {displayProduct.features.length > 0 && (
        <div className={styles.features}>
          {displayProduct.features.slice(0, 4).map((feature, index) => ( // Show up to 4 features
            <div key={index} className={styles.feature}>
              {/* Apply dynamic primary color to icon inline */}
              <CheckCheck
                size={15} // Slightly smaller icon
                className={styles.featureIcon}
                style={{ color: primaryColor }}
              />
              <span style={{ color: textColor }}>{feature}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer with Link */}
      <div className={styles.footer} style={footerStyle}>
        <a
          href={displayProduct.url || "#"}
          style={linkStyle} // Apply dynamic link style inline
          onClick={handleProductClick}
          // Apply hover effect using inline event handlers
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = linkHoverStyle.backgroundColor}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = linkStyle.backgroundColor}
        >
          Zobrazit detail
          {/* Moved arrow to the right of text */}
          <ArrowRight size={15} className={styles.linkIcon} style={{ marginLeft: '2px' }} />
        </a>
      </div>
    </div>
  );
};

export default ProductCard;