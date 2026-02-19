# Docker Compose Setup

This directory contains the Docker Compose configuration for the entire Comissão application stack.

## Services

- **db**: MySQL 8.0 database
- **api**: FastAPI backend with OpenAPI documentation
- **frontend-dev**: Vite + React frontend (dev mode with hot-reload)
- **frontend-prod**: Vite + React frontend (production build)

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

2. Start services using a **profile** to choose the frontend mode:

   **Development** (hot-reload enabled — code changes reflect instantly):
   ```bash
   docker compose --profile dev up --build
   ```

   **Production** (optimized static build):
   ```bash
   docker compose --profile prod up --build
   ```

3. Access the services:
   - Frontend: http://localhost:5173
   - API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Database: localhost:${MYSQL_PORT}

## Profiles

| Profile | Frontend service | Description |
|---------|-----------------|-------------|
| `dev`   | `frontend-dev`  | Vite dev server with HMR. Source code is mounted from the host, so edits are reflected instantly. |
| `prod`  | `frontend-prod` | Pre-built static bundle served via `vite preview`. No volume mounts needed. |

> **Note:** Both profiles use the same container name and port, so only one can run at a time.

## Notes

- The `mysql_data` directory will be created automatically to persist database data
- The API service has hot-reload enabled via `--reload` flag
- The frontend in `dev` profile mounts `src/`, `public/`, and `index.html` for live editing
- The frontend connects to the API using the configured `VITE_API_BASE_URL`
