import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
// Removed import for handleStripeWebhookEvent

// Disable body parsing for this route since we need the raw body for Stripe signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize Stripe with the API secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Use the API version your integration is built against
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const fastApiUrl = process.env.FASTAPI_URL; // Get FastAPI URL from env
const internalSecret = process.env.INTERNAL_SECRET; // Get Internal Secret from env

export async function POST(request) {
  // Log webhook receipt for debugging
  console.log("!!! STRIPE WEBHOOK ENDPOINT HIT !!!");
  console.log(`STRIPE_WEBHOOK_SECRET: ${webhookSecret ? 'Present (Masked)' : 'MISSING!'}`);

  try {
    // Get the raw request body for signature verification
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    console.log("[Webhook] Received body length:", body.length);
    console.log("[Webhook] Received signature:", signature);
    
    // Log partial body content safely (first 100 chars)
    const safeBodyPreview = body.substring(0, 100) + '...';
    console.log("[Webhook] Body preview:", safeBodyPreview);

    // Validate that we received a signature header
    if (!signature) {
       console.error("[Webhook] Error: Missing stripe-signature header");
       return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }
    
    // Validate that the webhook secret is configured
    if (!webhookSecret) {
       console.error("[Webhook] Error: Missing STRIPE_WEBHOOK_SECRET environment variable");
       return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    let event;
    try {
      // Verify the event signature using Stripe's library
      // This ensures the event came from Stripe and wasn't tampered with
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log("[Webhook] Event constructed successfully:", event.type, event.id);
      
      // Log important details about the event
      if (event.data && event.data.object) {
        const eventObj = event.data.object;
        console.log("[Webhook] Event object type:", eventObj.object);
        console.log("[Webhook] Event metadata:", eventObj.metadata || 'None');
        
        if (eventObj.customer) {
          console.log("[Webhook] Customer ID:", eventObj.customer);
        }
        
        if (eventObj.subscription) {
          console.log("[Webhook] Subscription ID:", eventObj.subscription);
        }
      }
    } catch (err) {
      // If signature verification fails, return a 400 error
      console.error(`[Webhook] Signature verification failed: ${err.message}`);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // After successfully verifying the event signature, forward to FastAPI
    // This is the key architectural change - database operations are now handled by FastAPI
    if (!fastApiUrl || !internalSecret) {
      console.error("[Webhook] Error: FASTAPI_URL or INTERNAL_SECRET environment variables not set.");
      return NextResponse.json({ error: 'Internal configuration error' }, { status: 500 });
    }

    // Define the endpoint URL for the FastAPI webhook handler
    const internalWebhookUrl = `${fastApiUrl}/webhooks/stripe`; // Corrected endpoint
    console.log(`[Webhook] Forwarding event ${event.id} (${event.type}) to FastAPI: ${internalWebhookUrl}`);

    try {
      // Forward the verified event to FastAPI with the internal secret for authentication
      const response = await fetch(internalWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret, // Add the shared secret header for secure communication
        },
        body: JSON.stringify(event), // Send the full event object
      });

      const responseBody = await response.json(); // Read response body once

      if (!response.ok) {
        // If FastAPI returns an error, log it and return it to Stripe
        console.error(`[Webhook] FastAPI Error (${response.status}):`, responseBody.detail || 'Unknown error');
        return NextResponse.json({ error: `FastAPI processing failed: ${responseBody.detail || 'Unknown error'}` }, { status: response.status });
      }

      // If successful, log and return success to Stripe
      console.log(`[Webhook] Event ${event.id} successfully forwarded and processed by FastAPI.`);
      return NextResponse.json({ received: true, forwarded: true, fastapi_response: responseBody }); // Return success

    } catch (fetchError) {
      // Handle network errors or other issues when forwarding to FastAPI
      console.error(`[Webhook] Error forwarding event ${event.id} to FastAPI:`, fetchError);
      return NextResponse.json({ error: 'Failed to forward webhook event to internal service' }, { status: 500 });
    }

  } catch (error) {
    // Catch errors from signature verification or initial request reading
    console.error('[Webhook] Error processing webhook request:', error);
    return NextResponse.json(
      { error: 'Failed to handle webhook' },
      { status: 500 }
    );
  }
}

// NOTE: Database update logic is now handled by the FastAPI internal webhook endpoint.
// This Next.js route is only responsible for signature verification and forwarding.
