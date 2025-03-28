import React from "react";
import styles from "./ConfirmDialog.module.css";

export const ConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title,
  description,
  dynamicStyles = {}
}) => {
  if (!open) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.dialogContainer}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
        <div className={styles.buttonContainer}>
          <button
            onClick={onCancel}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={styles.confirmButton}
            style={dynamicStyles.confirmButton}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = dynamicStyles.confirmButtonHover?.backgroundColor;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = dynamicStyles.confirmButton?.backgroundColor;
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;