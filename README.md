# Watch Manager V2

Watch Manager V2 is a high-performance state-machine engine and interactive journey builder designed to map, interpret, and escalate Channel Mobile C360 WhatsApp gateway events. It features dynamic state transitions, preemption override hierarchies for emergency triggers (such as panic alarms), active tenant configuration panels with locked UUID identifiers, and real-time audit logging console tools.

---

## 📂 Codebase Architecture

```text
Watch Manager V2/
├── apps/
│   ├── backend/          # Express.js Server & Mongoose Database Models
│   │   ├── src/
│   │   │   ├── db/       # MongoDB schemas (sys, builder, runtime, audit)
│   │   │   ├── interpreter/ # State-machine parser and preemption manager
│   │   │   ├── middleware/  # Concurrency queue lock middleware
│   │   │   └── routes/   # Admin and WhatsApp webhook routes
│   │   └── tests/        # Mock integration services and simulator tests
│   └── frontend/         # Vue 3 Single Page Application (Vite-powered)
│       ├── src/
│       │   ├── views/    # Dashboard, Builder, Config, Logs, and Console views
│       │   └── router/   # Vue Router setup
├── documents/            # Test Cases and specification guidelines
├── Dockerfile            # Multi-stage production container build script
├── docker-compose.yml    # Traefik SSL routing production service definition
└── README.md             # Platform documentation guide
```

---

## 🛠️ Local Development Setup

To run the full stack locally for development and testing, you will need **Node.js (v20+)** and **MongoDB** installed and running on your machine.

### 1. Database Setup
Ensure MongoDB is running locally at:
```text
mongodb://localhost:27017/WatchManagerV2
```

### 2. Run the Express Backend Server
Navigate to the backend directory, install dependencies, and start the application:
```bash
cd apps/backend
npm install
npm start
```
*The backend runs on port `3001`.*

### 3. Run the Vue 3 Frontend
Open a new terminal window, navigate to the frontend directory, install dependencies, and start Vite dev server:
```bash
cd apps/frontend
npm install
npm run dev
```
*The frontend runs on port `5173` (served with automatic API proxying to `3001` for localhost context).*

### 4. Run the QA Mock Integration Server
To simulate the external control room and gateway triggers:
```bash
cd apps/backend
node tests/mockServer.js
```
*The mock server runs on port `3002`.*

### 5. Running the Simulator Tests
To run the end-to-end state machine preemption override-and-restore simulation suite:
```bash
cd apps/backend
node tests/simulate.js
```

---

## 🔗 Dynamic Webhook Callback Structure

Webhooks are dynamically routed using the tenant's auto-generated **Platform UUID** (available on the Config Panel):

1. **Inbound WhatsApp Messages**:
   `POST http://localhost:3001/api/:platformUuid/whatsapp/messages`
2. **Delivery Receipt Notifications**:
   `POST http://localhost:3001/api/:platformUuid/whatsapp/notifications`

*Note: Inbound panic triggers target the static route `/api/webhook/alarm/trigger`.*

---

## 🐳 Production Containerization (Docker & Traefik)

The project is built as a single containerized monolith in production. The Express server serves the compiled Vue static assets under `NODE_ENV=production`.

### 1. Build the Docker Image
To build the multi-stage container locally:
```bash
docker build -t watchmanager:latest .
```

### 2. Running via Docker Compose
Ensure that you have Traefik running on your host machine inside the external network `traefik_network`. Then run:
```bash
docker compose --env-file .env.prod up -d
```

---

## 🚀 AWS EC2 Deployment Workflow

Follow these step-by-step instructions to deploy Watch Manager V2 to your AWS EC2 instance:

### Step 1: Connect to AWS Instance
SSH into your AWS host server:
```bash
ssh user@your-aws-ec2-ip
```
Navigate to the directory where your Docker services are hosted (e.g. `/home/user/apps`).

### Step 2: Configure Domain & DNS
- Add an **A Record** pointing `watchmanager.novare.co.za` in your registrar to your AWS EC2 instance public IP.

### Step 3: Clone the Repository
Clone the codebase using your credentials:
```bash
git clone https://github.com/vernonpe/watchmanager-v2.git
cd watchmanager-v2
```

### Step 4: Configure Production Environment
Create a `.env.prod` configuration file in the project root:
```bash
nano .env.prod
```
*Add the following configurations:*
```ini
COMPOSE_PROJECT_NAME=watchmanager
HOST_URL=watchmanager.novare.co.za
HOST_PORT=3001

NODE_ENV=production
# AWS Live MongoDB Server connection string
MONGO_URI=mongodb://admin:wC8%40Rz3%24L5%23sP9qT@13.245.26.99:27017/WatchManagerV2
```

### Step 5: Start the Container
Run Docker Compose in detached mode to download dependencies, compile frontend assets, and start the monolithic server:
```bash
docker compose --env-file .env.prod up -d --build
```

### Step 6: Verify and Inspect Logs
Check container status:
```bash
docker ps | grep watchmanager
```
Verify that Traefik has successfully registered the service and generated Let's Encrypt SSL certificates by checking the logs:
```bash
docker compose --env-file .env.prod logs -f app
```

### Step 7: Push Updates
Whenever you push changes to your `main` branch, pull them on the server and rebuild:
```bash
git pull origin main
docker compose --env-file .env.prod up -d --build
```
