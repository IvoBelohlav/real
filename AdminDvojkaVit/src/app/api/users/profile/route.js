import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt'; // Import getToken

const secret = process.env.NEXTAUTH_SECRET; // Ensure NEXTAUTH_SECRET is set

export async function GET(request) {
  try {
    // Get token from NextAuth session
    const token = await getToken({ req: request, secret });

    if (!token || !token.accessToken) {
      console.error("[API /users/profile GET] No token or accessToken found in session:", token);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }

    // Make request to FastAPI backend using the accessToken from the session
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
      headers: {
        'Authorization': `Bearer ${token.accessToken}` // Use token from NextAuth
      },
      cache: 'no-store', // Ensure fresh data is fetched
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.detail || 'Failed to get user profile' },
        { status: response.status }
      );
    }
    
    const userData = await response.json();
    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error getting user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Get token from NextAuth session
    const token = await getToken({ req: request, secret });

    if (!token || !token.accessToken) {
      console.error("[API /users/profile PUT] No token or accessToken found in session:", token);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }

    // Get profile data from request
    const data = await request.json();

    // Make request to FastAPI backend using the accessToken from the session
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`, // Use token from NextAuth
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.detail || 'Failed to update user profile' },
        { status: response.status }
      );
    }
    
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
