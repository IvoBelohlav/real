import { NextResponse } from 'next/server';
import { getUserFromToken } from '../../../../lib/jwt-helpers';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper function to extract user from authorization header
async function getUserFromHeader(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      return null;
    }
    
    // Get JWT secret from environment or use fallback
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_development';
    
    // Verify and decode the token
    const decoded = jwt.verify(token, jwtSecret);
    
    // Extract user information
    const userId = decoded.sub || decoded.userId || decoded.id;
    const email = decoded.email || 'user@example.com';
    
    if (!userId) {
      console.error('Token missing user ID');
      return null;
    }
    
    return {
      id: userId,
      email: email,
      authenticated: true
    };
  } catch (error) {
    console.error('Error verifying token from header:', error);
    return null;
  }
}

export async function POST(request) {
  try {
    // Try to get user from cookies first
    let user = await getUserFromToken();
    
    // If that fails, try to get from authorization header
    if (!user) {
      user = await getUserFromHeader(request);
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to create a checkout session' },
        { status: 401 }
      );
    }

    const requestData = await request.json();
    const { priceId } = requestData;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    // Use the price ID directly from the request
    // This ensures we're using the correct price ID for 2500 Kč
    console.log('Creating checkout session with price ID:', priceId);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/billing?canceled=true`,
      customer_email: user.email || 'customer@example.com',
      client_reference_id: user.id,
    });

    // Return the session ID and checkout URL
    return NextResponse.json({ 
      sessionId: session.id,
      checkout_url: session.url 
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 