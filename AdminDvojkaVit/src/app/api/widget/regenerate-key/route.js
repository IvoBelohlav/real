import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const secret = process.env.NEXTAUTH_SECRET;
const backendUrl = process.env.NEXT_PUBLIC_API_URL;

export async function POST(request) {
  try {
    console.log('[API /widget/regenerate-key] Request received');
    const token = await getToken({ req: request, secret });

    if (!token || !token.accessToken) {
      console.error("[API /widget/regenerate-key] No token or accessToken found in session:", token);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }

    console.log('[API /widget/regenerate-key] Calling backend /api/subscriptions/api-key');
    // Call the FastAPI backend endpoint to regenerate the API key
    const response = await fetch(`${backendUrl}/api/subscriptions/api-key`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        // No Content-Type needed for this POST request as it doesn't send a body
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[API /widget/regenerate-key] Backend error: ${response.status}`, data);
      return NextResponse.json(
        { error: data.detail || 'Failed to regenerate API key via backend' },
        { status: response.status }
      );
    }

    console.log('[API /widget/regenerate-key] Backend response OK:', data);
    // Return the new API key received from the backend
    return NextResponse.json({
      success: true,
      apiKey: data.api_key, // Ensure key matches backend response (ApiKeyResponse model)
      message: 'API key regenerated successfully'
    });
  } catch (error) {
    console.error('Error regenerating API key:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate API key' },
      { status: 500 }
    );
  }
}
