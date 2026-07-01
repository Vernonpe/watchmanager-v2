# Stage 1: Build the Vue Frontend Single Page Application
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

COPY apps/frontend/package*.json ./
RUN npm ci

COPY apps/frontend/ ./
RUN npm run build

# Stage 2: Production Monolithic Runtime
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Install backend production dependencies
COPY apps/backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Copy backend source files and scripts
COPY apps/backend/src ./backend/src
COPY apps/backend/scripts ./backend/scripts
# Copy built frontend assets from Stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Expose backend port
EXPOSE 3001

# Boot the Express app server
CMD ["node", "backend/src/app.js"]
