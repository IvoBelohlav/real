import React from 'react';
import { Search } from 'lucide-react';
import styles from './FaqSearch.module.css';

const FaqSearch = ({ faqSearchTerm, handleFaqSearch, theme, style }) => {
    // Get primary color and background color directly from the widget config
    const borderColor =
        theme === 'light'
            ? style?.primary_color_light
            : style?.primary_color_dark;
    const backgroundColor =
        theme === 'light'
            ? style?.background_color_light
            : style?.background_color_dark;
    const textColor =
        theme === 'light'
            ? style?.text_color_light
            : style?.text_color_dark;

    return (
        <div className={styles.container}>
            <input
                type="text"
                placeholder="Najít otázku..."
                value={faqSearchTerm}
                onChange={handleFaqSearch}
                className={styles.searchInput}
                style={{
                    backgroundColor: backgroundColor,
                    color: textColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '0.75rem',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    fontSize: '0.875rem',
                }}
            />
            <Search
                size={18}
                className={styles.searchIcon}
                style={{
                    color: borderColor,
                }}
            />
            <style jsx global>{`
                input:focus {
                    outline: none !important;
                    box-shadow: none !important;
                    border-color: ${borderColor} !important;
                }
            `}</style>
        </div>
    );
};

export default FaqSearch;