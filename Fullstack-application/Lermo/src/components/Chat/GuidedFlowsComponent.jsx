import React, { useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import ChatMessage from "../Chat/ChatMessage";
import styles from "./GuidedFlows.module.css";

const GuidedFlowsComponent = React.memo(
  ({
    onOptionSelect,
    currentFlow,
    theme,
    brandTheme,
    flows,
    setGuidedMessages,
    guidedMessages,
    widgetConfig,
  }) => {
  
    // Increase delay time for option selection
    const handleOptionSelectWrapper = useCallback(
      (option) => {
        setGuidedMessages((prev) => [
          ...prev,
          {
            text: option.text,
            sender: "user",
            icon: option.icon,
            isOption: true,
            useCase: "guided",
          },
        ]);
        // Added longer delay before triggering the option select
        setTimeout(() => {
          onOptionSelect(option);
        }, 700); // Increased from default 300ms to 700ms
      },
      [onOptionSelect, setGuidedMessages]
    );

    const containerVariants = {
      hidden: { opacity: 0, y: 10, scale: 0.95 },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 25,
          duration: 0.4,
        },
      },
      hover: {
        scale: 1.02,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 25,
        },
      },
      tap: {
        scale: 0.98,
        transition: {
          duration: 0.1,
        },
      },
      exit: {
        opacity: 0,
        y: 10,
        scale: 0.95,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 35,
          duration: 0.3,
        },
      },
    };

    const buttonStyle = {
      border: `1px solid ${brandTheme.primaryColor}`, // Use brandTheme.primaryColor
      backgroundColor: brandTheme.buttonBgColor, // Use brandTheme.backgroundColor
      color: brandTheme.buttonTextColor, // Use brandTheme.buttonTextColor
      backdropFilter: "none !important",
    };

    const textStyle = {
      color: brandTheme.buttonTextColor, // Use brandTheme.textColor
    };

    const iconStyle = {
      backgroundColor: brandTheme.iconBackgroundColor,
      color: "#FFFFFF",
    };

    return (
      <div className={styles.container}>
        {guidedMessages.length > 0 &&
          guidedMessages.map((msg, index) => (
            <React.Fragment key={index}>
              {msg.sender === "user" && msg.isOption && (
                <ChatMessage
                  message={{ ...msg, timestamp: msg.timestamp }}
                  onMessageDisplayed={() => {}}
                  onRead={() => {}}
                  theme={theme}
                  widgetConfig={widgetConfig}
                  onProductClick={onOptionSelect}
                  style={{ // Pass the style prop here
                    backgroundColor: brandTheme.userMessageBgColor,
                    color: brandTheme.userMessageTextColor,
                    borderRadius: brandTheme.userMessageBorderRadius,
                    padding: brandTheme.userMessagePadding,
                    textAlign: brandTheme.userMessageTextAlign,
                    fontWeight: brandTheme.messageFontWeight,
                    fontSize: brandTheme.baseFontSize,
                    borderStyle: brandTheme.messageBubbleBorderStyle,
                    borderWidth: brandTheme.messageBubbleBorderWidth,
                    messageBubbleBorderColor: brandTheme.messageBubbleBorderColor
                  }}
                />
              )}
            </React.Fragment>
          ))}

        {currentFlow &&
          flows[currentFlow]?.options &&
          flows[currentFlow].options.map((option, index) => (
            <motion.div
              key={option.id}
              variants={containerVariants}
              initial="hidden"
              animate="animate"
              whileHover="hover"
              whileTap="tap"
              exit="exit"
              className={styles.optionContainer}
            >
              <button
                onClick={() => handleOptionSelectWrapper(option)}
                className={styles.button}
                style={buttonStyle}
              >
                <div className={styles.buttonContent}>
                  {/* Icon */}
                  <div
                    className={styles.iconContainer}
                    style={iconStyle}
                  >
                    {option.icon}
                  </div>

                  {/* Text */}
                  <div className={styles.textContainer}>
                    <div className={styles.text} style={textStyle}>
                      {option.text}
                    </div>
                  </div>

                  {/* Arrow */}
                  <motion.div
                    className={styles.arrowContainer}
                    style={textStyle}
                    animate={{
                      x: 0,
                      opacity: 1,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                  >
                    <ArrowLeft
                      className={styles.arrow}
                      aria-label="Select"
                    />
                  </motion.div>
                </div>
              </button>
            </motion.div>
          ))}
      </div>
    );
  }
);

export default GuidedFlowsComponent;