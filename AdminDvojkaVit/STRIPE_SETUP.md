# Stripe Setup for 2500 Kč Plan

This document provides instructions on how to configure Stripe for the premium plan with a price of 2500 Kč per month.

## Create Stripe Account

1. Sign up for a Stripe account at [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register) if you don't have one already.
2. Once logged in, make sure you're in test mode for development (toggle in the top right).

## Create Product and Price

1. Navigate to **Products** in the Stripe dashboard sidebar.
2. Click **+ Add product**.
3. Set the following details:
   - **Name**: Premium Plan
   - **Description**: Complete solution for your website with unlimited widgets and domains.
   - **Pricing model**: Standard pricing
   - **Price**: 
     - **Amount**: 2500
     - **Currency**: CZK (Czech Koruna)
     - **Recurring**: Every month
   - **Additional options**: Set tax codes if applicable

4. Click **Save product**.

5. After saving, you'll see the product details page. Find the **API ID** for the price you just created. It will look like `price_1234567890abcdef`.

## Update Environment Variables

1. Copy the Price ID from the previous step.

2. Open `.env.local` file in your project root.

3. Update the following variable:
   ```
   NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=price_YOUR_PRICE_ID
   ```
   Replace `price_YOUR_PRICE_ID` with the actual Price ID from Stripe.

4. Also ensure you have the correct Stripe API keys:
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
   STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
   ```
   Replace these with your actual Stripe API keys found in the Stripe Dashboard under Developers > API keys.

## Test the Integration

1. Start your application.
2. Navigate to the Billing page.
3. Verify that only one plan (Premium Plan) is showing with the price of 2500 Kč/month.
4. Click Subscribe and complete the checkout flow using Stripe test cards:
   - For successful payment: `4242 4242 4242 4242`
   - For failed payment: `4000 0000 0000 0002`
   - Use any future expiry date, any 3-digit CVC, and any postal code.

## Moving to Production

When ready to go live:

1. Switch to live mode in the Stripe dashboard.
2. Repeat the product and price creation steps above in live mode.
3. Update your environment variables with the live API keys and Price ID.
4. Test thoroughly with a real payment method before announcing to customers. 