# SaaS Multi-Tenant Deployment Guide

This guide provides step-by-step instructions for deploying the SaaS-enabled Lermo platform with multi-tenant support.

## Prerequisites

- MongoDB database (Atlas recommended for production)
- Node.js v16+ and npm v8+
- Python 3.9+
- Stripe account with API keys
- Domain name with SSL certificate (for production)

## Environment Setup

### Backend Environment Variables

Create a `.env` file in the FastAPI backend directory with the following variables:

```
# MongoDB Connection
MONGODB_URL=mongodb+srv://username:password@your-cluster.mongodb.net/lermo
MONGODB_NAME=lermo

# Authentication
SECRET_KEY=your-secret-key-at-least-32-chars-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Stripe Integration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
STRIPE_PRICE_ID=price_your_subscription_price_id

# Email Configuration (for verification and password reset)
MAIL_USERNAME=your-email@example.com
MAIL_PASSWORD=your-email-password
MAIL_FROM=your-email@example.com
MAIL_PORT=587
MAIL_SERVER=smtp.example.com
MAIL_TLS=True
MAIL_SSL=False

# Frontend URLs
FRONTEND_URL=https://your-frontend-domain.com
CUSTOMER_PORTAL_URL=https://your-customer-portal.com

# CORS Settings
CORS_ORIGINS=https://your-frontend-domain.com,https://other-approved-domain.com
```

### Frontend Environment Variables

Create a `.env` file in the React frontend directory:

```
REACT_APP_API_URL=https://your-backend-api.com
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
```

## Database Setup

1. Create a MongoDB database named `lermo`
2. The application will automatically create necessary collections and indexes on startup

## Deployment Steps

### Backend Deployment

1. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Initialize the database with required indexes:
   ```bash
   python -m app.init_db
   ```

3. Start the FastAPI application:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

   For production, use Gunicorn with Uvicorn workers:
   ```bash
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
   ```

### Frontend Dashboard Deployment

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Build the production version:
   ```bash
   npm run build
   ```

3. Serve the build directory with Nginx or a similar web server

### Lermo Widget Deployment

1. Install dependencies:
   ```bash
   cd Lermo
   npm install
   ```

2. Build the widget:
   ```bash
   npm run build
   ```

3. Deploy the widget build to a CDN or static file server

## Stripe Configuration

1. Create products and price plans in your Stripe dashboard
2. Set up webhook endpoints for subscription events:
   - `https://your-backend-api.com/api/webhooks/stripe`
   - Subscribe to these events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `checkout.session.completed`

## Post-Deployment Verification

1. Create a test user account through the signup endpoint
2. Verify API key generation and authentication
3. Test multi-tenant data isolation by creating multiple accounts
4. Verify subscription workflows with test payment methods
5. Test the Lermo widget with user-specific API keys

## Load Balancing and Scaling (Production)

For production deployments with high traffic:

1. Use a load balancer (AWS ALB, Nginx, etc.) for the backend
2. Configure auto-scaling based on CPU/memory usage
3. Set up database sharding and replication for MongoDB
4. Implement a caching layer (Redis) for frequently accessed data
5. Use a CDN for serving the widget JavaScript files

## Backup and Disaster Recovery

1. Configure MongoDB Atlas backups or implement your own backup strategy
2. Create automated backup scripts for critical data
3. Test restore procedures regularly
4. Implement monitoring and alerting for system health

## Security Recommendations

1. Enable MongoDB authentication and use TLS connections
2. Regularly rotate API keys and secrets
3. Implement IP-based rate limiting
4. Set up continuous security scanning
5. Enable HTTPS for all communication
6. Configure proper Content Security Policy (CSP) headers

## Troubleshooting

- If MongoDB connection fails, verify network access and credentials
- For authentication issues, check the JWT secret key and algorithm
- If Stripe webhooks aren't working, verify the webhook secret and event subscriptions
- For CORS errors, ensure all client domains are added to the allowed origins list 