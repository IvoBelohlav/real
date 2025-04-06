'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WidgetConfig } from '@/types';
import { fetchApi } from '@/lib/api';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

// Basic visual representation of the widget
const WidgetPreview: React.FC = () => {
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light'); // To toggle preview

  // Fetch config using the same query key as the form
  const { data: config, isLoading, isError, error } = useQuery<WidgetConfig, Error>({
    queryKey: ['widgetConfig'], // Use the same key to get cached/updated data from the form
    queryFn: async () => {
        // Fetching here ensures preview updates even if form isn't mounted/visible
        // Or rely purely on cache if form MUST be mounted first (remove queryFn)
        const response = await fetchApi('/api/widget-config');
        // Provide defaults if fetch returns null or partial data
        const defaults: Partial<WidgetConfig> = {
            primary_color_light: '#3b82f6', // Default blue
            widget_button_text: 'Chat',
            greeting_message: 'Hello!',
            logo_light_mode: null,
            // Add other necessary defaults from getDefaultFormData in the form component if needed
            main_title: 'Chat Support',
            primary_color_dark: '#60a5fa',
            background_color_light: '#eff6ff',
            background_color_dark: '#1f2937',
            text_color_light: '#1f2937',
            text_color_dark: '#f9fafb',
            button_bg_color_light: '#3b82f6',
            button_bg_color_dark: '#60a5fa',
            button_text_color_light: '#ffffff',
            button_text_color_dark: '#ffffff',
            font_family: 'Inter, sans-serif',
            widget_help_text: 'Need help?',
            widget_border_radius: '1.5rem',
            button_border_radius: '0.5rem',
            widget_shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        };
        return { ...defaults, ...response };
    },
    staleTime: 1000, // Reduce stale time so preview updates faster after form save
    refetchOnWindowFocus: true, // Refetch when window is focused
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-64 bg-gray-100 rounded-md border"><LoadingSpinner /></div>;
  }

  if (isError) {
    return <div className="h-64 bg-red-100 text-red-700 p-4 rounded-md border border-red-300">Error loading preview: {error?.message}</div>;
  }

  // Use fetched config or empty object as fallback
  const currentConfig = config || {};

  // Determine colors based on preview mode
  const primaryColor = previewMode === 'dark' ? currentConfig.primary_color_dark : currentConfig.primary_color_light;
  const bgColor = previewMode === 'dark' ? currentConfig.background_color_dark : currentConfig.background_color_light;
  const textColor = previewMode === 'dark' ? currentConfig.text_color_dark : currentConfig.text_color_light;
  const logo = previewMode === 'dark' ? currentConfig.logo_dark_mode : currentConfig.logo_light_mode;
  const buttonTextColor = previewMode === 'dark' ? currentConfig.button_text_color_dark : currentConfig.button_text_color_light;
  const buttonBgColor = previewMode === 'dark' ? currentConfig.button_bg_color_dark : currentConfig.button_bg_color_light;
  const headerBg = previewMode === 'dark' ? currentConfig.header_bg_color_dark : currentConfig.header_bg_color;
  const headerText = previewMode === 'dark' ? currentConfig.header_text_color_dark : currentConfig.header_text_color;

  // Basic position (can be enhanced later)
  const positionClasses = 'bottom-6 right-6';

  return (
    <div className="space-y-4">
        {/* Mode Toggle Buttons */}
        <div className="flex justify-center space-x-2 mb-2">
            <button
                onClick={() => setPreviewMode('light')}
                className={`px-3 py-1 text-xs rounded ${previewMode === 'light' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
                Light
            </button>
            <button
                onClick={() => setPreviewMode('dark')}
                className={`px-3 py-1 text-xs rounded ${previewMode === 'dark' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
                Dark
            </button>
        </div>

        {/* Mock Website Area */}
        <div className="relative w-full h-96 bg-gray-100 rounded-md overflow-hidden border border-gray-300 p-4 flex flex-col justify-end"
             style={{ background: previewMode === 'dark' ? '#333' : '#f0f0f0' }} // Mock website bg change
        >
            <p className="absolute top-4 left-4 text-sm font-light" style={{ color: previewMode === 'dark' ? '#ccc' : '#555' }}>
                Your Website Content Area
            </p>

            {/* Mock Widget Bubble */}
            <div
                className={`absolute ${positionClasses} w-auto min-w-[4rem] h-16 px-4 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-all hover:scale-105 group`}
                style={{
                    backgroundColor: buttonBgColor || '#3b82f6', // Fallback color
                    color: buttonTextColor || '#ffffff',
                    borderRadius: currentConfig.button_border_radius || '9999px',
                    borderWidth: currentConfig.button_border_width || '0px',
                    borderStyle: currentConfig.button_border_style || 'none',
                    // borderColor: ??? // Need border color field if style is not none
                }}
                title="Chat Widget Preview"
            >
                {/* Show Logo if available, else icon */}
                {logo ? (
                    <img src={logo} alt="Logo" className="h-8 w-auto object-contain max-w-[80%]" /> // Added max-width
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                )}
                {/* Show button text if logo isn't present */}
                {!logo && currentConfig.widget_button_text && (
                    <span className="ml-2 text-sm font-medium" style={{ fontWeight: currentConfig.button_font_weight || 'bold' }}>
                        {currentConfig.widget_button_text}
                    </span>
                )}

                {/* Tooltip showing help text */}
                <div className="absolute bottom-full mb-2 w-max max-w-xs p-2 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)'}}
                >
                    {currentConfig.widget_help_text || 'Need help?'}
                    <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-black" style={{ borderTopColor: 'rgba(0,0,0,0.7)'}}></div>
                </div>
            </div>

            {/* Mock Expanded Widget (Simplified) - Uncomment to show basic expanded view */}

            <div className={`absolute bottom-24 right-6 w-72 h-96 rounded-lg shadow-xl overflow-hidden flex flex-col`}
                 style={{
                     backgroundColor: bgColor || '#ffffff',
                     borderRadius: currentConfig.widget_border_radius || '1.5rem',
                     boxShadow: currentConfig.widget_shadow || 'none',
                     borderWidth: currentConfig.widget_border_width || '0px',
                     borderStyle: currentConfig.widget_border_style || 'none',
                     // borderColor: ??? // Need border color field
                     fontFamily: currentConfig.font_family || 'sans-serif',
                 }}
            >
                {/* Header */}
                <div className="h-14 flex items-center px-4 flex-shrink-0" style={{ backgroundColor: headerBg || primaryColor, color: headerText || '#ffffff' }}>
                    {/* Header Logo */}
                     {logo && (
                         <img src={logo} alt="Header Logo" className="h-6 w-auto mr-2 object-contain" />
                     )}
                    <span className="font-semibold text-base" style={{ fontWeight: currentConfig.header_font_weight || 'bold' }}>
                        {currentConfig.main_title || 'Chat'}
                    </span>
                    {/* Add close button icon placeholder */}
                    <button className="ml-auto text-inherit opacity-70 hover:opacity-100">✕</button>
                </div>
                {/* Body */}
                <div className="flex-1 p-4 text-sm overflow-y-auto" style={{ color: textColor || '#000000', fontSize: currentConfig.base_font_size || '1rem' }}>
                    {/* Greeting Message */}
                    <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: previewMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: currentConfig.message_bubble_border_radius || '1rem' }}>
                        <p style={{ fontWeight: currentConfig.message_font_weight || 'normal' }}>
                            {currentConfig.greeting_message || 'Hello!'}
                        </p>
                    </div>
                    {/* Example User Message */}
                     <div className="mb-3 p-3 rounded-lg ml-auto max-w-[80%]" style={{ backgroundColor: primaryColor || '#3b82f6', color: buttonTextColor || '#ffffff', borderRadius: currentConfig.message_bubble_border_radius || '1rem' }}>
                        <p style={{ fontWeight: currentConfig.message_font_weight || 'normal' }}>
                            This is a user message preview.
                        </p>
                    </div>
                </div>
                 {/* Input Area */}
                 <div className="p-3 border-t" style={{ borderColor: previewMode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}>
                     <input
                         type="text"
                         placeholder="Type your message..."
                         className="w-full px-3 py-2 border rounded-md text-sm"
                         style={{
                             padding: currentConfig.input_field_padding || '0.5rem',
                             borderRadius: currentConfig.input_field_border_radius || '0.5rem',
                             borderWidth: currentConfig.input_field_border_width || '1px',
                             borderStyle: currentConfig.input_field_border_style || 'solid',
                             borderColor: previewMode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                             backgroundColor: previewMode === 'dark' ? 'rgba(255,255,255,0.1)' : '#ffffff',
                             color: textColor || '#000000',
                         }}
                     />
                 </div>
            </div>

        </div>
    </div>
  );
};

export default WidgetPreview;
