import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt'; // Use getToken
// import { getServerSession } from 'next-auth/next'; // Alternative
// import { authOptions } from '../auth/[...nextauth]/route'; // Not needed if using getToken
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb'; // Keep if user ID in DB is ObjectId

const secret = process.env.NEXTAUTH_SECRET;

export async function DELETE(request) {
  try {
    console.log('[API /users/account] DELETE request received');
    // const session = await getServerSession(authOptions); // Alternative
    const token = await getToken({ req: request, secret });

    if (!token || !token.id) { // Check for token and user ID
      console.error("[API /users/account] No token or user ID found in session:", token);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    const userId = token.id; // Use ID from NextAuth token
    // TODO: Consider converting userId to ObjectId if your DB uses ObjectIds for _id
    // const userObjectId = new ObjectId(userId);

    console.log(`[API /users/account] Attempting to delete account and associated data for user ID: ${userId}`);

    // --- Deletion Logic ---
    // NOTE: This cascading delete logic might be better handled by a dedicated backend endpoint
    //       to ensure atomicity and separation of concerns.
    
    // Delete user's data in various collections
    // This should be a transaction or at least a series of operations
    // to ensure data consistency
    
    // Delete user's widget configurations
    await db.collection('widget_configs').deleteMany({ user_id: userId });
    
    // Delete user's contact submissions
    await db.collection('contact_submissions').deleteMany({ user_id: userId });
    
    // Delete user's API keys
    await db.collection('api_keys').deleteMany({ user_id: userId });
    
    // Delete user's authorized domains
    await db.collection('authorized_domains').deleteMany({ user_id: userId });
    
    // Delete user's conversations and logs
    await db.collection('conversations').deleteMany({ user_id: userId });
    await db.collection('logs').deleteMany({ user_id: userId });
    
    // Delete user's subscriptions and billing info
    await db.collection('subscriptions').deleteMany({ user_id: userId });
    await db.collection('invoices').deleteMany({ user_id: userId });
    
    // Finally delete the user account
    await db.collection('users').deleteOne({ _id: userId });
    
    return NextResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
