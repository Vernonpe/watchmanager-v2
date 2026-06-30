<template>
  <div class="dashboard-view animated-fade-in">
    <header class="dashboard-header glass-panel">
      <h2>Platform Dashboard <span>WatchManager Analytics & Status</span></h2>
      <div class="tenant-selector-group">
        <label>Active Tenant Context:</label>
        <select v-model="selectedTenantId" class="glass-input select-input" @change="fetchStats">
          <option v-for="t in tenants" :key="t.tenant_id" :value="t.tenant_id">{{ t.name }}</option>
        </select>
      </div>
    </header>

    <!-- METRICS GRID -->
    <div class="metrics-grid" v-if="stats">
      <!-- Card 1: Active Sessions -->
      <div class="metric-card glass-panel cyan-glow">
        <div class="metric-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div class="metric-info">
          <span class="value">{{ stats.sessions.active }}</span>
          <span class="label">Active Sessions</span>
        </div>
      </div>

      <!-- Card 2: Total Journeys -->
      <div class="metric-card glass-panel orange-glow">
        <div class="metric-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </div>
        <div class="metric-info">
          <span class="value">{{ stats.journeys.total }}</span>
          <span class="label">Blueprint Journeys</span>
        </div>
      </div>

      <!-- Card 3: Traffic volume -->
      <div class="metric-card glass-panel green-glow">
        <div class="metric-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
        <div class="metric-info">
          <span class="value">{{ stats.traffic.inbound + stats.traffic.outbound }}</span>
          <span class="label">Total Webhook Events</span>
        </div>
      </div>

      <!-- Card 4: Registered Tenants -->
      <div class="metric-card glass-panel pink-glow">
        <div class="metric-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 21h18" />
            <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" />
            <path d="M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4" />
          </svg>
        </div>
        <div class="metric-info">
          <span class="value">{{ stats.tenants.active }} / {{ stats.tenants.total }}</span>
          <span class="label">Active Tenants</span>
        </div>
      </div>
    </div>

    <!-- MAIN BODY GRID -->
    <div class="dashboard-body" v-if="stats">
      <!-- Left Column: Service Status & Ingress traffic -->
      <div class="body-column flex-column">
        <!-- Service status card -->
        <div class="glass-panel info-card status-card">
          <h3>Services Connectivity State</h3>
          <div class="status-list">
            <div class="status-item">
              <span class="name">MongoDB Database</span>
              <span class="badge active">{{ stats.status.database }}</span>
            </div>
            <div class="status-item">
              <span class="name">C360 Gateway Portal</span>
              <span class="badge active">{{ stats.status.gateway }}</span>
            </div>
            <div class="status-item">
              <span class="name">WatchManager Mock Server</span>
              <span class="badge active">{{ stats.status.mock_server }}</span>
            </div>
          </div>
        </div>

        <!-- Traffic Breakdown -->
        <div class="glass-panel info-card traffic-breakdown-card">
          <h3>Traffic Volume Breakdown</h3>
          <div class="breakdown-list">
            <div class="breakdown-item">
              <span class="label">Inbound Messages</span>
              <span class="val cyan-text">{{ stats.traffic.inbound }}</span>
            </div>
            <div class="breakdown-item">
              <span class="label">Outbound API Requests</span>
              <span class="val orange-text">{{ stats.traffic.outbound }}</span>
            </div>
            <div class="breakdown-item">
              <span class="label">Delivery Notifications</span>
              <span class="val green-text">{{ stats.traffic.receipts }}</span>
            </div>
            <div class="breakdown-item">
              <span class="label">System Exceptions</span>
              <span class="val red-text">{{ stats.traffic.exceptions }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Recent Activities -->
      <div class="body-column glass-panel activities-card">
        <h3>Recent Live Events</h3>
        <p class="description">Live audit callbacks processed recently by the state machine interpreter.</p>
        
        <div class="activity-feed">
          <div class="feed-item" v-for="act in stats.activities" :key="act.id">
            <div class="feed-header">
              <span class="badge" :class="act.type === 'Inbound Msg' ? 'inbound' : 'receipt'">{{ act.type }}</span>
              <span class="time">{{ formatTime(act.timestamp) }}</span>
            </div>
            <p class="feed-text">{{ act.message }}</p>
          </div>
          <div class="empty-state" v-if="stats.activities.length === 0">
            No live events captured. Trigger a WhatsApp message or alarm override to populate the log feed.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const tenants = ref([]);
const selectedTenantId = ref('');
const stats = ref(null);

const fetchTenants = async () => {
  try {
    const res = await axios.get('http://localhost:3001/api/admin/tenants');
    tenants.value = res.data;
    if (tenants.value.length > 0) {
      selectedTenantId.value = tenants.value[0].tenant_id;
      await fetchStats();
    }
  } catch (err) {
    console.error('Failed to load tenants:', err.message);
  }
};

const fetchStats = async () => {
  try {
    const tenantHeader = { headers: { 'x-tenant-id': selectedTenantId.value } };
    const res = await axios.get('http://localhost:3001/api/admin/dashboard_stats', tenantHeader);
    stats.value = res.data;
  } catch (err) {
    console.error('Failed to fetch dashboard stats:', err.message);
  }
};

const formatTime = (ts) => {
  return new Date(ts).toLocaleTimeString();
};

onMounted(() => {
  fetchTenants();
});
</script>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 32px);
  gap: 16px;
  overflow: hidden;
}

.dashboard-header {
  height: 70px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.dashboard-header h2 {
  font-size: 1.2rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
}

.dashboard-header h2 span {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--accent-cyan);
  border: 1px solid rgba(186, 100, 50, 0.2);
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(186, 100, 50, 0.05);
}

.tenant-selector-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Metrics Cards Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  flex-shrink: 0;
}

.metric-card {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-radius: 16px;
  transition: var(--transition-smooth);
}

.metric-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.metric-icon svg {
  width: 22px;
  height: 22px;
}

.metric-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-info .value {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: var(--font-mono);
}

.metric-info .label {
  font-size: 0.75rem;
  color: var(--text-dim);
  text-transform: uppercase;
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* Glow styles */
.cyan-glow:hover { box-shadow: var(--shadow-glow-cyan); border-color: var(--accent-cyan); }
.cyan-glow .metric-icon { color: var(--accent-cyan); background: rgba(0, 220, 200, 0.08); }

.orange-glow:hover { box-shadow: var(--shadow-glow-orange); border-color: var(--accent-orange); }
.orange-glow .metric-icon { color: var(--accent-orange); background: rgba(255, 170, 0, 0.08); }

.green-glow:hover { box-shadow: var(--shadow-glow-green); border-color: var(--accent-green); }
.green-glow .metric-icon { color: var(--accent-green); background: rgba(0, 200, 100, 0.08); }

.pink-glow:hover { box-shadow: 0 0 15px rgba(255, 70, 90, 0.15); border-color: var(--accent-red); }
.pink-glow .metric-icon { color: var(--accent-red); background: rgba(255, 70, 90, 0.08); }

/* Main Body Grid */
.dashboard-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  height: calc(100% - 186px);
  overflow: hidden;
}

.body-column {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.flex-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  padding: 24px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card h3, .activities-card h3 {
  font-size: 1.05rem;
  font-weight: 600;
}

/* Status state badging */
.status-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 0.85rem;
}

.status-item .badge {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 20px;
}

.status-item .badge.active {
  background: rgba(0, 200, 100, 0.15);
  color: var(--accent-green);
}

/* Traffic Breakdown styles */
.breakdown-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.breakdown-item {
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.breakdown-item .label {
  font-size: 0.7rem;
  color: var(--text-dim);
  text-transform: uppercase;
  font-weight: 500;
}

.breakdown-item .val {
  font-size: 1.4rem;
  font-weight: 700;
  font-family: var(--font-mono);
}

.cyan-text { color: var(--accent-cyan); }
.orange-text { color: var(--accent-orange); }
.green-text { color: var(--accent-green); }
.red-text { color: var(--accent-red); }

/* Activity Feed */
.activities-card {
  padding: 24px;
}

.activities-card .description {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: -8px;
  margin-bottom: 8px;
}

.activity-feed {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  flex-grow: 1;
}

.feed-item {
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.feed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.feed-header .badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
}

.feed-header .badge.inbound {
  background: rgba(50, 150, 255, 0.15);
  color: var(--accent-blue);
}

.feed-header .badge.receipt {
  background: rgba(0, 220, 200, 0.15);
  color: var(--accent-cyan);
}

.feed-header .time {
  font-size: 0.75rem;
  color: var(--text-dim);
  font-family: var(--font-mono);
}

.feed-text {
  font-size: 0.8rem;
  color: var(--text-main);
  word-break: break-all;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex-grow: 1;
  font-size: 0.85rem;
  color: var(--text-dim);
  padding: 20px;
  border: 1px dashed var(--border-light);
  border-radius: 12px;
}
</style>
