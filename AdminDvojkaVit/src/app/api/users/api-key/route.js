import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const secret = process.env.NEXTAUTH_SECRET;

// GET API key for the current user from the session token
export async function GET(request) {
  try {
    console.log('[API /users/api-key] GET request received');
    const token = await getToken({ req: request, secret });

    if (!token) {
      console.error("[API /users/api-key] No token found in session");
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }

    const apiKey = token.api_key; // Get API key directly from the populated token

    if (!apiKey) {
      // This could happen if the user hasn't subscribed yet or if there was an issue during token population
      console.warn(`[API /users/api-key] API key not found in token for user ${token.email}`);
      return NextResponse.json(
        // Provide a clearer message to the frontend
        { apiKey: null, message: 'API key not available. Ensure subscription is active.' },
        { status: 200 } // Or 404 if preferred, but 200 with null might be easier for frontend
      );
    }

    console.log(`[API /users/api-key] Returning API key for user ${token.email}`);
    // Return only the API key
    return NextResponse.json({ apiKey: apiKey });

  } catch (error) {
    console.error('Error fetching API key from session:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching API key' },
      { status: 500 }
    );
  }
}

// POST and DELETE handlers are removed as key generation/regeneration
// is handled by the backend and the dedicated regenerate-key route.
// This route is solely for retrieving the current key from the session.
