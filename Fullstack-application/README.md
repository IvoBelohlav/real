# Lermo AI Widget SaaS Platform

## Overview

The Lermo AI Widget SaaS Platform is a secure, multi-tenant solution that enables businesses to offer the Lermo AI Chat Widget as a service to their customers. This platform provides:

- User self-service signup and management
- Subscription-based access with Stripe integration
- Secure API key generation and validation
- Multi-tenant data isolation
- Customizable widget configuration per tenant

## Project Structure

```
Fullstack-application/
├── backend/               # FastAPI backend
│   ├── app/               # Application code
│   │   ├── api/           # API endpoints
│   │   ├── core/          # Core functionality
│   │   ├── db/            # Database connections
│   │   ├── models/        # Data models
│   │   └── utils/         # Utility functions
│   ├── requirements.txt   # Python dependencies
│   └── .env               # Environment variables
├── frontend/              # React management dashboard
│   ├── public/            # Static assets
│   ├── src/               # Source code
│   │   ├── components/    # UI components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   └── services/      # API services
│   ├── package.json       # Node.js dependencies
│   └── .env               # Environment variables
├── Lermo/                 # Lermo AI Chat Widget
│   ├── public/            # Static assets
│   ├── src/               # Source code
│   │   ├── components/    # Widget components
│   │   ├── services/      # API services
│   │   └── styles/        # CSS Modules
│   └── package.json       # Node.js dependencies
├── mongodb-indexes.md     # MongoDB index documentation
├── saas-implementation-summary.md  # Implementation details
└── saas-deployment-guide.md       # Deployment instructions
```

## Key Features

### Multi-Tenancy

- Each customer has isolated data and configurations
- MongoDB indexes ensure secure and efficient data access
- All API endpoints filter data by user_id

### Authentication & Security

- JWT-based authentication for the management dashboard
- API key authentication for the widget
- Role-based access control (admin, customer)
- Secure password handling with bcrypt

### Subscription Management

- Stripe integration for payment processing
- Subscription status tracking
- Automatic API key revocation for expired subscriptions
- Customer portal for subscription management

### Widget Customization

- Per-tenant widget configuration
- CSS Modules for style isolation
- Branding customization options
- Product catalog management

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/lermo-saas.git
   cd lermo-saas
   ```

2. Set up the backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   cp .env.example .env  # Edit with your configuration
   ```

3. Set up the frontend dashboard:
   ```bash
   cd frontend
   npm install
   cp .env.example .env  # Edit with your configuration
   ```

4. Set up the Lermo widget:
   ```bash
   cd Lermo
   npm install
   ```

5. Start development servers:
   ```bash
   # In backend directory
   uvicorn app.main:app --reload

   # In frontend directory
   npm start

   # In Lermo directory
   npm start
   ```

6. Open your browser:
   - Management Dashboard: http://localhost:3000
   - Lermo Widget Demo: http://localhost:3001

## Documentation

- [Deployment Guide](./saas-deployment-guide.md) - Instructions for deploying to production
- [Implementation Summary](./saas-implementation-summary.md) - Overview of all implemented features
- [MongoDB Indexes](./mongodb-indexes.md) - Documentation of database indexes

## License

MIT

## Contributors

- Your Name <your.email@example.com> 