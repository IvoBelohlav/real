import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt'; // Use getToken

const secret = process.env.NEXTAUTH_SECRET;
const backendUrl = process.env.NEXT_PUBLIC_API_URL;

// Helper function for admin check (copied from [userId]/route.js for consistency)
const checkAdminAuth = async (request) => {
  const token = await getToken({ req: request, secret });
  if (!token || !token.accessToken) {
    console.error("[API /admin/users/[userId]/status] No token or accessToken found in session:", token);
    return { error: 'Unauthorized - Invalid session', status: 401, token: null };
  }
  if (token.subscription_tier !== 'admin') {
     console.warn(`[API /admin/users/[userId]/status] Non-admin user ${token.email} attempted access.`);
     return { error: 'Forbidden - Admin access required', status: 403, token: null };
  }
  return { error: null, status: 200, token };
};

export async function PUT(request, { params }) {
  try {
    const { userId } = params;
    const { status } = await request.json(); // Extract status from body
    console.log(`[API /admin/users/${userId}/status] PUT request received with status: ${status}`);

    const authCheck = await checkAdminAuth(request);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    const { token } = authCheck;

    if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status provided' }, { status: 400 });
    }

    // --- Backend Call Placeholder ---
    console.warn(`[API /admin/users/${userId}/status] Backend endpoint PUT /api/admin/users/{userId}/status is not implemented. Returning mock success.`);
    // TODO: Implement PUT /api/admin/users/{userId}/status in FastAPI backend
    /*
    const response = await fetch(`${backendUrl}/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }), // Send only the status in the body
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to update user status');
    return NextResponse.json(data); // Return updated user data or success message
    */
    // Mock Response:
    return NextResponse.json({
        message: `User ${userId} status updated to ${status} (mock)`
    });
    // --- End Placeholder ---

  } catch (error) {
    console.error('Error updating user status:', error);
    
    // Handle specific error responses from the backend
    if (error.response) {
      return NextResponse.json(
        { error: error.response.data.detail || 'An error occurred while updating user status' },
        { status: error.response.status }
      );
    }
    
    // Handle network errors or other issues
    return NextResponse.json(
      { error: 'Failed to update user status' },
      { status: 500 }
    );
  }
}
