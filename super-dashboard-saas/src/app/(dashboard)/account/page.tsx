'use client';

import React from 'react';

export default function AccountPage() {
  return (
    <div className="space-y-6"> {/* Added space-y */}
      <h1 className="text-2xl font-semibold text-gray-900">Account Settings</h1> {/* Removed bottom margin */}
      <div className="bg-white shadow rounded-lg p-6"> {/* Wrap content in a card */}
        <p className="text-gray-600">Manage your profile information and account settings.</p>
        {/* Account details form placeholder */}
        <div className="mt-6 border-t border-gray-200 pt-6">
          <p className="text-center text-gray-500">Account management form placeholder...</p>
          {/* TODO: Implement actual account management form (e.g., change password) */}
        </div>
      </div>
    </div>
  );
}
