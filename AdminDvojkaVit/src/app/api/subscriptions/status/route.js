import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const secret = process.env.NEXTAUTH_SECRET;
const backendUrl = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request) {
  try {
    console.log('[API /subscriptions/status] Request received');
    const token = await getToken({ req: request, secret });

    if (!token || !token.accessToken) {
      console.error("[API /subscriptions/status] No token or accessToken found in session:", token);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }

    console.log('[API /subscriptions/status] Fetching backend /api/subscriptions/current');
    const response = await fetch(`${backendUrl}/api/subscriptions/current`, {
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
      },
      cache: 'no-store', // Ensure fresh data
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[API /subscriptions/status] Backend error: ${response.status}`, data);
      // Return the error detail from the backend if available
      return NextResponse.json(
        { error: data.detail || 'Failed to get subscription status from backend' },
        { status: response.status }
      );
    }

    console.log('[API /subscriptions/status] Backend response OK:', data);
    // Transform backend response to match expected frontend structure if necessary
    // Assuming backend returns SubscriptionDetails model directly
    const frontendResponse = {
      active: data.status === 'active' || data.status === 'trialing', // Determine 'active' based on backend status
      id: data.id,
      status: data.status,
      plan: data.tier, // Map tier to plan
      current_period_end: data.current_period_end,
      cancel_at_period_end: data.cancel_at_period_end,
      // trial_end: data.trial_end, // Add if backend provides trial_end
    };

    return NextResponse.json(frontendResponse);

  } catch (error) {
    console.error('[API /subscriptions/status] Internal server error:', error);
    return NextResponse.json(
      { error: 'Internal server error checking subscription status' },
      { status: 500 }
    );
  }
}
