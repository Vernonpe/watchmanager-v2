<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';

const sessions = ref([]);
const loading = ref(true);
const error = ref('');
const pollingInterval = ref(null);

const fetchSessions = async () => {
  try {
    const res = await axios.get('/api/admin/sessions/active');
    sessions.value = res.data || [];
    error.value = '';
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Failed to fetch active sessions';
    console.error('Failed fetching active sessions:', err);
  } finally {
    loading.value = false;
  }
};

const terminateSession = async (mobile) => {
  if (!confirm(`Are you sure you want to terminate the active session for ${mobile}?`)) return;
  try {
    await axios.delete(`/api/admin/sessions/${mobile}`);
    await fetchSessions();
  } catch (err) {
    alert('Failed to terminate session: ' + (err.response?.data?.error || err.message));
  }
};

onMounted(() => {
  fetchSessions();
  // Auto-refresh every 5 seconds for live observability
  pollingInterval.value = setInterval(fetchSessions, 5000);
});

onUnmounted(() => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value);
  }
});
</script>

<template>
  <div class="page-container fade-in">
    <header class="page-header">
      <div class="header-title">
        <h1>Live Active Sessions</h1>
        <p class="subtitle">Monitor and debug in-flight WhatsApp conversational sessions</p>
      </div>
      <button class="glass-btn glass-btn-primary" @click="fetchSessions">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        Refresh Now
      </button>
    </header>

    <div v-if="error" class="error-banner">
      {{ error }}
    </div>

    <div class="glass-panel main-content">
      <div v-if="loading && sessions.length === 0" class="loading-state">
        <div class="spinner"></div>
        <p>Loading active sessions...</p>
      </div>

      <div v-else-if="sessions.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h2>No Active Sessions</h2>
        <p>There are currently no active users traversing any WhatsApp journeys.</p>
      </div>

      <div v-else class="table-container">
        <table class="glass-table">
          <thead>
            <tr>
              <th>Mobile / User</th>
              <th>Active Journey</th>
              <th>Current Node</th>
              <th>Collected Data Preview</th>
              <th>Last Activity</th>
              <th>Expires At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="session in sessions" :key="session._id">
              <td class="primary-cell">{{ session.mobile }}</td>
              <td><span class="badge journey-badge">{{ session.active_journey_id }}</span></td>
              <td><span class="badge node-badge">{{ session.current_node_id }}</span></td>
              <td class="data-preview">
                <pre class="json-preview">{{ JSON.stringify(session.collected_data || {}, null, 2) }}</pre>
              </td>
              <td>{{ new Date(session.last_user_message_at).toLocaleTimeString() }}</td>
              <td class="expires-cell">{{ new Date(session.expires_at).toLocaleTimeString() }}</td>
              <td>
                <button class="action-btn danger-btn" @click="terminateSession(session.mobile)" title="Force Terminate Session">
                  Terminate
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: 32px;
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: var(--text-muted);
  margin: 0;
  font-size: 1rem;
}

.error-banner {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
}

.main-content {
  padding: 24px;
  min-height: 400px;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--text-muted);
  text-align: center;
}

.empty-state svg {
  color: var(--accent-blue);
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h2 {
  margin: 0 0 8px 0;
  color: var(--text-main);
}

.table-container {
  overflow-x: auto;
}

.glass-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  text-align: left;
}

.glass-table th {
  padding: 16px;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border-light);
}

.glass-table td {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: top;
}

.glass-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

.primary-cell {
  font-weight: 600;
  color: var(--text-main);
  letter-spacing: 0.5px;
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.journey-badge {
  background: rgba(99, 102, 241, 0.15);
  color: var(--accent-purple);
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.node-badge {
  background: rgba(14, 165, 233, 0.15);
  color: var(--accent-cyan);
  border: 1px solid rgba(14, 165, 233, 0.3);
}

.data-preview {
  max-width: 300px;
}

.json-preview {
  margin: 0;
  background: rgba(0, 0, 0, 0.3);
  padding: 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #a5b4fc;
  max-height: 100px;
  overflow-y: auto;
  border: 1px solid rgba(255,255,255,0.05);
}

.json-preview::-webkit-scrollbar {
  width: 4px;
}
.json-preview::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.2);
  border-radius: 4px;
}

.expires-cell {
  color: var(--accent-orange);
}

.action-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.danger-btn {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.danger-btn:hover {
  background: rgba(239, 68, 68, 0.3);
  color: #fff;
}
</style>
