//unchanged, using external library
import React from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import styles from './EmojiPicker.module.css';

export const EmojiPicker = ({
  value,
  onChange,
  title = "Pick an emoji",
  placement = "top",
}) => {
  return (
    <div className={styles.container}>
      <div
        className={styles.pickerContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <Picker
          data={data}
          onEmojiSelect={(emoji) => {
            onChange(emoji.native);
          }}
          title={title}
          emojiSize={20}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
};