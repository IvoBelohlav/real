// themes.js
export const themes = {
  light: {
    backgroundColor: "#ffffff",
    textColor: "#212121",
    primaryColor: "#0070F3",
    secondaryColor: "#f0f2f5",
    accentColor: "#0EA5E9",
    highlightColor: "#38BDF8",

    chatBubbleBot: "bg-gray-100 text-gray-800",
    chatBubbleUser: "bg-blue-200 text-gray-800",

    buttonBg: "#0070F3",
    buttonText: "#ffffff",
    optionButtonBg: "#ffffff",
    optionButtonText: "#212121",
    optionButtonBorder: "#ced4da",

    headerBg: "#0070F3",
    headerText: "#ffffff",

    inputBg: "#ffffff",
    inputBorder: "#90caf9",
    placeholderText: "#757575",

    faqBg: "#ffffff",
    faqBorder: "#e0e0e0",
    faqQuestionText: "#212121",
    faqAnswerText: "#424242",

    errorBg: "#ffcdd2",
    errorText: "#d32f2f",
    successBg: "#b9f6ca",
    successText: "#00c853",
  },
  dark: {
    backgroundColor: "#1E1E1E",
    textColor: "#ffffff",
    primaryColor: "#0070F3",
    secondaryColor: "#212121",
    accentColor: "#38BDF8",
    highlightColor: "#0EA5E9",

    chatBubbleBot: "bg-gray-700 text-gray-100",
    chatBubbleUser: "bg-blue-800 text-white",

    buttonBg: "#0070F3",
    buttonText: "#ffffff",
    optionButtonBg: "#212121",
    optionButtonText: "#ffffff",
    optionButtonBorder: "#424242",

    headerBg: "#065091",
    headerText: "#ffffff",

    inputBg: "#212121",
    inputBorder: "#42a5f5",
    placeholderText: "#bdbdbd",

    faqBg: "#121212",
    faqBorder: "#424242",
    faqQuestionText: "#ffffff",
    faqAnswerText: "#e0e0e0",

    errorBg: "#ef5350",
    errorText: "#ffebee",
    successBg: "#80cbc4",
    successText: "#a7ffeb",
  },
  animation: {
    bounce: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
    smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
    springy: { type: "spring", damping: 15, stiffness: 100 }
  },
}; 