'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { ShopInfo, ShopInfoUpdate, Address, SocialMedia, AboutSection } from '@/types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

// Helper function to create CSS class names conditionally (similar to clsx)
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

// Default empty state for the form
const defaultShopInfo: ShopInfo = {
    shop_name: '',
    description_short: '',
    description_long: '',
    primary_email: '',
    primary_phone: '',
    website: '',
    founded_year: new Date().getFullYear(),
    business_type: '',
    ai_prompt_summary: '',
    // Initialize arrays/objects to avoid undefined errors
    addresses: [],
    social_media: [],
    about_sections: [],
    business_hours: {},
    services: [],
    payment_methods: [],
    keywords: [],
    ai_faq_facts: [],
    language: 'cs', // Default language
};

const ShopInfoManager: React.FC = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth(); // Get user from auth context
    // TODO: Implement language selection if needed, defaulting to 'cs' for now
    const [language, setLanguage] = useState('cs');
    const [formData, setFormData] = useState<ShopInfo>(defaultShopInfo);

    // Fetch Shop Info for the selected language AND current user
    const { data: shopInfo, isLoading, isError, error, refetch } = useQuery<ShopInfo, Error>({
        // Include user ID in the query key for user-specific caching
        queryKey: ['shopInfo', language, user?.id],
        queryFn: () => fetchApi(`/api/shop-info?language=${language}`),
        // Only run the query if the user ID is available
        enabled: !!user?.id,
    });

    // Update form state when fetched data changes or user/language changes
    useEffect(() => {
        if (shopInfo && user?.id) { // Ensure user context is also loaded
            // Prepare data, joining array fields for textareas
            const preparedData = { ...shopInfo };
            const arrayFields: (keyof ShopInfo)[] = ['services', 'keywords', 'payment_methods', 'ai_faq_facts'];
            const jsonFields: (keyof ShopInfo)[] = ['addresses', 'social_media', 'about_sections', 'business_hours'];

            arrayFields.forEach(field => {
                if (Array.isArray(preparedData[field])) {
                    (preparedData as any)[field] = (preparedData[field] as string[]).join('\n');
                }
            });
            jsonFields.forEach(field => {
                 // Stringify only if it's an object/array and not already a string
                if (typeof preparedData[field] === 'object' && preparedData[field] !== null) {
                    try {
                        (preparedData as any)[field] = JSON.stringify(preparedData[field], null, 2); // Pretty print JSON
                    } catch (e) {
                        console.error(`Failed to stringify field ${field}:`, e);
                        (preparedData as any)[field] = '{}'; // Fallback to empty object string
                    }
                } else if (preparedData[field] === null || preparedData[field] === undefined) {
                     // Ensure null/undefined becomes an empty object/array string representation for editing
                     (preparedData as any)[field] = (field === 'business_hours') ? '{}' : '[]';
                }
                // If it's already a string (e.g., due to previous failed parse), leave it as is
            });

            // Merge fetched data with defaults to ensure all fields exist
            setFormData({ ...defaultShopInfo, ...preparedData });
        } else if (user?.id) { // If user is loaded but no shopInfo (e.g., first time)
            // Reset to default, ensuring language is set
            setFormData({ ...defaultShopInfo, language });
        }
        // Add user?.id to dependency array
    }, [shopInfo, language, user?.id]);

    // Update Shop Info Mutation
    const updateShopInfoMutation = useMutation<ShopInfo, Error, ShopInfoUpdate>({
        mutationFn: (updateData) => fetchApi(`/api/shop-info?language=${language}`, {
            method: 'PUT',
            body: JSON.stringify(updateData),
        }),
        onSuccess: (updatedData) => {
            // Use the user-specific query key when updating cache/invalidating
            const queryKey = ['shopInfo', language, user?.id];
            queryClient.setQueryData(queryKey, updatedData); // Update cache
            queryClient.invalidateQueries({ queryKey: queryKey });
            toast.success('Shop information updated successfully!');
        },
        onError: (error) => {
            toast.error(`Failed to update shop information: ${error.message}`);
        },
    });

    // --- Handlers ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        // Handle array fields represented by textareas (one item per line)
        const arrayFields: (keyof ShopInfo)[] = ['services', 'keywords', 'payment_methods', 'ai_faq_facts'];

        setFormData(prev => {
            let newValue: any = value;
            if (type === 'number') {
                newValue = parseInt(value, 10) || 0;
            } else if (arrayFields.includes(name as keyof ShopInfo)) {
                // Split by newline, trim whitespace, filter empty lines
                newValue = value.split('\n').map(s => s.trim()).filter(Boolean);
            }
            return {
                ...prev,
                [name]: newValue,
            };
        });
    };

    // TODO: Add more complex handlers for nested arrays/objects (Addresses, Social Media, etc.) if needed
    // For simplicity, we might just use JSON textareas for these for now, or build dedicated sub-components.

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Prepare only the fields allowed in ShopInfoUpdate
        // Ensure array fields are correctly formatted (already handled by handleChange)
        const updatePayload: ShopInfoUpdate = {
            shop_name: formData.shop_name,
            legal_name: formData.legal_name,
            tagline: formData.tagline,
            description_short: formData.description_short,
            description_long: formData.description_long,
            primary_email: formData.primary_email,
            support_email: formData.support_email,
            sales_email: formData.sales_email,
            primary_phone: formData.primary_phone,
            support_phone: formData.support_phone,
            sales_phone: formData.sales_phone,
            website: formData.website,
            founded_year: formData.founded_year,
            addresses: formData.addresses, // Assuming direct update for now
            social_media: formData.social_media, // Assuming direct update for now
            about_sections: formData.about_sections, // Assuming direct update for now
            business_hours: formData.business_hours, // Assuming direct update for now
            business_type: formData.business_type,
            services: formData.services,
            shipping_policy: formData.shipping_policy,
            payment_methods: formData.payment_methods,
            return_policy: formData.return_policy,
            warranty_info: formData.warranty_info,
            keywords: formData.keywords,
            language: formData.language, // Include language if it's part of the update model
            ai_prompt_summary: formData.ai_prompt_summary,
            ai_faq_facts: formData.ai_faq_facts, // Should be array from handleChange
            ai_voice_style: formData.ai_voice_style,
        };
        // Optional: Remove undefined fields before sending? Depends on backend handling.
        // Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);

        updateShopInfoMutation.mutate(updatePayload);
    };

    // --- Render Logic ---
    if (isLoading) {
        return <div className="flex justify-center p-4"><LoadingSpinner /></div>;
    }

    if (isError) {
        return <div className="text-red-600 bg-red-100 p-4 rounded">Error loading shop info: {error?.message}</div>;
    }

    // Helper Render Functions
    const renderInputField = (id: keyof ShopInfo, label: string, type: string = 'text', required: boolean = false, options?: { placeholder?: string, className?: string }) => (
        <div className={options?.className ?? 'sm:col-span-6'}>
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && '*'}</label>
          <input
            type={type}
            name={id}
            id={id}
            value={(formData as any)[id] ?? ''}
            onChange={handleChange}
            required={required}
            placeholder={options?.placeholder}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border"
          />
        </div>
      );

      const renderTextareaField = (id: keyof ShopInfo, label: string, rows: number = 3, required: boolean = false, options?: { placeholder?: string, className?: string }) => (
        <div className={options?.className ?? 'sm:col-span-6'}>
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && '*'}</label>
          <textarea
            name={id}
            id={id}
            rows={rows}
            // Join array values with newline for display in textarea
            value={Array.isArray((formData as any)[id]) ? ((formData as any)[id] as string[]).join('\n') : (formData as any)[id] ?? ''}
            onChange={handleChange}
            required={required}
            placeholder={options?.placeholder}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
      );

      // TODO: Add render functions or components for Addresses, SocialMedia, AboutSections, BusinessHours

    return (
        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200">
            {/* Basic Info */}
            <div className="space-y-6 sm:space-y-5">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Basic Information</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Core details about your shop.</p>
                </div>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    {renderInputField('shop_name', 'Shop Name', 'text', true, { className: 'sm:col-span-4' })}
                    {renderInputField('legal_name', 'Legal Name', 'text', false, { className: 'sm:col-span-4' })}
                    {renderInputField('tagline', 'Tagline', 'text', false, { className: 'sm:col-span-6' })}
                    {renderTextareaField('description_short', 'Short Description', 3, true, { className: 'sm:col-span-6' })}
                    {renderTextareaField('description_long', 'Long Description', 6, true, { className: 'sm:col-span-6' })}
                    {renderInputField('website', 'Website URL', 'url', true, { className: 'sm:col-span-4' })}
                    {renderInputField('founded_year', 'Founded Year', 'number', true, { className: 'sm:col-span-2' })}
                    {renderInputField('business_type', 'Business Type', 'text', true, { className: 'sm:col-span-3' })}
                     {/* Language selection - if needed */}
                     {/* <div className="sm:col-span-3"> ... select dropdown for language ... </div> */}
                </div>
            </div>

             {/* Contact Info */}
             <div className="pt-8 space-y-6 sm:pt-10 sm:space-y-5">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Contact Information</h3>
                </div>
                 <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    {renderInputField('primary_email', 'Primary Email', 'email', true, { className: 'sm:col-span-3' })}
                    {renderInputField('primary_phone', 'Primary Phone', 'tel', true, { className: 'sm:col-span-3' })}
                    {renderInputField('support_email', 'Support Email', 'email', false, { className: 'sm:col-span-3' })}
                    {renderInputField('support_phone', 'Support Phone', 'tel', false, { className: 'sm:col-span-3' })}
                    {renderInputField('sales_email', 'Sales Email', 'email', false, { className: 'sm:col-span-3' })}
                    {renderInputField('sales_phone', 'Sales Phone', 'tel', false, { className: 'sm:col-span-3' })}
                 </div>
             </div>

             {/* AI Specific Fields */}
             <div className="pt-8 space-y-6 sm:pt-10 sm:space-y-5">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">AI Assistant Configuration</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Information used to tailor the AI's responses.</p>
                </div>
                 <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    {renderTextareaField('ai_prompt_summary', 'AI Prompt Summary', 4, true, { className: 'sm:col-span-6', placeholder: 'Concise summary for AI system prompts (max 1000 chars)' })}
                    {renderTextareaField('ai_faq_facts', 'AI FAQ Facts (one per line)', 5, false, { className: 'sm:col-span-6', placeholder: 'Key facts for AI responses, one per line.' })}
                    {renderTextareaField('ai_voice_style', 'AI Voice & Tone Guide', 4, false, { className: 'sm:col-span-6', placeholder: 'e.g., Friendly and helpful, Formal and professional' })}
                 </div>
             </div>

             {/* Business Details */}
             <div className="pt-8 space-y-6 sm:pt-10 sm:space-y-5">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Business Details</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Keywords, services, and payment methods.</p>
                </div>
                 <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    {renderTextareaField('services', 'Services Offered (one per line)', 5, false, { className: 'sm:col-span-6', placeholder: 'e.g., Web Design\nSEO Optimization\nConsulting' })}
                    {renderTextareaField('keywords', 'Keywords (one per line)', 4, false, { className: 'sm:col-span-6', placeholder: 'e.g., digital agency\nmarketing\nPrague' })}
                    {renderTextareaField('payment_methods', 'Payment Methods Accepted (one per line)', 3, false, { className: 'sm:col-span-6', placeholder: 'e.g., Credit Card\nBank Transfer\nPayPal' })}
                 </div>
             </div>

             {/* Policies */}
             <div className="pt-8 space-y-6 sm:pt-10 sm:space-y-5">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Policies</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Shipping, return, and warranty information.</p>
                </div>
                 <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    {renderTextareaField('shipping_policy', 'Shipping Policy', 5, false, { className: 'sm:col-span-6' })}
                    {renderTextareaField('return_policy', 'Return Policy', 5, false, { className: 'sm:col-span-6' })}
                    {renderTextareaField('warranty_info', 'Warranty Information', 5, false, { className: 'sm:col-span-6' })}
                 </div>
             </div>

             {/* TODO: Add sections for Addresses, Social Media, About Sections, Business Hours */}
             {/* These require more complex form elements or sub-components */}
             <div className="pt-8 space-y-6 sm:pt-10 sm:space-y-5">
                 <p className="text-gray-500 italic">Placeholders for Addresses, Social Media, About Sections, Business Hours...</p>
                 {/* Basic structure example - needs dynamic handling */}
                 {/* <div>Addresses: {JSON.stringify(formData.addresses)}</div> */}
                 {/* <div>Social Media: {JSON.stringify(formData.social_media)}</div> */}
             </div>


            {/* Save Button */}
            <div className="pt-5">
                <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={updateShopInfoMutation.isPending}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {updateShopInfoMutation.isPending ? <LoadingSpinner /> : 'Save Shop Information'}
                </button>
                </div>
            </div>
        </form>
    );
};

export default ShopInfoManager;
