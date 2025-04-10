# Stripe Integration Architecture

## Overview

This document describes the architecture for handling Stripe subscriptions and webhooks in our application. We use a two-tiered approach where:

1. Next.js frontend receives and validates webhook events from Stripe
2. FastAPI backend handles database updates and business logic

## Webhook Flow

```
+-------------+       +----------------+       +----------------+
|             |       |                |       |                |
|   Stripe    +------>+    Next.js     +------>+    FastAPI     |
|             |       |    Webhook     |       |    Webhook     |
|             |       |    Handler     |       |    Handler     |
+-------------+       +----------------+       +----------------+
                      |                |       |                |
                      | 1. Verify      |       | 1. Process     |
                      |    Signature   |       |    Event       |
                      | 2. Log Event   |       | 2. Update DB   |
                      | 3. Forward     |       | 3. Generate    |
                      |    to FastAPI  |       |    API Key     |
                      |                |       | 4. Seed Data   |
                      +----------------+       +----------------+
```

## Advantages of This Architecture

1. **Improved Reliability**: The FastAPI backend is more stable for database operations
2. **Separation of Concerns**: Next.js handles webhook verification, FastAPI handles business logic
3. **Security**: Only verified webhook events reach the database
4. **Idempotency**: FastAPI ensures events are processed only once

## Implementation Details

### Next.js Webhook Handler (`/api/webhooks/stripe/route.js`)

The Next.js webhook handler:
- Receives webhook events from Stripe
- Verifies the signature using the webhook secret
- Forwards verified events to the FastAPI backend
- Handles errors and returns appropriate responses to Stripe

### FastAPI Internal Webhook Handler (`/subscriptions/internal/stripe-webhook`)

The FastAPI webhook handler:
- Authenticates requests using a shared internal secret
- Processes different event types (`checkout.session.completed`, `invoice.payment_succeeded`, etc.)
- Updates the user's subscription status, tier, and API key
- Creates/updates subscription records
- Seeds initial data for new subscriptions
- Ensures idempotency by tracking processed events

## Event Types Handled

1. **checkout.session.completed**
   - Creates new subscription
   - Generates API key
   - Seeds initial widget configuration

2. **invoice.payment_succeeded**
   - Updates subscription status
   - Updates subscription end date

3. **customer.subscription.updated**
   - Updates subscription tier and status
   - Handles cancellation requests

4. **customer.subscription.deleted**
   - Downgrades to free tier
   - Marks subscription as canceled

## Security Considerations

1. **Signature Verification**: Only events with valid signatures from Stripe are processed
2. **Internal Secret**: Communication between Next.js and FastAPI is secured with a shared secret
3. **Error Handling**: Errors are logged and don't expose sensitive information

## Testing

Use the Stripe CLI to simulate webhook events during development:

```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

## Environment Variables

Refer to the `ENV_CONFIG_CHECKLIST.md` file for the required environment variables.

## Troubleshooting

- Check logs in both Next.js and FastAPI for detailed error messages
- Verify event forwarding by looking for "Forwarding event" logs in Next.js
- Verify event processing by looking for "Successfully processed" logs in FastAPI 