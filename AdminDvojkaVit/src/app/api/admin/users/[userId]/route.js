import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt'; // Use getToken

const secret = process.env.NEXTAUTH_SECRET;
const backendUrl = process.env.NEXT_PUBLIC_API_URL;

// Helper function for admin check
const checkAdminAuth = async (request) => {
  const token = await getToken({ req: request, secret });
  if (!token || !token.accessToken) {
    console.error("[API /admin/users/[userId]] No token or accessToken found in session:", token);
    return { error: 'Unauthorized - Invalid session', status: 401, token: null };
  }
  if (token.subscription_tier !== 'admin') {
     console.warn(`[API /admin/users/[userId]] Non-admin user ${token.email} attempted access.`);
     return { error: 'Forbidden - Admin access required', status: 403, token: null };
  }
  return { error: null, status: 200, token };
};


export async function GET(request, { params }) {
  try {
    const { userId } = params;
    console.log(`[API /admin/users/${userId}] GET request received`);

    const authCheck = await checkAdminAuth(request);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    const { token } = authCheck;

    // --- Backend Call Placeholder ---
    console.warn(`[API /admin/users/${userId}] Backend endpoint GET /api/admin/users/{userId} is not implemented. Returning mock data.`);
    // TODO: Implement GET /api/admin/users/{userId} in FastAPI backend
    /*
    const response = await fetch(`${backendUrl}/api/admin/users/${userId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token.accessToken}` },
        cache: 'no-store',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to fetch user');
    return NextResponse.json(data);
    */
    // Mock Response:
    return NextResponse.json({
        id: userId,
        name: `Mock User ${userId}`,
        email: `mock_${userId}@example.com`,
        role: 'user', // or fetch actual role if needed
        status: 'active',
        createdAt: new Date().toISOString()
    });
    // --- End Placeholder ---

  } catch (error) {
    console.error('Error fetching user details:', error);
    
    // Handle specific error responses from the backend
    if (error.response) {
      return NextResponse.json(
        { error: error.response.data.detail || 'An error occurred while fetching user details' },
        { status: error.response.status }
      );
    }
    
    // Handle network errors or other issues
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { userId } = params;
    const userData = await request.json();
    console.log(`[API /admin/users/${userId}] PUT request received with data:`, userData);

    const authCheck = await checkAdminAuth(request);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    const { token } = authCheck;

    // --- Backend Call Placeholder ---
    console.warn(`[API /admin/users/${userId}] Backend endpoint PUT /api/admin/users/{userId} is not implemented. Returning mock success.`);
    // TODO: Implement PUT /api/admin/users/{userId} in FastAPI backend
    /*
    const response = await fetch(`${backendUrl}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to update user');
    return NextResponse.json(data);
    */
    // Mock Response:
    return NextResponse.json({
        id: userId,
        ...userData, // Echo back updated data
        message: "User updated successfully (mock)"
    });
    // --- End Placeholder ---
  } catch (error) {
    console.error('Error updating user:', error);
    
    // Handle specific error responses from the backend
    if (error.response) {
      return NextResponse.json(
        { error: error.response.data.detail || 'An error occurred while updating user' },
        { status: error.response.status }
      );
    }
    
    // Handle network errors or other issues
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { userId } = params;
    console.log(`[API /admin/users/${userId}] DELETE request received`);

    const authCheck = await checkAdminAuth(request);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    const { token } = authCheck;

    // --- Backend Call Placeholder ---
    console.warn(`[API /admin/users/${userId}] Backend endpoint DELETE /api/admin/users/{userId} is not implemented. Returning mock success.`);
    // TODO: Implement DELETE /api/admin/users/{userId} in FastAPI backend
    /*
    const response = await fetch(`${backendUrl}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token.accessToken}` },
    });
    // Check response status, maybe no content on success (204)
    if (!response.ok && response.status !== 204) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete user');
    }
    return NextResponse.json({ success: true, message: 'User deleted successfully' });
    */
    // Mock Response:
    return NextResponse.json({ success: true, message: 'User deleted successfully (mock)' });
    // --- End Placeholder ---
  } catch (error) {
    console.error('Error deleting user:', error);
    
    // Handle specific error responses from the backend
    if (error.response) {
      return NextResponse.json(
        { error: error.response.data.detail || 'An error occurred while deleting user' },
        { status: error.response.status }
      );
    }
    
    // Handle network errors or other issues
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
