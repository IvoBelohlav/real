import React from 'react';
import WidgetConfigForm from './WidgetConfigForm';
import styles from './WidgetConfigManager.module.css';

const WidgetConfigManager = () => {
  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Widget Configuration</h2>
      <p className={styles.description}>
        Customize the appearance and behavior of the chat widget. Choose from predefined themes or create your own unique design.
      </p>

      <WidgetConfigForm />
    </div>
  );
};

export default WidgetConfigManager;