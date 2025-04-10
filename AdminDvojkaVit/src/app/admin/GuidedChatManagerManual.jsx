import React from "react";
import { 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  MessagesSquare 
} from "lucide-react";
import styles from "./GuidedChatManager.module.css";

const GuidedChatManagerManual = ({ dynamicStyles = {} }) => {
  return (
    <div className={styles.manualContainer} style={dynamicStyles.manualContainer}>
      <div className={styles.manualHeader}>
        <BookOpen className={styles.manualIcon} style={dynamicStyles.manualIcon} size={24} />
        <h2 className={styles.manualTitle}>Guided Chat Help</h2>
      </div>

      <div className={styles.manualSection}>
        <h3 className={styles.manualSectionTitle}>
          <Info size={18} className={styles.sectionIcon} style={dynamicStyles.sectionIcon} />
          What is Guided Chat?
        </h3>
        <p className={styles.manualText}>
          Guided Chat helps your users navigate conversations with predefined options instead of typing free text. 
          This creates a more structured experience and helps direct users to the most relevant information.
        </p>
      </div>

      <div className={styles.manualSection}>
        <h3 className={styles.manualSectionTitle}>
          <MessagesSquare size={18} className={styles.sectionIcon} style={dynamicStyles.sectionIcon} />
          How It Works
        </h3>
        <p className={styles.manualText}>
          The system uses a hierarchical "flow" structure:
        </p>
        <ul className={styles.manualList}>
          <li className={styles.manualListItem} style={dynamicStyles.manualListItem}>
            <strong>Main Flow:</strong> The starting point that every user sees first
          </li>
          <li className={styles.manualListItem} style={dynamicStyles.manualListItem}>
            <strong>Secondary Flows:</strong> Additional conversation paths that can be linked from the main flow or other secondary flows
          </li>
          <li className={styles.manualListItem} style={dynamicStyles.manualListItem}>
            <strong>Options:</strong> The clickable choices users see, each with its own bot response and optional link to another flow
          </li>
        </ul>
      </div>

      <div className={styles.manualSection}>
        <h3 className={styles.manualSectionTitle}>
          <CheckCircle2 size={18} className={styles.sectionIcon} style={dynamicStyles.sectionIcon} />
          Best Practices
        </h3>
        <ul className={styles.manualList}>
          <li className={styles.manualListItem} style={dynamicStyles.manualListItem}>
            Keep option text short and clear (3-5 words is ideal)
          </li>
          <li className={styles.manualListItem} style={dynamicStyles.manualListItem}>
            Use emojis to make options visually distinct
          </li>
          <li className={styles.manualListItem} style={dynamicStyles.manualListItem}>
            Group related topics into separate flows
          </li>
          <li className={styles.manualListItem} style={dynamicStyles.manualListItem}>
            Limit options to 4-5 per flow to avoid overwhelming users
          </li>
          <li className={styles.manualListItem} style={dynamicStyles.manualListItem}>
            Include a way for users to get back to previous menus
          </li>
        </ul>
      </div>

      <div className={styles.manualSection}>
        <h3 className={styles.manualSectionTitle}>
          <AlertCircle size={18} className={styles.sectionIcon} style={dynamicStyles.sectionIcon} />
          Important Notes
        </h3>
        <div className={styles.callout} style={dynamicStyles.callout}>
          <p className={styles.calloutText}>
            <strong>Flow Names:</strong> Must be lowercase with underscores (e.g., "product_info"). These are used internally as identifiers.
          </p>
        </div>
        <div className={styles.callout} style={dynamicStyles.callout}>
          <p className={styles.calloutText}>
            <strong>Main Flow:</strong> Cannot be deleted as it's the entry point for all guided conversations.
          </p>
        </div>
        <div className={styles.callout} style={dynamicStyles.callout}>
          <p className={styles.calloutText}>
            <strong>Circular References:</strong> The system prevents creating loops where flows endlessly refer to each other.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuidedChatManagerManual;