# Watch Manager V2 - Deployment & Upgrade Guide

This document outlines the standard procedures for deploying, upgrading, and seeding the Watch Manager V2 architecture.

## 1. Environment Configuration

Ensure your production `.env` files are correctly configured before starting the services.

### Backend (`apps/backend/.env`)
The backend requires a connection to a MongoDB instance. If your database requires authentication (common in production environments like MongoDB Atlas or secure self-hosted instances), ensure you append the correct database name and `authSource` to the URI string.

```env
PORT=3001
# Replace with your actual credentials and host. 
# CRITICAL: If your user was created in the 'admin' database, you MUST append ?authSource=admin
MONGO_URI=mongodb://admin:YOUR_PASSWORD@13.245.26.99:27017/WatchManagerV2?authSource=admin
JWT_SECRET=your_super_secret_session_token_key
MOCK_SERVER_URL=http://localhost:3002
```

## 2. Seeding the Database (Crucial for Upgrades)

Watch Manager V2 relies on a dynamic, database-driven architecture for its Node Palette and Tenant Configurations. 

**Whenever you deploy a new version to production, you MUST run the seeder scripts to ensure any new Node types or updated default configurations are pushed into the database.**

If you are running the application natively using Node.js:
```bash
# Navigate to the backend directory
cd apps/backend

# Run the Node Palette Seeder
node scripts/seed_nodes.js

# Run the Tenant Seeder
node scripts/seed_tenant.js
```

### Docker Deployments (Recommended)

If you are running Watch Manager V2 using Docker, you must execute the script *inside* your running backend container.

> [!WARNING]
> **Docker Upgrades:** If you just ran `git pull` to get new code on your host, you **must** rebuild your container image (e.g. `docker-compose up -d --build`) before seeding. Otherwise, your container will not have the updated script!

```bash
# Find your backend container name (e.g., watchmanager-app-1)
docker ps

# Execute the seeder directly inside the container
docker exec -it <container_name> node backend/scripts/seed_nodes.js
docker exec -it <container_name> node backend/scripts/seed_tenant.js
```

> **Note on Upgrades:** Running `seed_nodes.js` will overwrite the `sys_node_definitions` collection. This is intentional and required to push new palette updates to the frontend UI. It does **not** affect active user journeys or session data.

## 3. Building and Starting the Application

### Frontend (Vue.js)
The frontend must be statically built before being served by Nginx or your preferred web server.

```bash
cd apps/frontend
npm install
npm run build
```
The compiled static assets will be located in the `apps/frontend/dist` directory.

### Backend (Node.js/Express)
Start the backend service using a process manager like `pm2` or natively via Node.

```bash
cd apps/backend
npm install
node src/app.js
```

## 4. Routine Upgrade Checklist
1. Pull the latest code via `git pull origin main`
2. Rebuild the frontend (`npm run build`)
3. Restart the backend process
4. **CRITICAL:** Execute `node scripts/seed_nodes.js` from the backend directory to update the Canvas Palette.
