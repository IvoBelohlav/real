import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { themes } from "../../themes";
import api from "../../utils/api";
import styles from "./LoadingIndicator.module.css";

const LoadingIndicator = ({ theme, widgetConfig }) => {
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
          // Fallback to theme's accent color
          setPrimaryColor(currentTheme.accentColor);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchWidgetConfig();
  }, [theme, widgetConfig, currentTheme.primaryColor, currentTheme.accentColor]);

  // Get the final dot color (fallback to accent color)
  const dotColor = primaryColor || currentTheme.accentColor;

  const dotVariants = {
    initial: {
      y: "0%",
    },
    animate: {
      y: ["0%", "-50%", "0%"], // Animate Y for more noticeable bounce
      transition: {
        duration: 1.2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className={styles.container}>
      <div className={styles.dotsContainer}>
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={styles.dot}
            style={{ backgroundColor: dotColor }}
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{
              ...dotVariants.animate.transition,
              delay: index * 0.2, // Staggered delay for each dot
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default LoadingIndicator;