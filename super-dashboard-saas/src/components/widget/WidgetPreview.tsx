'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WidgetConfig } from '@/types';
import { fetchApi } from '@/lib/api';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { cn } from '@/lib/utils'; // Import cn utility

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
        <div className="flex justify-center space-x-2 mb-4">
            <button
                onClick={() => setPreviewMode('light')}
                className={`px-3 py-1 text-xs rounded-md border transition-colors ${previewMode === 'light' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} /* Simplified style */
            >
                Light
            </button>
            <button
                onClick={() => setPreviewMode('dark')}
                className={`px-3 py-1 text-xs rounded-md border transition-colors ${previewMode === 'dark' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} /* Simplified style */
            >
                Dark
            </button>
        </div>

        {/* Mock Website Area */}
        <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 p-4 flex flex-col justify-end" /* Adjusted bg/border/rounding */
             style={{ background: previewMode === 'dark' ? 'var(--neutral-900)' : 'var(--neutral-100)' }} /* Adjusted mock bg */
        >
            <p className="absolute top-4 left-4 text-xs font-light" style={{ color: previewMode === 'dark' ? 'var(--neutral-500)' : 'var(--neutral-500)' }}> 
                Widget preview
            </p>

            {/* Mock Widget Bubble - Updated Design */}
            <div
                className={cn(
                    `absolute ${positionClasses} shadow-lg flex items-center justify-center cursor-pointer group`,
                    currentConfig.collapsed_button_style === 'circular'
                        ? 'w-12 h-12 rounded-full p-0' // Circular style: fixed size, full round, no padding
                        : 'h-12 px-5 rounded-full' // Wide style: original height/padding/rounding
                )}
                style={{
                    backgroundColor: buttonBgColor || (previewMode === 'dark' ? '#DC2626' : '#DC2626'), // Defaulting to red as per image
                    color: buttonTextColor || '#ffffff',
                    // Use button_border_radius only for wide style, circular is always rounded-full via class
                    borderRadius: currentConfig.collapsed_button_style !== 'circular' ? (currentConfig.button_border_radius || '9999px') : undefined,
                    // borderRadius: currentConfig.button_border_radius || '9999px', // Keep pill shape default <-- REMOVED DUPLICATE
                    borderWidth: currentConfig.button_border_width || '0px',
                    borderStyle: currentConfig.button_border_style || 'none',
                    borderColor: previewMode === 'dark' ? 'var(--neutral-600)' : 'var(--neutral-300)',
                }}
                title="Chat Widget Preview"
            >
                {/* Text (Conditionally Rendered) */}
                {currentConfig.collapsed_button_style !== 'circular' && (
                    <span className="text-sm font-semibold mr-2" style={{ fontWeight: currentConfig.button_font_weight || '600' }}>
                        {currentConfig.widget_button_text || 'Chat Now'}
                    </span>
                )}

                {/* Icon Container (Adjusted for centering in circular mode) */}
                <div className={cn(
                    "bg-white/20 rounded-full p-1", // Base styles
                    currentConfig.collapsed_button_style === 'circular' ? '' : '' // No specific style needed here now, centering is handled by flex parent
                 )}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>

                {/* Tooltip showing help text (Optional, kept from original) */}
                <div className="absolute bottom-full mb-2 w-max max-w-xs p-2 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)'}}
                >
                    {currentConfig.widget_help_text || 'Need help?'}
                    <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-black" style={{ borderTopColor: 'rgba(0,0,0,0.7)'}}></div>
                </div>
            </div>

        </div>
    </div>
  );
};

export default WidgetPreview;
