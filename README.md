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