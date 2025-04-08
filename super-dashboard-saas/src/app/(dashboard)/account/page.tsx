'use client';

import React from 'react';
import { useTutorial } from '@/contexts/TutorialContext'; // Import the hook

export default function AccountPage() {
  const { startTutorial } = useTutorial(); // Get the start function

  return (
    <div className="space-y-6"> {/* Added space-y */}
      <h1 className="text-2xl font-semibold text-gray-900">Account Settings</h1> {/* Removed bottom margin */}

      {/* Account Details Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Profile Information</h2>
        <p className="text-gray-600">Manage your profile information and account settings.</p>
        {/* Account details form placeholder */}
        <div className="mt-6 border-t border-gray-200 pt-6">
          <p className="text-center text-gray-500">Account management form placeholder...</p>
          {/* TODO: Implement actual account management form (e.g., change password) */}
        </div>
      </div>

      {/* Tutorial Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Dashboard Tutorial</h2>
        <p className="text-gray-600 mb-4">Need a refresher? Restart the dashboard introduction tour.</p>
        <button
          onClick={startTutorial}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-150 ease-in-out"
        >
          Restart Tutorial
        </button>
      </div>

    </div>
  );
}
