import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request) {
  try {
    // Get session data
    const session = await getServerSession();
    console.log('[Debug] Session data:', JSON.stringify(session, null, 2));
    
    // If no session, return error
    if (!session) {
      return NextResponse.json(
        { 
          error: 'No active session found',
          authenticated: false 
        },
        { status: 401 }
      );
    }
    
    // Connect to database to look up user
    const { db } = await connectToDatabase();
    
    // Attempt to find user by id
    let user = null;
    let foundBy = [];
    
    if (session.user.id) {
      user = await db.collection('users').findOne({ id: session.user.id });
      if (user) foundBy.push(`id: ${session.user.id}`);
    }
    
    // If not found by id, try email
    if (!user && session.user.email) {
      user = await db.collection('users').findOne({ email: session.user.email });
      if (user) foundBy.push(`email: ${session.user.email}`);
    }
    
    // Prepare response object with safe user data
    const responseData = {
      authenticated: true,
      session: {
        expires: session.expires,
        userId: session.user?.id,
        email: session.user?.email,
        name: session.user?.name
      },
      databaseUser: user ? {
        id: user.id,
        email: user.email,
        subscription_status: user.subscription_status,
        subscription_tier: user.subscription_tier,
        hasApiKey: !!user.api_key,
        hasStripeCustomerId: !!(user.stripe_customer_id || user.stripeCustomerId),
        hasStripeSubscriptionId: !!(user.stripe_subscription_id || user.stripeSubscriptionId),
        _id: user._id ? user._id.toString() : null,
        foundBy: foundBy
      } : null
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[Debug] Error:', error);
    return NextResponse.json(
      { 
        error: 'Error retrieving session data',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
} 