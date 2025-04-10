// Predefined widget theme presets
export const widgetThemePresets = {
  modern: {
    name: 'Modern',
    chatBubbleStyle: 'rounded',
    buttonStyle: 'pill',
    primaryColor: '#3b82f6',
    secondaryColor: '#f8fafc',
    textColor: '#1e293b',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '0.75rem',
    boxShadow: 'medium',
    animation: 'slide',
    headerStyle: 'curved',
    widgetPosition: 'right',
    widgetSize: 'medium',
    bubbleIcon: 'chat',
    showBranding: true,
  },
  minimal: {
    name: 'Minimal',
    chatBubbleStyle: 'square',
    buttonStyle: 'square',
    primaryColor: '#64748b',
    secondaryColor: '#ffffff',
    textColor: '#334155',
    fontFamily: 'system-ui, sans-serif',
    borderRadius: '0.25rem',
    boxShadow: 'light',
    animation: 'fade',
    headerStyle: 'flat',
    widgetPosition: 'right',
    widgetSize: 'small',
    bubbleIcon: 'message',
    showBranding: false,
  },
  vibrant: {
    name: 'Vibrant',
    chatBubbleStyle: 'rounded',
    buttonStyle: 'pill',
    primaryColor: '#8b5cf6',
    secondaryColor: '#f5f3ff',
    textColor: '#4c1d95',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '1rem',
    boxShadow: 'strong',
    animation: 'bounce',
    headerStyle: 'curved',
    widgetPosition: 'right',
    widgetSize: 'large',
    bubbleIcon: 'chat-dots',
    showBranding: true,
  },
  corporate: {
    name: 'Corporate',
    chatBubbleStyle: 'square',
    buttonStyle: 'square',
    primaryColor: '#0f172a',
    secondaryColor: '#f8fafc',
    textColor: '#334155',
    fontFamily: 'system-ui, sans-serif',
    borderRadius: '0.25rem',
    boxShadow: 'medium',
    animation: 'slide',
    headerStyle: 'flat',
    widgetPosition: 'right',
    widgetSize: 'medium',
    bubbleIcon: 'headset',
    showBranding: false,
  },
  friendly: {
    name: 'Friendly',
    chatBubbleStyle: 'rounded',
    buttonStyle: 'pill',
    primaryColor: '#10b981',
    secondaryColor: '#ecfdf5',
    textColor: '#064e3b',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '1rem',
    boxShadow: 'medium',
    animation: 'bounce',
    headerStyle: 'curved',
    widgetPosition: 'right',
    widgetSize: 'medium',
    bubbleIcon: 'smile',
    showBranding: true,
  },
};

// Icons for the widget bubble
export const bubbleIcons = [
  { value: 'chat', label: 'Chat' },
  { value: 'message', label: 'Message' },
  { value: 'chat-dots', label: 'Chat Dots' },
  { value: 'headset', label: 'Headset' },
  { value: 'smile', label: 'Smile' },
  { value: 'question', label: 'Question' },
  { value: 'help', label: 'Help' },
  { value: 'support', label: 'Support' },
];

// Widget positions
export const widgetPositions = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

// Widget sizes
export const widgetSizes = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

// Animation options
export const animationOptions = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'scale', label: 'Scale' },
];

// Box shadow options
export const boxShadowOptions = [
  { value: 'none', label: 'None' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'strong', label: 'Strong' },
];

// Button styles
export const buttonStyles = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'pill', label: 'Pill' },
];

// Chat bubble styles
export const chatBubbleStyles = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'speech', label: 'Speech Bubble' },
];

// Header styles
export const headerStyles = [
  { value: 'flat', label: 'Flat' },
  { value: 'curved', label: 'Curved' },
  { value: 'minimal', label: 'Minimal' },
];

// Font families
export const fontFamilies = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'system-ui, sans-serif', label: 'System UI' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
]; 