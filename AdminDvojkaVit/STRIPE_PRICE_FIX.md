# Using Your Existing Czech Crown (Kč) Price in Stripe

I can see that you already have a product in your Stripe dashboard with a price of 2500 Kč per month. I've updated the application to connect to this price.

## What Was Changed

1. **Updated Environment Variables**:
   - Set `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=price_1S0M6wR4qkxDUOaXBCa9bDaO` in `.env.local`
   - This connects your application to the existing 2500 Kč price in Stripe

2. **Updated Billing Page Display**:
   - Changed the displayed price from $100 to 2500 Kč
   - Updated currency symbol from $ to Kč

## Verifying Everything Works

1. **Check the Billing Page**:
   - Navigate to your billing page
   - Verify that it shows "2500 Kč" per month

2. **Test the Subscription Flow**:
   - Click the Subscribe button
   - When redirected to Stripe, verify the checkout shows 2500 Kč
   - This confirms that your application is correctly connected to your Stripe price

## If You See Issues

If the Stripe checkout still shows $19.99 or any other amount:

1. **Check Your Price ID**: Make sure the price ID in `.env.local` matches the ID of your 2500 Kč price in Stripe
   - In Stripe Dashboard, go to Products
   - Find your product with the 2500 Kč price
   - Click on the price to view details or use the ⋮ menu to copy the ID
   - It should match `price_1S0M6wR4qkxDUOaXBCa9bDaO`

2. **Restart Your Server**: Make sure you've restarted your Next.js development server after updating the environment variables

3. **Clear Browser Cache**: Try in an incognito window to avoid cached data

4. **Check Console Logs**: The checkout page now includes debug logging that will show what price ID is being used

## For Future Price Changes

If you need to change the price in the future:

1. Create a new price in Stripe with the desired amount
2. Copy the new price ID
3. Update the `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` in `.env.local`
4. Update the display price in `billing/page.jsx`
5. Restart your development server 