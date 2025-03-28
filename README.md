# AI Widget Fullstack Application

A fullstack application for AI widget integration with several components:

## Project Structure

- **fast-api/**: Backend service built with FastAPI
- **client/**: Frontend client application
- **Lermo/**: React application for the main interface
- **docker-compose.yml**: Docker configuration for running the application

## Installation

1. Clone the repository:
```bash
git clone https://github.com/IvoBelohlav/AiWIdget.git
```

2. Install dependencies:
```bash
# Backend
cd fast-api
pip install -r requirements.txt

# Frontend
cd ../client
npm install
```

3. Run the application:
```bash
# Using Docker
docker-compose up

# Or run individually
# Backend
cd fast-api
uvicorn main:app --reload

# Frontend
cd client
npm start
```

## Environment Variables

Make sure to set up your environment variables in the .env file:
```
API_KEY=your_api_key
DATABASE_URL=your_database_url
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# Lermo AI Widget SaaS Platform

A secure, multi-tenant SaaS layer for the AI Widget (Lermo) platform with user self-service signup, Stripe subscriptions, and secure widget deployment.

## Deployment Guide

### Widget Deployment to AWS

The Lermo Widget is deployed to AWS using S3 for storage and CloudFront for content delivery:

- S3 Bucket: `lermoplus.s3-website.eu-north-1.amazonaws.com`
- CloudFront Distribution: `https://d129jv2av2liy7.cloudfront.net`

#### Deployment Steps

1. Build the widget for production:
   ```
   cd Fullstack-application/Lermo
   npm run build
   ```

2. Upload the build files to S3:
   - Navigate to the AWS S3 console
   - Upload the contents of the `build` folder to your S3 bucket
   - Ensure public read access is enabled for the bucket

3. Update CloudFront distribution:
   - Ensure your CloudFront distribution is pointing to your S3 bucket
   - Create an invalidation if needed to refresh the cache

### Widget Integration

Add the following code snippet to your website to integrate the Lermo AI Widget:

```html
<!-- Lermo AI Widget -->
<script src="https://d129jv2av2liy7.cloudfront.net/widget.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    LermoWidget.init({
      apiKey: 'YOUR_API_KEY',
      container: 'lermo-widget-container',
      theme: 'light',
      position: 'bottom-right'
    });
  });
</script>
<div id="lermo-widget-container"></div>
<!-- End Lermo AI Widget -->
```

Replace `YOUR_API_KEY` with the API key generated for your account.

### Backend Deployment

The backend API is deployed to your preferred hosting platform and configured to handle multi-tenant requests.

## Architecture

- **Frontend**: React widget deployed to AWS CloudFront/S3
- **Backend**: FastAPI application with MongoDB for data storage
- **Authentication**: JWT for dashboard, API keys for widget access
- **Multi-tenancy**: User-specific data partitioning in MongoDB
- **Payments**: Stripe integration for subscription management

## Security Considerations

- All API requests require authentication (JWT or API key)
- Data is partitioned by user/tenant ID
- CORS is configured to allow only specific origins
- Proper MongoDB indexing for secure and efficient queries 