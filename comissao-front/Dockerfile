FROM node:20-alpine AS base

WORKDIR /app

ARG VITE_API_BASE_URL=address_not_set
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

EXPOSE 5173

# ── Dev stage: Vite dev server with HMR ──
FROM base AS dev
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ── Prod stage: build & serve static bundle ──
FROM base AS prod
RUN npm run build
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
