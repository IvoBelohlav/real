import { NextResponse } from 'next/server';
import { getUserFromToken } from '../../../lib/jwt-helpers';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET(request) {
  try {
    const user = await getUserFromToken();
    
    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to view subscription data' },
        { status: 401 }
      );
    }

    // For demonstration purposes, we'll return mock subscription data
    // In production, you would look up the customer in your database
    // and fetch their subscription from Stripe
    
    // Try to find existing customer for this user
    let subscription = null;
    
    try {
      const customers = await stripe.customers.list({
        email: user.email || 'customer@example.com',
        limit: 1,
      });
      
      if (customers.data.length > 0) {
        const customerId = customers.data[0].id;
        
        // Fetch subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 1,
          status: 'all',
        });
        
        if (subscriptions.data.length > 0) {
          subscription = subscriptions.data[0];
        }
      }
    } catch (error) {
      console.error('Error fetching Stripe subscription:', error);
      // Don't create mock data - return null to show no subscription
      subscription = null;
    }
    
    // Return the subscription data
    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('Error fetching subscription data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription data' },
      { status: 500 }
    );
  }
} 