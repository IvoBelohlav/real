import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt'; // Use getToken

const secret = process.env.NEXTAUTH_SECRET;
const backendUrl = process.env.NEXT_PUBLIC_API_URL;

export async function POST(request) {
  try {
    console.log('[API /checkout/portal] Request received');
    const token = await getToken({ req: request, secret });

    if (!token || !token.accessToken) {
      console.error("[API /checkout/portal] No token or accessToken found in session:", token);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }

    // Define the return URL (where Stripe redirects after portal session)
    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/billing`; // Or dashboard, account page etc.

    console.log('[API /checkout/portal] Calling backend /api/subscriptions/portal');
    // Call the FastAPI backend endpoint to create the portal session
    const response = await fetch(`${backendUrl}/api/subscriptions/portal`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ return_url: returnUrl }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[API /checkout/portal] Backend error: ${response.status}`, data);
      return NextResponse.json(
        { error: data.detail || 'Failed to create customer portal session via backend' },
        { status: response.status }
      );
    }

    console.log('[API /checkout/portal] Backend response OK:', data);
    // Return the portal URL received from the backend
    return NextResponse.json({ portal_url: data.portal_url }); // Ensure key matches backend response

  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
