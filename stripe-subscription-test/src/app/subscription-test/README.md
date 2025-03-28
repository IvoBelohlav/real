# Lermo AI Widget Subscription Test Page

This is a minimal Next.js test page for demonstrating Stripe subscription integration and widget snippet generation for the Lermo AI Widget SaaS platform.

## Features

- User ID input for testing
- Stripe subscription checkout flow
- Automatic widget snippet generation
- Status updates and error handling
- Responsive Tailwind design

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root of your Next.js project with:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PRICE_ID=price_your_price_id_here
```

### 2. Backend Configuration

Ensure your FastAPI backend has the following environment variables set:

```
STRIPE_SECRET_KEY=sk_test_your_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
FRONTEND_URL=http://localhost:3000
```

### 3. Stripe Configuration

1. Create a test product and price in the Stripe dashboard
2. Update the `NEXT_PUBLIC_STRIPE_PRICE_ID` in `.env.local` with your actual price ID
3. Set up the Stripe CLI for webhook forwarding:
   ```
   stripe listen --forward-to http://localhost:8000/api/webhooks/stripe
   ```

## Usage Flow

1. Enter a Test User ID (can be any string, e.g. "test123")
2. Click "Subscribe (Test)" which redirects to Stripe Checkout
3. Use a [Stripe test card](https://stripe.com/docs/testing) (e.g. 4242 4242 4242 4242)
4. Upon successful payment, you'll be redirected back
5. The page will automatically poll for the widget snippet
6. Once generated, copy the snippet to embed the widget in your site

## API Endpoints Required

The test page expects these backend API endpoints:

1. `POST /api/payments/create-checkout-session`
   - Input: `{ user_id: string, price_id: string }`
   - Output: `{ checkout_url: string }`

2. `GET /api/widget-snippet?user_id=xxx`
   - Output: `{ snippet: string, status: string }`

## Testing Notes

- All subscriptions are created in Stripe test mode
- No actual charges will be processed
- The backend will create a test user if one doesn't exist
- The snippet includes a test API key for widget authentication
- The system uses user_id for test authentication (in production, use proper auth)

## Development

To run the development server:

```bash
npm run dev
```

Visit http://localhost:3000/subscription-test to see the page in action. 