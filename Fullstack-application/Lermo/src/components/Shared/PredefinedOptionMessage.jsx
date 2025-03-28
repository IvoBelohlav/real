import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { themes } from "../../themes";
import styles from "./PredefinedOptionMessage.module.css";

const PredefinedOptionMessage = ({
    option,
    onSelect,
    theme = "light",
    disabled,
    className = "",
    animationDelay = 0,
    widgetConfig,
}) => {
    const currentTheme = themes[theme] || themes.light;
    const [isFading, setIsFading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const timeoutRef = useRef();
    const buttonRef = useRef();
    const [isLoading, setIsLoading] = useState(false);

    const motionConfig = {
        type: "spring",
        stiffness: 400,
        damping: 30,
        mass: 0.8,
    };

    useEffect(() => {
        return () => clearTimeout(timeoutRef.current);
    }, []);

    const handleSelect = async () => {
        if (disabled || isLoading) return;
        setIsLoading(true);
        setIsFading(true);
        if (window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }
        timeoutRef.current = setTimeout(() => {
            onSelect(option);
            setIsLoading(false);
        }, 400);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSelect();
        }
    };

    const getButtonStyles = () => {
      const primaryColor = theme === "dark"
          ? (widgetConfig?.primary_color_dark || currentTheme.primaryColor)
          : (widgetConfig?.primary_color_light || currentTheme.primaryColor);

      const buttonBackgroundColor = theme === "dark"
          ? (widgetConfig?.button_bg_color_dark || currentTheme.backgroundColor)
          : (widgetConfig?.button_bg_color_light || currentTheme.backgroundColor);

      return {
          backgroundColor: buttonBackgroundColor,
          color: theme === "dark"
              ? (widgetConfig?.text_color_dark || currentTheme.textColor)
              : (widgetConfig?.text_color_light || currentTheme.textColor),
          border: `1px solid ${primaryColor}`,
          borderRadius: widgetConfig?.button_border_radius || "1rem",
          boxShadow: isHovered || isFocused
              ? `0 4px 12px ${primaryColor}33`
              : "none",
          padding: widgetConfig?.button_padding || "0.75rem 1rem",
          fontSize: widgetConfig?.base_font_size || "0.875rem",
          fontWeight: widgetConfig?.button_font_weight || "normal",
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
      };
    };

    const getIconStyles = () => {
        const primaryColor = theme === "dark"
            ? (widgetConfig?.primary_color_dark || currentTheme.primaryColor)
            : (widgetConfig?.primary_color_light || currentTheme.primaryColor);

        return {
            backgroundColor: theme === "dark"
                ? (widgetConfig?.icon_background_color_dark || currentTheme.secondaryColor)
                : (widgetConfig?.icon_background_color_light || currentTheme.secondaryColor),
            color: theme === "dark"
                ? (widgetConfig?.button_text_color_dark || "#FFFFFF")
                : (widgetConfig?.button_text_color_light || "#FFFFFF"),
            border: `1px solid ${primaryColor}`,
        };
    };

    return (
        <AnimatePresence>
            <motion.div
                className={`${styles.container} ${className}`}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ ...motionConfig, delay: animationDelay }}
                layout
            >
                <motion.button
                    ref={buttonRef}
                    onClick={handleSelect}
                    onKeyDown={handleKeyDown}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    disabled={isFading || disabled}
                    aria-disabled={disabled}
                    aria-label={`Select ${option.text}${option.followUp ? `: ${option.followUp}` : ""}`}
                    role="button"
                    className={styles.button}
                    style={getButtonStyles()}
                >
                    <motion.div
                        className={styles.buttonGradient}
                        initial={false}
                        animate={{
                            opacity: isHovered || isFocused ? 1 : 0,
                            scale: isHovered || isFocused ? 1.05 : 1,
                        }}
                        transition={{ duration: 0.2 }}
                    />

                    <div className={styles.content}>
                        <motion.div
                            className={styles.iconContainer}
                            animate={{
                                scale: isHovered || isFocused ? 1.1 : 1,
                                rotate: isFading ? 360 : 0,
                            }}
                            transition={motionConfig}
                            style={getIconStyles()}
                        >
                            {isFading ? (
                                <Loader2 className={styles.spinner} />
                            ) : (
                                option.icon
                            )}
                        </motion.div>

                        <div className={styles.textContainer}>
                            <motion.div
                                className={styles.primaryText}
                                animate={{ x: isFading ? -10 : 0, opacity: isFading ? 0 : 1 }}
                                transition={motionConfig}
                            >
                                {option.text}
                            </motion.div>
                            {option.followUp && (
                                <motion.div
                                    className={styles.secondaryText}
                                    animate={{
                                        x: isFading ? -10 : 0,
                                        opacity: isFading ? 0 : 0.8,
                                    }}
                                    transition={{ ...motionConfig, delay: 0.05 }}
                                >
                                    {option.followUp}
                                </motion.div>
                            )}
                        </div>

                        <motion.div
                            animate={{
                                x: isFading ? 15 : 0,
                                opacity: isFading ? 0 : 1,
                                scale: isHovered || isFocused ? 1.2 : 1,
                            }}
                            transition={motionConfig}
                        >
                            <ArrowLeft className={styles.arrow} />
                        </motion.div>
                    </div>
                </motion.button>
            </motion.div>
        </AnimatePresence>
    );
};

PredefinedOptionMessage.propTypes = {
    option: PropTypes.shape({
        text: PropTypes.string.isRequired,
        icon: PropTypes.node.isRequired,
        followUp: PropTypes.string,
    }).isRequired,
    onSelect: PropTypes.func.isRequired,
    theme: PropTypes.oneOf(["light", "dark"]),
    disabled: PropTypes.bool,
    className: PropTypes.string,
    animationDelay: PropTypes.number,
    widgetConfig: PropTypes.shape({
        background_color_light: PropTypes.string,
        background_color_dark: PropTypes.string,
        primary_color_light: PropTypes.string,
        primary_color_dark: PropTypes.string,
        secondary_color_light: PropTypes.string,
        secondary_color_dark: PropTypes.string,
        text_color_light: PropTypes.string,
        text_color_dark: PropTypes.string,
        button_text_color_light: PropTypes.string,
        button_text_color_dark: PropTypes.string,
        button_bg_color_light: PropTypes.string,
        button_bg_color_dark: PropTypes.string,
        icon_background_color_light: PropTypes.string,
        icon_background_color_dark: PropTypes.string,
        button_border_radius: PropTypes.string,
        button_padding: PropTypes.string,
        base_font_size: PropTypes.string,
        button_font_weight: PropTypes.string,
    }),
};

export default PredefinedOptionMessage;