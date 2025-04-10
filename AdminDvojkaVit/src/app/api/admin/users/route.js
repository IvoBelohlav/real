import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const secret = process.env.NEXTAUTH_SECRET;
const backendUrl = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request) {
  try {
    console.log('[API /admin/users] GET request received');
    const token = await getToken({ req: request, secret });

    // 1. Authentication Check
    if (!token || !token.accessToken) {
      console.error("[API /admin/users] No token or accessToken found in session:", token);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }

    // 2. Authorization Check (Admin Only)
    // Assuming 'admin' tier signifies admin role
    if (token.subscription_tier !== 'admin') {
       console.warn(`[API /admin/users] Non-admin user ${token.email} attempted access.`);
       return NextResponse.json(
         { error: 'Forbidden - Admin access required' },
         { status: 403 }
       );
    }

    // 3. Backend Call (Placeholder - Endpoint needs implementation)
    console.warn('[API /admin/users] Backend endpoint for fetching users is not implemented. Returning empty list.');
    // TODO: Implement GET /api/admin/users in FastAPI backend
    // When implemented, the call would look like this:
    /*
    const { searchParams } = new URL(request.url);
    const response = await fetch(`${backendUrl}/api/admin/users?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'Content-Type': 'application/json',
        },
        cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
        console.error(`[API /admin/users] Backend error: ${response.status}`, data);
        return NextResponse.json(
            { error: data.detail || 'Failed to fetch users from backend' },
            { status: response.status }
        );
    }
    console.log('[API /admin/users] Backend response OK:', data);
    return NextResponse.json(data); // Return data directly from backend (users, pagination)
    */

    // Return empty list for now
    return NextResponse.json({
      users: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        pages: 0
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    console.log('[API /admin/users] POST request received');
    const token = await getToken({ req: request, secret });

    // 1. Authentication Check
    if (!token || !token.accessToken) {
      console.error("[API /admin/users] No token or accessToken found in session:", token);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }

    // 2. Authorization Check (Admin Only)
    if (token.subscription_tier !== 'admin') {
       console.warn(`[API /admin/users] Non-admin user ${token.email} attempted POST access.`);
       return NextResponse.json(
         { error: 'Forbidden - Admin access required' },
         { status: 403 }
       );
    }

    // 3. Parse request body
    const userData = await request.json();

    // Basic validation (backend should also validate thoroughly)
    if (!userData.email || !userData.name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // 4. Backend Call (Placeholder - Endpoint needs implementation)
    console.warn('[API /admin/users] Backend endpoint for creating users is not implemented. Returning mock success.');
    // TODO: Implement POST /api/admin/users in FastAPI backend
    // When implemented, the call would look like this:
    /*
    const response = await fetch(`${backendUrl}/api/admin/users`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error(`[API /admin/users] Backend error creating user: ${response.status}`, data);
        return NextResponse.json(
            { error: data.detail || 'Failed to create user via backend' },
            { status: response.status }
        );
    }
    console.log('[API /admin/users] Backend user creation OK:', data);
    return NextResponse.json(data, { status: response.status }); // Return data from backend
    */

    // Return mock success for now
    const mockNewUser = {
        id: `mock_user_${Date.now()}`,
        ...userData,
        role: userData.role || 'user',
        status: userData.status || 'active',
        createdAt: new Date().toISOString()
    };
    return NextResponse.json({
      success: true,
      user: mockNewUser
    }, { status: 201 }); // 201 Created

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
