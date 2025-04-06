import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { toast } from 'react-hot-toast';
import { themes } from '../../themes';
import { widgetThemePresets } from './widgetThemes';
import { generateWidgetInstallationCode } from '../../lib/widget-utils';
import styles from './WidgetConfigForm.module.css';

const WidgetConfigForm = ({ initialConfig, onSubmit }) => {
  const { user = null } = useAuth() || {};
  const [activeTab, setActiveTab] = useState('general');
  const [selectedThemePreset, setSelectedThemePreset] = useState('default');
  const [previewMode, setPreviewMode] = useState('light');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const defaultTheme = themes.light;
  const defaultDarkTheme = themes.dark;

  const [config, setConfig] = useState(initialConfig || {
    chatTitle: 'Chat Support',
    welcomeMessage: 'Hello! How can we help you today?',
    primaryColor: '#4F46E5',
    messageColor: '#F3F4F6',
    position: 'right',
    autoOpen: false,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Fetch config from API
  useEffect(() => {
    const fetchConfig = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const response = await fetch('/api/widget/config');
        if (!response.ok) throw new Error('Failed to fetch widget configuration');
        
        const data = await response.json();
        if (data) {
          setConfig(prev => ({
            ...prev,
            ...data,
          }));
        }
    } catch (error) {
        console.error('Error fetching widget config:', error);
        toast.error('Failed to load widget configuration');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchApiKey = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/api-keys');
        if (!response.ok) throw new Error('Failed to fetch API key');
        
        const data = await response.json();
        if (data.apiKeys && data.apiKeys.length > 0) {
          setApiKey(data.apiKeys[0].key);
        }
      } catch (error) {
        console.error('Error fetching API key:', error);
      }
    };

    fetchConfig();
    fetchApiKey();
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig({
      ...config,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      await onSubmit(config);
      setSaveMessage('Widget configuration saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving widget configuration:', error);
      setSaveMessage('Error saving configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

    const handleReset = () => {
    setConfig({
      chatTitle: 'Chat Support',
      welcomeMessage: 'Hello! How can we help you today?',
      primaryColor: '#4F46E5',
      messageColor: '#F3F4F6',
      position: 'right',
      autoOpen: false,
        });
        setSelectedThemePreset('default');
    toast.success('Configuration reset to default!');
    };

    const handleThemePresetChange = (preset) => {
        setSelectedThemePreset(preset);
        const presetTheme = widgetThemePresets[preset];
        if (presetTheme) {
      setConfig(prev => ({
                ...prev,
        primaryColor: presetTheme.primary_color_light,
        messageColor: presetTheme.secondary_color_light,
        background_color_light: presetTheme.background_color_light,
        text_color_light: presetTheme.text_color_light,
        button_text_color_light: presetTheme.button_text_color_light,
        button_bg_color_light: presetTheme.button_bg_color_light,
        header_bg_color_light: presetTheme.header_bg_color_light,
        header_text_color_light: presetTheme.header_text_color_light,
        icon_background_color_light: presetTheme.icon_background_color_light,
        mode_toggle_background_light: presetTheme.mode_toggle_background_light,
        primary_color_dark: presetTheme.primary_color_dark,
        secondary_color_dark: presetTheme.secondary_color_dark,
        background_color_dark: presetTheme.background_color_dark,
        text_color_dark: presetTheme.text_color_dark,
        button_text_color_dark: presetTheme.button_text_color_dark,
        button_bg_color_dark: presetTheme.button_bg_color_dark,
        header_bg_color_dark: presetTheme.header_bg_color_dark,
        header_text_color_dark: presetTheme.header_text_color_dark,
        icon_background_color_dark: presetTheme.icon_background_color_dark,
        mode_toggle_background_dark: presetTheme.mode_toggle_background_dark,
        font_family: presetTheme.font_family,
        greeting_message: presetTheme.greeting_message,
        widget_button_text: presetTheme.widget_button_text,
        widget_help_text: presetTheme.widget_help_text,
        widget_padding: presetTheme.widget_padding,
        message_spacing: presetTheme.message_spacing,
        input_field_padding: presetTheme.input_field_padding,
        base_font_size: presetTheme.base_font_size,
        header_font_weight: presetTheme.header_font_weight,
        message_font_weight: presetTheme.message_font_weight,
        button_font_weight: presetTheme.button_font_weight,
        widget_border_radius: presetTheme.widget_border_radius,
        widget_border_style: presetTheme.widget_border_style,
        widget_border_width: presetTheme.widget_border_width,
        message_bubble_border_radius: presetTheme.message_bubble_border_radius,
        message_bubble_border_style: presetTheme.message_bubble_border_style,
        message_bubble_border_width: presetTheme.message_bubble_border_width,
        input_field_border_radius: presetTheme.input_field_border_radius,
        input_field_border_style: presetTheme.input_field_border_style,
        input_field_border_width: presetTheme.input_field_border_width,
        button_border_radius: presetTheme.button_border_radius,
        button_border_style: presetTheme.button_border_style,
        button_border_width: presetTheme.button_border_width,
        widget_shadow: presetTheme.widget_shadow,
        custom_css: presetTheme.custom_css || '',
            }));
        }
    };

  // Installation code
  const installCode = apiKey ? generateWidgetInstallationCode(apiKey, 'dvojkavit-widget-container') : '';

    return (
        <div className={styles.formContainer}>
                    <div className={styles.tabContainer}>
                        <div 
          className={`${styles.tab} ${activeTab === 'general' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('general')}
                        >
          General
                        </div>
                        <div 
          className={`${styles.tab} ${activeTab === 'appearance' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('appearance')}
                        >
          Appearance
                        </div>
                        <div 
          className={`${styles.tab} ${activeTab === 'advanced' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('advanced')}
                        >
                            Advanced
                        </div>
        <div 
          className={`${styles.tab} ${activeTab === 'installation' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('installation')}
        >
          Installation
                        </div>
                    </div>

      <form onSubmit={handleSubmit}>
        {/* General Settings */}
        <div className={`${styles.formSection} ${activeTab === 'general' ? styles.formSectionActive : ''}`}>
                            <h3 className={styles.sectionTitle}>General Settings</h3>
                            
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="chatTitle">Chat Widget Title</label>
                                <input
                                    type="text"
                id="chatTitle"
                name="chatTitle"
                className={styles.input}
                value={config.chatTitle}
                                    onChange={handleChange}
                required
                                />
                            </div>
                            
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="welcomeMessage">Welcome Message</label>
                                    <textarea
                id="welcomeMessage"
                name="welcomeMessage"
                className={styles.textarea}
                value={config.welcomeMessage}
                                        onChange={handleChange}
                required
                                    ></textarea>
                            </div>
                            
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="primaryColor">Primary Color</label>
              <div className={styles.colorPickerContainer}>
                                    <input
                  type="color"
                  id="primaryColor"
                  name="primaryColor"
                  value={config.primaryColor}
                                        onChange={handleChange}
                  className={styles.colorPicker}
                />
                                    <input
                                        type="text"
                  value={config.primaryColor}
                                        onChange={handleChange}
                  name="primaryColor"
                  className={styles.colorText}
                                    />
                                </div>
                            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="position">Widget Position</label>
              <select
                id="position"
                name="position"
                value={config.position}
                                        onChange={handleChange}
                className={styles.select}
              >
                <option value="right">Bottom Right</option>
                <option value="left">Bottom Left</option>
              </select>
                                </div>
                                
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="autoOpen">Auto-open widget after page load (5 seconds)</label>
                                    <input
                type="checkbox"
                id="autoOpen"
                name="autoOpen"
                checked={config.autoOpen}
                                        onChange={handleChange}
                className={styles.checkbox}
                                    />
                                </div>
                            </div>
                                </div>
                                
        {/* Appearance Settings */}
        <div className={`${styles.formSection} ${activeTab === 'appearance' ? styles.formSectionActive : ''}`}>
          <h3 className={styles.sectionTitle}>Theme Presets</h3>
          
          <div className={styles.previewToggle}>
            <span className={styles.toggleLabel}>Preview Mode:</span>
            <button
              type="button"
              className={`${styles.toggleButton} ${previewMode === 'light' ? styles.toggleButtonActive : ''}`}
              onClick={() => setPreviewMode('light')}
            >
              Light
            </button>
            <button
              type="button"
              className={`${styles.toggleButton} ${previewMode === 'dark' ? styles.toggleButtonActive : ''}`}
              onClick={() => setPreviewMode('dark')}
            >
              Dark
            </button>
                                </div>
                                
          <div className={styles.themePresets}>
            {Object.keys(widgetThemePresets).map((preset) => (
              <div
                key={preset}
                className={`${styles.themePreset} ${selectedThemePreset === preset ? styles.themePresetActive : ''}`}
                onClick={() => handleThemePresetChange(preset)}
              >
                <div className={styles.themePreviewSwatch}>
                  <div 
                    className={styles.previewSection} 
                    style={{ 
                      backgroundColor: previewMode === 'light' 
                        ? widgetThemePresets[preset].primary_color_light 
                        : widgetThemePresets[preset].primary_color_dark 
                    }}
                  ></div>
                  <div 
                    className={styles.previewSection} 
                    style={{ 
                      backgroundColor: previewMode === 'light' 
                        ? widgetThemePresets[preset].background_color_light 
                        : widgetThemePresets[preset].background_color_dark 
                    }}
                  >
                    <div 
                      className={styles.previewHeader} 
                      style={{ 
                        backgroundColor: previewMode === 'light' 
                          ? widgetThemePresets[preset].header_bg_color_light 
                          : widgetThemePresets[preset].header_bg_color_dark 
                      }}
                    ></div>
                    <div className={styles.previewBody}>
                      <div 
                        className={styles.previewMessage} 
                        style={{ 
                          backgroundColor: previewMode === 'light' 
                            ? widgetThemePresets[preset].secondary_color_light 
                            : widgetThemePresets[preset].secondary_color_dark 
                        }}
                      ></div>
                      <div 
                        className={`${styles.previewMessage} ${styles.previewMessageUser}`} 
                        style={{ 
                          backgroundColor: previewMode === 'light' 
                            ? widgetThemePresets[preset].primary_color_light 
                            : widgetThemePresets[preset].primary_color_dark 
                        }}
                      ></div>
                      <div 
                        className={styles.previewInput} 
                        style={{ 
                          backgroundColor: previewMode === 'light' ? '#fff' : '#333',
                          border: previewMode === 'light' ? '1px solid #ddd' : '1px solid #555'
                        }}
                      ></div>
                                </div>
                                </div>
                            </div>
                <span className={styles.themePresetTitle}>{preset.charAt(0).toUpperCase() + preset.slice(1)}</span>
              </div>
            ))}
          </div>
          
          <h3 className={styles.sectionTitle}>Colors</h3>
          
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="background_color_light">Background (Light)</label>
                                    <input
                                        type="color"
                id="background_color_light"
                name="background_color_light"
                className={styles.colorInput}
                value={config.background_color_light}
                                        onChange={handleChange}
                                    />
                                </div>
                                
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="background_color_dark">Background (Dark)</label>
                                    <input
                                        type="color"
                id="background_color_dark"
                name="background_color_dark"
                className={styles.colorInput}
                value={config.background_color_dark}
                                        onChange={handleChange}
                                    />
                                </div>
                                
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="text_color_light">Text Color (Light)</label>
                                    <input
                                        type="color"
                id="text_color_light"
                name="text_color_light"
                className={styles.colorInput}
                value={config.text_color_light}
                                        onChange={handleChange}
                                    />
                                </div>
                                
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="text_color_dark">Text Color (Dark)</label>
                                    <input
                                        type="color"
                                        id="text_color_dark"
                                        name="text_color_dark"
                className={styles.colorInput}
                value={config.text_color_dark}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
        </div>

        {/* Advanced Settings */}
        <div className={`${styles.formSection} ${activeTab === 'advanced' ? styles.formSectionActive : ''}`}>
          <h3 className={styles.sectionTitle}>Advanced Settings</h3>
          
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="widget_border_radius">Widget Border Radius</label>
                                    <input
                type="text"
                id="widget_border_radius"
                name="widget_border_radius"
                className={styles.input}
                value={config.widget_border_radius}
                                        onChange={handleChange}
                                    />
                                </div>
                                
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="widget_shadow">Widget Shadow</label>
                                    <input
                type="text"
                id="widget_shadow"
                name="widget_shadow"
                className={styles.input}
                value={config.widget_shadow}
                                        onChange={handleChange}
                                    />
                                </div>
                                
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="message_bubble_border_radius">Message Bubble Radius</label>
                                    <input
                type="text"
                id="message_bubble_border_radius"
                name="message_bubble_border_radius"
                className={styles.input}
                value={config.message_bubble_border_radius}
                                        onChange={handleChange}
                                    />
                                </div>
                                
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="base_font_size">Base Font Size</label>
                                    <input
                type="text"
                id="base_font_size"
                name="base_font_size"
                className={styles.input}
                value={config.base_font_size}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="custom_css">Custom CSS</label>
            <textarea
              id="custom_css"
              name="custom_css"
              className={styles.textarea}
              value={config.custom_css}
                                        onChange={handleChange}
              placeholder="/* Add your custom CSS here */"
            />
                                </div>
                            </div>
                            
        {/* Installation Code */}
        <div className={`${styles.formSection} ${activeTab === 'installation' ? styles.formSectionActive : ''}`}>
          <h3 className={styles.sectionTitle}>Installation Code</h3>
          
          <p>Copy and paste this code into your website to install the Dvojkavit chat widget:</p>
          
          {apiKey ? (
            <div className={styles.formGroup}>
              <textarea
                className={styles.textarea}
                value={installCode}
                readOnly
                onClick={(e) => e.target.select()}
                style={{ height: '200px' }}
              />
                                </div>
          ) : (
            <p>You need to generate an API key first. Go to API Keys section to create one.</p>
          )}
                                </div>
                                
        <div className={styles.actions}>
                        <button
                            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
                            onClick={handleReset}
                        >
                            Reset to Default
                        </button>
                        <button
                            type="submit"
            className={styles.button}
            disabled={isSaving}
                        >
            {isSaving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </form>
        </div>
    );
};

export default WidgetConfigForm;