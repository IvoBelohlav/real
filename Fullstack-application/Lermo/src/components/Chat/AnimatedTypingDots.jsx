import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { themes } from "../../themes";
import api from "../../utils/api";
import styles from "./AnimatedTypingDots.module.css";

const AnimatedTypingDots = ({ theme, widgetConfig }) => {
  const currentTheme = themes[theme] || themes["light"];
  const [primaryColor, setPrimaryColor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch widget config from backend if not provided as prop
  useEffect(() => {
    const fetchWidgetConfig = async () => {
      if (widgetConfig) {
        // If widgetConfig is passed as prop, use it
        setPrimaryColor(
          theme === "light"
            ? widgetConfig.primary_color_light || currentTheme.primaryColor
            : widgetConfig.primary_color_dark || currentTheme.primaryColor
        );
        setIsLoading(false);
      } else {
        // Otherwise fetch from backend
        try {
          setIsLoading(true);
          const response = await api.get('/api/widget-config');
          const config = response.data;
          
          setPrimaryColor(
            theme === "light"
              ? config.primary_color_light || currentTheme.primaryColor
              : config.primary_color_dark || currentTheme.primaryColor
          );
        } catch (error) {
          console.error('Failed to fetch widget config:', error);
          // Fallback to theme's primary color
          setPrimaryColor(currentTheme.primaryColor);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchWidgetConfig();
  }, [theme, widgetConfig, currentTheme.primaryColor]);

  // Set the dot color to purple
  const dotColor = "#800080"; // Purple color

  const dotVariants = {
    initial: { y: 0, scale: 1, opacity: 0.8 },
    animate: {
      y: [-3, 0, -3],
      scale: [1, 1.2, 1],
      opacity: [0.8, 1, 0.8],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className={styles.container}>
      {[0, 0.3, 0.6].map((delay, i) => (
        <motion.span
          key={i}
          className={styles.dot}
          style={{
            backgroundColor: isLoading ? currentTheme.primaryColor : dotColor,
            boxShadow: `0 0 5px ${isLoading ? currentTheme.primaryColor : dotColor}80`,
          }}
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ delay }}
        />
      ))}
    </div>
  );
};

export default AnimatedTypingDots;