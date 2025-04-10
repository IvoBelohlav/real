import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Use the Stripe key directly to ensure it's correctly provided
const stripeKey = 'sk_test_51R7icNR4qkxDUOaXMU8AuG52RjokEYLQ8H4IbHHMYxrE2RGsBRwcue0HWS7oiIRP7U6m3CBGNVhFiCbAk5qasaaL00dKOcIlKX';
const stripe = new Stripe(stripeKey, {
  apiVersion: '2022-11-15'
});

export async function GET() {
  try {
    console.log('Fetching all available prices from Stripe');
    
    // List all active prices from Stripe
    const prices = await stripe.prices.list({
      active: true,
      limit: 100,
      expand: ['data.product']
    });
    
    // Format the prices for the frontend
    const formattedPrices = prices.data.map(price => ({
      id: price.id,
      nickname: price.nickname || 'No Name',
      currency: price.currency,
      unit_amount: price.unit_amount / 100,
      recurring: price.recurring,
      product: {
        id: price.product.id,
        name: price.product.name,
        description: price.product.description
      }
    }));
    
    console.log(`Found ${formattedPrices.length} active prices`);
    
    return NextResponse.json({
      success: true,
      prices: formattedPrices
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: `Failed to fetch prices: ${error.message}`,
        details: error.stack
      },
      { status: 500 }
    );
  }
} 