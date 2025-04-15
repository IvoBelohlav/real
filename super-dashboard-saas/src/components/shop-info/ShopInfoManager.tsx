'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { ShopInfo, ShopInfoUpdate } from '@/types'; // Removed unused Address, SocialMedia, AboutSection for now
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import EditableListInput from './EditableListInput'; // Import the new component

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
    ai_faq_facts: [], // Ensure these are initialized as arrays
    language: 'cs', // Default language
};

// Define which fields will use the EditableListInput
const listInputFields: (keyof ShopInfo)[] = ['services', 'keywords', 'payment_methods', 'ai_faq_facts'];

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
            // Prepare data, ensuring arrays are arrays and stringifying JSON fields
            const preparedData = { ...shopInfo };
            // Ensure list input fields are arrays, even if API returns null/undefined
            listInputFields.forEach(field => {
                if (!Array.isArray(preparedData[field])) {
                    (preparedData as any)[field] = [];
                }
            });

            // Handle JSON fields (Addresses, Social Media, etc.) - keep stringifying for now
            const jsonFields: (keyof ShopInfo)[] = ['addresses', 'social_media', 'about_sections', 'business_hours'];
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
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (parseInt(value, 10) || 0) : value,
        }));
    };

    // Handler for the EditableListInput component
    const handleListChange = (name: keyof ShopInfo, newValue: string[]) => {
        setFormData(prev => ({
            ...prev,
            [name]: newValue, // Update the array directly
        }));
    };

    // TODO: Add more complex handlers for nested JSON fields (Addresses, Social Media, etc.) if needed
    // For simplicity, we might just use JSON textareas for these for now, or build dedicated sub-components.

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        e.preventDefault();

        // Prepare the payload, parsing JSON strings back to objects/arrays
        let parsedAddresses: any[] | undefined = undefined;
        let parsedSocialMedia: any[] | undefined = undefined;
        let parsedAboutSections: any[] | undefined = undefined;
        let parsedBusinessHours: Record<string, string> | undefined = undefined;

        try {
            // Attempt to parse fields that were stringified
            if (typeof formData.addresses === 'string') {
                parsedAddresses = JSON.parse(formData.addresses);
            } else {
                 parsedAddresses = formData.addresses; // Already an object/array or null/undefined
            }
            if (typeof formData.social_media === 'string') {
                parsedSocialMedia = JSON.parse(formData.social_media);
            } else {
                parsedSocialMedia = formData.social_media;
            }
             if (typeof formData.about_sections === 'string') {
                parsedAboutSections = JSON.parse(formData.about_sections);
            } else {
                parsedAboutSections = formData.about_sections;
            }
            if (typeof formData.business_hours === 'string') {
                parsedBusinessHours = JSON.parse(formData.business_hours);
            } else {
                parsedBusinessHours = formData.business_hours;
            }

        } catch (error) {
            console.error("Error parsing JSON fields:", error);
            toast.error("Failed to save: Invalid format in Addresses, Social Media, About Sections, or Business Hours fields.");
            return; // Prevent submission if parsing fails
        }


        // Prepare only the fields allowed in ShopInfoUpdate
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
            // Use parsed values
            addresses: parsedAddresses,
            social_media: parsedSocialMedia,
            about_sections: parsedAboutSections,
            business_hours: parsedBusinessHours,
            business_type: formData.business_type,
            services: formData.services, // Already an array
            shipping_policy: formData.shipping_policy,
            payment_methods: formData.payment_methods, // Already an array
            return_policy: formData.return_policy,
            warranty_info: formData.warranty_info,
            keywords: formData.keywords, // Already an array
            language: formData.language,
            ai_prompt_summary: formData.ai_prompt_summary,
            ai_faq_facts: formData.ai_faq_facts, // Already an array
            ai_voice_style: formData.ai_voice_style,
        };

        // Optional: Remove undefined fields before sending? Pydantic handles optional fields.
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

    // Helper Render Functions - Apply dark theme styles
    const renderInputField = (id: keyof ShopInfo, label: string, type: string = 'text', required: boolean = false, options?: { placeholder?: string, className?: string }) => (
        <div className={options?.className ?? 'sm:col-span-6'}>
          {/* Use muted-foreground for label */}
          <label htmlFor={id} className="block text-sm font-medium text-muted-foreground mb-1">{label}{required && '*'}</label>
          {/* Use input styling */}
          <input
            type={type}
            name={id}
            id={id}
            value={(formData as any)[id] ?? ''}
            onChange={handleInputChange}
            required={required}
            placeholder={options?.placeholder}
            className="shadow-sm focus:ring-ring focus:border-primary block w-full sm:text-sm border-border rounded-md px-3 py-2 border bg-input text-foreground placeholder-muted-foreground"
          />
        </div>
      );

      const renderTextareaField = (id: keyof ShopInfo, label: string, rows: number = 3, required: boolean = false, options?: { placeholder?: string, className?: string }) => (
        <div className={options?.className ?? 'sm:col-span-6'}>
          {/* Use muted-foreground for label */}
          <label htmlFor={id} className="block text-sm font-medium text-muted-foreground mb-1">{label}{required && '*'}</label>
          {/* Use textarea styling */}
          <textarea
            name={id}
            id={id}
            rows={rows}
            value={(formData as any)[id] ?? ''}
            onChange={handleInputChange}
            required={required}
            placeholder={options?.placeholder}
            className="shadow-sm focus:ring-ring focus:border-primary block w-full sm:text-sm border border-border rounded-md px-3 py-2 bg-input text-foreground placeholder-muted-foreground"
          />
        </div>
      );

      // TODO: Add render functions or components for Addresses, SocialMedia, AboutSections, BusinessHours

    return (
        // Use border color for divider
        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-border">
            {/* Basic Info - Apply dark theme text */}
            <div className="space-y-6 sm:space-y-5 pt-8 sm:pt-10"> {/* Added padding top */}
                <div>
                    <h3 className="text-lg leading-6 font-medium text-foreground">Basic Information</h3>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Core details about your shop.</p>
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

             {/* Contact Info - Apply dark theme text */}
             <div className="pt-8 space-y-6 sm:pt-10 sm:space-y-5">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-foreground">Contact Information</h3>
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

             {/* AI Specific Fields - Apply dark theme text */}
             <div className="pt-8 space-y-6 sm:pt-10 sm:space-y-5">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-foreground">AI Assistant Configuration</h3>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Information used to tailor the AI's responses.</p>
                </div>
                 <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    {renderTextareaField('ai_prompt_summary', 'AI Prompt Summary', 4, true, { className: 'sm:col-span-6', placeholder: 'Concise summary for AI system prompts (max 1000 chars)' })}
                    {/* Use EditableListInput for AI FAQ Facts */}
                    <EditableListInput
                        id="ai_faq_facts"
                        label="AI FAQ Facts"
                        value={formData.ai_faq_facts ?? []} // Add nullish coalescing
                        onChange={(newValue) => handleListChange('ai_faq_facts', newValue)}
                        placeholder="Enter a key fact..."
                        className="sm:col-span-6"
                    />
                    {renderTextareaField('ai_voice_style', 'AI Voice & Tone Guide', 4, false, { className: 'sm:col-span-6', placeholder: 'e.g., Friendly and helpful, Formal and professional' })}
                 </div>
             </div>

             {/* Business Details - Apply dark theme text */}
             <div className="pt-8 space-y-6 sm:pt-10 sm:space-y-5">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-foreground">Business Details</h3>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Keywords, services, and payment methods.</p>
                </div>
                 <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    {/* Use EditableListInput for Services */}
                    <EditableListInput
                        id="services"
                        label="Services Offered"
                        value={formData.services ?? []} // Add nullish coalescing
                        onChange={(newValue) => handleListChange('services', newValue)}
                        placeholder="Enter a service..."
                        className="sm:col-span-6"
                    />
                    {/* Use EditableListInput for Keywords */}
                    <EditableListInput
                        id="keywords"
                        label="Keywords"
                        value={formData.keywords ?? []} // Add nullish coalescing
                        onChange={(newValue) => handleListChange('keywords', newValue)}
                        placeholder="Enter a keyword..."
                        className="sm:col-span-6"
                    />
                    {/* Use EditableListInput for Payment Methods */}
                    <EditableListInput
                        id="payment_methods"
                        label="Payment Methods Accepted"
                        value={formData.payment_methods ?? []} // Add nullish coalescing
                        onChange={(newValue) => handleListChange('payment_methods', newValue)}
                        placeholder="Enter a payment method..."
                        className="sm:col-span-6"
                    />
                 </div>
             </div>

             {/* Policies - Apply dark theme text */}
             <div className="pt-8 space-y-6 sm:pt-10 sm:space-y-5">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-foreground">Policies</h3>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Shipping, return, and warranty information.</p>
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
                 <p className="text-muted-foreground italic">Placeholders for Addresses, Social Media, About Sections, Business Hours...</p>
                 {/* Basic structure example - needs dynamic handling */}
                 {/* <div className="text-muted-foreground">Addresses: {JSON.stringify(formData.addresses)}</div> */}
                 {/* <div>Social Media: {JSON.stringify(formData.social_media)}</div> */}
             </div>


            {/* Save Button */}
            {/* Save Button - Use primary button style */}
            <div className="pt-5">
                <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={updateShopInfoMutation.isPending}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50"
                >
                    {updateShopInfoMutation.isPending ? <LoadingSpinner /> : 'Save Shop Information'}
                </button>
                </div>
            </div>
        </form>
    );
};

export default ShopInfoManager;
