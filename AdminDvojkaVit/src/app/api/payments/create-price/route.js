import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Use the Stripe key directly to ensure it's correctly provided
const stripeKey = 'sk_test_51R7icNR4qkxDUOaXMU8AuG52RjokEYLQ8H4IbHHMYxrE2RGsBRwcue0HWS7oiIRP7U6m3CBGNVhFiCbAk5qasaaL00dKOcIlKX';
const stripe = new Stripe(stripeKey, {
  apiVersion: '2022-11-15'
});

export async function GET() {
  try {
    // Use the existing product ID from the Stripe dashboard
    const productId = 'prod_S28Td5oJHDylgE';
    
    // Check if there's already a price for this product
    const existingPrices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 1
    });
    
    // If there's an existing price, use it
    if (existingPrices.data.length > 0) {
      return NextResponse.json({
        success: true,
        price: {
          id: existingPrices.data[0].id,
          nickname: existingPrices.data[0].nickname || 'Premium Plan 2500 Kč',
          currency: existingPrices.data[0].currency,
          unit_amount: existingPrices.data[0].unit_amount / 100,
          recurring: existingPrices.data[0].recurring,
          product: existingPrices.data[0].product
        },
        message: 'Using existing price'
      });
    }
    
    // Create a new price for the product
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: 250000, // in cents (2500 * 100)
      currency: 'czk',
      recurring: {
        interval: 'month',
      },
      nickname: 'Premium Plan 2500 Kč'
    });
    
    return NextResponse.json({
      success: true,
      price: {
        id: price.id,
        nickname: price.nickname,
        currency: price.currency,
        unit_amount: price.unit_amount / 100,
        recurring: price.recurring,
        product: price.product
      },
      message: 'Successfully created a new price for 2500 Kč'
    });
  } catch (error) {
    console.error('Error creating price:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: `Failed to create price: ${error.message}`,
        details: error.stack
      },
      { status: 500 }
    );
  }
} 