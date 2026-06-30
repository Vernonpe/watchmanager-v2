<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const logs = ref([]);
const isLoggerEnabled = ref(false);
const isLoadingLogs = ref(false);
const isLoadingConfig = ref(false);
const isUpdatingConfig = ref(false);
const selectedLog = ref(null);
const isDrawerOpen = ref(false);

// Edit form fields
const editSource = ref('');
const editNotes = ref('');
const editPurpose = ref('');
const isSavingNotes = ref(false);

// Alerts
const successMsg = ref('');
const errorMsg = ref('');

const fetchConfig = async () => {
  isLoadingConfig.value = true;
  try {
    const res = await axios.get('/api/dev/admin/config');
    isLoggerEnabled.value = res.data.enabled;
  } catch (err) {
    console.error('Failed to load dev logger config:', err);
  } finally {
    isLoadingConfig.value = false;
  }
};

const toggleLoggerConfig = async () => {
  isUpdatingConfig.value = true;
  successMsg.value = '';
  errorMsg.value = '';
  try {
    const res = await axios.post('/api/dev/admin/config', {
      enabled: !isLoggerEnabled.value
    });
    isLoggerEnabled.value = res.data.enabled;
    successMsg.value = `Developer Request Logger successfully ${isLoggerEnabled.value ? 'enabled' : 'disabled'}.`;
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Failed to toggle request logger config';
  } finally {
    isUpdatingConfig.value = false;
  }
};

const fetchLogs = async () => {
  isLoadingLogs.value = true;
  errorMsg.value = '';
  try {
    const res = await axios.get('/api/dev/admin/logs');
    logs.value = res.data;
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Failed to fetch developer api logs';
  } finally {
    isLoadingLogs.value = false;
  }
};

const selectLog = (log) => {
  selectedLog.value = log;
  editSource.value = log.source || '';
  editNotes.value = log.notes || '';
  editPurpose.value = log.purpose || '';
  isDrawerOpen.value = true;
};

const handleUpdateNotes = async () => {
  if (!selectedLog.value) return;
  isSavingNotes.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    const res = await axios.post(`/api/dev/admin/logs/${selectedLog.value._id}/notes`, {
      notes: editNotes.value,
      source: editSource.value,
      purpose: editPurpose.value
    });
    
    // Update local state
    selectedLog.value.notes = res.data.notes;
    selectedLog.value.source = res.data.source;
    selectedLog.value.purpose = res.data.purpose;
    
    successMsg.value = 'Request annotations updated successfully!';
    isDrawerOpen.value = false;
    
    // Refresh list
    await fetchLogs();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Failed to save log annotations';
  } finally {
    isSavingNotes.value = false;
  }
};

const deleteLog = async (id) => {
  if (!confirm('Are you sure you want to delete this captured request log?')) return;
  successMsg.value = '';
  errorMsg.value = '';
  try {
    await axios.delete(`/api/dev/admin/logs/${id}`);
    successMsg.value = 'Request log deleted successfully.';
    if (selectedLog.value && selectedLog.value._id === id) {
      selectedLog.value = null;
    }
    await fetchLogs();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Failed to delete request log';
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  });
};

onMounted(() => {
  fetchConfig();
  fetchLogs();
});
</script>

<template>
  <div class="dev-console-view animated-fade-in">
    <header class="view-header glass-panel">
      <h2>Developer Request Logging Console <span>Capture specifications and payloads from external n8n/webhook triggers</span></h2>
    </header>

    <!-- UPPER ROW: CONFIGURATION & ENDPOINT INFO -->
    <div class="config-row">
      <div class="info-card glass-panel flex-row-between">
        <div class="endpoint-details">
          <span class="label">Logger Target API Endpoint</span>
          <div class="url-badge">
            <span class="method">POST</span>
            <code>https://watchmanager.novare.co.za/api/dev/logger</code>
          </div>
          <p class="helper-text">Send any raw JSON payload here to capture it for visual layout development reference.</p>
        </div>
        
        <div class="config-toggle-box">
          <span class="label">Request Logging Status</span>
          <div class="toggle-container">
            <button 
              class="toggle-switch-btn" 
              :class="{ enabled: isLoggerEnabled }" 
              @click="toggleLoggerConfig" 
              :disabled="isUpdatingConfig || isLoadingConfig"
            >
              <span class="knob"></span>
              <span class="status-text">{{ isLoggerEnabled ? 'Logging Active' : 'Logging Paused' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN BODY GRID -->
    <div class="split-layout">
      <!-- LEFT SECTION: LOGS LIST -->
      <div class="logs-section glass-panel">
        <div class="section-title">
          <h3>Captured API Payloads</h3>
          <button class="refresh-btn" @click="fetchLogs" :disabled="isLoadingLogs">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" :class="{ spinning: isLoadingLogs }">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>

        <div v-if="successMsg" class="alert-banner success animate-fade-in">
          <span>{{ successMsg }}</span>
        </div>
        <div v-if="errorMsg" class="alert-banner error animate-fade-in">
          <span>{{ errorMsg }}</span>
        </div>

        <div class="table-container">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Method</th>
                <th>Source context</th>
                <th>Purpose</th>
                <th>Notes / Annotations</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="log in logs" 
                :key="log._id" 
                :class="{ 'selected-row': selectedLog?._id === log._id }"
                @click="selectedLog = log"
              >
                <td class="timestamp-cell">{{ formatDate(log.timestamp) }}</td>
                <td>
                  <span class="badge method-badge">{{ log.method }}</span>
                </td>
                <td>
                  <span class="badge source-badge">{{ log.source || 'unknown' }}</span>
                </td>
                <td class="purpose-cell">{{ log.purpose || 'N/A' }}</td>
                <td class="notes-cell" :title="log.notes">{{ log.notes || 'Click Edit to add notes...' }}</td>
                <td>
                  <div class="actions-cell">
                    <button class="edit-btn" @click.stop="selectLog(log)">Edit</button>
                    <button class="delete-btn" @click.stop="deleteLog(log._id)">Delete</button>
                  </div>
                </td>
              </tr>
              <tr v-if="logs.length === 0 && !isLoadingLogs">
                <td colspan="6" class="empty-cell">No requests logged yet. Enable logging and send POST requests to the endpoint to capture data.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- RIGHT SECTION: DETAILED JSON VIEWER -->
      <div class="viewer-section glass-panel">
        <div class="viewer-header">
          <h3>Payload Inspector</h3>
          <span class="hint-text" v-if="selectedLog">ID: {{ selectedLog._id }}</span>
        </div>

        <div v-if="selectedLog" class="inspector-content">
          <div class="meta-info">
            <div class="meta-item">
              <span class="label">Logged Method:</span>
              <code>{{ selectedLog.method }}</code>
            </div>
            <div class="meta-item">
              <span class="label">Source Context:</span>
              <code>{{ selectedLog.source || 'unknown' }}</code>
            </div>
            <div class="meta-item">
              <span class="label">Captured Path:</span>
              <code>{{ selectedLog.path }}</code>
            </div>
          </div>

          <div class="json-box">
            <span class="label">JSON Payload Body</span>
            <pre class="terminal-view"><code>{{ JSON.stringify(selectedLog.payload, null, 2) }}</code></pre>
          </div>

          <div class="json-box">
            <span class="label">Captured Headers</span>
            <pre class="terminal-view"><code>{{ JSON.stringify(selectedLog.headers, null, 2) }}</code></pre>
          </div>
        </div>

        <div v-else class="empty-inspector">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <p>Select a log item from the list to inspect its captured JSON body and request headers.</p>
        </div>
      </div>
    </div>

    <!-- ANNOTATION EDIT DRAWER -->
    <div class="drawer-overlay" v-if="isDrawerOpen" @click="isDrawerOpen = false">
      <div class="drawer glass-panel animated-slide-left" @click.stop>
        <div class="drawer-header">
          <h3>Annotate Request</h3>
          <button class="close-btn" @click="isDrawerOpen = false">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleUpdateNotes" class="drawer-form">
          <div class="input-group">
            <label for="edit-source">Source Origin</label>
            <input 
              v-model="editSource" 
              type="text" 
              id="edit-source" 
              class="glass-input" 
              placeholder="e.g. n8n support flow" 
            />
          </div>

          <div class="input-group">
            <label for="edit-purpose">Purpose Descriptor</label>
            <input 
              v-model="editPurpose" 
              type="text" 
              id="edit-purpose" 
              class="glass-input" 
              placeholder="e.g. Inbound ticket creation webhook" 
            />
          </div>

          <div class="input-group">
            <label for="edit-notes">Notes / Handling Status</label>
            <textarea 
              v-model="editNotes" 
              id="edit-notes" 
              class="glass-input textarea" 
              rows="6" 
              placeholder="Add developer notes or mapping specs here..."
            ></textarea>
          </div>

          <button type="submit" class="submit-btn" :disabled="isSavingNotes">
            <span v-if="isSavingNotes" class="spinner"></span>
            <span v-else>Save Annotations</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dev-console-view {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 100vh;
}

.view-header {
  padding: 1.5rem 2rem;
}

.view-header h2 {
  font-family: 'Outfit', sans-serif;
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.view-header h2 span {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 400;
}

.config-row {
  width: 100%;
}

.flex-row-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-card {
  padding: 1.5rem 2rem;
}

.endpoint-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.url-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  width: fit-content;
}

.url-badge .method {
  color: var(--accent-cyan);
  font-weight: 700;
  font-size: 0.85rem;
}

.url-badge code {
  color: #ffffff;
  font-family: var(--font-mono);
  font-size: 0.9rem;
}

.helper-text {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.config-toggle-box {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-end;
}

.toggle-switch-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-light);
  padding: 0.6rem 1.2rem;
  border-radius: 20px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.toggle-switch-btn .knob {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #ff4d4f;
  box-shadow: 0 0 8px #ff4d4f;
  transition: all 0.3s ease;
}

.toggle-switch-btn.enabled {
  border-color: var(--accent-green);
  color: #ffffff;
}

.toggle-switch-btn.enabled .knob {
  background-color: #52c41a;
  box-shadow: 0 0 10px #52c41a;
}

.split-layout {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

.logs-section {
  padding: 2rem;
  min-height: 500px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-title h3 {
  font-family: 'Outfit', sans-serif;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.refresh-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.refresh-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.spinning {
  animation: spin 1s linear infinite;
}

.alert-banner {
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.alert-banner.success {
  background: rgba(40, 167, 69, 0.15);
  border: 1px solid rgba(40, 167, 69, 0.3);
  color: #52c41a;
}

.alert-banner.error {
  background: rgba(220, 53, 69, 0.15);
  border: 1px solid rgba(220, 53, 69, 0.3);
  color: #ff4d4f;
}

.table-container {
  overflow-x: auto;
}

.glass-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.glass-table th {
  padding: 1rem;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-family: 'Outfit', sans-serif;
}

.glass-table td {
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.9rem;
  color: var(--text-primary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-row {
  background: rgba(0, 240, 255, 0.05);
}

.timestamp-cell {
  color: var(--text-secondary);
}

.badge {
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.method-badge {
  background: rgba(0, 240, 255, 0.15);
  color: var(--accent-cyan);
  border: 1px solid rgba(0, 240, 255, 0.25);
}

.source-badge {
  background: rgba(186, 100, 50, 0.1);
  color: #f39c12;
  border: 1px solid rgba(186, 100, 50, 0.2);
}

.purpose-cell,
.notes-cell {
  color: var(--text-muted);
}

.edit-btn {
  padding: 0.4rem 0.8rem;
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.edit-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--accent-cyan);
}

.actions-cell {
  display: flex;
  gap: 8px;
  align-items: center;
}

.delete-btn {
  padding: 0.4rem 0.8rem;
  background: rgba(220, 53, 69, 0.15);
  color: #ff4d4f;
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.delete-btn:hover {
  background: rgba(220, 53, 69, 0.3);
  border-color: #ff4d4f;
}

.viewer-section {
  padding: 2rem;
  min-height: 500px;
}

.viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.viewer-header h3 {
  font-family: 'Outfit', sans-serif;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.hint-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.inspector-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.meta-info {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.meta-item code {
  color: var(--accent-cyan);
  font-family: var(--font-mono);
}

.json-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.terminal-view {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border-light);
  padding: 1rem;
  border-radius: 8px;
  max-height: 250px;
  overflow-y: auto;
  font-family: var(--font-mono);
  font-size: 0.825rem;
  color: #a9b7c6;
  white-space: pre-wrap;
  text-align: left;
}

.empty-inspector {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--text-muted);
  text-align: center;
  padding: 5rem 2rem;
}

.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.drawer {
  width: 100%;
  max-width: 460px;
  height: 100%;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-light);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.5);
  animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes slideLeft {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}

.close-btn:hover {
  color: #ffffff;
}

.drawer-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.textarea {
  resize: vertical;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-cell {
  text-align: center;
  color: var(--text-muted);
  padding: 3rem !important;
}
</style>
