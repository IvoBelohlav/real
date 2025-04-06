import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageCircle,
    X,
    ArrowLeft,
    Sun,
    Moon,
    AlertTriangle,
    RefreshCw,
    CheckCircle,
    Phone,
    Mail,
    User,
    ArrowRight,
} from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { useOffline } from '../hooks/useOffline';
import { storage } from '../utils/storage';
import chatService from '../services/chat';
import { themes } from '../themes';
import api from '../utils/api';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import ChatMessage from './Chat/ChatMessage';
import MessageInput from './Chat/MessageInput';
import AnimatedTypingDots from './Chat/AnimatedTypingDots';
import LoadingIndicator from './Chat/LoadingIndicator';

import FaqItem from './Faq/FaqItem';
import FaqSearch from './Faq/FaqSearch';

import ModeToggle from './Shared/ModeToggle';
import PredefinedOptionMessage from './Shared/PredefinedOptionMessage';

import mainLogo from '../assets/aiassistant-img.png';
import styles from './Widget.module.css';

const INITIAL_MESSAGE = {
    text: '👋Zdravím! Jak vám mohu dnes pomoci?',
    followUp: '',
    sender: 'bot',
    isOption: false,
};

// Helper function for glassmorphism effect
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
};

const Widget = ({ fonts, widgetConfig: widgetConfigProp, currentTheme: currentThemeProp, isPreview }) => {
    const [isExpanded, setIsExpanded] = useState(isPreview ? true : false);
    const [mode, setMode] = useState('guided');
    const { messages, sendMessage, loading, error: chatError, clearError } =
        useChat();
    const { isOnline, pendingMessages, savePendingMessage } = useOffline();
    const [guestId, setGuestId] = useState(storage.get('guestId'));
    const [currentFlow, setCurrentFlow] = useState('main');
    const [guidedMessages, setGuidedMessages] = useState([
        { ...INITIAL_MESSAGE, text: INITIAL_MESSAGE.text },
    ]);
    const [showDots, setShowDots] = useState(false);
    const messagesEndRef = useRef(null);
    const [flowHistory, setFlowHistory] = useState([]);
    const [openFaqIndex, setOpenFaqIndex] = useState(null);
    const [faqSearchTerm, setFaqSearchTerm] = useState('');
    const [showError, setShowError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;
    const [currentTheme, setCurrentTheme] = useState(
        currentThemeProp || localStorage.getItem('chatWidgetTheme') || 'light'
    );
    const [guidedFlows, setGuidedFlows] = useState({});
    const [, setIsLoadingFlows] = useState(true);
    const [widgetFaqs, setWidgetFaqs] = useState([]);
    const [processedOptions, setProcessedOptions] = useState(new Set());
    const [localLogoUrl, setLogoUrl] = useState(null);
    const [localBrandName, setBrandName] = useState(null);
    const [localPrimaryColor, setPrimaryColor] = useState(null);
    const [localSecondaryColor, setSecondaryColor] = useState(null);
    const [localInitialGreeting, setInitialGreeting] = useState(null);
    const [, setCompanyDescription] = useState(null);
    const [localWidgetButtonText, setWidgetButtonText] = useState('');
    const [localWidgetHelpText, setWidgetHelpText] = useState('');
    const [widgetConfigData, setWidgetConfigData] = useState(widgetConfigProp);
    const [localHeaderBgDark, setHeaderBgDark] = useState(null);
    const [localHeaderTextDark, setHeaderTextDark] = useState(null);
    const [localHeaderBgLight, setHeaderBgLight] = useState(null);
    const [localHeaderTextLight, setHeaderTextLight] = useState(null);
    const [localIconBgLight, setIconBgLight] = useState(null);
    const [localIconBgDark, setIconBgDark] = useState(null);
    const [localModeToggleBgLight, setModeToggleBgLight] = useState(null);
    const [localModeToggleBgDark, setModeToggleBgDark] = useState(null);

    // State for Contact Admin Form
    const [isContactAdminFormVisible, setIsContactAdminFormVisible] = useState(false);
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactMessage, setContactMessage] = useState('');
    const [contactFormSubmitted, setContactFormSubmitted] = useState(false);

    const {
        data: fetchedWidgetConfig,
    } = useQuery({
        // Use a unique query key for the public endpoint to avoid cache conflicts
        // if the dashboard also fetches config (though it uses a different endpoint now)
        key: ['publicWidgetConfig'], 
        queryFn: async () => {
            // Use the correct public endpoint which validates API key and origin
            const response = await api.get('/api/public/widget-config'); 
            return response.data;
        },
        onSuccess: (data) => {
            if (!widgetConfigProp) {
                setWidgetConfigData(data);
            }
        },
        onError: (error) => {
            console.error('Failed to fetch widget config', error);
        },
        enabled: !widgetConfigProp,
    });

    const currentConfig = widgetConfigData || fetchedWidgetConfig;

    useEffect(() => {
        if (currentConfig) {
            setBrandName(currentConfig.main_title);
            setPrimaryColor(
                currentTheme === 'light'
                    ? currentConfig.primary_color_light
                    : currentConfig.primary_color_dark
            );
            setSecondaryColor(
                currentTheme === 'light'
                    ? currentConfig.secondary_color_light
                    : currentConfig.secondary_color_dark
            );
            setInitialGreeting(currentConfig.greeting_message);
            setCompanyDescription(currentConfig.company_description);
            setWidgetButtonText(currentConfig.widget_button_text);
            setWidgetHelpText(currentConfig.widget_help_text);
            setHeaderBgDark(currentConfig.header_bg_color_dark);
            setHeaderTextDark(currentConfig.header_text_color_dark);
            setHeaderBgLight(currentConfig.header_bg_color_light);
            setHeaderTextLight(currentConfig.header_text_color_light);
            setIconBgDark(currentConfig.icon_background_color_dark);
            setIconBgLight(currentConfig.icon_background_color_light);
            setModeToggleBgDark(currentConfig.mode_toggle_background_dark);
            setModeToggleBgLight(currentConfig.mode_toggle_background_light);

            if (currentConfig.logo_light_mode && currentTheme === 'light') {
                setLogoUrl(currentConfig.logo_light_mode);
            } else if (currentConfig.logo_dark_mode && currentTheme === 'dark') {
                setLogoUrl(currentConfig.logo_dark_mode);
            }

            const { font_family: fonts } = currentConfig;
            if (fonts) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;700&display=swap';
                document.head.appendChild(link);
            }

            if (currentConfig.custom_css) {
                const styleElement = document.createElement('style');
                styleElement.textContent = currentConfig.custom_css;
                document.head.appendChild(styleElement);
                return () => {
                    document.head.removeChild(styleElement);
                };
            }
        }
    }, [currentConfig, currentTheme, setCompanyDescription]);

    const brandTheme = useMemo(() => {
        const accentColorLight = currentConfig?.accent_color_light || "#4F46E5";
        const accentColorDark = currentConfig?.accent_color_dark || "#6366F1";

        console.log("Widget component theme:", currentTheme);
        console.log("Widget component config:", currentConfig);
        
        const theme = themes[currentTheme] || themes.light;
        const configData = currentConfig || {};

        const themeData = {
            ...theme,
            primaryColor:
                currentTheme === 'light'
                    ? configData.primary_color_light || theme.primaryColor
                    : configData.primary_color_dark || theme.primaryColor,
            secondaryColor:
                currentTheme === 'light'
                    ? configData.secondary_color_light || theme.secondaryColor
                    : configData.secondary_color_dark || theme.secondaryColor,
            fonts: fonts || theme.fonts,
            headerBg: 
                currentTheme === 'light' 
                    ? configData.header_bg_color_light || localHeaderBgLight || theme.headerBg 
                    : configData.header_bg_color_dark || localHeaderBgDark || theme.headerBg,
            headerText: 
                currentTheme === 'light' 
                    ? configData.header_text_color_light || localHeaderTextLight || theme.headerText 
                    : configData.header_text_color_dark || localHeaderTextDark || theme.headerText,
            backgroundColor:
                currentTheme === 'light'
                    ? configData.background_color_light || theme.backgroundColor
                    : configData.background_color_dark || theme.backgroundColor,
            textColor:
                currentTheme === 'light'
                    ? configData.text_color_light || theme.textColor
                    : configData.text_color_dark || theme.textColor,
            buttonText:
                currentTheme === 'light'
                    ? configData.button_text_color_light || theme.buttonText
                    : configData.button_text_color_dark || theme.buttonText,
            iconBackgroundColor:
                currentTheme === 'light'
                    ? configData.icon_background_color_light || localIconBgLight || configData.secondary_color_light || theme.secondaryColor
                    : configData.icon_background_color_dark || localIconBgDark || configData.primary_color_dark || theme.primaryColor,
            modeToggleBackgroundColor:
                currentTheme === 'light'
                    ? configData.mode_toggle_background_light || localModeToggleBgLight || configData.primary_color_light || theme.primaryColor
                    : configData.mode_toggle_background_dark || localModeToggleBgDark || configData.secondary_color_dark || theme.secondaryColor,
            widgetPadding: configData.widget_padding,
            messageSpacing: configData.message_spacing,
            inputFieldPadding: configData.input_field_padding,
            baseFontSize: configData.base_font_size,
            headerFontWeight: configData.header_font_weight,
            messageFontWeight: configData.message_fontWeight,
            buttonFontWeight: configData.button_font_weight,
            widgetBorderStyle: configData.widget_border_style,
            widgetBorderWidth: configData.widget_border_width,
            widgetBorderRadius: configData.widget_border_radius,
            widgetBorderColor: 
                currentTheme === 'light' 
                    ? configData.primary_color_light 
                    : configData.primary_color_dark,
            messageBubbleBorderStyle: configData.message_bubble_border_style,
            messageBubbleBorderWidth: configData.message_bubble_border_width,
            messageBubbleBorderRadius: configData.message_bubble_border_radius,
            messageBubbleBorderColor: 
                currentTheme === 'light' 
                    ? configData.primary_color_light 
                    : configData.primary_color_dark,
            inputFieldBorderStyle: configData.input_field_border_style,
            inputFieldBorderWidth: configData.input_field_border_width,
            inputFieldBorderRadius: configData.input_field_border_radius,
            buttonBorderStyle: configData.button_border_style,
            buttonBorderWidth: configData.button_border_width,
            buttonBorderRadius: configData.button_border_radius,
            widgetShadow: configData.widget_shadow,
            accentGradient: `linear-gradient(to right, ${accentColorLight}, ${accentColorDark})`,
            
            // Add these for bot/user message styles
            botMessageBgColor: currentTheme === 'light' ? '#f0f2f5' : '#2a2a2a',
            botMessageTextColor: currentTheme === 'light' ? '#212121' : '#ffffff',
            userMessageBgColor: currentTheme === 'light' 
                ? configData.primary_color_light || theme.primaryColor 
                : configData.primary_color_dark || theme.primaryColor,
            userMessageTextColor: '#ffffff',
            botMessageBorderRadius: '1rem 1rem 1rem 0',
            userMessageBorderRadius: '1rem 1rem 0 1rem',
            botMessagePadding: '0.8rem 1rem',
            userMessagePadding: '0.8rem 1rem',
            botMessageTextAlign: 'left',
            userMessageTextAlign: 'left',
        };

        console.log("Generated brandTheme:", themeData);
        return themeData;
    }, [currentTheme, fonts, currentConfig, localHeaderBgDark, localHeaderTextDark, localHeaderBgLight, localHeaderTextLight, localIconBgDark, localIconBgLight, localModeToggleBgDark, localModeToggleBgLight]);

    const toggleTheme = () => {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setCurrentTheme(newTheme);
        localStorage.setItem('chatWidgetTheme', newTheme);
    };

    useEffect(() => {
        const fetchWidgetFaqs = async () => {
            setIsLoadingFlows(true);
            console.log("Widget.js: Fetching widget FAQs from /api/widget-faqs...");

            try {
                const response = await api.get('/api/widget-faqs');
                console.log("Widget.js: Widget FAQs response received:", response.data);
                setWidgetFaqs(response.data);
            } catch (error) {
                console.error('Widget.js: Failed to fetch widget FAQs from /api/widget-faqs', error);
                console.error("Widget.js: Full error details:", error);
                toast.error("Failed to load FAQs. Please try again later.");
            } finally {
                setIsLoadingFlows(false);
                console.log("Widget.js: fetchWidgetFaqs completed (finally block)");
            }
        };

        if (mode === 'faq') {
            fetchWidgetFaqs();
        } else {
            setWidgetFaqs([]);
        }
    }, [mode, setIsLoadingFlows]);

    const filteredFaqQuestions = widgetFaqs.filter((faq) => {
        const searchTerm = faqSearchTerm.toLowerCase();
        return (
            faq.question.toLowerCase().includes(searchTerm) ||
            faq.answer.toLowerCase().includes(searchTerm)
        );
    });

    const handleFaqToggle = (index) => {
        setOpenFaqIndex((prevIndex) => (prevIndex === index ? null : index));
    };

    const handleFaqSearch = (e) => {
        setFaqSearchTerm(e.target.value);
    };

    useEffect(() => {
        const fetchGuidedFlows = async () => {
            setIsLoadingFlows(true);
            try {
                const response = await api.get('/api/guided-flows');
                const transformedFlows = response.data.reduce((acc, flow) => {
                    acc[flow.name] = {
                        options: flow.options.map((option) => ({
                            id: option.id,
                            text: option.text,
                            icon: option.icon,
                            nextFlow: option.next_flow,
                            botResponse: option.bot_response,
                        })),
                    };
                    return acc;
                }, {});
                setGuidedFlows(transformedFlows);
            } catch (error) {
                console.error('Failed to fetch guided flows', error);
            } finally {
                setIsLoadingFlows(false);
            }
        };
        fetchGuidedFlows();
    }, [setIsLoadingFlows]);

    useEffect(() => {
        if (chatError) {
            setShowError(true);
            const timer = setTimeout(() => {
                setShowError(false);
                clearError();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [chatError, clearError]);

    useEffect(() => {
        if (isOnline && pendingMessages.length > 0 && retryCount < MAX_RETRIES) {
            pendingMessages.forEach((msg) => sendMessage(msg));
            setRetryCount(retryCount + 1);
        }
    }, [isOnline, pendingMessages, sendMessage, retryCount]);

    useEffect(() => {
        const initializeGuest = async () => {
            if (!guestId) {
                try {
                    const response = await chatService.guestAuth();
                    const newGuestId = response.data.guestId;
                    setGuestId(newGuestId);
                    storage.set('guestId', newGuestId);
                    pendingMessages.forEach((msg) => sendMessage(msg.text));
                } catch (error) {
                    console.error('Failed to create guest user.', error);
                }
            } else {
                pendingMessages.forEach((msg) => sendMessage(msg.text));
            }
        };
        initializeGuest();
    }, [guestId, sendMessage, pendingMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, guidedMessages]);

    const handleSendMessage = useCallback(
        (message) => {
            if (mode === 'chat') {
                if (isOnline) {
                    sendMessage(message.text);
                } else {
                    savePendingMessage(message.text);
                }
            }
        },
        [isOnline, sendMessage, savePendingMessage, mode]
    );

    const handleMessageDisplayed = useCallback(() => {
        setShowDots(false);
    }, []);

    const handleOptionSelect = useCallback(
        (option) => {
            if (processedOptions.has(option.id)) return;

            setProcessedOptions((prev) => new Set([...prev, option.id]));

            const userMessage = {
                text: option.text,
                sender: 'user',
                icon: option.icon,
                isOption: true,
                timestamp: new Date().toISOString(),
            };

            setGuidedMessages((prev) => [...prev, userMessage]);
            setFlowHistory((prev) => [...prev, currentFlow]);
            setCurrentFlow(option.nextFlow);

            if (option.botResponse) {
                setTimeout(() => {
                    setGuidedMessages((prev) => [
                        ...prev,
                        {
                            ...option.botResponse,
                            sender: 'bot',
                            timestamp: new Date().toISOString(),
                        },
                    ]);
                    setProcessedOptions((prev) => {
                        const newSet = new Set(prev);
                        newSet.delete(option.id);
                        return newSet;
                    });
                }, );
            }
        },
        [currentFlow, processedOptions]
    );

    const handleGoBack = useCallback(() => {
        if (flowHistory.length > 0) {
            const previousFlow = flowHistory[flowHistory.length - 1];

            setFlowHistory((prev) => {
                const newHistory = [...prev];
                newHistory.pop();
                return newHistory;
            });

            setCurrentFlow(previousFlow);

            setGuidedMessages((prev) => {
                const newMessages = [...prev];
                let removeCount = 0;
                const lastUserIndex = newMessages.findLastIndex(
                    (msg) => msg.sender === 'user' && msg.isOption
                );

                if (lastUserIndex !== -1) {
                    removeCount = newMessages.length - lastUserIndex;
                    newMessages.splice(lastUserIndex, removeCount);
                }
                return newMessages;
            });

            setProcessedOptions(new Set());

            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end',
                });
            }, 100);
        }
    }, [flowHistory]);

    const handleModeChange = useCallback(
        (newMode) => {
            setMode(newMode);
            if (newMode === "guided") {
                setCurrentFlow("main");
                setGuidedMessages([
                    {
                        ...INITIAL_MESSAGE,
                        text: localInitialGreeting || INITIAL_MESSAGE.text,
                    },
                ]);
                setFlowHistory([]);
                setIsContactAdminFormVisible(false);
                setContactFormSubmitted(false);
            } else if (newMode === "faq") {
                setGuidedMessages([]);
                setOpenFaqIndex(null);
                setIsContactAdminFormVisible(false);
                setContactFormSubmitted(false);
            } else if (newMode === "chat") {
                setGuidedMessages([
                    {
                        ...INITIAL_MESSAGE,
                        text: localInitialGreeting || INITIAL_MESSAGE.text,
                    },
                ]);
                setIsContactAdminFormVisible(false);
                setContactFormSubmitted(false);
            }
        },
        [localInitialGreeting]
    );

    const collapseButtonVariants = {
        expanded: {
            rotate: 0,
            transition: { type: "spring", damping: 20, stiffness: 300 },
        },
        collapsed: { rotate: 45, transition: { duration: 0.2 } },
    };

    const widgetVariants = {
        hidden: {
            opacity: 0,
            scale: 0.8,
            y: 10,
            transition: { duration: 0.3, ease: "easeOut" },
        },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                type: "spring",
                damping: 20,
                stiffness: 150,
            },
        },
    };

    const toggleButtonVariants = {
        opened: { rotate: 180 },
        closed: { rotate: 0 },
    };

    // Handler for follow-up question clicks
    const handleFollowupClick = useCallback((question) => {
        if (typeof question === 'string') {
            // If the clicked item is a string (follow-up question)
            console.log('Follow-up question clicked:', question);
            
            // Always send the message directly for follow-up questions
            sendMessage(question);
            
            // Optionally, also update the input field for visual feedback
            try {
                if (questionInputRef && questionInputRef.current) {
                    // Update the input field with the clicked question
                    questionInputRef.current.value = question;
                    // Focus the input field
                    questionInputRef.current.focus();
                }
            } catch (error) {
                console.error("Error updating input field:", error);
                // Message is already sent above, this is just for UI feedback
            }
        } else if (question && typeof question === 'object') {
            // Handle product card clicks
            console.log('Product selected:', question);
            // Additional product handling logic can go here
        }
    }, [sendMessage]);
    
    // Reference for the question input field
    const questionInputRef = useRef(null);

    const handleContactAdminClick = () => {
        setIsContactAdminFormVisible(true);
        setContactFormSubmitted(false);
    };

    const handleContactFormSubmit = async (e) => {
        e.preventDefault();

        try {
            setContactFormSubmitted(false);
            setIsContactAdminFormVisible(false);

            const submissionData = {
                email: contactEmail,
                phone: contactPhone,
                message: contactMessage,
            };

            const response = await api.post('/api/contact-admin/', submissionData);
            console.log('Contact Admin Form submission successful:', response.data);

            setContactFormSubmitted(true);
            setContactEmail('');
            setContactPhone('');
            setContactMessage('');

            toast.success("Message sent to Admin!");

        } catch (error) {
            console.error('Error submitting contact admin form:', error);
            toast.error("Failed to submit your message. Please try again.");
            setIsContactAdminFormVisible(true);
            setContactFormSubmitted(false);
        }
    };

    const handleContactFormCancel = () => {
        setIsContactAdminFormVisible(false);
        setContactFormSubmitted(false);
    };

    // Update currentTheme when currentThemeProp changes (for preview mode)
    useEffect(() => {
        // When the currentThemeProp changes (from WidgetPreview)
        if (currentThemeProp) {
            console.log(`Widget.jsx: Updating theme to ${currentThemeProp} (isPreview: ${isPreview})`);
            setCurrentTheme(currentThemeProp);
            
            // When in preview mode and theme changes, also update all theme-dependent variables
            if (isPreview && currentConfig) {
                setPrimaryColor(
                    currentThemeProp === 'light'
                        ? currentConfig.primary_color_light
                        : currentConfig.primary_color_dark
                );
                setSecondaryColor(
                    currentThemeProp === 'light'
                        ? currentConfig.secondary_color_light
                        : currentConfig.secondary_color_dark
                );
                setHeaderBgLight(currentConfig.header_bg_color_light);
                setHeaderTextLight(currentConfig.header_text_color_light);
                setHeaderBgDark(currentConfig.header_bg_color_dark);
                setHeaderTextDark(currentConfig.header_text_color_dark);
                setIconBgLight(currentConfig.icon_background_color_light);
                setIconBgDark(currentConfig.icon_background_color_dark);
                setModeToggleBgLight(currentConfig.mode_toggle_background_light);
                setModeToggleBgDark(currentConfig.mode_toggle_background_dark);
            }
        }
    }, [currentThemeProp, isPreview, currentConfig]);
    
    // When in preview mode, always show as expanded
    useEffect(() => {
        if (isPreview) {
            setIsExpanded(true);
        }
    }, [isPreview]);

    if (!isExpanded) {
        return (
            <motion.div 
                className={`${styles.widget} ${styles.collapsed}`}
                style={{
                    fontFamily: brandTheme.fonts,
                }}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    y: 0,
                    transition: { 
                        type: "spring", 
                        damping: 15, 
                        stiffness: 300 
                    }
                }}
                whileHover={{ 
                    scale: 1.03,
                    transition: { duration: 0.2 }
                }}
            >
                <motion.button 
                    className={styles.chatButton}
                    onClick={() => setIsExpanded(true)}
                    aria-label="Open chat widget"
                    style={{
                        backgroundColor: currentTheme === 'light' 
                            ? brandTheme.primaryColor
                            : brandTheme.primaryColor,
                        color: brandTheme.buttonText,
                        borderRadius: brandTheme.widgetBorderRadius || '1.6rem',
                        boxShadow: brandTheme.widgetShadow,
                        padding: '0.625rem 1rem',
                        fontWeight: brandTheme.buttonFontWeight || 'bold',
                    }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                        boxShadow: [
                            brandTheme.widgetShadow,
                            `0 6px 16px rgba(0, 0, 0, 0.15)`,
                            brandTheme.widgetShadow
                        ],
                        y: [0, -3, 0]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut"
                    }}
                >
                    <div className={styles.buttonContent}>
                        <span>{localWidgetButtonText || widgetConfigData?.widget_button_text || 'Chat Now'}</span>
                        <motion.div 
                            className={styles.chatIconContainer}
                            style={{
                                backgroundColor: currentTheme === 'light' 
                                    ? brandTheme.secondaryColor 
                                    : brandTheme.iconBackgroundColor,
                                color: brandTheme.buttonText,
                            }}
                            animate={{ 
                                scale: [1, 1.1, 1]
                            }}
                            transition={{
                                duration: 2,
                                repeatType: "reverse",
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <MessageCircle
                                size={24}
                                color="currentColor"
                                className={styles.chatIcon}
                            />
                        </motion.div>
                    </div>
                </motion.button>
            </motion.div>
        );
    }

    return (
        <div className={styles['dvojkavit-widget-container']}>
            <AnimatePresence>
                {showError && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, height: 0, scale: 0.9, rotate: -5 }}
                        animate={{ opacity: 1, y: 0, height: 'auto', scale: 1, rotate: 0, transition: { duration: 0.4, type: 'spring', damping: 15 } }}
                        exit={{ opacity: 0, y: 20, height: 0, scale: 0.9, rotate: 5, transition: { duration: 0.3 } }}
                        className={styles['dvojkavit-error-message']}
                        style={{ transform: 'translateY(-110%)' }}
                    >
                        <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                            <AlertTriangle className={styles['dvojkavit-error-icon']} />
                        </motion.div>
                        <p className={styles['dvojkavit-error-text']}>
                            {isOnline ? "Oops! Something went wrong." : "Reconnecting... Please wait."}
                        </p>
                        {!isOnline && (
                            <motion.button
                                onClick={() => setRetryCount(0)}
                                className={styles['dvojkavit-retry-button']}
                                whileHover={{ scale: 1.1, rotate: 180 }}
                                whileTap={{ scale: 0.9 }}
                                aria-label="Retry"
                            >
                                <RefreshCw className={styles['dvojkavit-retry-icon']} />
                            </motion.button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Desktop View */}
            <motion.div
                className={styles['dvojkavit-desktop-widget']}
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 100 }}
                style={{
                    backgroundColor: brandTheme.backgroundColor,
                    borderRadius: brandTheme.widgetBorderRadius || "1.5rem",
                    borderStyle: brandTheme.widgetBorderStyle,
                    borderWidth: brandTheme.widgetBorderWidth,
                    borderColor: brandTheme.widgetBorderColor,
                    boxShadow: brandTheme.widgetShadow,
                }}
            >
                <motion.div
                    className={styles['dvojkavit-widget-header']}
                    style={{
                        backgroundColor: brandTheme.headerBg,
                        borderRadius: "1.5rem 1.5rem 0 0",
                        padding: brandTheme.headerPadding,
                    }}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1, transition: { duration: 0.6, delay: 0.2 } }}
                >
                    <div className={styles['dvojkavit-header-left']}>
                        <motion.div
                            className={styles['dvojkavit-logo-container']}
                            whileHover={{ scale: 1.1, rotate: 10 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <img
                                src={localLogoUrl || mainLogo}
                                alt={localBrandName || "Your Brand"}
                                className={styles['dvojkavit-logo-image']}
                            />
                        </motion.div>
                        <div>
                        <motion.h3
                            className={styles['dvojkavit-header-title']}
                            style={{
                                color: brandTheme.headerText,
                                fontSize: "1rem",
                                fontWeight: 700,
                                fontFamily: "'Exo 2', sans-serif",
                                // Add any motion-specific properties here
                            }}
                            // Keep your existing animation props
                            whileHover={{ scale: 1.05 }}
                            >
                            {localBrandName || "Main Title"}
                            </motion.h3>
                            <p
                                className={styles['dvojkavit-header-status']}
                                style={{ color: brandTheme.headerText, fontSize: brandTheme.baseFontSize, fontWeight: brandTheme.headerFontWeight }}
                            >
                                <motion.span
                                    className={styles['dvojkavit-status-indicator']}
                                    animate={{ scale: [1, 1.5, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                ></motion.span>
                                Online
                            </p>
                        </div>
                    </div>

                    <div className={styles['dvojkavit-header-controls']}>
                        <motion.button
                            onClick={toggleTheme}
                            className={styles['dvojkavit-theme-toggle']}
                            style={{ color: brandTheme.headerText }}
                            whileHover={{ scale: 1.2, rotate: 180 }}
                            whileTap={{ scale: 0.8 }}
                            transition={{ type: "spring", stiffness: 400 }}
                            aria-label="Toggle Theme"
                        >
                            {currentTheme === "light" ? (
                                <Sun className={styles['dvojkavit-toggle-icon']} style={{ color: brandTheme.headerText }} />
                            ) : (
                                <Moon className={styles['dvojkavit-toggle-icon']} style={{ color: brandTheme.headerText }} />
                            )}
                        </motion.button>
                        <motion.button
                            onClick={() => setIsExpanded(false)}
                            className={styles['dvojkavit-close-button']}
                            style={{ color: brandTheme.headerText }}
                            whileHover={{ scale: 1.2, rotate: 90 }}
                            whileTap={{ scale: 0.8 }}
                            transition={{ type: "spring", stiffness: 400 }}
                            aria-label="Close"
                        >
                            <X className={styles['dvojkavit-close-icon']} style={{ color: brandTheme.headerText }} />
                        </motion.button>
                    </div>
                </motion.div>

                <motion.div
                    className={styles['dvojkavit-widget-content']}
                    style={{
                        backgroundColor: brandTheme.backgroundColor,
                        padding: brandTheme.widgetPadding,
                        paddingBottom: brandTheme.messageSpacing,
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    {/* Welcome Banner - Only shown when no messages yet */}
                    {guidedMessages.length <= 1 && mode !== "faq" && !isContactAdminFormVisible && !contactFormSubmitted && (
                        <div 
                            className={styles["dvojkavit-welcome-banner"]}
                            style={{
                                backgroundColor: brandTheme.secondaryColor,
                                color: brandTheme.textColor === "#ffffff" || brandTheme.textColor === "#FFFFFF" ? "#ffffff" : "#ffffff",
                                boxShadow: `0 4px 6px rgba(0, 0, 0, 0.1)`,
                            }}
                        >
                            <div className={styles["dvojkavit-welcome-title"]}>
                                {localInitialGreeting?.split('\n')[0] || 'Vítejte v AI asistentu!'}
                            </div>
                            <div className={styles["dvojkavit-welcome-text"]}>
                                {localInitialGreeting?.split('\n')[1] || 'Jsem tu, abych vám pomohl s vašimi dotazy. Jak vám mohu dnes pomoci?'}
                            </div>
                        </div>
                    )}
                    
                    {guidedMessages.length > 0 && !isContactAdminFormVisible && !contactFormSubmitted &&
                        guidedMessages.map((msg, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -30, scale: 0.9 }}
                                animate={{
                                    opacity: 1,
                                    x: 0,
                                    scale: 1,
                                    transition: { duration: 0.5, delay: index * 0.15 },
                                }}
                                whileHover={{ scale: 1.02 }}
                            >
                                {msg.sender === "bot" && (
                                    <ChatMessage
                                        message={{ ...msg, timestamp: msg.timestamp }}
                                        showDots={false}
                                        onMessageDisplayed={handleMessageDisplayed}
                                        theme={currentTheme}
                                        widgetConfig={currentConfig}
                                        onProductClick={handleFollowupClick}
                                        style={{
                                            backgroundColor: brandTheme.botMessageBgColor,
                                            color: brandTheme.botMessageTextColor,
                                            borderRadius: brandTheme.messageBubbleBorderRadius,
                                            padding: brandTheme.botMessagePadding,
                                            textAlign: brandTheme.botMessageTextAlign,
                                            fontWeight: brandTheme.messageFontWeight,
                                            fontSize: brandTheme.baseFontSize,
                                            borderStyle: brandTheme.messageBubbleBorderStyle,
                                            borderWidth: brandTheme.messageBubbleBorderWidth,
                                            borderColor: brandTheme.secondaryColor,
                                            boxShadow: `0 2px 5px ${brandTheme.secondaryColor}30`,
                                        }}
                                    />
                                )}
                                {msg.sender === "user" && !msg.isOption && (
                                    <ChatMessage
                                        message={{ ...msg, timestamp: msg.timestamp }}
                                        showDots={false}
                                        onMessageDisplayed={handleMessageDisplayed}
                                        theme={currentTheme}
                                        widgetConfig={currentConfig}
                                        onProductClick={handleFollowupClick}
                                        style={{
                                            backgroundColor: brandTheme.userMessageBgColor,
                                            color: brandTheme.userMessageTextColor,
                                            borderRadius: brandTheme.userMessageBorderRadius,
                                            padding: brandTheme.userMessagePadding,
                                            textAlign: brandTheme.userMessageTextAlign,
                                            fontWeight: brandTheme.messageFontWeight,
                                            fontSize: brandTheme.baseFontSize,
                                            borderStyle: brandTheme.messageBubbleBorderStyle,
                                            borderWidth: brandTheme.messageBubbleBorderWidth,
                                            borderColor: brandTheme.secondaryColor,
                                            boxShadow: `0 2px 5px ${brandTheme.secondaryColor}30`,
                                        }}
                                    />
                                )}
                                {msg.isOption && (
                                    <PredefinedOptionMessage
                                        option={{ text: msg.text, icon: msg.icon }}
                                        onSelect={() => { }}
                                        theme={currentTheme}
                                        widgetConfig={currentConfig}
                                        style={{
                                            buttonBgColor: brandTheme.buttonBgColor,
                                            buttonTextColor: brandTheme.buttonTextColor,
                                            buttonBorderRadius: brandTheme.buttonBorderRadius,
                                            buttonPadding: brandTheme.buttonPadding,
                                            fontWeight: brandTheme.buttonFontWeight,
                                            fontSize: brandTheme.baseFontSize,
                                            borderStyle: brandTheme.buttonBorderStyle,
                                            borderWidth: brandTheme.buttonBorderWidth,
                                        }}
                                    />
                                )}
                            </motion.div>
                        ))}
                        
                    {mode === "guided" && !isContactAdminFormVisible && !contactFormSubmitted &&
                        currentFlow &&
                        guidedFlows[currentFlow]?.options && (
                            <motion.div
                                className={styles['dvojkavit-guided-options']}
                                initial={{ opacity: 0 }}
                                animate={{
                                    opacity: 1,
                                    transition: {
                                        duration: 0.5,
                                        delay: guidedMessages.length * 0.1,
                                    },
                                }}
                            >
                                {/* Options heading */}
                                <div className={styles['dvojkavit-options-heading']} style={{ color: brandTheme.textColor }}>
                                    Vyberte možnost:
                                </div>
                                {guidedFlows[currentFlow].options.map((option) => (
                                    <PredefinedOptionMessage
                                        key={option.id}
                                        option={option}
                                        onSelect={() => handleOptionSelect(option)}
                                        theme={currentTheme}
                                        disabled={processedOptions.has(option.id)}
                                        widgetConfig={currentConfig}
                                        style={{
                                            buttonBgColor: brandTheme.buttonBgColor,
                                            buttonTextColor: brandTheme.buttonTextColor,
                                            buttonBorderRadius: brandTheme.buttonBorderRadius,
                                            buttonPadding: brandTheme.buttonPadding,
                                            fontWeight: brandTheme.buttonFontWeight,
                                            fontSize: brandTheme.baseFontSize,
                                            borderStyle: brandTheme.buttonBorderStyle,
                                            borderWidth: brandTheme.buttonBorderWidth,
                                        }}
                                    />
                                ))}
                            </motion.div>
                        )}

                    {mode === "chat" && !isContactAdminFormVisible && !contactFormSubmitted &&
                        messages.map((msg, index) => (
                            <motion.div key={index}>
                                <ChatMessage
                                    message={{ ...msg, timestamp: msg.timestamp }}
                                    onMessageDisplayed={handleMessageDisplayed}
                                    onRead={() => { }}
                                    theme={currentTheme}
                                    widgetConfig={currentConfig}
                                    onProductClick={handleFollowupClick}
                                    style={{
                                        backgroundColor: brandTheme.userMessageBgColor,
                                        color: brandTheme.userMessageTextColor,
                                        borderRadius: brandTheme.userMessageBorderRadius,
                                        padding: brandTheme.userMessagePadding,
                                        textAlign: brandTheme.userMessageTextAlign,
                                        fontWeight: brandTheme.messageFontWeight,
                                        fontSize: brandTheme.baseFontSize,
                                        borderStyle: brandTheme.messageBubbleBorderStyle,
                                        borderWidth: brandTheme.messageBubbleBorderWidth,
                                        borderColor: brandTheme.secondaryColor,
                                        boxShadow: `0 2px 5px ${brandTheme.secondaryColor}30`,
                                    }}
                                />
                            </motion.div>
                        ))}

                    {mode === "chat" && loading && !isContactAdminFormVisible && !contactFormSubmitted && (
                        <LoadingIndicator theme={currentTheme} />
                    )}

                    {mode === "guided" && showDots && !isContactAdminFormVisible && !contactFormSubmitted && (
                        <div className={styles['dvojkavit-typing-container']}>
                            <motion.div
                                className={styles['dvojkavit-avatar-container']}
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 260,
                                    damping: 20,
                                    delay: 0.2,
                                }}
                            >
                                <img
                                    src={mainLogo}
                                    alt="Assistant"
                                    className={styles['dvojkavit-avatar-image']}
                                />
                            </motion.div>
                            <div className={styles['dvojkavit-typing-bubble-container']}>
                                <div className={styles['dvojkavit-typing-bubble']}>
                                    <AnimatedTypingDots theme={currentTheme} secondaryColor={brandTheme.secondaryColor} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- CONTACT ADMIN FORM (Desktop) --- */}
                    {isContactAdminFormVisible && (
                        <motion.form
                            onSubmit={handleContactFormSubmit}
                            className={styles.contactForm} // Use new module class
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
                        >
                            <div className={styles.formHeader} style={{ backgroundColor: brandTheme.secondaryColor }}>
                                <h3 className={styles.formTitle} style={{ color: "#FFFFFF" }}>
                                    Kontaktujte nás ✨
                                </h3>
                                <p className={styles.formSubtitle} style={{ color: "#FFFFFF" }}>
                                    Vyplňte prosím formulář a my se vám ozveme co nejdříve.
                                </p>
                            </div>

                            <div>
                                <label htmlFor="contact-email" className={styles.formLabel} style={{ color: brandTheme.textColor }}>
                                    <Mail className={styles.formLabelIcon} /> Váš email *
                                </label>
                                <input
                                    type="email"
                                    id="contact-email"
                                    className={styles.formInput} // Use new module class
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    required
                                    style={{
                                        backgroundColor: currentTheme === 'light' ? '#F9FAFB' : '#2D3748',
                                        color: brandTheme.textColor,
                                        borderColor: `${brandTheme.primaryColor}80`, // Use borderColor
                                    }}
                                />
                            </div>

                            <div>
                                <label htmlFor="contact-phone" className={styles.formLabel} style={{ color: brandTheme.textColor }}>
                                    <Phone className={styles.formLabelIcon} /> Telefonní číslo (nepovinné)
                                </label>
                                <input
                                    type="tel"
                                    id="contact-phone"
                                    className={styles.formInput} // Use new module class
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    style={{
                                        backgroundColor: currentTheme === 'light' ? '#F9FAFB' : '#2D3748',
                                        color: brandTheme.textColor,
                                        borderColor: `${brandTheme.primaryColor}80`, // Use borderColor
                                    }}
                                />
                            </div>

                            <div>
                                <label htmlFor="contact-message" className={styles.formLabel} style={{ color: brandTheme.textColor }}>
                                    Vaše zpráva *
                                </label>
                                <textarea
                                    id="contact-message"
                                    rows={3}
                                    className={styles.formTextarea} // Use new module class
                                    value={contactMessage}
                                    onChange={(e) => setContactMessage(e.target.value)}
                                    required
                                    style={{
                                        backgroundColor: currentTheme === 'light' ? '#F9FAFB' : '#2D3748',
                                        color: brandTheme.textColor,
                                        borderColor: `${brandTheme.primaryColor}80`, // Use borderColor
                                    }}
                                ></textarea>
                            </div>

                            {/* Keep focus styles */}
                            <style jsx global>{`
                                input:focus, textarea:focus {
                                    outline: none !important;
                                    box-shadow: 0 0 0 2px ${brandTheme.primaryColor}40 !important;
                                    border-color: ${brandTheme.primaryColor} !important;
                                }
                            `}</style>

                            <div className={styles.formActions}>
                                <motion.button
                                    type="button"
                                    onClick={handleContactFormCancel}
                                    className={styles.formCancelButton} // Use new module class
                                    style={{
                                        color: brandTheme.textColor,
                                        borderColor: `${brandTheme.secondaryColor}80`, // Use borderColor
                                    }}
                                    whileHover={{ scale: 1.03, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Zrušit
                                </motion.button>

                                <motion.button
                                    type="submit"
                                    className={styles.formSubmitButton} // Use new module class
                                    style={{
                                        background: brandTheme.primaryColor,
                                        color: '#FFFFFF',
                                    }}
                                    whileHover={{ scale: 1.03, boxShadow: '0 4px 8px rgba(0,0,0,0.15)' }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Odeslat
                                </motion.button>
                            </div>
                        </motion.form>
                    )}

                    {/* Thank You Message - Desktop */}
                    {contactFormSubmitted && (
                        <motion.div
                            className={styles.thankYouContainer} // Use new module class
                            style={{
                                background: `linear-gradient(to right, ${brandTheme.primaryColor}10, ${brandTheme.secondaryColor}10)`,
                                border: `1px solid ${brandTheme.primaryColor}30`,
                            }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
                            exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
                        >
                            <motion.div
                                className={styles.thankYouIconContainer} // Use new module class
                                style={{
                                    backgroundColor: `${brandTheme.primaryColor}20`,
                                    border: `2px solid ${brandTheme.primaryColor}`
                                }}
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.2, 1], rotate: [0, 10, 0] }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                            >
                                <CheckCircle size={32} color={brandTheme.primaryColor} />
                            </motion.div>

                            <h3 className={styles.thankYouTitle} style={{ color: brandTheme.primaryColor }}>
                                Děkujeme!
                            </h3>

                            <p className={styles.thankYouText} style={{ color: brandTheme.textColor }}>
                                Vaše zpráva byla úspěšně odeslána. Budeme vás kontaktovat co nejdříve.
                            </p>

                            <motion.button
                                onClick={() => {
                                    setContactFormSubmitted(false);
                                    setMode('chat');
                                }}
                                className={styles.thankYouButton} // Use new module class
                                style={{
                                    background: brandTheme.accentGradient,
                                    color: '#FFFFFF',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                }}
                                whileHover={{ scale: 1.05, boxShadow: '0 4px 8px rgba(0,0,0,0.15)' }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Pokračovat v chatu
                            </motion.button>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </motion.div>

                {/* Footer - Desktop */}
                <motion.div
                    className={styles['dvojkavit-widget-footer']}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1, transition: { duration: 0.5, delay: 0.3 } }}
                >
                    {mode === "guided" && !isContactAdminFormVisible && !contactFormSubmitted && (
                        <div className={styles['dvojkavit-guided-footer']}>
                            <div
                                className={styles['dvojkavit-time-display']}
                                style={{ color: brandTheme.textColor, fontSize: brandTheme.baseFontSize }}
                            >
                                {new Date().toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </div>
                            {currentFlow !== "main" && (
                                <motion.button
                                    onClick={handleGoBack}
                                    className={styles['dvojkavit-back-button']}
                                    style={{
                                        borderColor: brandTheme.secondaryColor,
                                        color: brandTheme.textColor,
                                        borderRadius: brandTheme.buttonBorderRadius || "1rem",
                                        borderStyle: brandTheme.buttonBorderStyle,
                                        borderWidth: brandTheme.buttonBorderWidth,
                                        padding: brandTheme.buttonPadding,
                                        fontWeight: brandTheme.buttonFontWeight,
                                        fontSize: brandTheme.baseFontSize,
                                        backgroundColor: brandTheme.buttonBgColor,
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    }}
                                    whileHover={{
                                        scale: 1.05,
                                        backgroundColor: brandTheme.primaryColor,
                                        color: "#FFFFFF",
                                        boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ duration: 0.3 }}
                                    aria-label="Go Back"
                                >
                                    <ArrowLeft className={styles['dvojkavit-back-icon']} />
                                    Zpět na předchozí
                                </motion.button>
                            )}
                        </div>
                    )}

                    {mode === "faq" && !isContactAdminFormVisible && !contactFormSubmitted && (
                        <motion.div
                            className={styles['dvojkavit-faq-container']}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1, transition: { duration: 0.5 } }}
                        >
                            <div
                                className={styles['dvojkavit-faq-title']}
                                style={{ color: brandTheme.textColor, fontSize: brandTheme.baseFontSize, fontWeight: brandTheme.headerFontWeight }}
                            >
                                Často kladené otázky
                            </div>
                            <FaqSearch
                                faqSearchTerm={faqSearchTerm}
                                handleFaqSearch={handleFaqSearch}
                                theme={currentTheme}
                                style={currentConfig}
                            />
                            <motion.div
                                className={styles['dvojkavit-faq-list']}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0, transition: { staggerChildren: 0.05 } }}
                            >
                                {filteredFaqQuestions.map((faq, index) => (
                                    <FaqItem
                                        key={faq.id}
                                        question={faq.question}
                                        answer={faq.answer}
                                        index={index}
                                        isOpen={openFaqIndex === index}
                                        toggleOpen={() => handleFaqToggle(index)}
                                        theme={currentTheme}
                                        searchTerm={faqSearchTerm}
                                        style={brandTheme}
                                    />
                                ))}
                            </motion.div>
                            <div className={styles['dvojkavit-faq-actions']}>
                                <motion.button
                                    onClick={() => handleModeChange("chat")}
                                    className={styles['dvojkavit-goto-chat-button']}
                                    style={{
                                        backgroundColor: brandTheme.primaryColor,
                                        color: '#FFFFFF',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    }}
                                    whileHover={{ scale: 1.03, boxShadow: '0 4px 8px rgba(0,0,0,0.15)' }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <User className={styles['dvojkavit-user-icon']} />
                                    Přejít do chatu s asistentem
                                    <ArrowRight className={styles['dvojkavit-arrow-icon']} />
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {mode === "chat" && !isContactAdminFormVisible && !contactFormSubmitted && (
                        <div className={styles['dvojkavit-chat-footer']}>
                            <motion.button
                                onClick={handleContactAdminClick}
                                className={styles['dvojkavit-contact-admin-button']}
                                style={{
                                    background: brandTheme.primaryColor,                              
                                    color: '#FFFFFF',
                                    borderRadius: brandTheme.buttonBorderRadius || "1.5rem",
                                    padding: brandTheme.buttonPadding,
                                    fontWeight: "600",
                                    fontSize: brandTheme.baseFontSize,
                                    minHeight: "48px",
                                    letterSpacing: "0.02em",
                                    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.07)",
                                    border: "1px solid rgba(255, 255, 255, 0.1)"
                                }}
                                whileHover={{
                                    backgroundColor: brandTheme.primaryColor,
                                    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
                                    filter: "brightness(1.05)",
                                    transition: { duration: 0.3, ease: "easeInOut" }
                                }}
                                whileTap={{
                                    scale: 0.98,
                                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 20
                                }}
                                aria-label="Contact Admin"
                            >
                                <MessageCircle className={styles['dvojkavit-message-icon']} />
                                Kontaktujte nás!
                            </motion.button>
                            <MessageInput
                                onSend={handleSendMessage}
                                disabled={loading || !isOnline}
                                theme={currentTheme}
                                inputRef={questionInputRef}
                                widgetConfig={{
                                    primary_color_light: currentConfig?.primary_color_light,
                                    primary_color_dark: currentConfig?.primary_color_dark,
                                }}
                                style={{
                                    inputBgColor: brandTheme.inputBgColor,
                                    inputTextColor: brandTheme.inputTextColor,
                                    inputBorderColor: brandTheme.inputBorderColor,
                                    inputBorderFocusColor: brandTheme.primaryColor,
                                    inputPlaceholderColor: brandTheme.inputPlaceholderColor,
                                    buttonBgColor: brandTheme.buttonBgColor,
                                    buttonTextColor: brandTheme.buttonTextColor,
                                }}
                            />
                        </div>
                    )}

                    <div className={styles['dvojkavit-mode-toggle-container']}>
                        {currentConfig && <ModeToggle
                            mode={mode}
                            onModeChange={handleModeChange}
                            theme={currentTheme}
                            widgetConfig={currentConfig}
                            primaryColor={brandTheme.primaryColor}
                            secondaryColor={brandTheme.secondaryColor}
                        />}
                    </div>

                    <div
                        className={styles['dvojkavit-widget-footer-copyright']}
                        style={{ color: brandTheme.textColor, fontSize: brandTheme.baseFontSize }}
                    >
                        <a href="https://www.dvojkavit.com" className={styles['dvojkavit-copyright-link']}>Vytvořeno Dvojka v IT</a>
                    </div>
                </motion.div>
            </motion.div>

            {/* Mobile View - Hidden on medium and larger screens */}
            <motion.div
                className={styles['dvojkavit-mobile-widget']}
                initial="hidden"
                animate="visible"
                variants={widgetVariants}
                style={{
                    backgroundColor: brandTheme.backgroundColor,
                    borderRadius: brandTheme.widgetBorderRadius || "1rem",
                    borderStyle: brandTheme.widgetBorderStyle,
                    borderWidth: brandTheme.widgetBorderWidth,
                    borderColor: brandTheme.widgetBorderColor,
                    boxShadow: brandTheme.widgetShadow,
                }}
            >
                {/* Header - Mobile */}
                <motion.div
                    className={styles['dvojkavit-mobile-header']}
                    style={{
                        backgroundColor: brandTheme.headerBg,
                        borderRadius: "1rem 1rem 0 0",
                        padding: brandTheme.headerPadding,
                    }}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1, transition: { duration: 0.5, delay: 0.1 } }}
                >
                    <div className={styles['dvojkavit-mobile-header-left']}>
                        <div className={styles['dvojkavit-mobile-logo-container']}>
                            <img
                                src={localLogoUrl || mainLogo}
                                alt={localBrandName || "Name"}
                                className={styles['dvojkavit-mobile-logo']}
                            />
                        </div>
                        <div>
                            <h3
                                className={styles['dvojkavit-mobile-title']}
                                style={{ color: brandTheme.headerText, fontSize: brandTheme.baseFontSize, fontWeight: brandTheme.headerFontWeight }}
                            >
                                {localBrandName || "Main Title"}
                            </h3>
                            <p
                                className={styles['dvojkavit-mobile-status']}
                                style={{ color: brandTheme.headerText, fontSize: brandTheme.baseFontSize, fontWeight: brandTheme.headerFontWeight }}
                            >
                                <span className={styles['dvojkavit-mobile-status-indicator']}></span>
                                Online
                            </p>
                        </div>
                    </div>
                    <div className={styles['dvojkavit-mobile-header-controls']}>
                        <motion.button
                            onClick={toggleTheme}
                            className={styles['dvojkavit-mobile-theme-toggle']}
                            style={{ color: brandTheme.headerText }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            variants={toggleButtonVariants}
                            animate={currentTheme === "light" ? "closed" : "opened"}
                            transition={{ duration: 0.3 }}
                            aria-label="Toggle Theme"
                        >
                            {currentTheme === "light" ? 
                                <Sun className={styles['dvojkavit-mobile-toggle-icon']} style={{ color: brandTheme.headerText }} /> : 
                                <Moon className={styles['dvojkavit-mobile-toggle-icon']} style={{ color: brandTheme.headerText }} />
                            }
                        </motion.button>
                        <motion.button
                            onClick={() => setIsExpanded(false)}
                            className={styles['dvojkavit-mobile-close-button']}
                            style={{ color: brandTheme.headerText }}
                            variants={collapseButtonVariants}
                            animate={isExpanded ? "expanded" : "collapsed"}
                            aria-label="Close"
                        >
                            <X className={styles['dvojkavit-mobile-close-icon']} style={{ color: brandTheme.headerText }} />
                        </motion.button>
                    </div>
                </motion.div>

                {/* Body - Mobile */}
                <motion.div
                    className={styles['dvojkavit-mobile-content']}
                    style={{ backgroundColor: brandTheme.backgroundColor, padding: brandTheme.widgetPadding, paddingBottom: brandTheme.messageSpacing }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.5, delay: 0.2 } }}
                >
                    {/* Welcome Banner - Mobile */}
                    {guidedMessages.length <= 1 && mode !== "faq" && !isContactAdminFormVisible && !contactFormSubmitted && (
                        <div 
                            className={styles["dvojkavit-mobile-welcome-banner"]}
                            style={{
                                backgroundColor: brandTheme.secondaryColor,
                                color: brandTheme.textColor === "#ffffff" || brandTheme.textColor === "#FFFFFF" ? "#ffffff" : "#ffffff",
                                boxShadow: `0 4px 6px rgba(0, 0, 0, 0.1)`,
                            }}
                        >
                            <div className={styles["dvojkavit-mobile-welcome-title"]}>
                                {localInitialGreeting?.split('\n')[0] || 'Vítejte v AI asistentu!'}
                            </div>
                            <div className={styles["dvojkavit-mobile-welcome-text"]}>
                                {localInitialGreeting?.split('\n')[1] || 'Jsem tu, abych vám pomohl s vašimi dotazy. Jak vám mohu dnes pomoci?'}
                            </div>
                        </div>
                    )}
                    
                    {/* --- MESSAGES RENDERING AREA (Mobile) --- */}
                    {guidedMessages.length > 0 && !isContactAdminFormVisible && !contactFormSubmitted &&
                        guidedMessages.map((msg, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    transition: { duration: 0.4, delay: index * 0.1 },
                                }}
                            >
                                {msg.sender === "bot" && (
                                    <ChatMessage
                                        message={{ ...msg, timestamp: msg.timestamp }}
                                        showDots={false}
                                        onMessageDisplayed={handleMessageDisplayed}
                                        theme={currentTheme}
                                        widgetConfig={currentConfig}
                                        onProductClick={handleFollowupClick}
                                        style={{
                                            backgroundColor: brandTheme.botMessageBgColor,
                                            color: brandTheme.botMessageTextColor,
                                            borderRadius: brandTheme.botMessageBorderRadius,
                                            padding: brandTheme.botMessagePadding,
                                            textAlign: brandTheme.botMessageTextAlign,
                                            fontWeight: brandTheme.messageFontWeight,
                                            fontSize: brandTheme.baseFontSize,
                                            borderStyle: brandTheme.messageBubbleBorderStyle,
                                            borderWidth: brandTheme.messageBubbleBorderWidth,
                                            borderColor: brandTheme.secondaryColor,
                                            boxShadow: `0 2px 5px ${brandTheme.secondaryColor}30`,
                                        }}
                                    />
                                )}
                                {(msg.sender === "user" || msg.isOption) && !isContactAdminFormVisible && !contactFormSubmitted && (
                                    <ChatMessage
                                        message={{ ...msg, timestamp: msg.timestamp }}
                                        showDots={false}
                                        onMessageDisplayed={handleMessageDisplayed}
                                        theme={currentTheme}
                                        widgetConfig={currentConfig}
                                        onProductClick={handleFollowupClick}
                                        style={{
                                            backgroundColor: brandTheme.userMessageBgColor,
                                            color: brandTheme.userMessageTextColor,
                                            borderRadius: brandTheme.userMessageBorderRadius,
                                            padding: brandTheme.userMessagePadding,
                                            textAlign: brandTheme.userMessageTextAlign,
                                            fontWeight: brandTheme.messageFontWeight,
                                            fontSize: brandTheme.baseFontSize,
                                            borderStyle: brandTheme.messageBubbleBorderStyle,
                                            borderWidth: brandTheme.messageBubbleBorderWidth,
                                            borderColor: brandTheme.secondaryColor,
                                            boxShadow: `0 2px 5px ${brandTheme.secondaryColor}30`,
                                        }}
                                    />
                                )}
                            </motion.div>
                        ))}

                    {mode === "guided" && !isContactAdminFormVisible && !contactFormSubmitted &&
                        currentFlow &&
                        guidedFlows[currentFlow]?.options && (
                            <motion.div
                                className={styles['dvojkavit-mobile-options']}
                                initial={{ opacity: 0 }}
                                animate={{
                                    opacity: 1,
                                    transition: {
                                        duration: 0.5,
                                        delay: guidedMessages.length * 0.1,
                                    },
                                }}
                            >
                                {/* Options heading - Mobile */}
                                <div className={styles['dvojkavit-mobile-options-heading']} style={{ color: brandTheme.textColor }}>
                                    Vyberte možnost:
                                </div>
                                {guidedFlows[currentFlow].options.map((option) => (
                                    <PredefinedOptionMessage
                                        key={option.id}
                                        option={option}
                                        onSelect={handleOptionSelect}
                                        theme={currentTheme}
                                        disabled={processedOptions.has(option.id)}
                                        widgetConfig={currentConfig}
                                        style={{
                                            buttonBgColor: brandTheme.buttonBgColor,
                                            buttonTextColor: brandTheme.buttonTextColor,
                                            buttonBorderRadius: brandTheme.buttonBorderRadius,
                                            buttonPadding: brandTheme.buttonPadding,
                                            fontWeight: brandTheme.buttonFontWeight,
                                            fontSize: brandTheme.baseFontSize,
                                            borderStyle: brandTheme.buttonBorderStyle,
                                            borderWidth: brandTheme.buttonBorderWidth,
                                        }}
                                    />
                                ))}
                            </motion.div>
                        )}

                    {mode === "chat" && !isContactAdminFormVisible && !contactFormSubmitted &&
                        messages.map((msg, index) => (
                            <motion.div key={index}>
                                <ChatMessage
                                    message={{ ...msg, timestamp: msg.timestamp }}
                                    onMessageDisplayed={handleMessageDisplayed}
                                    theme={currentTheme}
                                    widgetConfig={currentConfig}
                                    onProductClick={handleFollowupClick}
                                    style={{
                                        backgroundColor: brandTheme.userMessageBgColor,
                                        color: brandTheme.userMessageTextColor,
                                        borderRadius: brandTheme.userMessageBorderRadius,
                                        padding: brandTheme.userMessagePadding,
                                        textAlign: brandTheme.userMessageTextAlign,
                                        fontWeight: brandTheme.messageFontWeight,
                                        fontSize: brandTheme.baseFontSize,
                                        borderStyle: brandTheme.messageBubbleBorderStyle,
                                        borderWidth: brandTheme.messageBubbleBorderWidth,
                                        borderColor: brandTheme.secondaryColor,
                                        boxShadow: `0 2px 5px ${brandTheme.secondaryColor}30`,
                                    }}
                                />
                            </motion.div>
                        ))}

                    {mode === "chat" && loading && !isContactAdminFormVisible && !contactFormSubmitted && (
                        <LoadingIndicator theme={currentTheme} />
                    )}
                    
                    {mode === "guided" && showDots && !isContactAdminFormVisible && !contactFormSubmitted && (
                        <div className={styles['dvojkavit-mobile-typing-container']}>
                            <motion.div
                                className={styles['dvojkavit-mobile-avatar-container']}
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 260,
                                    damping: 20,
                                    delay: 0.2,
                                }}
                            >
                                <img
                                    src={mainLogo}
                                    alt="Assistant"
                                    className={styles['dvojkavit-mobile-avatar-image']}
                                />
                            </motion.div>
                            <div className={styles['dvojkavit-mobile-typing-bubble-container']}>
                                <div className={styles['dvojkavit-mobile-typing-bubble']}>
                                    <AnimatedTypingDots theme={currentTheme} secondaryColor={brandTheme.secondaryColor} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- CONTACT ADMIN FORM (Mobile) --- */}
                    {isContactAdminFormVisible && (
                        <motion.form
                            onSubmit={handleContactFormSubmit}
                            className={styles.mobileForm} // Use new module class
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
                        >
                            <div className={styles.mobileFormHeader} style={{ backgroundColor: brandTheme.secondaryColor }}>
                                <h3 className={styles.mobileFormTitle} style={{ color: "#FFFFFF" }}>
                                    Kontaktujte nás
                                </h3>
                                <p className={styles.mobileFormSubtitle} style={{ color: "#FFFFFF" }}>
                                    Vyplňte prosím formulář a my se vám ozveme co nejdříve.
                                </p>
                            </div>

                            <div>
                                <label htmlFor="contact-email-mobile" className={styles.mobileFormLabel} style={{ color: brandTheme.textColor }}>
                                    <Mail className={styles.mobileFormLabelIcon} /> Váš email *
                                </label>
                                <input
                                    type="email"
                                    id="contact-email-mobile"
                                    className={styles.mobileFormInput} // Use new module class
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    required
                                    style={{
                                        backgroundColor: currentTheme === 'light' ? '#F9FAFB' : '#2D3748',
                                        color: brandTheme.textColor,
                                        borderColor: `${brandTheme.primaryColor}80`, // Use borderColor
                                    }}
                                />
                            </div>

                            <div>
                                <label htmlFor="contact-phone-mobile" className={styles.mobileFormLabel} style={{ color: brandTheme.textColor }}>
                                    <Phone className={styles.mobileFormLabelIcon} /> Telefonní číslo (nepovinné)
                                </label>
                                <input
                                    type="tel"
                                    id="contact-phone-mobile"
                                    className={styles.mobileFormInput} // Use new module class
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    style={{
                                        backgroundColor: currentTheme === 'light' ? '#F9FAFB' : '#2D3748',
                                        color: brandTheme.textColor,
                                        borderColor: `${brandTheme.primaryColor}80`, // Use borderColor
                                    }}
                                />
                            </div>

                            <div>
                                <label htmlFor="contact-message-mobile" className={styles.mobileFormLabel} style={{ color: brandTheme.textColor }}>
                                    Vaše zpráva *
                                </label>
                                <textarea
                                    id="contact-message-mobile"
                                    rows={3}
                                    className={styles.mobileFormTextarea} // Use new module class
                                    value={contactMessage}
                                    onChange={(e) => setContactMessage(e.target.value)}
                                    required
                                    style={{
                                        backgroundColor: currentTheme === 'light' ? '#F9FAFB' : '#2D3748',
                                        color: brandTheme.textColor,
                                        borderColor: `${brandTheme.primaryColor}80`, // Use borderColor
                                    }}
                                ></textarea>
                            </div>

                            {/* Keep focus styles */}
                            <style jsx global>{`
                                input:focus, textarea:focus {
                                    outline: none !important;
                                    box-shadow: 0 0 0 2px ${brandTheme.primaryColor}40 !important;
                                    border-color: ${brandTheme.primaryColor} !important;
                                }
                            `}</style>

                            <div className={styles.mobileFormActions}>
                                <motion.button
                                    type="button"
                                    onClick={handleContactFormCancel}
                                    className={styles.mobileFormCancelButton} // Use new module class
                                    style={{
                                        color: brandTheme.textColor,
                                        borderColor: `${brandTheme.secondaryColor}80`, // Use borderColor
                                    }}
                                    whileHover={{ scale: 1.03, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Zrušit
                                </motion.button>

                                <motion.button
                                    type="submit"
                                    className={styles.mobileFormSubmitButton} // Use new module class
                                    style={{
                                        backgroundColor: brandTheme.primaryColor,
                                        color: '#FFFFFF',
                                    }}
                                    whileHover={{ scale: 1.03, boxShadow: '0 4px 8px rgba(0,0,0,0.15)' }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Odeslat
                                </motion.button>
                            </div>
                        </motion.form>
                    )}

                    {/* Thank You Message - Mobile */}
                    {contactFormSubmitted && (
                        <motion.div
                            className={styles.mobileThankYouContainer} // Use new module class
                            style={{
                                background: `linear-gradient(to right, ${brandTheme.primaryColor}10, ${brandTheme.secondaryColor}10)`,
                                border: `1px solid ${brandTheme.primaryColor}30`,
                            }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
                            exit={{ opacity: 0, y: 10, transition: { duration: 0.2 } }}
                        >
                            <motion.div
                                className={styles.mobileThankYouIconContainer} // Use new module class
                                style={{
                                    backgroundColor: `${brandTheme.primaryColor}20`,
                                    border: `2px solid ${brandTheme.primaryColor}`
                                }}
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.2, 1], rotate: [0, 10, 0] }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                            >
                                <CheckCircle size={24} color={brandTheme.primaryColor} />
                            </motion.div>

                            <h3 className={styles.mobileThankYouTitle} style={{ color: brandTheme.primaryColor }}>
                                Děkujeme!
                            </h3>

                            <p className={styles.mobileThankYouText} style={{ color: brandTheme.textColor }}>
                                Vaše zpráva byla odeslána.
                            </p>

                            <motion.button
                                onClick={() => {
                                    setContactFormSubmitted(false);
                                    setMode('chat');
                                }}
                                className={styles.mobileThankYouButton} // Use new module class
                                style={{
                                    background: brandTheme.accentGradient,
                                    color: '#FFFFFF',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                }}
                                whileHover={{ scale: 1.03, boxShadow: '0 3px 6px rgba(0,0,0,0.15)' }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Pokračovat
                            </motion.button>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </motion.div>

                {/* Footer - Mobile */}
                <motion.div
                    className={styles['dvojkavit-mobile-footer']}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1, transition: { duration: 0.5, delay: 0.3 } }}
                >
                    {mode === "guided" && !isContactAdminFormVisible && !contactFormSubmitted && (
                        <motion.div className={styles['dvojkavit-mobile-guided-footer']}>
                            <div
                                className={styles['dvojkavit-mobile-time-display']}
                                style={{ color: brandTheme.textColor, fontSize: brandTheme.baseFontSize }}
                            >
                                {new Date().toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </div>
                            {currentFlow !== "main" && (
                                <motion.button
                                    onClick={handleGoBack}
                                    className={styles['dvojkavit-mobile-back-button']}
                                    style={{
                                        borderColor: brandTheme.secondaryColor,
                                        color: brandTheme.textColor,
                                        borderRadius: brandTheme.buttonBorderRadius || "1rem",
                                        borderStyle: brandTheme.buttonBorderStyle,
                                        borderWidth: brandTheme.buttonBorderWidth,
                                        padding: brandTheme.buttonPadding,
                                        fontWeight: brandTheme.buttonFontWeight,
                                        fontSize: brandTheme.baseFontSize,
                                        backgroundColor: brandTheme.buttonBgColor,
                                    }}
                                    whileHover={{
                                        scale: 1.05,
                                        backgroundColor: brandTheme.primaryColor,
                                        color: "#FFFFFF",
                                    }}
                                    transition={{ duration: 0.3 }}
                                    aria-label="Go Back"
                                >
                                    <ArrowLeft className={styles['dvojkavit-mobile-back-icon']} />
                                    Go Back
                                </motion.button>
                            )}
                        </motion.div>
                    )}

                    {mode === "faq" && !isContactAdminFormVisible && !contactFormSubmitted && (
                        <motion.div
                            className={styles['dvojkavit-mobile-faq-container']}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1, transition: { duration: 0.5 } }}
                        >
                            <div
                                className={styles['dvojkavit-mobile-faq-title']}
                                style={{ color: brandTheme.textColor, fontSize: brandTheme.baseFontSize, fontWeight: brandTheme.headerFontWeight }}
                            >
                                Často kladené otázky
                            </div>
                            <FaqSearch
                                faqSearchTerm={faqSearchTerm}
                                handleFaqSearch={handleFaqSearch}
                                theme={currentTheme}
                                style={currentConfig}
                            />
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0, transition: { staggerChildren: 0.05 } }}
                            >
                                {filteredFaqQuestions.map((faq, index) => (
                                    <FaqItem
                                        key={faq.id}
                                        question={faq.question}
                                        answer={faq.answer}
                                        index={index}
                                        isOpen={openFaqIndex === index}
                                        toggleOpen={() => handleFaqToggle(index)}
                                        theme={currentTheme}
                                        searchTerm={faqSearchTerm}
                                        style={brandTheme}
                                    />
                                ))}
                            </motion.div>
                            <div className={styles['dvojkavit-mobile-faq-actions']}>
                                <motion.button
                                    onClick={() => handleModeChange("chat")}
                                    className={styles['dvojkavit-mobile-goto-chat-button']}
                                    style={{
                                        backgroundColor: brandTheme.primaryColor,
                                        color: '#FFFFFF',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        padding: '1rem 2rem',
                                    }}
                                    whileHover={{ scale: 1.03, boxShadow: '0 4px 8px rgba(0,0,0,0.15)' }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <User className={styles['dvojkavit-mobile-user-icon']} />
                                    Přejít do chatu s asistentem
                                    <ArrowRight className={styles['dvojkavit-mobile-arrow-icon']} />
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {mode === "chat" && !isContactAdminFormVisible && !contactFormSubmitted && (
                        <div className={styles['dvojkavit-mobile-chat-footer']}>
                            {/* --- CONTACT ADMIN BUTTON (Mobile) - MOVED INSIDE FOOTER & FLEX CONTAINER --- */}
                            <motion.button
                                onClick={handleContactAdminClick}
                                className={styles['dvojkavit-mobile-contact-admin-button']}
                                style={{
                                    background: `linear-gradient(135deg, ${brandTheme.primaryColor}, ${brandTheme.secondaryColor})`,
                                    color: '#FFFFFF',
                                    borderRadius: brandTheme.buttonBorderRadius || "1.5rem",
                                    padding: brandTheme.buttonPadding,
                                    fontWeight: "600",
                                    fontSize: brandTheme.baseFontSize,
                                    minHeight: "48px",
                                    letterSpacing: "0.02em",
                                    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.07)",
                                    border: "1px solid rgba(255, 255, 255, 0.1)"
                                }}
                                whileHover={{
                                    scale: 1.02,
                                    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
                                    filter: "brightness(1.05)"
                                }}
                                whileTap={{
                                    scale: 0.98,
                                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
                                }}
                                transition={{ 
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 15
                                }}
                                aria-label="Contact Admin"
                            >
                                <MessageCircle className={styles['dvojkavit-mobile-message-icon']} />
                                Kontaktujte nás!
                            </motion.button>
                            <MessageInput
                                onSend={handleSendMessage}
                                disabled={loading || !isOnline}
                                theme={currentTheme}
                                inputRef={questionInputRef}
                                widgetConfig={{
                                    primary_color_light: currentConfig?.primary_color_light,
                                    primary_color_dark: currentConfig?.primary_color_dark,
                                }}
                                style={{
                                    inputBgColor: brandTheme.inputBgColor,
                                    inputTextColor: brandTheme.inputTextColor,
                                    inputBorderColor: brandTheme.inputBorderColor,
                                    inputBorderFocusColor: brandTheme.primaryColor,
                                    inputPlaceholderColor: brandTheme.inputPlaceholderColor,
                                    buttonBgColor: brandTheme.buttonBgColor,
                                    buttonTextColor: brandTheme.buttonTextColor,
                                }}
                            />
                        </div>
                    )}
                    
                    <div className={styles['dvojkavit-mobile-mode-toggle']}>
                        {currentConfig && <ModeToggle
                            mode={mode}
                            onModeChange={handleModeChange}
                            theme={currentTheme}
                            widgetConfig={currentConfig}
                            primaryColor={brandTheme.primaryColor}
                            secondaryColor={brandTheme.secondaryColor}
                        />}
                    </div>

                    <div
                        className={styles['dvojkavit-mobile-footer-copyright']}
                        style={{ color: brandTheme.textColor, fontSize: brandTheme.baseFontSize }}
                    >
                        <a href="https://www.dvojkavit.com" className={styles['dvojkavit-mobile-copyright-link']}>Vytvořeno Dvojka v IT</a>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default Widget;
