FROM node:20-alpine

WORKDIR /app

ARG VITE_API_BASE_URL=address_not_set
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}"

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 5173

# Serve the built application
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
# CMD ["npm", "run", "serve"]

