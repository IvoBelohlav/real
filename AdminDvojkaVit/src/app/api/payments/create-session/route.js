import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Use the Stripe key directly to ensure it's correctly provided
const stripeKey = 'sk_test_51R7icNR4qkxDUOaXMU8AuG52RjokEYLQ8H4IbHHMYxrE2RGsBRwcue0HWS7oiIRP7U6m3CBGNVhFiCbAk5qasaaL00dKOcIlKX';
const stripe = new Stripe(stripeKey, {
  apiVersion: '2022-11-15'
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { priceId, email } = body;
    
    if (!priceId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing priceId in request body' 
        },
        { status: 400 }
      );
    }
    
    console.log(`Creating checkout session for price: ${priceId}, email: ${email}`);
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/dashboard/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/checkout?checkout_cancelled=true`,
      customer_email: email || undefined,
    });
    
    console.log('Checkout session created:', session.id);
    
    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Provide detailed error information for debugging
    return NextResponse.json(
      { 
        success: false,
        error: `Failed to create checkout session: ${error.message}`,
        details: error.stack
      },
      { status: 500 }
    );
  }
} 