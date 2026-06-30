<template>
  <div class="logs-view animated-fade-in">
    <header class="logs-header glass-panel">
      <div class="header-title">
        <h2>System Logs <span>Audit & Exception Console</span></h2>
      </div>

      <div class="header-filters">
        <!-- Tenant Selector -->
        <div class="filter-group">
          <label>Tenant:</label>
          <select v-model="selectedTenantId" class="glass-input select-input" @change="fetchLogs">
            <option v-for="t in tenants" :key="t.tenant_id" :value="t.tenant_id">{{ t.name }}</option>
          </select>
        </div>

        <!-- Search input -->
        <div class="search-box">
          <input 
            v-model="searchQuery" 
            type="text" 
            class="glass-input search-input" 
            placeholder="Search keywords, phone numbers, payloads..." 
            @input="fetchLogs"
          />
          <button class="clear-search" v-if="searchQuery" @click="clearSearch">&times;</button>
        </div>
      </div>
    </header>

    <div class="logs-layout">
      <!-- PANEL 1: Logs Feed & Filters -->
      <section class="logs-panel glass-panel list-panel">
        <div class="panel-filters-row">
          <div class="category-pills">
            <button 
              v-for="pill in pills" 
              :key="pill.value" 
              class="pill-btn" 
              :class="{ active: selectedCategory === pill.value }"
              @click="setCategory(pill.value)"
            >
              {{ pill.label }}
            </button>
          </div>
          <button class="glass-btn refresh-btn" @click="fetchLogs">Refresh</button>
        </div>

        <div class="logs-feed">
          <div 
            v-for="log in logs" 
            :key="log.id" 
            class="log-row" 
            :class="{ selected: selectedLogId === log.id, [log.category]: true }"
            @click="inspectLog(log)"
          >
            <div class="log-meta">
              <span class="log-badge" :class="log.category">{{ log.type }}</span>
              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
            </div>
            <div class="log-summary">{{ log.summary }}</div>
          </div>
          <div v-if="logs.length === 0" class="empty-state">
            No audit logs found matching the filter criteria.
          </div>
        </div>
      </section>

      <!-- PANEL 2: Detailed payload inspector -->
      <section class="logs-panel glass-panel inspector-panel">
        <h3>Payload Inspector</h3>
        <p class="description">Select a log entry to view detailed payload, variable values, headers and stack traces.</p>

        <div v-if="inspectedLog" class="inspector-details">
          <div class="meta-grid">
            <div class="meta-item">
              <label>Log ID</label>
              <code>{{ inspectedLog.id }}</code>
            </div>
            <div class="meta-item">
              <label>Timestamp</label>
              <span>{{ formatFullTime(inspectedLog.timestamp) }}</span>
            </div>
            <div class="meta-item">
              <label>Category</label>
              <span class="log-badge" :class="inspectedLog.category">{{ inspectedLog.type }}</span>
            </div>
          </div>

          <div class="payload-box">
            <label>JSON Data Schema</label>
            <pre class="json-code"><code>{{ formatJSON(inspectedLog.details) }}</code></pre>
          </div>
        </div>
        <div v-else class="empty-state">
          Please select a log entry on the left to inspect its parameters.
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const tenants = ref([]);
const selectedTenantId = ref('tenant_watchmanager_prod_01');
const logs = ref([]);
const inspectedLog = ref(null);
const selectedLogId = ref(null);
const searchQuery = ref('');
const selectedCategory = ref('all');

const pills = [
  { label: 'All Logs', value: 'all' },
  { label: 'Inbound Messages', value: 'inbound' },
  { label: 'Outbound API Calls', value: 'outbound' },
  { label: 'Delivery Receipts', value: 'receipt' },
  { label: 'Exceptions / Errors', value: 'exception' }
];

const fetchTenants = async () => {
  try {
    const res = await axios.get('/api/admin/tenants');
    tenants.value = res.data;
    if (tenants.value.length > 0) {
      selectedTenantId.value = tenants.value[0].tenant_id;
      await fetchLogs();
    }
  } catch (err) {
    console.error('Failed to load tenants:', err.message);
  }
};

const fetchLogs = async () => {
  try {
    const tenantHeader = { 
      headers: { 'x-tenant-id': selectedTenantId.value },
      params: { 
        type: selectedCategory.value,
        search: searchQuery.value
      } 
    };
    const res = await axios.get('/api/admin/logs', tenantHeader);
    logs.value = res.data;
    
    // Auto-select first log if any
    if (logs.value.length > 0) {
      inspectLog(logs.value[0]);
    } else {
      inspectedLog.value = null;
      selectedLogId.value = null;
    }
  } catch (err) {
    console.error('Failed to fetch logs:', err.message);
  }
};

const setCategory = (cat) => {
  selectedCategory.value = cat;
  fetchLogs();
};

const clearSearch = () => {
  searchQuery.value = '';
  fetchLogs();
};

const inspectLog = (log) => {
  inspectedLog.value = log;
  selectedLogId.value = log.id;
};

const formatTime = (ts) => {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatFullTime = (ts) => {
  const date = new Date(ts);
  return date.toLocaleString();
};

const formatJSON = (details) => {
  try {
    return JSON.stringify(details, null, 2);
  } catch (e) {
    return String(details);
  }
};

onMounted(() => {
  fetchTenants();
});
</script>

<style scoped>
.logs-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 32px);
  gap: 16px;
}

.logs-header {
  height: 70px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-title h2 {
  font-size: 1.2rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title h2 span {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--accent-cyan);
  border: 1px solid rgba(186, 100, 50, 0.2);
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(186, 100, 50, 0.05);
}

.header-filters {
  display: flex;
  align-items: center;
  gap: 16px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.search-box {
  position: relative;
  width: 280px;
}

.search-input {
  width: 100%;
  padding-right: 32px;
}

.clear-search {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
}

.logs-layout {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  height: calc(100% - 86px);
  overflow: hidden;
}

.logs-panel {
  height: 100%;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.panel-filters-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-pills {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  flex-grow: 1;
}

.pill-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-light);
  color: var(--text-muted);
  font-size: 0.75rem;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  transition: var(--transition-smooth);
}

.pill-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main);
}

.pill-btn.active {
  background: rgba(186, 100, 50, 0.1);
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
  box-shadow: var(--shadow-glow-cyan);
}

.refresh-btn {
  font-size: 0.75rem;
  padding: 6px 14px;
}

/* Logs Feed */
.logs-feed {
  flex-grow: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-row {
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: var(--transition-smooth);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.log-row:hover {
  background: var(--bg-surface-hover);
  border-color: var(--accent-cyan);
}

.log-row.selected {
  background: rgba(186, 100, 50, 0.05);
  border-color: var(--accent-cyan);
  box-shadow: var(--shadow-glow-cyan);
}

.log-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
}

.log-badge.inbound { background: rgba(50, 150, 255, 0.15); color: var(--accent-blue); }
.log-badge.outbound { background: rgba(255, 170, 0, 0.15); color: var(--accent-orange); }
.log-badge.receipt { background: rgba(0, 220, 200, 0.15); color: var(--accent-cyan); }
.log-badge.exception { background: rgba(255, 70, 90, 0.15); color: var(--accent-red); }

.log-time {
  font-size: 0.75rem;
  color: var(--text-dim);
  font-family: var(--font-mono);
}

.log-summary {
  font-size: 0.8rem;
  color: var(--text-main);
  word-break: break-all;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Inspector Panel */
.inspector-panel h3 {
  font-size: 1.05rem;
  font-weight: 600;
}

.inspector-panel .description {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: -6px;
}

.inspector-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  flex-grow: 1;
}

.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 12px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item label {
  font-size: 0.65rem;
  text-transform: uppercase;
  color: var(--text-dim);
  font-weight: 500;
}

.meta-item span {
  font-size: 0.8rem;
}

.meta-item code {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--accent-cyan);
}

.payload-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-grow: 1;
  overflow: hidden;
}

.payload-box label {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 500;
}

.json-code {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 16px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  overflow: auto;
  flex-grow: 1;
  color: hsl(215, 100%, 80%);
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
