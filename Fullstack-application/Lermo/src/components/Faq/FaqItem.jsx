import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import styles from './FaqItem.module.css';

const FaqItem = ({
  question,
  answer,
  isOpen,
  toggleOpen,
  searchTerm,
  theme,
  style,
}) => {
  // Correctly use primaryColor from style based on the theme
  const primaryColor =
    theme === 'light' ? style.primaryColor : style.primaryColor;

  // Define background and text colors based on theme, using style values
  const backgroundColor =
    theme === 'light' ? style.backgroundColor : style.backgroundColor; // Use style.backgroundColor for both themes
  const textColor = theme === 'light' ? '#1F2937' : style.textColor;
  const answerTextColor = theme === 'light' ? '#374151' : '#E2E8F0';

  const highlightedQuestion = (q) => {
    if (!searchTerm) return q;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = q.split(regex);
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          className={styles.highlightedMark}
          style={{
            backgroundColor: `${primaryColor}40`,
            color: textColor,
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <motion.div
      className={styles.faqItem}
      style={{
        borderColor: primaryColor,
        backgroundColor: backgroundColor, // Use the dynamic backgroundColor from style
      }}
    >
      <div
        className={styles.questionContainer}
        onClick={toggleOpen}
      >
        <h4 className={styles.question} style={{ color: textColor }}>
          {highlightedQuestion(question)}
        </h4>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown size={24} style={{ color: primaryColor }} />
        </motion.span>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <div className={styles.answerContainer} style={{ color: answerTextColor }}>
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FaqItem;