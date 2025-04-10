import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getTierFromPriceId, generateApiKey } from '@/lib/stripe-server'; // Reuse functions

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function POST(request) {
  console.log("[API verify-session] Received request");
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      console.error("[API verify-session] Missing sessionId in request body");
      return NextResponse.json({ success: false, error: 'Missing session ID' }, { status: 400 });
    }

    console.log(`[API verify-session] Verifying session: ${sessionId}`);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription'], // Expand subscription details if needed later
    });

    console.log(`[API verify-session] Retrieved session status: ${session.status}, payment_status: ${session.payment_status}`);

    // Check if payment was successful
    if (session.payment_status === 'paid' && session.status === 'complete') {
      const userIdString = session.metadata?.userId;
      const stripeSubscriptionId = session.subscription?.id || session.subscription; // Handle expanded vs non-expanded
      const stripeCustomerId = session.customer;
      const subscriptionDetails = session.subscription; // Contains status, period dates etc.

      console.log(`[API verify-session] Session paid. User ID: ${userIdString}, Sub ID: ${stripeSubscriptionId}, Cust ID: ${stripeCustomerId}`);


      if (!userIdString || !stripeSubscriptionId || !stripeCustomerId || !subscriptionDetails) {
         console.error("[API verify-session] Error: Missing required data from paid session.", { userIdString, stripeSubscriptionId, stripeCustomerId, subscriptionDetails });
         return NextResponse.json({ success: false, error: 'Incomplete session data from Stripe' }, { status: 500 });
      }

      // --- Perform Database Updates (Similar to Webhook) ---
      const { db } = await connectToDatabase();
      let userObjectId;
       try {
            userObjectId = new ObjectId(userIdString);
        } catch (e) {
             console.error(`[API verify-session] Error: Invalid userId format in metadata: ${userIdString}`);
             return NextResponse.json({ success: false, error: 'Invalid user ID format' }, { status: 400 });
        }

      const apiKey = generateApiKey();
      const priceId = subscriptionDetails.items.data[0]?.price?.id;
      const subscriptionTier = getTierFromPriceId(priceId);
      const subscriptionStatus = subscriptionDetails.status; // e.g., 'active', 'trialing'

      console.log(`[API verify-session] Updating DB for user ${userIdString} (_id: ${userObjectId}). Status: ${subscriptionStatus}, Tier: ${subscriptionTier}`);

      // Update User Record
      const userUpdateResult = await db.collection('users').updateOne(
        { _id: userObjectId },
        {
          $set: {
            subscriptionStatus: subscriptionStatus,
            subscription_tier: subscriptionTier,
            api_key: apiKey,
            stripeCustomerId: stripeCustomerId,
            stripeSubscriptionId: stripeSubscriptionId,
            updatedAt: new Date(),
          },
        }
      );
      console.log(`[API verify-session] User update result: Matched: ${userUpdateResult.matchedCount}, Modified: ${userUpdateResult.modifiedCount}`);


      if (userUpdateResult.matchedCount === 0) {
        console.error(`[API verify-session] User not found in DB for update: ${userIdString}`);
        // Don't necessarily fail the whole request, but log it. The user might exist but ID mismatch?
      }

      // Upsert Subscription Record
       const subUpsertResult = await db.collection('subscriptions').updateOne(
          { stripeSubscriptionId: stripeSubscriptionId },
          {
            $set: {
                stripePriceId: priceId,
                stripeCustomerId: stripeCustomerId,
                status: subscriptionStatus,
                currentPeriodStart: new Date(subscriptionDetails.current_period_start * 1000),
                currentPeriodEnd: new Date(subscriptionDetails.current_period_end * 1000),
                createdAt: new Date(subscriptionDetails.created * 1000),
                updatedAt: new Date()
            },
            $setOnInsert: {
                 userId: userObjectId // Store ObjectId
            }
          },
          { upsert: true }
        );
       console.log(`[API verify-session] Subscription upsert result: Matched: ${subUpsertResult.matchedCount}, Modified: ${subUpsertResult.modifiedCount}, Upserted: ${subUpsertResult.upsertedCount}`);


      // Seed Widget Config (Optional but good practice)
       const widgetConfigCollection = db.collection('widget_configs');
       const existingConfig = await widgetConfigCollection.findOne({ user_id: userObjectId });
       if (!existingConfig) {
            const defaultConfig = {
                user_id: userObjectId,
                theme: 'default',
                greeting: 'Hello! How can I help you?',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await widgetConfigCollection.insertOne(defaultConfig);
            console.log(`[API verify-session] Seeded default widget config for user ${userIdString}`);
       }

      console.log(`[API verify-session] Successfully verified and updated DB for session ${sessionId}`);
      return NextResponse.json({ success: true, message: 'Subscription activated successfully.' });

    } else {
      console.log(`[API verify-session] Session ${sessionId} not paid or not complete. Status: ${session.status}, Payment Status: ${session.payment_status}`);
      return NextResponse.json({ success: false, error: 'Checkout session not successfully paid.' }, { status: 400 });
    }
  } catch (error) {
    console.error('[API verify-session] Error verifying session:', error);
    return NextResponse.json(
      { success: false, error: `Failed to verify session: ${error.message}` },
      { status: 500 }
    );
  }
}
