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

From the root of the project, run the following commands. These scripts will automatically read the `MONGO_URI` from your `apps/backend/.env` file.

```bash
# 1. Navigate to the backend directory
cd apps/backend

# 2. Run the Node Palette Seeder
# This safely wipes the old palette and injects the latest node definitions
node scripts/seed_nodes.js

# 3. Run the Tenant Seeder
# This ensures the default demo tenant and Channel360 credentials exist (safe to run multiple times)
node scripts/seed_tenant.js
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
