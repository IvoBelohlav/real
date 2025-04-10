import { NextResponse } from 'next/server';
import axios from 'axios';

// Simple function to check if user is authenticated
// In a real app, you'd verify the session/token properly
const isAuthenticated = (request) => {
  // For demo purposes, always return true
  // In a real app, you'd check cookies, headers, etc.
  return true;
};

// In a real application, this would be stored in a database
const defaultConfig = {
  appearance: {
    theme: 'light',
    position: 'bottom-right',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 'medium',
    borderRadius: 'medium',
    showBranding: true
  },
  behavior: {
    autoOpen: false,
    openDelay: 3,
    welcomeMessage: 'Hello! How can I help you today?',
    offlineMessage: 'We\'re currently offline. Leave a message and we\'ll get back to you.',
    persistConversation: true,
    requireName: true,
    requireEmail: true
  },
  businessInfo: {
    companyName: '',
    logo: '',
    businessType: '',
    productCategories: []
  },
  faq: {
    items: []
  },
  domains: {
    whitelist: []
  },
  apiKey: 'demo_api_key_' + Math.random().toString(36).substring(2, 15)
};

// Map to store user configurations (in a real app, this would be in a database)
// Key: userId, Value: config object
const userConfigs = new Map();

// GET route to fetch widget configuration for the current user
export async function GET(request) {
  try {
    // Check if user is authenticated
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // In a real application, you would get the user ID from authentication
    // and fetch their configuration from a database
    const userId = 'current_user'; // Mock user ID for demo
    
    // Get the user's config or return the default if not found
    const config = userConfigs.get(userId) || {...defaultConfig};
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching widget config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch widget configuration' },
      { status: 500 }
    );
  }
}

// PUT route to update widget configuration for the current user
export async function PUT(request) {
  try {
    // Check if user is authenticated
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // In a real application, you would get the user ID from authentication
    const userId = 'current_user'; // Mock user ID for demo
    
    // Parse the request body
    const updatedConfig = await request.json();
    
    // Validate the config (simplified validation for demo)
    if (!updatedConfig || typeof updatedConfig !== 'object') {
      return NextResponse.json(
        { error: 'Invalid configuration data' },
        { status: 400 }
      );
    }
    
    // Store the updated configuration
    userConfigs.set(userId, updatedConfig);
    
    // In a real application, you would save this to a database
    
    return NextResponse.json({ 
      success: true, 
      message: 'Widget configuration updated successfully' 
    });
  } catch (error) {
    console.error('Error updating widget config:', error);
    return NextResponse.json(
      { error: 'Failed to update widget configuration' },
      { status: 500 }
    );
  }
} 