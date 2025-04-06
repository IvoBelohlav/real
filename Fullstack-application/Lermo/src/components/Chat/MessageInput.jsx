import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader } from "lucide-react";
import { themes } from "../../themes";
import styles from "./MessageInput.module.css";

const MessageInput = ({
  onSend,
  disabled,
  theme = "light",
  onFocus,
  onBlur,
  widgetConfig,
  inputRef,
  // style prop is passed from Widget.jsx but not used directly here anymore
}) => {
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef(null);
  // We'll get theme colors directly from widgetConfig or fallbacks
  // const currentThemeStyle = themes[theme] || themes.light; // No longer needed for direct style access

  useEffect(() => {
    if (inputRef && textareaRef.current) {
      inputRef.current = {
        element: textareaRef.current,
        focus: () => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        },
        get value() { 
          return textareaRef.current ? textareaRef.current.value : ""; 
        },
        set value(val) { 
          if (!textareaRef.current) return;
          
          textareaRef.current.value = val;
          setText(val);
          
          textareaRef.current.style.height = "auto";
          const newHeight = Math.min(textareaRef.current.scrollHeight, 60);
          textareaRef.current.style.height = `${newHeight}px`;
          
          const inputEvent = new Event('input', { bubbles: true });
          textareaRef.current.dispatchEvent(inputEvent);
        }
      };
    }
  }, [inputRef]);

  useEffect(() => {
    const currentTextarea = textareaRef.current;
    
    if (!currentTextarea) return;
    
    const syncInputValue = (e) => {
      if (e.target.value !== text) {
        setText(e.target.value);
      }
    };
    
    currentTextarea.addEventListener('input', syncInputValue);
    
    return () => {
      if (currentTextarea) {
        currentTextarea.removeEventListener('input', syncInputValue);
      }
    };
  }, [text, textareaRef]);

  // Determine theme colors for CSS variables
  const primaryColor = theme === "light" ? widgetConfig?.primary_color_light : widgetConfig?.primary_color_dark;
  const inputBgColor = theme === "light" ? widgetConfig?.input_bg_color_light : widgetConfig?.input_bg_color_dark; // Assuming these exist in config
  const inputTextColor = theme === 'light' ? widgetConfig?.text_color_light : widgetConfig?.text_color_dark;
  const containerBgColor = theme === 'light' ? widgetConfig?.background_color_light : widgetConfig?.background_color_dark; // Or a specific footer bg color if available
  const placeholderColor = theme === 'light' ? '#a0aec0' : '#718096'; // Example placeholder colors
  const focusShadowColor = theme === 'light' ? `${primaryColor}40` : `${primaryColor}40`;
  const buttonTextColor = text.trim() && !disabled ? (theme === 'light' ? widgetConfig?.button_text_color_light : widgetConfig?.button_text_color_dark || '#FFFFFF') : (inputTextColor || (theme === 'light' ? '#000000' : '#FFFFFF'));
  const buttonBgColor = text.trim() && !disabled ? primaryColor : 'transparent';
  const buttonCursor = text.trim() && !disabled ? 'pointer' : 'default';
  const buttonOpacity = disabled ? 0.5 : 1;

  // Define CSS variables
  const cssVariables = {
    '--input-container-bg': containerBgColor || (theme === 'light' ? '#ffffff' : '#1a202c'), // Fallback container bg
    '--input-border-top-color': `${primaryColor}20` || 'rgba(0,0,0,0.1)', // Fallback border top
    '--input-shadow-color': `${primaryColor}05` || 'rgba(0,0,0,0.02)', // Fallback shadow
    '--input-bg-color': inputBgColor || (theme === 'light' ? '#f7fafc' : '#2d3748'), // Fallback input bg
    '--input-text-color': inputTextColor || (theme === 'light' ? '#000000' : '#ffffff'), // Fallback text color
    '--input-placeholder-color': placeholderColor,
    '--input-focus-shadow-color': focusShadowColor || 'rgba(0,0,0,0.1)', // Fallback focus shadow
    '--scrollbar-track-color': `${primaryColor}10` || 'rgba(0,0,0,0.05)',
    '--scrollbar-thumb-color': `${primaryColor}30` || 'rgba(0,0,0,0.2)',
    '--scrollbar-thumb-hover-color': `${primaryColor}50` || 'rgba(0,0,0,0.3)',
    '--button-bg-color': buttonBgColor,
    '--button-text-color': buttonTextColor,
    '--button-cursor': buttonCursor,
    '--button-opacity': buttonOpacity,
  };


  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 60);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [text]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!text.trim() || disabled || isLoading) return;

    setIsLoading(true);
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    try {
      await onSend({ text: text.trim(), timestamp });
      setText("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const computedLineHeight = text.trim() === "" ? "34px" : "1.3";

  return (
    // Apply CSS variables to the container
    <div
      className={styles.container}
      style={cssVariables}
    >
      <motion.form
        onSubmit={handleSubmit}
        className={styles.form}
        initial={false}
        animate={{
          scale: isFocused ? 1.01 : 1,
          transition: { type: "spring", stiffness: 400, damping: 25 },
        }}
      >
        <motion.div
          className={styles.inputContainer}
          initial={false}
          animate={{ opacity: disabled ? 0.7 : 1 }}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Zadejte své otázky..."
            disabled={disabled}
            className={styles.textarea}
            // Inline styles removed - handled by CSS Module + CSS variables
            // Note: line-height calculation might need adjustment if it was dynamic based on text
          />
        </motion.div>

        <AnimatePresence>
          <motion.button
            type="submit"
            disabled={!text.trim() || disabled || isLoading}
            className={styles.submitButton}
            // Inline styles removed - handled by CSS Module + CSS variables
            whileHover={!disabled && text.trim() ? { scale: 1.05, filter: 'brightness(1.1)' } : {}} // Add brightness effect on hover
            whileTap={!disabled && text.trim() ? { scale: 0.95 } : {}}
            initial={{ rotate: 0 }}
            animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 1, repeat: isLoading ? Infinity : 0 }}
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader className={styles.loadingIcon} />
            ) : (
              <Send className={styles.icon} />
            )}
          </motion.button>
        </AnimatePresence>
      </motion.form>
      {/* Removed <style jsx global> tag */}
    </div>
  );
};

export default MessageInput;
