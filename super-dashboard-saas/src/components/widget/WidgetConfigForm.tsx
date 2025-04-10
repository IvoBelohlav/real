'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { fetchApi, api } from '@/lib/api'; // Ensure api is imported correctly
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { themes } from '@/lib/themes';
import { widgetThemePresets } from '@/lib/widgetThemePresets';
import { WidgetConfig } from '@/types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
// We'll need to create or adapt styles. Using placeholder class names for now.
// import styles from './WidgetConfigForm.module.css'; // TODO: Create this CSS module

// Helper function to create CSS class names conditionally (similar to clsx)
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

// Define default values based on the WidgetConfig type and themes
const getDefaultFormData = (): WidgetConfig => {
  const defaultTheme = themes.light;
  const defaultDarkTheme = themes.dark;
  return {
    isEnabled: true, // Default to enabled
    logo_light_mode: null,
    logo_dark_mode: null,
    main_title: 'Chat Support',
    primary_color_light: defaultTheme.primaryColor,
    secondary_color_light: defaultTheme.secondaryColor,
    background_color_light: defaultTheme.backgroundColor,
    text_color_light: defaultTheme.textColor,
    button_text_color_light: defaultTheme.buttonText,
    button_bg_color_light: defaultTheme.buttonBg,
    header_bg_color: defaultTheme.headerBg, // Use non-suffixed for light default
    header_text_color: defaultTheme.headerText, // Use non-suffixed for light default
    icon_background_color_light: defaultTheme.secondaryColor,
    mode_toggle_background_light: defaultTheme.primaryColor,

    primary_color_dark: defaultDarkTheme.primaryColor,
    secondary_color_dark: defaultDarkTheme.secondaryColor,
    background_color_dark: defaultDarkTheme.backgroundColor,
    text_color_dark: defaultDarkTheme.textColor,
    button_text_color_dark: defaultDarkTheme.buttonText,
    button_bg_color_dark: defaultDarkTheme.buttonBg,
    header_bg_color_dark: defaultDarkTheme.headerBg,
    header_text_color_dark: defaultDarkTheme.headerText,
    icon_background_color_dark: defaultDarkTheme.primaryColor,
    mode_toggle_background_dark: defaultDarkTheme.secondaryColor,

    font_family: 'Inter, sans-serif',
    greeting_message: '👋 Hey there! How can I assist you today?',
    widget_button_text: 'We are here!',
    widget_help_text: 'Need help? Chat now',

    // New fields defaults
    collapsed_button_style: 'wide',
    second_button_enabled: false,
    second_button_text: '',
    second_button_link: '',

    widget_padding: '1rem',
    message_spacing: '0.75rem',
    input_field_padding: '0.625rem',
    base_font_size: '1rem',
    header_font_weight: 'bold',
    message_font_weight: 'normal',
    button_font_weight: 'bold',

    widget_border_radius: '1.5rem',
    widget_border_style: 'none',
    widget_border_width: '0px',
    message_bubble_border_radius: '1rem',
    message_bubble_border_style: 'none',
    message_bubble_border_width: '0px',
    input_field_border_radius: '0.5rem',
    input_field_border_style: 'solid',
    input_field_border_width: '1px',
    button_border_radius: '0.5rem',
    button_border_style: 'none',
    button_border_width: '0px',

    widget_shadow: '0 5px 15px rgba(14, 165, 233, 0.15)',
    custom_css: '',
  };
};

const WidgetConfigForm = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [selectedThemePreset, setSelectedThemePreset] = useState('default'); // 'default' or key from presets
  const [formData, setFormData] = useState<WidgetConfig>(getDefaultFormData());
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth(); // Get auth state

  const queryClient = useQueryClient();

  // Fetch existing config - Enable only when authenticated and auth check is done
  // Note: The check at the component's start makes the 'enabled' flag slightly redundant,
  // but it's good practice to keep it for clarity and potential direct use of the hook elsewhere.
  const { data: config, isLoading: isFetching, isError: isFetchError, error: fetchError } = useQuery<WidgetConfig, Error>({
    queryKey: ['widgetConfig'],
    queryFn: async () => {
      const response = await fetchApi('/api/widget-config'); // Use your fetchApi function
      if (!response) {
        // If API returns null/empty, return default values merged with potential partials
        return { ...getDefaultFormData(), ...response };
      }
      // Merge fetched data with defaults to ensure all fields are present
      return { ...getDefaultFormData(), ...response };
    },
    // Keep data fresh but don't refetch too aggressively
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: isAuthenticated && !isAuthLoading, // Only run if authenticated and auth check complete
  });

  // Update form state when fetched config changes
  useEffect(() => {
    if (config) {
      setFormData(config);
      // Try to find if the current config matches a preset
      const matchingPreset = Object.keys(widgetThemePresets).find(key => {
        const preset = widgetThemePresets[key];
        // Simple check based on a few key colors - adjust as needed
        return preset.primary_color_light === config.primary_color_light &&
               preset.background_color_light === config.background_color_light &&
               preset.primary_color_dark === config.primary_color_dark;
      });
      setSelectedThemePreset(matchingPreset || 'custom'); // Mark as custom if no exact match
    }
  }, [config]);

  // Mutation for updating config
  // TData = { data: WidgetConfig } (type returned by api.put)
  // TError = Error
  // TVariables = WidgetConfig (type passed to mutate, matching backend expectation)
  const updateConfigMutation = useMutation<{ data: WidgetConfig }, Error, WidgetConfig>({
    mutationFn: (updatedConfig: WidgetConfig) => api.put<WidgetConfig>('/api/widget-config', updatedConfig), // api.put handles stringify
    onSuccess: (response) => { // response is of type { data: WidgetConfig }
      // Access the actual config data via response.data
      queryClient.setQueryData(['widgetConfig'], response.data); // Update cache with the returned config
      queryClient.invalidateQueries({ queryKey: ['widgetConfig'] }); // Refetch to confirm
      toast.success('Widget configuration updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update widget configuration: ${error.message}`);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: processedValue }));
    setSelectedThemePreset('custom'); // Any manual change makes it custom
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof WidgetConfig) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'image/webp') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          [fieldName]: reader.result as string, // Store as base64 string
        }));
        setSelectedThemePreset('custom'); // File change makes it custom
      };
      reader.readAsDataURL(file);
    } else if (file) {
      toast.error('Please select a .webp image file.');
      // Clear the input if the file type is wrong
      e.target.value = '';
    } else {
       // Handle case where file selection is cancelled
       setFormData((prev) => ({
         ...prev,
         [fieldName]: null, // Or keep previous value if preferred
       }));
       setSelectedThemePreset('custom');
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Create a clean copy to modify before sending
    const configToSend = { ...formData };

    // 1. Handle second_button_link: Set to null if disabled or empty/whitespace when enabled
    if (!configToSend.second_button_enabled || (configToSend.second_button_enabled && (!configToSend.second_button_link || String(configToSend.second_button_link).trim() === ''))) {
      configToSend.second_button_link = null;
    }
    // Otherwise, keep the potentially valid URL string for Pydantic HttpUrl validation

    // 2. Backend expects a WidgetConfig object, but derives user_id/business_id from token.
    //    Do not delete fields from the frontend payload.

    console.log("Sending config payload:", configToSend); // Log the final payload

    updateConfigMutation.mutate(configToSend); // Mutate with the object containing the null link if needed
  };

  const handleReset = () => {
    const defaults = getDefaultFormData();
    setFormData(defaults);
    setSelectedThemePreset('default'); // Or match the default preset if one exists
    toast.info('Configuration reset to default!');
  };

  const handleThemePresetChange = (presetKey: string) => {
    setSelectedThemePreset(presetKey);
    const presetTheme = widgetThemePresets[presetKey];
    if (presetTheme) {
      // Merge preset onto default base, then onto current state to preserve non-preset fields
      const baseDefaults = getDefaultFormData();
      const mergedTheme = { ...baseDefaults, ...presetTheme };

      setFormData((prev) => ({
        ...prev, // Keep existing fields not in the preset
        ...mergedTheme, // Apply all fields from the merged preset
      }));
      toast.info(`Applied '${presetKey}' theme preset.`);
    } else if (presetKey === 'default') {
        handleReset(); // Reset if 'default' is chosen
    }
  };

  // --- NEW ---
  // Explicitly handle loading and unauthenticated states *before* rendering the form/query logic
  if (isAuthLoading) {
    // Still checking authentication
    return <div className="flex justify-center items-center p-8"><LoadingSpinner /></div>;
  }

  if (!isAuthenticated) {
    // Not authenticated, AuthGuard should be handling redirect. Render nothing here.
    return null;
  }
  // --- END NEW ---

  // If we reach here, user is authenticated, proceed with query-related loading/error/form rendering

  // Loading and Error States for the query itself (only relevant if authenticated)
  if (isFetching) {
    // Authenticated, but fetching config data
    return <div className="flex justify-center items-center p-8"><LoadingSpinner /></div>;
  }

  if (isFetchError) {
    // Authenticated, but failed to fetch config
    return <div className="text-red-600 bg-red-100 p-4 rounded">Error loading configuration: {fetchError?.message || 'Unknown error'}</div>;
  }

  // If authenticated, not loading, and no fetch error, render the form:
  // This component shouldn't render the form if not authenticated.
  // We might add an explicit check here, but often the parent layout/guard handles this.
  // if (!isAuthenticated && !isAuthLoading) {
  //   return <div>Not authenticated.</div>; // Or null, or redirect handled by AuthGuard
  // }

  // Helper Render Functions (using Tailwind classes)
  const renderInputField = (id: keyof WidgetConfig, label: string, type: string = 'text', options?: { placeholder?: string, className?: string, step?: number, min?: number }) => (
    <div className={options?.className ?? 'sm:col-span-3'}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700"> {/* Removed mb-1 */}
        {label}
      </label>
      <input
        type={type}
        name={id}
        id={id}
        value={(formData as any)[id] ?? ''}
        onChange={handleChange}
        placeholder={options?.placeholder}
        step={options?.step}
        min={options?.min}
        className={`mt-1 shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md ${type === 'color' ? 'h-10 p-1 cursor-pointer border' : 'px-3 py-2 border'}`} 
      />
    </div>
  );

  const renderSelectField = (id: keyof WidgetConfig, label: string, options: { value: string; label: string }[], divClassName?: string) => (
    <div className={divClassName ?? 'sm:col-span-3'}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700"> {/* Removed mb-1 */}
        {label}
      </label>
      <select
        id={id}
        name={id}
        value={(formData as any)[id] ?? ''}
        onChange={handleChange}
        className="mt-1 shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border" 
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  const renderTextareaField = (id: keyof WidgetConfig, label: string, rows: number = 4, options?: { placeholder?: string, className?: string }) => (
    <div className={options?.className ?? 'sm:col-span-6'}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700"> {/* Removed mb-1 */}
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        rows={rows}
        value={(formData as any)[id] ?? ''}
        onChange={handleChange}
        placeholder={options?.placeholder}
        className="mt-1 shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md px-3 py-2" 
      />
    </div>
  );

  const renderFileUpload = (id: keyof WidgetConfig, label: string, currentPreview: string | null | undefined) => (
     <div className="sm:col-span-3">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700"> {/* Removed mb-1 */}
            {label} (.webp only)
        </label>
        <div className="mt-1 flex items-center space-x-4">
            {currentPreview ? (
                <img src={currentPreview} alt="Logo Preview" className="h-10 w-auto border border-gray-200 rounded" /> /* Adjusted border */
            ) : (
                <div className="h-10 w-16 bg-gray-50 border border-gray-200 rounded flex items-center justify-center text-xs text-gray-400">Preview</div> /* Simplified placeholder */
            )}
            <input
                type="file"
                id={id}
                name={id}
                accept=".webp"
                onChange={(e) => handleFileChange(e, id)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-300 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50" /* Simplified file input button */
            />
        </div>
     </div>
  );

  const fontOptions = [
    { value: 'Inter, sans-serif', label: 'Inter' },
    { value: "'Exo 2', sans-serif", label: 'Exo 2' },
    { value: "'Roboto', sans-serif", label: 'Roboto' },
    { value: "'Open Sans', sans-serif", label: 'Open Sans' },
    { value: "'Montserrat', sans-serif", label: 'Montserrat' },
    { value: "'Segoe UI', sans-serif", label: 'Segoe UI' },
    { value: "'Poppins', sans-serif", label: 'Poppins' },
    { value: "'Lato', sans-serif", label: 'Lato' },
    { value: "'Comic Neue', cursive", label: 'Comic Neue' },
    { value: "'Raleway', sans-serif", label: 'Raleway' },
    { value: "'IBM Plex Sans', sans-serif", label: 'IBM Plex Sans' },
    { value: "'Nunito', sans-serif", label: 'Nunito' },
    { value: "'Roboto Condensed', sans-serif", label: 'Roboto Condensed' },
  ];

  const sizeOptions = [
    { value: '0.875rem', label: 'Small (0.875rem)' },
    { value: '1rem', label: 'Medium (1rem)' },
    { value: '1.125rem', label: 'Large (1.125rem)' },
  ];

  const weightOptions = [
    { value: 'lighter', label: 'Lighter' },
    { value: 'normal', label: 'Normal (400)' },
    { value: '500', label: 'Medium (500)' },
    { value: '600', label: 'Semi-Bold (600)' },
    { value: 'bold', label: 'Bold (700)' },
    { value: 'bolder', label: 'Bolder' },
  ];

  const borderStyleOptions = [
      { value: 'none', label: 'None' },
      { value: 'solid', label: 'Solid' },
      { value: 'dashed', label: 'Dashed' },
      { value: 'dotted', label: 'Dotted' },
  ];

  const radiusOptions = [
      { value: '0px', label: 'None (0px)' },
      { value: '0.25rem', label: 'Small (0.25rem)' },
      { value: '0.5rem', label: 'Medium (0.5rem)' },
      { value: '0.75rem', label: 'Large (0.75rem)' },
      { value: '1rem', label: 'X-Large (1rem)' },
      { value: '1.5rem', label: 'XX-Large (1.5rem)' },
      { value: '9999px', label: 'Full (Pill)' },
  ];

   const borderWidthOptions = [
      { value: '0px', label: 'None (0px)' },
      { value: '1px', label: 'Thin (1px)' },
      { value: '2px', label: 'Medium (2px)' },
      { value: '3px', label: 'Thick (3px)' },
  ];

   const shadowOptions = [
      { value: 'none', label: 'None' },
      { value: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', label: 'Small' },
      { value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', label: 'Medium' },
      { value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', label: 'Large' },
    { value: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', label: 'X-Large' },
   ];

   const collapsedButtonStyleOptions = [
     { value: 'wide', label: 'Wide (Text + Icon)' },
     { value: 'circular', label: 'Circular (Icon Only)' },
   ];

  return (
    <div className="bg-white"> {/* Removed shadow and rounding */}
      <div className="p-6 sm:p-8"> {/* Increased padding */}
        {/* Theme Preset Selector */}
        <div className="mb-6 pb-4 border-b border-gray-200">
          <h3 className="text-base font-semibold leading-6 text-gray-900 mb-2">Theme Preset</h3>
          <div className="flex flex-wrap gap-2">
            <button
                key="default"
                type="button"
                className={cn(
                    'px-3 py-1 text-sm rounded-md border',
                    selectedThemePreset === 'default'
                        ? 'bg-indigo-600 text-white border-indigo-600' // Active state
                        : 'bg-white text-gray-700 border-gray-300' // Default state (removed hover)
                )}
                onClick={() => handleThemePresetChange('default')}
            >
                Default
            </button>
            {Object.keys(widgetThemePresets).map((themeKey) => (
              <button
                key={themeKey}
                type="button"
                className={cn(
                  'px-3 py-1 text-sm rounded-md border capitalize',
                  selectedThemePreset === themeKey
                    ? 'bg-indigo-600 text-white border-indigo-600' // Active state
                    : 'bg-white text-gray-700 border-gray-300' // Default state (removed hover)
                )}
                onClick={() => handleThemePresetChange(themeKey)}
              >
                {themeKey.replace(/([A-Z])/g, ' $1').trim()} {/* Add space before caps */}
              </button>
            ))}
             <button
                key="custom"
                type="button"
                disabled // Cannot select custom directly, it's set by editing
                className={cn(
                    'px-3 py-1 text-sm rounded-md border capitalize',
                    selectedThemePreset === 'custom'
                        ? 'bg-indigo-600 text-white border-indigo-600' // Active state
                        : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed' // Disabled state
                )}
            >
                Custom
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8"> {/* Increased margin-bottom */}
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {['general', 'lightColors', 'darkColors', 'typography', 'spacing', 'borders', 'advanced'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  tab === activeTab
                    ? 'border-indigo-600 text-indigo-600 font-semibold' // Adjusted active state
                    : 'border-transparent text-gray-500 hover:text-gray-700', // Default state
                  'whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium capitalize' // Adjusted padding
                )}
                aria-current={tab === activeTab ? 'page' : undefined}
              >
                {tab.replace('Colors', ' Colors').replace(/([A-Z])/g, ' $1').trim()} {/* Format tab name */}
              </button>
            ))}
          </nav>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit}>
          {/* General Settings Tab */}
          {activeTab === 'general' && ( // Opening parenthesis for general tab content
            <div className="space-y-6"> {/* Adjusted vertical spacing */}
              <h3 className="text-base font-semibold leading-6 text-gray-900">General Settings</h3> {/* Adjusted heading style */}
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                {renderInputField('main_title', 'Main Title', 'text', { className: 'sm:col-span-6 max-w-xl' })}
                {renderFileUpload('logo_light_mode', 'Logo (Light Mode)', formData.logo_light_mode)}
                {renderFileUpload('logo_dark_mode', 'Logo (Dark Mode)', formData.logo_dark_mode)}
                {renderTextareaField('greeting_message', 'Greeting Message', 3, { className: 'sm:col-span-6 max-w-xl' })}
                {renderInputField('widget_button_text', 'Widget Button Text', 'text', { className: 'sm:col-span-3' })}
                {renderInputField('widget_help_text', 'Widget Help Text', 'text', { className: 'sm:col-span-3' })}

                {/* --- New Fields --- */}
                {renderSelectField('collapsed_button_style', 'Collapsed Button Style', collapsedButtonStyleOptions, 'sm:col-span-3')}

                <div className="sm:col-span-6 border-t border-gray-200 pt-6 mt-4"> {/* Separator */}
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Second Action Button (Expanded Chat)</h4>
                  <div className="flex items-center mb-4">
                      <input
                          id="second_button_enabled"
                          name="second_button_enabled"
                          type="checkbox"
                          checked={formData.second_button_enabled ?? false}
                          onChange={handleChange}
                          className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      />
                      <label htmlFor="second_button_enabled" className="ml-2 block text-sm font-medium text-gray-700">
                          Enable Second Action Button
                      </label>
                  </div>
                  {formData.second_button_enabled && (
                      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 pl-6 border-l-2 border-indigo-100"> {/* Indent conditional fields */}
                          {renderInputField('second_button_text', 'Second Button Text', 'text', { className: 'sm:col-span-3' })}
                          {renderInputField('second_button_link', 'Second Button Link (URL)', 'url', { placeholder: 'https://example.com', className: 'sm:col-span-3' })}
                      </div>
                  )}
                </div>

                <div className="sm:col-span-6 border-t border-gray-200 pt-6 mt-4"> {/* Separator */}
                   <h4 className="text-sm font-medium text-gray-600 mb-2">Widget Status</h4>
                   {/* isEnabled Toggle */}
                   <div className="flex items-center"> {/* Removed sm:col-span-6 and pt-2 */}
                      <input
                        id="isEnabled"
                        name="isEnabled"
                        type="checkbox"
                        checked={formData.isEnabled ?? true}
                        onChange={handleChange}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                    <label htmlFor="isEnabled" className="ml-2 block text-sm font-medium text-gray-700"> {/* Adjusted margin */}
                        Enable Chat Widget
                    </label>
                 </div> {/* Closing div for Widget Status flex container */}
              </div> {/* Closing div for Widget Status section */}
            </div> {/* Closing div for grid */}
          </div> // Closing div for general tab's outer div
          )} {/* Correct closing for general tab conditional rendering */}

          {/* Light Mode Colors Tab */}
          {activeTab === 'lightColors' && ( // Opening parenthesis for lightColors tab content
            <div className="space-y-6"> {/* Adjusted vertical spacing */}
              <h3 className="text-base font-semibold leading-6 text-gray-900">Light Mode Colors</h3> {/* Adjusted heading style */}
              <div className="grid grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-4 lg:grid-cols-6">
                {renderInputField('primary_color_light', 'Primary', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('secondary_color_light', 'Secondary', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('background_color_light', 'Background', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('text_color_light', 'Text', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('header_bg_color', 'Header BG', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('header_text_color', 'Header Text', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('button_bg_color_light', 'Button BG', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('button_text_color_light', 'Button Text', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('icon_background_color_light', 'Icon BG', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('mode_toggle_background_light', 'Mode Toggle BG', 'color', { className: 'sm:col-span-2' })}
              </div> {/* Closing div for grid */}
            </div> // Closing div for lightColors tab's outer div
          )} {/* Correct closing for lightColors tab conditional rendering */}

          {/* Dark Mode Colors Tab */}
          {activeTab === 'darkColors' && ( // Opening parenthesis for darkColors tab content
             <div className="space-y-6"> {/* Adjusted vertical spacing */}
              <h3 className="text-base font-semibold leading-6 text-gray-900">Dark Mode Colors</h3> {/* Adjusted heading style */}
              <div className="grid grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-4 lg:grid-cols-6">
                {renderInputField('primary_color_dark', 'Primary', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('secondary_color_dark', 'Secondary', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('background_color_dark', 'Background', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('text_color_dark', 'Text', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('header_bg_color_dark', 'Header BG', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('header_text_color_dark', 'Header Text', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('button_bg_color_dark', 'Button BG', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('button_text_color_dark', 'Button Text', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('icon_background_color_dark', 'Icon BG', 'color', { className: 'sm:col-span-2' })}
                {renderInputField('mode_toggle_background_dark', 'Mode Toggle BG', 'color', { className: 'sm:col-span-2' })}
              </div> {/* Closing div for grid */}
            </div> // Closing div for darkColors tab's outer div
          )} {/* Correct closing for darkColors tab conditional rendering */}

          {/* Typography Tab */}
          {activeTab === 'typography' && ( // Opening parenthesis for typography tab content
            <div className="space-y-6"> {/* Adjusted vertical spacing */}
              <h3 className="text-base font-semibold leading-6 text-gray-900">Typography</h3> {/* Adjusted heading style */}
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                {renderSelectField('font_family', 'Font Family', fontOptions, 'sm:col-span-6')}
                {renderSelectField('base_font_size', 'Base Font Size', sizeOptions, 'sm:col-span-2')}
                {renderSelectField('header_font_weight', 'Header Weight', weightOptions, 'sm:col-span-2')}
                {renderSelectField('message_font_weight', 'Message Weight', weightOptions, 'sm:col-span-2')}
                {renderSelectField('button_font_weight', 'Button Weight', weightOptions, 'sm:col-span-2')}
              </div> {/* Closing div for grid */}
            </div> // Closing div for typography tab's outer div
          )} {/* Correct closing for typography tab conditional rendering */}

          {/* Spacing Tab */}
          {activeTab === 'spacing' && ( // Opening parenthesis for spacing tab content
            <div className="space-y-6"> {/* Adjusted vertical spacing */}
              <h3 className="text-base font-semibold leading-6 text-gray-900">Spacing</h3> {/* Adjusted heading style */}
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                {renderInputField('widget_padding', 'Widget Padding', 'text', { placeholder: 'e.g., 1rem', className: 'sm:col-span-2' })}
                {renderInputField('message_spacing', 'Message Spacing', 'text', { placeholder: 'e.g., 0.5rem', className: 'sm:col-span-2' })}
                {renderInputField('input_field_padding', 'Input Field Padding', 'text', { placeholder: 'e.g., 0.5rem', className: 'sm:col-span-2' })}
              </div> {/* Closing div for grid */}
            </div> // Closing div for spacing tab's outer div
          )} {/* Correct closing for spacing tab conditional rendering */}

           {/* Borders Tab */}
          {activeTab === 'borders' && ( // Opening parenthesis for borders tab content
            <div className="space-y-6"> {/* Adjusted vertical spacing */}
              <h3 className="text-base font-semibold leading-6 text-gray-900">Borders</h3> {/* Adjusted heading style */}
              {/* Simplified Grouping for Borders */}
              <div className="space-y-6">
                {/* Widget Borders Group */}
                <div> {/* Removed border/padding */}
                  <h4 className="text-sm font-medium text-gray-600 mb-4">Widget</h4> {/* Added margin */}
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    {renderSelectField('widget_border_radius', 'Radius', radiusOptions, 'sm:col-span-2')}
                    {renderSelectField('widget_border_style', 'Style', borderStyleOptions, 'sm:col-span-2')}
                    {renderSelectField('widget_border_width', 'Width', borderWidthOptions, 'sm:col-span-2')}
                  </div>
                </div>

                {/* Message Bubble Borders Group */}
                <div> {/* Removed border/padding */}
                  <h4 className="text-sm font-medium text-gray-600 mb-4">Message Bubbles</h4> {/* Added margin */}
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    {renderSelectField('message_bubble_border_radius', 'Radius', radiusOptions, 'sm:col-span-2')}
                    {renderSelectField('message_bubble_border_style', 'Style', borderStyleOptions, 'sm:col-span-2')}
                    {renderSelectField('message_bubble_border_width', 'Width', borderWidthOptions, 'sm:col-span-2')}
                  </div>
                </div>

                {/* Input Field Borders Group */}
                <div> {/* Removed border/padding */}
                  <h4 className="text-sm font-medium text-gray-600 mb-4">Input Field</h4> {/* Added margin */}
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    {renderSelectField('input_field_border_radius', 'Radius', radiusOptions, 'sm:col-span-2')}
                    {renderSelectField('input_field_border_style', 'Style', borderStyleOptions, 'sm:col-span-2')}
                    {renderSelectField('input_field_border_width', 'Width', borderWidthOptions, 'sm:col-span-2')}
                  </div>
                </div>

                {/* Button Borders Group */}
                <div> {/* Removed border/padding */}
                  <h4 className="text-sm font-medium text-gray-600 mb-4">Buttons</h4> {/* Added margin */}
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    {renderSelectField('button_border_radius', 'Radius', radiusOptions, 'sm:col-span-2')}
                    {renderSelectField('button_border_style', 'Style', borderStyleOptions, 'sm:col-span-2')}
                    {renderSelectField('button_border_width', 'Width', borderWidthOptions, 'sm:col-span-2')}
                  </div> {/* Closing div for grid */}
                </div> {/* Closing div for Button Borders Group */}
              </div> {/* Closing div for Simplified Grouping */}
            </div> // Closing div for borders tab's outer div
          )} {/* Correct closing for borders tab conditional rendering */}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && ( // Opening parenthesis for advanced tab content
            <div className="space-y-6"> {/* Adjusted vertical spacing */}
              <h3 className="text-base font-semibold leading-6 text-gray-900">Advanced</h3> {/* Adjusted heading style */}
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                {renderSelectField('widget_shadow', 'Widget Shadow', shadowOptions, 'sm:col-span-6')}
                {renderTextareaField('custom_css', 'Custom CSS', 8, {
                  placeholder: '/* Add custom CSS rules here */\n.widget-container {\n  /* Example */\n}',
                  className: 'sm:col-span-6 max-w-xl'
                })}
              </div> {/* Closing div for grid */}
            </div> // Closing div for advanced tab's outer div
          )} {/* Correct closing for advanced tab conditional rendering */}

          {/* Action Buttons */}
          <div className="pt-6 mt-6 border-t border-gray-200 flex justify-end space-x-3"> {/* Adjusted padding/margin */}
            <button
              type="button"
              onClick={handleReset}
              className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50" /* Removed shadow */
            >
              Reset to Default
            </button>
            <button
              type="submit"
              disabled={updateConfigMutation.isPending}
              className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50" /* Removed shadow */
            >
              {updateConfigMutation.isPending ? <LoadingSpinner /> : 'Save Configuration'}
            </button>
          </div>
        </form> 
      </div> 
    </div> // Closing div for bg-white
  ); // Closing parenthesis for return statement
}; // Closing brace for component function

export default WidgetConfigForm;
