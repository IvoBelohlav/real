import { NextResponse } from 'next/server';
import { isAuthenticated, getUserFromRequest } from '@/app/api/auth-utils';

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
    
    // In a real app, you'd query your database for the user's subscription
    // For demo purposes, return a mock subscription
    return NextResponse.json({
      subscriptionId: 'sub_mock123',
      status: 'active',
      plan: 'premium',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      features: {
        widgetAccess: true,
        multiDomain: true,
        analytics: true,
        prioritySupport: true,
        customBranding: true
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription details' },
      { status: 500 }
    );
  }
}

// Create a checkout session for subscription
export async function POST(request) {
  try {
    const body = await request.json();
    const { priceId, successUrl, cancelUrl } = body;
    
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }
    
    // Get authenticated user session
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user's access token
    const accessToken = session.accessToken;
    if (!accessToken) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Create checkout session via backend
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/create-checkout-session`,
      {
        price_id: priceId,
        success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/billing`
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Handle specific error responses
    if (error.response?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 