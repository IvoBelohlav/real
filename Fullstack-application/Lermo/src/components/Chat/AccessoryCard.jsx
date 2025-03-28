import React from 'react';
import { motion } from 'framer-motion';
import { 
  Paperclip,
  ChevronRight,
  ShoppingCart,
  Check
} from 'lucide-react';
import styles from './AccessoryCard.module.css';

const AccessoryCard = ({ 
  accessoryData, 
  theme = 'light',
  primaryColor = '#4f46e5',
  onProductClick,
  style 
}) => {
  // Guard clause - if accessoryData is not defined, return null
  if (!accessoryData) {
    console.error('AccessoryCard: No accessoryData provided');
    return null;
  }

  // Format price helper function
  const formatPrice = (price) => {
    if (!price) return 'Cena není k dispozici';
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK'
    }).format(price);
  };

  // Get display price from accessory data
  const getDisplayPrice = () => {
    if (!accessoryData.pricing) return null;
    const pricing = accessoryData.pricing;
    
    if (pricing.one_time) return formatPrice(pricing.one_time);
    if (pricing.monthly) return `${formatPrice(pricing.monthly)}/měsíc`;
    if (pricing.annual) return `${formatPrice(pricing.annual)}/rok`;
    return accessoryData.price || null;
  };

  const price = accessoryData.price || getDisplayPrice();

  // Handle product click
  const handleProductClick = (e) => {
    if (e) {
      e.preventDefault();
    }
    if (onProductClick && accessoryData) {
      onProductClick(accessoryData);
    }
  };

  // Get accent color from admin panel
  const accentColor = theme === 'dark' 
    ? style?.primary_color_dark || primaryColor
    : style?.primary_color_light || primaryColor;

  // Create CSS classes based on theme
  const cardClass = `${styles.card} ${theme === 'dark' ? styles.cardDark : styles.cardLight}`;
  const headerClass = styles.header;
  const headerLeftClass = styles.headerLeft;
  const iconContainerClass = styles.iconContainer;
  const iconClass = styles.icon;
  const titleClass = `${styles.title} ${theme === 'dark' ? styles.titleDark : styles.titleLight}`;
  const badgeClass = `${styles.badge} ${theme === 'dark' ? styles.badgeDark : styles.badgeLight}`;
  const contentClass = styles.content;
  const imageContainerClass = `${styles.imageContainer} ${theme === 'dark' ? styles.imageDark : styles.imageLight}`;
  const imageClass = styles.image;
  const detailsClass = `${styles.details} ${!accessoryData.image_url ? styles.detailsFull : ''}`;
  const priceClass = `${styles.price} ${theme === 'dark' ? styles.priceDark : styles.priceLight}`;
  const featuresClass = styles.features;
  const featureClass = `${styles.feature} ${theme === 'dark' ? styles.featureDark : styles.featureLight}`;
  const checkIconClass = styles.checkIcon;
  const actionsClass = styles.actions;
  const viewLinkClass = `${styles.viewLink} ${theme === 'dark' ? styles.viewLinkDark : styles.viewLinkLight}`;
  const chevronIconClass = styles.chevronIcon;
  const addButtonClass = styles.addButton;
  const cartIconClass = styles.cartIcon;

  // Create custom inline styles for elements using primary color 
  const customStyles = {
    iconContainer: { backgroundColor: `${accentColor}20` },
    icon: { color: accentColor },
    badge: { color: accentColor },
    checkIcon: { color: accentColor },
    addButton: { backgroundColor: accentColor, color: 'white' },
    viewLink: { color: accentColor }
  };

  // Animation variants
  const cardVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div 
      className={cardClass} 
      style={style}
      variants={cardVariants}
      initial="initial"
      animate="animate"
    >
      <div className={headerClass}>
        <div className={headerLeftClass}>
          <div className={iconContainerClass} style={customStyles.iconContainer}>
            <Paperclip className={iconClass} style={customStyles.icon} />
          </div>
          <h3 className={titleClass}>
            {accessoryData.name || accessoryData.product_name || 'Doporučené příslušenství'}
          </h3>
        </div>
        <div className={badgeClass} style={customStyles.badge}>
          Příslušenství
        </div>
      </div>
      
      <div className={contentClass}>
        {accessoryData.image_url && (
          <div className={imageContainerClass}>
            <img 
              src={accessoryData.image_url} 
              alt={accessoryData.name || accessoryData.product_name || 'Příslušenství'} 
              className={imageClass}
              onError={(e) => {
                console.warn("Failed to load accessory image:", accessoryData.image_url);
                e.target.src = "/placeholder-accessory.png"; // Fallback image
              }}
            />
          </div>
        )}
        
        <div className={detailsClass}>
          {price && (
            <div className={priceClass}>
              {price}
            </div>
          )}
          
          <div className={featuresClass}>
            {(accessoryData.features || []).slice(0, 3).map((feature, index) => (
              <div key={index} className={featureClass}>
                <Check className={checkIconClass} style={customStyles.checkIcon} />
                {feature}
              </div>
            ))}
          </div>
          
          <div className={actionsClass}>
            {accessoryData.url && (
              <a 
                href={accessoryData.url} 
                className={viewLinkClass}
                style={customStyles.viewLink}
                onClick={(e) => handleProductClick(e)}
                target="_blank" 
                rel="noopener noreferrer"
              >
                Více info
                <ChevronRight className={chevronIconClass} />
              </a>
            )}
            
            <button 
              className={addButtonClass} 
              style={customStyles.addButton}
              onClick={(e) => handleProductClick(e)}
            >
              <ShoppingCart className={cartIconClass} />
              Detail
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AccessoryCard;