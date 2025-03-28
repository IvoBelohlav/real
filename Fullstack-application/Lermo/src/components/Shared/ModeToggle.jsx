import React from "react";
import { motion } from "framer-motion";
import { themes } from "../../themes";
import styles from "./ModeToggle.module.css";

const ModeToggle = ({ mode, onModeChange, theme, widgetConfig }) => {
  const currentTheme = themes[theme] || themes["light"];

  const modeToggleBackgroundColor =
    theme === "light"
      ? widgetConfig.mode_toggle_background_light
      : widgetConfig.mode_toggle_background_dark;

  const primaryColor =
    theme === "light"
      ? widgetConfig.primary_color_light || currentTheme.primaryColor
      : widgetConfig.primary_color_dark || currentTheme.primaryColor;
  const secondaryColor =
    theme === "light"
      ? widgetConfig.secondary_color_light || currentTheme.secondaryColor
      : widgetConfig.secondary_color_dark || currentTheme.secondaryColor;

  const getModeIcon = (currentMode) => {
    switch (currentMode) {
      case "guided":
        return "🌟";
      case "chat":
        return "🗨️";
      case "faq":
        return "📚";
      default:
        return "";
    }
  };

  return (
    <div className={styles.container}>
      <div
        className={styles.toggleWrapper}
        style={{
          border: `0.5px solid ${secondaryColor}`,
          backgroundColor: currentTheme.backgroundColor,
          borderRadius: "1rem",
          isolation: "isolate"
        }}
      >
        <div className={styles.buttonGroup}>
          <motion.div
            className={styles.modeIndicator}
            animate={{
              x: mode === "guided" ? "0%" : mode === "chat" ? "100%" : "200%",
            }}
            transition={{
              type: "tween",
              ease: "easeInOut",
              duration: 0.3,
            }}
            style={{
              backgroundColor: modeToggleBackgroundColor,
              borderRadius: "1rem",
            }}
          />

          <div className={styles.buttonsContainer}>
            {["guided", "chat", "faq"].map((modeType) => (
              <motion.button
                key={modeType}
                onClick={() => onModeChange(modeType)}
                className={styles.modeButton}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  color: mode === modeType ? "#FFFFFF" : currentTheme.textColor,
                  borderRadius: "1.5rem",
                  width: "33.333%",
                  position: "relative",
                }}
              >
                <motion.div
                  className={styles.buttonContent}
                  animate={{
                    scale: mode === modeType ? 1.05 : 1,
                    y: mode === modeType ? -1 : 0,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  }}
                >
                  <span className={styles.icon}>
                    {getModeIcon(modeType)}
                  </span>
                  <span className={styles.modeName}>
                    {modeType === "faq"
                      ? "FAQ"
                      : modeType === "guided"
                      ? "Průvodce"
                      : "Chat"}
                  </span>
                </motion.div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModeToggle;