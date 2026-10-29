# Multi-stage build for React Vite frontend (Practical 11)
FROM node:18 AS build

# Set working directory
WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Install frontend dependencies
RUN npm install

# Copy source code and build production bundle
COPY . .
RUN npm run build

# Expose Vite preview port
EXPOSE 5173

# Serve production preview bound to 0.0.0.0
CMD ["npm", "run", "preview", "--", "--host", "--port", "5173"]
