import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt'; // Use getToken

const secret = process.env.NEXTAUTH_SECRET;
const backendUrl = process.env.NEXT_PUBLIC_API_URL;

// Changed to POST to match backend endpoint method
export async function POST(request) {
  try {
    console.log('[API /users/password] POST request received');
    const token = await getToken({ req: request, secret });

    if (!token || !token.accessToken) {
      console.error("[API /users/password] No token or accessToken found in session:", token);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    // Basic validation (backend should also validate)
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    console.log('[API /users/password] Calling backend /api/users/change-password');
    // Call the FastAPI backend endpoint
    const response = await fetch(`${backendUrl}/api/users/change-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[API /users/password] Backend error: ${response.status}`, data);
      // Pass backend error message through
      return NextResponse.json(
        { error: data.detail || 'Failed to change password via backend' },
        { status: response.status }
      );
    }

    console.log('[API /users/password] Backend response OK:', data);
    return NextResponse.json(
      { message: data.message || 'Password changed successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
