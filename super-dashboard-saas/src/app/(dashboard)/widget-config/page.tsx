'use client';

import React from 'react';
import WidgetConfigForm from '@/components/widget/WidgetConfigForm';
import WidgetPreview from '@/components/widget/WidgetPreview';
import { useSubscription } from '@/contexts/SubscriptionContext';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Link from 'next/link';

export default function WidgetConfigPage() {
  const { hasActiveSubscription, isLoading: isSubscriptionLoading } = useSubscription();

  // Render loading state while checking subscription
  if (isSubscriptionLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background p-6">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-muted-foreground font-medium">Loading your configuration...</p>
        </div>
      </div>
    );
  }

  // Render subscription required message if not active
  if (!hasActiveSubscription) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-xl font-bold text-foreground mb-6">Widget Configuration</h1>
        <div className="bg-card border-l-4 border-yellow-500 rounded-lg shadow-lg overflow-hidden p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-foreground">Subscription Required</h3>
              <div className="mt-2 text-muted-foreground">
                <p className="mb-4">You need an active subscription to configure and use our widget tools.</p>
                <Link href="/billing" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-colors duration-150 ease-in-out">
                  View Subscription Plans
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render configuration page if subscribed
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-background min-h-screen text-foreground">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Widget Configuration</h1>
        <p className="mt-1 text-sm text-muted-foreground">Customize your widget appearance and behavior</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2 bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-card-foreground flex items-center">
              <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </h2>
          </div>
          <div className="p-6">
            <WidgetConfigForm />
          </div>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-card-foreground flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </h2>
            </div>
            <div className="p-6">
              <div className="bg-background border border-border rounded-md p-4 mb-4">
                <p className="text-xs text-muted-foreground mb-2">Live Widget Preview</p>
                <div className="relative">
                  <WidgetPreview />
                  <div className="absolute bottom-2 right-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-600/20 text-green-400">
                      <span className="h-1.5 w-1.5 mr-1 bg-green-500 rounded-full"></span>
                      Live
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">About Widget Preview</p>
                  <p className="text-xs">This preview updates in real-time as you modify the settings. All changes will be applied immediately to see how your widget will appear to your users.</p>
                </div>
                <div className="flex justify-end mt-4">
                  <button type="button" className="inline-flex items-center px-3 py-1.5 border border-border shadow-sm text-xs font-medium rounded-md text-foreground bg-card hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Export Widget
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          Changes are saved automatically.
        </p>
      </div>
    </div>
  );
}