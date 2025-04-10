import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';

// Generate a secure API key
const generateApiKey = (length = 32) => {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};

export async function POST(request) {
  try {
    // Get user from session or request
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Generate an API key
    const apiKey = generateApiKey();
    
    // Connect to the database
    const { db } = await connectToDatabase();
    
    console.log(`[Manual Activation] Activating subscription for user ${userId}`);
    
    // Update user record to activate subscription
    const result = await db.collection('users').updateOne(
      { id: userId },
      {
        $set: {
          subscription_status: "active",
          subscription_tier: "premium",
          api_key: apiKey,
          stripeSubscriptionId: "manual_activation_" + Date.now(),
          subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`[Manual Activation] Database update result: ${result.matchedCount} matched, ${result.modifiedCount} modified`);
    
    if (result.matchedCount === 0) {
      console.error(`[Manual Activation] User not found: ${userId}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    if (result.modifiedCount === 0) {
      console.warn(`[Manual Activation] User found but not modified: ${userId}`);
      // Continue anyway as this might be because the user is already activated
    }
    
    // Return success
    return NextResponse.json({
      success: true,
      message: 'Subscription activated successfully',
      subscription: {
        status: 'active',
        tier: 'premium',
        api_key: apiKey
      }
    });
    
  } catch (error) {
    console.error('[Manual Activation] Error activating subscription:', error);
    
    return NextResponse.json(
      { error: 'Failed to activate subscription', details: error.message },
      { status: 500 }
    );
  }
} 