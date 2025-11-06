# Docker Compose Setup

This directory contains the Docker Compose configuration for the entire Comissão application stack.

## Services

- **db**: MySQL 8.0 database
- **api**: FastAPI backend with OpenAPI documentation
- **frontend**: Vite + React frontend

## Usage

1. Create a `.env` file in this directory with the required environment variables:
   ```env
   MYSQL_ROOT_PASSWORD=your_password
   MYSQL_DATABASE=your_database
   MYSQL_PORT=3306
   DATABASE_URL=mysql+asyncmy://root:your_password@db:3306/your_database
   SECRET_KEY=your_secret_key
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ADMIN_TOKEN=your_admin_token
   API_PORT=8000
   FRONTEND_PORT=5173
   VITE_API_BASE_URL=http://localhost:8000
   ```

2. Start all services:
   ```bash
   docker-compose up --build
   ```

3. Access the services:
   - Frontend: http://localhost:5173
   - API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Database: localhost:${MYSQL_PORT}

## Notes

- The `mysql_data` directory will be created automatically to persist database data
- All services have hot-reload enabled for development
- The frontend connects to the API using the configured `VITE_API_BASE_URL`

