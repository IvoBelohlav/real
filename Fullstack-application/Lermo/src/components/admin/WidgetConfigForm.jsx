import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { themes } from '../../themes';
import { widgetThemePresets } from './widgetThemes.jsx';
import styles from './WidgetConfigForm.module.css';

// Set CSS variables for the entire app - using LERMO's brand color
const applyThemeToApp = () => {
    const root = document.documentElement;
    
    // Set fixed LERMO brand colors for the admin UI
    root.style.setProperty('--primary-color', '#E01E26');
    root.style.setProperty('--primary-color-darker', '#B61319');
    root.style.setProperty('--secondary-color', '#f0f2f5');
    
    // Button colors
    root.style.setProperty('--button-bg-color', '#E01E26');
    root.style.setProperty('--button-text-color', '#FFFFFF');
    
    // Text colors
    root.style.setProperty('--text-color', '#212121');
    root.style.setProperty('--header-text-color', '#FFFFFF');
    
    // Background colors
    root.style.setProperty('--background-color', '#FFFFFF');
    root.style.setProperty('--header-bg-color', '#E01E26');
};

// Apply the LERMO theme to the admin UI immediately when this component loads
(() => {
    applyThemeToApp();
})();

// Helper function to darken or lighten a color
const adjustColor = (color, amount) => {
    try {
        if (!color || color === 'undefined') {
            return '#B61319'; // Darker LERMO red as fallback
        }
        
        // Convert hex to RGB
        let r = parseInt(color.substring(1, 3), 16);
        let g = parseInt(color.substring(3, 5), 16);
        let b = parseInt(color.substring(5, 7), 16);
        
        // Adjust color
        r = Math.max(0, Math.min(255, r + amount));
        g = Math.max(0, Math.min(255, g + amount));
        b = Math.max(0, Math.min(255, b + amount));
        
        // Convert back to hex
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    } catch (error) {
        console.error('Error adjusting color:', error);
        return color; // Return original if there's an error
    }
};

// Apply theme only to widget preview, not to the admin UI
const applyThemeToWidget = (themeData) => {
    // This function does not modify root document styles
    // Instead, it returns the theme data to be passed to the Widget component
    return themeData;
};

const WidgetConfigForm = () => {
    const defaultTheme = themes.light;
    const defaultDarkTheme = themes.dark;
    const [activeTab, setActiveTab] = useState('general');
    const [selectedThemePreset, setSelectedThemePreset] = useState('default');
    const [previewMode, setPreviewMode] = useState('light');

    const [formData, setFormData] = useState({
        logo_light_mode: null,
        logo_dark_mode: null,
        main_title: '',
        primary_color_light: defaultTheme.primaryColor,
        secondary_color_light: defaultTheme.secondaryColor,
        background_color_light: defaultTheme.backgroundColor,
        text_color_light: defaultTheme.textColor,
        button_text_color_light: defaultTheme.buttonText,
        button_bg_color_light: defaultTheme.buttonBgColor,
        header_bg_color_light: defaultTheme.headerBg,
        header_text_color_light: defaultTheme.headerText,
        icon_background_color_light: defaultTheme.secondaryColor,
        mode_toggle_background_light: defaultTheme.primaryColor,
        primary_color_dark: defaultDarkTheme.primaryColor,
        secondary_color_dark: defaultDarkTheme.secondaryColor,
        background_color_dark: defaultDarkTheme.backgroundColor,
        text_color_dark: defaultDarkTheme.textColor,
        button_text_color_dark: defaultDarkTheme.buttonText,
        button_bg_color_dark: defaultDarkTheme.buttonBgColor,
        header_bg_color_dark: defaultDarkTheme.headerBg,
        header_text_color_dark: defaultDarkTheme.headerText,
        icon_background_color_dark: defaultDarkTheme.primaryColor,
        mode_toggle_background_dark: defaultDarkTheme.secondaryColor,
        font_family: 'Inter, sans-serif',
        greeting_message: '👋 Hey there! How can I assist you today?',
        widget_button_text: 'We are here!',
        widget_help_text: 'Need help? Chat now',
        widget_padding: '0rem',
        message_spacing: '0.75rem',
        input_field_padding: '0.625rem',
        base_font_size: '1rem',
        header_font_weight: 'bold',
        message_font_weight: 'normal',
        button_font_weight: 'bold',
        widget_border_radius: '1.6rem',
        widget_border_style: 'solid',
        widget_border_width: '0px',
        message_bubble_border_radius: '0.75rem',
        message_bubble_border_style: 'none',
        message_bubble_border_width: '0px',
        input_field_border_radius: '0.375rem',
        input_field_border_style: 'solid',
        input_field_border_width: '1px',
        button_border_radius: '0.75rem',
        button_border_style: 'none',
        button_border_width: '0px',
        widget_shadow: '0 5px 15px rgba(14, 165, 233, 0.15)',
        custom_css: '',
    });

    const queryClient = useQueryClient();

    const { data: config, isLoading, isError } = useQuery({
        queryKey: ['widgetConfig'],
        queryFn: async () => {
            const response = await api.get('/api/widget-config');
            return response.data;
        },
        onError: (error) => {
            toast.error(`Failed to load widget config: ${error.message}`);
        },
    });

    useEffect(() => {
        if (config) {
            setFormData(prevFormData => ({
                ...prevFormData, // Keep existing form data
                ...config,       // Override with config data, but keep defaults for missing backend values
            }));
        }
    }, [config]);

    const updateConfigMutation = useMutation({
        mutationFn: (updatedConfig) => api.put('/api/widget-config', updatedConfig),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['widgetConfig'] });
            toast.success('Widget configuration updated successfully!');
        },
        onError: (error) => {
            toast.error(`Failed to update widget configuration: ${error.message}`);
        },
    });

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFileChange = (e, fieldName) => {
        const file = e.target.files[0];
        if (file && file.type === 'image/webp') {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData((prev) => ({
                    ...prev,
                    [fieldName]: reader.result,
                }));
            };
            reader.readAsDataURL(file);
        } else {
            toast.error('Please select a .webp image file.');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        updateConfigMutation.mutate(formData);
    };

    const handleReset = () => {
        setFormData({
            logo_light_mode: null,
            logo_dark_mode: null,
            main_title: '',
            primary_color_light: defaultTheme.primaryColor,
            secondary_color_light: defaultTheme.secondaryColor,
            background_color_light: defaultTheme.backgroundColor,
            text_color_light: defaultTheme.textColor,
            button_text_color_light: defaultTheme.buttonText,
            button_bg_color_light: defaultTheme.buttonBgColor,
            header_bg_color_light: defaultTheme.headerBg,
            header_text_color_light: defaultTheme.headerText,
            icon_background_color_light: defaultTheme.secondaryColor,
            mode_toggle_background_light: defaultTheme.primaryColor,
            primary_color_dark: defaultDarkTheme.primaryColor,
            secondary_color_dark: defaultDarkTheme.secondaryColor,
            background_color_dark: defaultDarkTheme.backgroundColor,
            text_color_dark: defaultDarkTheme.textColor,
            button_text_color_dark: defaultDarkTheme.buttonText,
            button_bg_color_dark: defaultDarkTheme.buttonBgColor,
            header_bg_color_dark: defaultDarkTheme.headerBg,
            header_text_color_dark: defaultDarkTheme.headerText,
            icon_background_color_dark: defaultDarkTheme.primaryColor,
            mode_toggle_background_dark: defaultDarkTheme.secondaryColor,
            font_family: 'Inter, sans-serif',
            greeting_message: '👋 Hey there! How can I assist you today?',
            widget_button_text: 'We are here!',
            widget_help_text: 'Need help? Chat now',
            widget_padding: '0rem',
            message_spacing: '0.75rem',
            input_field_padding: '0.625rem',
            base_font_size: '1rem',
            header_font_weight: 'bold',
            message_font_weight: 'normal',
            button_font_weight: 'bold',
            widget_border_radius: '1.6rem',
            widget_border_style: 'solid',
            widget_border_width: '0px',
            message_bubble_border_radius: '0.75rem',
            message_bubble_border_style: 'none',
            message_bubble_border_width: '0px',
            input_field_border_radius: '0.375rem',
            input_field_border_style: 'solid',
            input_field_border_width: '1px',
            button_border_radius: '0.75rem',
            button_border_style: 'none',
            button_border_width: '0px',
            widget_shadow: '0 5px 15px rgba(14, 165, 233, 0.15)',
            custom_css: '',
        });
        setSelectedThemePreset('default');
        toast.info('Configuration reset to default!');
    };

    const handleThemePresetChange = (preset) => {
        setSelectedThemePreset(preset);
        const presetTheme = widgetThemePresets[preset];
        if (presetTheme) {
            setFormData((prev) => ({
                ...prev,
                primary_color_light: presetTheme.primary_color_light || presetTheme.light?.primaryColor,
                secondary_color_light: presetTheme.secondary_color_light || presetTheme.light?.secondaryColor,
                background_color_light: presetTheme.background_color_light || presetTheme.light?.backgroundColor,
                text_color_light: presetTheme.text_color_light || presetTheme.light?.textColor,
                button_text_color_light: presetTheme.button_text_color_light || presetTheme.light?.buttonText,
                button_bg_color_light: presetTheme.button_bg_color_light || presetTheme.light?.buttonBgColor,
                header_bg_color_light: presetTheme.header_bg_color_light || presetTheme.light?.headerBg,
                header_text_color_light: presetTheme.header_text_color_light || presetTheme.light?.headerText,
                icon_background_color_light: presetTheme.icon_background_color_light || presetTheme.light?.secondaryColor,
                mode_toggle_background_light: presetTheme.mode_toggle_background_light || presetTheme.light?.primaryColor,
                primary_color_dark: presetTheme.primary_color_dark || presetTheme.dark?.primaryColor,
                secondary_color_dark: presetTheme.secondary_color_dark || presetTheme.dark?.secondaryColor,
                background_color_dark: presetTheme.background_color_dark || presetTheme.dark?.backgroundColor,
                text_color_dark: presetTheme.text_color_dark || presetTheme.dark?.textColor,
                button_text_color_dark: presetTheme.button_text_color_dark || presetTheme.dark?.buttonText,
                button_bg_color_dark: presetTheme.button_bg_color_dark || presetTheme.dark?.buttonBgColor,
                header_bg_color_dark: presetTheme.header_bg_color_dark || presetTheme.dark?.headerBg,
                header_text_color_dark: presetTheme.header_text_color_dark || presetTheme.dark?.headerText,
                icon_background_color_dark: presetTheme.icon_background_color_dark || presetTheme.dark?.primaryColor,
                mode_toggle_background_dark: presetTheme.mode_toggle_background_dark || presetTheme.dark?.secondaryColor,
                greeting_message: presetTheme.greeting_message || prev.greeting_message,
                widget_button_text: presetTheme.widget_button_text || prev.widget_button_text,
                widget_help_text: presetTheme.widget_help_text || prev.widget_help_text,
            }));
        }
    };

    // Remove unused preview mode functions
    const togglePreviewMode = () => {
        setPreviewMode(prev => prev === 'light' ? 'dark' : 'light');
    };

    useEffect(() => {
        console.log("WidgetConfigForm - previewMode updated:", previewMode);
    }, [previewMode]);

    const setLightMode = () => {
        console.log("Setting light mode for preview");
        setPreviewMode('light');
    };

    const setDarkMode = () => {
        console.log("Setting dark mode for preview");
        setPreviewMode('dark');
    };

    return (
        <div className={styles.formContainer}>
            <div className={styles.form}>
                <div className={styles.themeSelector}>
                    <h3 className={styles.sectionTitle}>Theme Preset</h3>
                    <div>
                        {Object.keys(widgetThemePresets).map((theme) => (
                            <button 
                                key={theme}
                                className={selectedThemePreset === theme ? styles.themeOptionActive : styles.themeOption}
                                onClick={() => handleThemePresetChange(theme)}
                            >
                                {theme.charAt(0).toUpperCase() + theme.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.tabContainer}>
                        <div 
                            className={activeTab === 'general' ? styles.tabActive : styles.tab}
                            onClick={() => setActiveTab('general')}
                        >
                            General Settings
                        </div>
                        <div 
                            className={activeTab === 'lightColors' ? styles.tabActive : styles.tab}
                            onClick={() => setActiveTab('lightColors')}
                        >
                            Light Mode Colors
                        </div>
                        <div 
                            className={activeTab === 'darkColors' ? styles.tabActive : styles.tab}
                            onClick={() => setActiveTab('darkColors')}
                        >
                            Dark Mode Colors
                        </div>
                        <div 
                            className={activeTab === 'typography' ? styles.tabActive : styles.tab}
                            onClick={() => setActiveTab('typography')}
                        >
                            Typography
                        </div>
                        <div 
                            className={activeTab === 'spacing' ? styles.tabActive : styles.tab}
                            onClick={() => setActiveTab('spacing')}
                        >
                            Spacing & Borders
                        </div>
                        <div 
                            className={activeTab === 'advanced' ? styles.tabActive : styles.tab}
                            onClick={() => setActiveTab('advanced')}
                        >
                            Advanced
                        </div>
                    </div>

                    {/* General Settings Tab */}
                    {activeTab === 'general' && (
                        <>
                            <h3 className={styles.sectionTitle}>General Settings</h3>
                            
                            <div className={styles.field}>
                                <label htmlFor="main_title" className={styles.label}>
                                    Main Title
                                </label>
                                <input
                                    type="text"
                                    id="main_title"
                                    name="main_title"
                                    value={formData.main_title}
                                    onChange={handleChange}
                                    className={styles.input}
                                    placeholder="LERMO Assistant"
                                />
                            </div>
                            
                            <div className={styles.fieldGroup}>
                                <div className={styles.field}>
                                    <label htmlFor="logo_light_mode" className={styles.label}>
                                        Logo (Light Mode)
                                    </label>
                                    <div className={styles.fileUploadContainer}>
                                        <input
                                            type="file"
                                            id="logo_light_mode"
                                            accept=".webp"
                                            onChange={(e) => handleFileChange(e, 'logo_light_mode')}
                                            style={{ display: 'none' }}
                                        />
                                        <label htmlFor="logo_light_mode" style={{ cursor: 'pointer' }}>
                                            {formData.logo_light_mode ? (
                                                <img
                                                    src={formData.logo_light_mode}
                                                    alt="Logo Preview"
                                                    className={styles.filePreview}
                                                />
                                            ) : (
                                                "Choose Logo (Light Mode)"
                                            )}
                                        </label>
                                    </div>
                                </div>

                                <div className={styles.field}>
                                    <label htmlFor="logo_dark_mode" className={styles.label}>
                                        Logo (Dark Mode)
                                    </label>
                                    <div className={styles.fileUploadContainer}>
                                        <input
                                            type="file"
                                            id="logo_dark_mode"
                                            accept=".webp"
                                            onChange={(e) => handleFileChange(e, 'logo_dark_mode')}
                                            style={{ display: 'none' }}
                                        />
                                        <label htmlFor="logo_dark_mode" style={{ cursor: 'pointer' }}>
                                            {formData.logo_dark_mode ? (
                                                <img
                                                    src={formData.logo_dark_mode}
                                                    alt="Logo Preview"
                                                    className={styles.filePreview}
                                                />
                                            ) : (
                                                "Choose Logo (Dark Mode)"
                                            )}
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div className={styles.fieldGroup}>
                                <div className={styles.field}>
                                    <label htmlFor="greeting_message" className={styles.label}>
                                        Greeting Message
                                    </label>
                                    <textarea
                                        id="greeting_message"
                                        name="greeting_message"
                                        value={formData.greeting_message}
                                        onChange={handleChange}
                                        className={styles.textarea}
                                        placeholder="👋 Hey there! How can I assist you today?"
                                        rows={3}
                                    ></textarea>
                                </div>
                            </div>
                            
                            <div className={styles.fieldGroup}>
                                <div className={styles.field}>
                                    <label htmlFor="widget_button_text" className={styles.label}>
                                        Widget Button Text
                                    </label>
                                    <input
                                        type="text"
                                        id="widget_button_text"
                                        name="widget_button_text"
                                        value={formData.widget_button_text}
                                        onChange={handleChange}
                                        className={styles.input}
                                        placeholder="We are here!"
                                    />
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="widget_help_text" className={styles.label}>
                                        Widget Help Text
                                    </label>
                                    <input
                                        type="text"
                                        id="widget_help_text"
                                        name="widget_help_text"
                                        value={formData.widget_help_text}
                                        onChange={handleChange}
                                        className={styles.input}
                                        placeholder="Need help? Chat now"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Light Mode Colors Tab */}
                    {activeTab === 'lightColors' && (
                        <>
                            <h3 className={styles.sectionTitle}>Light Mode Colors</h3>
                            
                            <div className={styles.fieldGroup}>
                                <div className={styles.field}>
                                    <label htmlFor="primary_color_light" className={styles.label}>
                                        Primary Color
                                    </label>
                                    <input
                                        type="color"
                                        id="primary_color_light"
                                        name="primary_color_light"
                                        value={formData.primary_color_light}
                                        onChange={handleChange}
                                        className={styles.colorInput}
                                    />
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="secondary_color_light" className={styles.label}>
                                        Secondary Color
                                    </label>
                                    <input
                                        type="color"
                                        id="secondary_color_light"
                                        name="secondary_color_light"
                                        value={formData.secondary_color_light}
                                        onChange={handleChange}
                                        className={styles.colorInput}
                                    />
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="background_color_light" className={styles.label}>
                                        Background Color
                                    </label>
                                    <input
                                        type="color"
                                        id="background_color_light"
                                        name="background_color_light"
                                        value={formData.background_color_light}
                                        onChange={handleChange}
                                        className={styles.colorInput}
                                    />
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="text_color_light" className={styles.label}>
                                        Text Color
                                    </label>
                                    <input
                                        type="color"
                                        id="text_color_light"
                                        name="text_color_light"
                                        value={formData.text_color_light}
                                        onChange={handleChange}
                                        className={styles.colorInput}
                                    />
                                </div>
                            </div>
                            
                            <div className={styles.fieldGroup}>
                                <div className={styles.field}>
                                    <label htmlFor="header_bg_color_light" className={styles.label}>
                                        Header Background Color
                                    </label>
                                    <input
                                        type="color"
                                        id="header_bg_color_light"
                                        name="header_bg_color_light"
                                        value={formData.header_bg_color_light}
                                        onChange={handleChange}
                                        className={styles.colorInput}
                                    />
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="header_text_color_light" className={styles.label}>
                                        Header Text Color
                                    </label>
                                    <input
                                        type="color"
                                        id="header_text_color_light"
                                        name="header_text_color_light"
                                        value={formData.header_text_color_light}
                                        onChange={handleChange}
                                        className={styles.colorInput}
                                    />
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="icon_background_color_light" className={styles.label}>
                                        Icon Background
                                    </label>
                                    <input
                                        type="color"
                                        id="icon_background_color_light"
                                        name="icon_background_color_light"
                                        value={formData.icon_background_color_light}
                                        onChange={handleChange}
                                        className={styles.colorInput}
                                    />
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="mode_toggle_background_light" className={styles.label}>
                                        Mode Toggle Background
                                    </label>
                                    <input
                                        type="color"
                                        id="mode_toggle_background_light"
                                        name="mode_toggle_background_light"
                                        value={formData.mode_toggle_background_light}
                                        onChange={handleChange}
                                        className={styles.colorInput}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Dark Mode Colors Tab */}
                    {activeTab === 'darkColors' && (
                        <>
                            <h3 className={styles.sectionTitle}>Dark Mode Colors</h3>
                            
                            <div className={styles.fieldGroup}>
                                <div className={styles.field}>
                                    <label htmlFor="primary_color_dark" className={styles.label}>
                                        Primary Color
                                    </label>
                                    <input
                                        type="color"
                                        id="primary_color_dark"
                                        name="primary_color_dark"
                                        value={formData.primary_color_dark}
                                        onChange={handleChange}
                                        className={styles.colorInput}
                                    />
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="secondary_color_dark" className={styles.label}>
                                        Secondary Color
                                    </label>
                                    <input
                                        type="color"
                                        id="secondary_color_dark"
                                        name="secondary_color_dark"
                                        value={formData.secondary_color_dark}
                                        onChange={handleChange}
                                        className={styles.colorInput}
                                    />
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="background_color_dark" className={styles.label}>
                                        Background Color
                                    </label>
                                    <input
                                        type="color"
                                        id="background_color_dark"
                                        name="background_color_dark"
                                        value={formData.background_color_dark}
                                        onChange={handleChange}
                                        className={styles.colorInput}
                                    />
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="text_color_dark" className={styles.label}>
                                        Text Color
                                    </label>
                                    <input
                                        type="color"
                                        id="text_color_dark"
                                        name="text_color_dark"
                                        value={formData.text_color_dark}
                                        onChange={handleChange}
                                        className={styles.colorInput}
                                    />
                                </div>
                            </div>
                            
                            <div className={styles.fieldGroup}>
                                <div className={styles.field}>
                                    <label htmlFor="header_bg_color_dark" className={styles.label}>
                                        Header Background Color
                                    </label>
                                    <input
                                        type="color"
                                        id="header_bg_color_dark"
                                        name="header_bg_color_dark"
                                        value={formData.header_bg_color_dark}
                                        onChange={handleChange}
                                        className={styles.colorInput}
                                    />
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="header_text_color_dark" className={styles.label}>
                                        Header Text Color
                                    </label>
                                    <input
                                        type="color"
                                        id="header_text_color_dark"
                                        name="header_text_color_dark"
                                        value={formData.header_text_color_dark}
                                        onChange={handleChange}
                                        className={styles.colorInput}
                                    />
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="icon_background_color_dark" className={styles.label}>
                                        Icon Background
                                    </label>
                                    <input
                                        type="color"
                                        id="icon_background_color_dark"
                                        name="icon_background_color_dark"
                                        value={formData.icon_background_color_dark}
                                        onChange={handleChange}
                                        className={styles.colorInput}
                                    />
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="mode_toggle_background_dark" className={styles.label}>
                                        Mode Toggle Background
                                    </label>
                                    <input
                                        type="color"
                                        id="mode_toggle_background_dark"
                                        name="mode_toggle_background_dark"
                                        value={formData.mode_toggle_background_dark}
                                        onChange={handleChange}
                                        className={styles.colorInput}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Typography Tab */}
                    {activeTab === 'typography' && (
                        <>
                            <h3 className={styles.sectionTitle}>Typography</h3>
                            
                            <div className={styles.fieldGroup}>
                                <div className={styles.field}>
                                    <label htmlFor="font_family" className={styles.label}>
                                        Font Family
                                    </label>
                                    <select
                                        id="font_family"
                                        name="font_family"
                                        value={formData.font_family}
                                        onChange={handleChange}
                                        className={styles.select}
                                    >
                                        <option value="Inter, sans-serif">Inter</option>
                                        <option value="'Exo 2', sans-serif">Exo 2</option>
                                        <option value="'Roboto', sans-serif">Roboto</option>
                                        <option value="'Open Sans', sans-serif">Open Sans</option>
                                        <option value="'Montserrat', sans-serif">Montserrat</option>
                                    </select>
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="base_font_size" className={styles.label}>
                                        Base Font Size
                                    </label>
                                    <select
                                        id="base_font_size"
                                        name="base_font_size"
                                        value={formData.base_font_size}
                                        onChange={handleChange}
                                        className={styles.select}
                                    >
                                        <option value="0.875rem">Small (0.875rem)</option>
                                        <option value="1rem">Medium (1rem)</option>
                                        <option value="1.125rem">Large (1.125rem)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className={styles.fieldGroup}>
                                <div className={styles.field}>
                                    <label htmlFor="header_font_weight" className={styles.label}>
                                        Header Font Weight
                                    </label>
                                    <select
                                        id="header_font_weight"
                                        name="header_font_weight"
                                        value={formData.header_font_weight}
                                        onChange={handleChange}
                                        className={styles.select}
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="bold">Bold</option>
                                        <option value="lighter">Lighter</option>
                                        <option value="inherit">Inherit</option>
                                    </select>
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="message_font_weight" className={styles.label}>
                                        Message Font Weight
                                    </label>
                                    <select
                                        id="message_font_weight"
                                        name="message_font_weight"
                                        value={formData.message_font_weight}
                                        onChange={handleChange}
                                        className={styles.select}
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="bold">Bold</option>
                                        <option value="lighter">Lighter</option>
                                        <option value="inherit">Inherit</option>
                                    </select>
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="button_font_weight" className={styles.label}>
                                        Button Font Weight
                                    </label>
                                    <select
                                        id="button_font_weight"
                                        name="button_font_weight"
                                        value={formData.button_font_weight}
                                        onChange={handleChange}
                                        className={styles.select}
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="bold">Bold</option>
                                        <option value="lighter">Lighter</option>
                                        <option value="inherit">Inherit</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Spacing & Borders Tab */}
                    {activeTab === 'spacing' && (
                        <>
                            <h3 className={styles.sectionTitle}>Spacing & Borders</h3>
                            
                            <div className={styles.fieldGroup}>
                                <div className={styles.field}>
                                    <label htmlFor="widget_padding" className={styles.label}>
                                        Widget Padding
                                    </label>
                                    <select
                                        id="widget_padding"
                                        name="widget_padding"
                                        value={formData.widget_padding}
                                        onChange={handleChange}
                                        className={styles.select}
                                    >
                                        <option value="0rem">None (0rem)</option>
                                        <option value="0.5rem">Small (0.5rem)</option>
                                        <option value="1rem">Medium (1rem)</option>
                                        <option value="1.5rem">Large (1.5rem)</option>
                                    </select>
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="message_spacing" className={styles.label}>
                                        Message Spacing
                                    </label>
                                    <select
                                        id="message_spacing"
                                        name="message_spacing"
                                        value={formData.message_spacing}
                                        onChange={handleChange}
                                        className={styles.select}
                                    >
                                        <option value="0.5rem">Small (0.5rem)</option>
                                        <option value="0.75rem">Medium (0.75rem)</option>
                                        <option value="1rem">Large (1rem)</option>
                                    </select>
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="input_field_padding" className={styles.label}>
                                        Input Field Padding
                                    </label>
                                    <select
                                        id="input_field_padding"
                                        name="input_field_padding"
                                        value={formData.input_field_padding}
                                        onChange={handleChange}
                                        className={styles.select}
                                    >
                                        <option value="0.375rem">Small (0.375rem)</option>
                                        <option value="0.625rem">Medium (0.625rem)</option>
                                        <option value="0.875rem">Large (0.875rem)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className={styles.fieldGroup}>
                                <div className={styles.field}>
                                    <label htmlFor="widget_border_radius" className={styles.label}>
                                        Widget Border Radius
                                    </label>
                                    <select
                                        id="widget_border_radius"
                                        name="widget_border_radius"
                                        value={formData.widget_border_radius}
                                        onChange={handleChange}
                                        className={styles.select}
                                    >
                                        <option value="0">None (0)</option>
                                        <option value="0.5rem">Small (0.5rem)</option>
                                        <option value="1rem">Medium (1rem)</option>
                                        <option value="1.6rem">Large (1.6rem)</option>
                                    </select>
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="widget_border_style" className={styles.label}>
                                        Widget Border Style
                                    </label>
                                    <select
                                        id="widget_border_style"
                                        name="widget_border_style"
                                        value={formData.widget_border_style}
                                        onChange={handleChange}
                                        className={styles.select}
                                    >
                                        <option value="none">None</option>
                                        <option value="solid">Solid</option>
                                        <option value="dashed">Dashed</option>
                                        <option value="dotted">Dotted</option>
                                    </select>
                                </div>
                                
                                <div className={styles.field}>
                                    <label htmlFor="widget_border_width" className={styles.label}>
                                        Widget Border Width
                                    </label>
                                    <select
                                        id="widget_border_width"
                                        name="widget_border_width"
                                        value={formData.widget_border_width}
                                        onChange={handleChange}
                                        className={styles.select}
                                    >
                                        <option value="0px">None (0px)</option>
                                        <option value="1px">Thin (1px)</option>
                                        <option value="2px">Medium (2px)</option>
                                        <option value="3px">Thick (3px)</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Advanced Tab */}
                    {activeTab === 'advanced' && (
                        <>
                            <h3 className={styles.sectionTitle}>Advanced Settings</h3>
                            
                            <div className={styles.field}>
                                <label htmlFor="widget_shadow" className={styles.label}>
                                    Widget Shadow
                                </label>
                                <select
                                    id="widget_shadow"
                                    name="widget_shadow"
                                    value={formData.widget_shadow}
                                    onChange={handleChange}
                                    className={styles.select}
                                >
                                    <option value="none">None</option>
                                    <option value="0 1px 3px rgba(0, 0, 0, 0.1)">Light</option>
                                    <option value="0 5px 15px rgba(14, 165, 233, 0.15)">Medium</option>
                                    <option value="0 10px 25px rgba(0, 0, 0, 0.2)">Heavy</option>
                                </select>
                            </div>
                            
                            <div className={styles.field}>
                                <label htmlFor="custom_css" className={styles.label}>
                                    Custom CSS
                                </label>
                                <textarea
                                    id="custom_css"
                                    name="custom_css"
                                    value={formData.custom_css}
                                    onChange={handleChange}
                                    className={styles.textarea}
                                    rows={8}
                                    placeholder="/* Add your custom CSS here */
.dvojkavit-widget-container { /* Custom styles */ }"
                                ></textarea>
                                <p className={styles.label} style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                    Advanced: Add custom CSS to further customize the widget appearance.
                                </p>
                            </div>
                        </>
                    )}

                    <div className={styles.buttonGroup}>
                        <button
                            type="button"
                            className={styles.resetButton}
                            onClick={handleReset}
                        >
                            Reset to Default
                        </button>
                        <button
                            type="submit"
                            className={styles.saveButton}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WidgetConfigForm;