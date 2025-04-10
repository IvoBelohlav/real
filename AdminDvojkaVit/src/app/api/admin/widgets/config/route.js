import { NextResponse } from 'next/server';
import { isAuthenticated, getUserFromRequest, isAdmin } from '@/app/api/auth-utils';

// Mock widget configurations for demo purposes
const widgetConfigs = new Map();

// Default configuration
const defaultConfig = {
  appearance: {
    theme: 'light',
    primaryColor: '#4F46E5',
    secondaryColor: '#E0E7FF',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '8px',
    buttonStyle: 'rounded'
  },
  behavior: {
    greeting: 'Hello! How can I help you today?',
    autoOpen: false,
    openDelay: 5,
    position: 'bottom-right',
    showBranding: true
  },
  advanced: {
    domain: '*',
    allowedDomains: [],
    blockedDomains: [],
    customCss: ''
  }
};

export async function GET(request) {
  try {
    // Check if user is authenticated
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user info from request
    const user = getUserFromRequest(request);
    
    // Check if user has admin privileges
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    // Get configuration for specified widget ID or user's default widget
    const { searchParams } = new URL(request.url);
    const widgetId = searchParams.get('widgetId') || 'default';
    
    // Get widget config or return default if not found
    const config = widgetConfigs.get(widgetId) || { ...defaultConfig };
    
    return NextResponse.json({
      widgetId,
      config
    });
  } catch (error) {
    console.error('Error fetching widget config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch widget configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Check if user is authenticated
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user info from request
    const user = getUserFromRequest(request);
    
    // Check if user has admin privileges
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const data = await request.json();
    
    // Basic validation
    if (!data || !data.widgetId || !data.config) {
      return NextResponse.json(
        { error: 'Invalid request body. widgetId and config are required.' },
        { status: 400 }
      );
    }
    
    // Update widget configuration
    widgetConfigs.set(data.widgetId, data.config);
    
    return NextResponse.json({
      success: true,
      message: 'Widget configuration updated successfully',
      widgetId: data.widgetId
    });
  } catch (error) {
    console.error('Error updating widget config:', error);
    return NextResponse.json(
      { error: 'Failed to update widget configuration' },
      { status: 500 }
    );
  }
} 