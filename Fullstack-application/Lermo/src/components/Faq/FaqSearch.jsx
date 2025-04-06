import React from 'react';
import { Search } from 'lucide-react';
import styles from './FaqSearch.module.css';

const FaqSearch = ({ faqSearchTerm, handleFaqSearch, theme, style: widgetStyle }) => {
    // Determine theme colors
    const primaryColor = theme === 'light' ? widgetStyle?.primary_color_light : widgetStyle?.primary_color_dark;
    const backgroundColor = theme === 'light' ? widgetStyle?.background_color_light : widgetStyle?.background_color_dark;
    const textColor = theme === 'light' ? widgetStyle?.text_color_light : widgetStyle?.text_color_dark;
    // Use primary color for border and icon, secondary or a lighter/darker shade for focus shadow if available
    const focusShadowColor = theme === 'light' 
        ? `${widgetStyle?.primary_color_light}40` // Add alpha for focus shadow
        : `${widgetStyle?.primary_color_dark}40`; 

    // Define CSS variables based on theme
    const cssVariables = {
        '--faq-border-color': primaryColor || '#cccccc', // Fallback border color
        '--faq-bg-color': backgroundColor || (theme === 'light' ? '#ffffff' : '#333333'), // Fallback bg
        '--faq-text-color': textColor || (theme === 'light' ? '#000000' : '#ffffff'), // Fallback text color
        '--faq-icon-color': primaryColor || '#888888', // Fallback icon color
        '--faq-focus-shadow-color': focusShadowColor || 'rgba(0, 0, 0, 0.1)', // Fallback focus shadow
    };

    return (
        // Apply CSS variables to the container
        <div className={styles.container} style={cssVariables}>
            <input
                type="text"
                placeholder="Najít otázku..."
                value={faqSearchTerm}
                onChange={handleFaqSearch}
                className={styles.searchInput}
                // Inline styles are now removed, handled by CSS Module + CSS variables
            />
            <Search
                size={18}
                className={styles.searchIcon}
                // Inline style removed, handled by CSS Module + CSS variables
            />
            {/* Removed <style jsx global> tag */}
        </div>
    );
};

export default FaqSearch;
