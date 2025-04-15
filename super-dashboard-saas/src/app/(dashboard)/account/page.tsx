'use client';

import React from 'react';
import { useTutorial } from '@/contexts/TutorialContext'; // Import the hook

export default function AccountPage() {
  const { startTutorial } = useTutorial(); // Get the start function

  return (
    <div className="space-y-6"> {/* Added space-y */}
      {/* Heading styling for dark theme */}
      <h1 className="text-2xl font-semibold text-foreground">Account Settings</h1> {/* Removed bottom margin */}

      {/* Account Details Card - Use card styling */}
      <div className="bg-card shadow rounded-lg p-6 border border-border">
        {/* Card title styling */}
        <h2 className="text-lg font-medium text-foreground mb-4">Profile Information</h2>
        {/* Card description styling */}
        <p className="text-muted-foreground">Manage your profile information and account settings.</p>
        {/* Account details form placeholder */}
        {/* Divider styling */}
        <div className="mt-6 border-t border-border pt-6">
          {/* Placeholder text styling */}
          <p className="text-center text-muted-foreground">Account management form placeholder...</p>
          {/* TODO: Implement actual account management form (e.g., change password) */}
        </div>
      </div>

      {/* Tutorial Card - Use card styling */}
      <div className="bg-card shadow rounded-lg p-6 border border-border">
        {/* Card title styling */}
        <h2 className="text-lg font-medium text-foreground mb-4">Dashboard Tutorial</h2>
        {/* Card description styling */}
        <p className="text-muted-foreground mb-4">Need a refresher? Restart the dashboard introduction tour.</p>
        {/* Button styling for dark theme (primary action) */}
        <button
          onClick={startTutorial}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 transition duration-150 ease-in-out"
        >
          Restart Tutorial
        </button>
      </div>

    </div>
  );
}
