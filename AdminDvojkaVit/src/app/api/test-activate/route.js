import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

// Helper function to generate a secure API key
function generateApiKey() {
  // Generate a random 32-byte hex string
  return 'ak_' + crypto.randomBytes(16).toString('hex');
}

// Helper function to generate widget embed code
function generateWidgetCode(apiKey) {
  const widgetScriptBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const html = `<!-- Widget Container -->
<div id="lermo-widget-container"></div>`;

  const javascript = `<!-- Lermo Widget Script -->
<script src="${widgetScriptBaseUrl}/widget.js" defer></script>
<script>
  window.lermoSettings = {
    apiKey: "${apiKey}",
    containerId: "lermo-widget-container"
    // theme: "light" // Optional: Add theme or other config from user settings
  };
</script>`;

  return { html, javascript };
}

export async function POST(request) {
  try {
    // Get user from session
    const session = await getServerSession();
    console.log('[/api/test-activate] Session data:', JSON.stringify(session, null, 2));
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user identifiers
    const userEmail = session.user.email;
    const userId = session.user.id;
    
    console.log(`[/api/test-activate] User email from session: "${userEmail}"`);
    console.log(`[/api/test-activate] User ID from session: "${userId || 'Not available'}"`);
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email missing in session' },
        { status: 400 }
      );
    }
    
    // Connect to the database
    const { db } = await connectToDatabase();
    
    // Get the user data - PRIORITIZE EMAIL LOOKUP
    let user = null;
    
    // Try with email first (more reliable)
    if (userEmail) {
      user = await db.collection('users').findOne({ email: userEmail });
      console.log(`[/api/test-activate] User lookup by email=${userEmail} result:`, user ? 'Found' : 'Not found');
    }
    
    // Fall back to ID lookup if email lookup fails
    if (!user && userId) {
      user = await db.collection('users').findOne({ id: userId });
      console.log(`[/api/test-activate] User lookup by id=${userId} result:`, user ? 'Found' : 'Not found');
    }
    
    if (!user) {
      console.error('[/api/test-activate] User not found. Creating new user with email');
      
      // Create a new user if not found
      const newUser = {
        email: userEmail,
        name: session.user.name || userEmail.split('@')[0],
        id: userId || `user_${Date.now().toString(36)}`,
        created_at: new Date(),
        updated_at: new Date(),
        subscription_status: 'inactive',
        subscription_tier: 'free'
      };
      
      try {
        const insertResult = await db.collection('users').insertOne(newUser);
        console.log('[/api/test-activate] Created new user:', insertResult.acknowledged);
        
        // Get the newly created user
        user = await db.collection('users').findOne({ _id: insertResult.insertedId });
        console.log('[/api/test-activate] Retrieved newly created user');
      } catch (createError) {
        console.error('[/api/test-activate] Failed to create new user:', createError);
        return NextResponse.json(
          { error: 'Failed to create user', details: createError.message },
          { status: 500 }
        );
      }
    }
    
    // Log full user data for debugging
    console.log('[/api/test-activate] Found user:', JSON.stringify({
      id: user.id,
      email: user.email,
      subscription_status: user.subscription_status,
      _id: user._id ? user._id.toString() : null
    }, null, 2));
    
    // Generate a test subscription ID
    const testSubscriptionId = `test_sub_${Date.now().toString(36)}`;
    const testCustomerId = `test_cus_${Date.now().toString(36)}`;
    
    // Calculate subscription end date (1 month from now)
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    
    // Always generate a fresh API key for test activation
    const apiKey = generateApiKey();
    
    // Generate widget embed code
    const embedCode = generateWidgetCode(apiKey);
    
    // Update user with test subscription data
    const updateResult = await db.collection('users').updateOne(
      { _id: user._id }, // Use MongoDB _id for reliable updates
      {
        $set: {
          subscription_status: 'active',
          subscription_tier: 'premium',
          api_key: apiKey,
          stripe_customer_id: testCustomerId,
          stripe_subscription_id: testSubscriptionId,
          stripeCustomerId: testCustomerId, // For compatibility
          stripeSubscriptionId: testSubscriptionId, // For compatibility
          subscription_end_date: subscriptionEndDate,
          updated_at: new Date()
        }
      }
    );
    
    console.log(`[/api/test-activate] Updated user: ${updateResult.matchedCount} matched, ${updateResult.modifiedCount} modified`);
    
    // Seed widget config if not present
    try {
      let userObjectId = user._id;
      
      const existingConfig = await db.collection('widget_configs').findOne({ user_id: userObjectId });
      console.log(`[/api/test-activate] Widget config lookup result:`, existingConfig ? 'Found' : 'Not found');
      
      if (!existingConfig) {
        const configResult = await db.collection('widget_configs').insertOne({
          user_id: userObjectId,
          theme: 'default',
          greeting: 'Hello! How can I help you?',
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log(`[/api/test-activate] Created default widget config, result:`, configResult.acknowledged);
      }
    } catch (configError) {
      console.error('[/api/test-activate] Error with widget config:', configError);
      // Continue even if config creation fails
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test subscription activated successfully',
      api_key: apiKey,
      subscription_status: 'active',
      subscription_tier: 'premium',
      embed_code: embedCode, // Return the embed code directly
      instructions: `
1. Your subscription has been activated successfully!
2. Your API key is: ${apiKey}
3. Copy the HTML and JavaScript code below to add the widget to your website.
4. The widget will be automatically configured with your API key.
      `
    });
    
  } catch (error) {
    console.error('[/api/test-activate] Error:', error);
    
    return NextResponse.json(
      { error: 'Failed to activate test subscription', details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
} 