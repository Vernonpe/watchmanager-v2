<template>
  <div class="config-view animated-fade-in">
    <header class="config-header glass-panel">
      <h2>System Configurations <span>Tenant & Integration Control</span></h2>
    </header>

    <div class="config-grid">
      <!-- PANEL 1: Tenants List & Management -->
      <section class="config-card glass-panel tenants-section">
        <div class="section-title">
          <h3>Commercial Tenants</h3>
          <button class="glass-btn glass-btn-primary add-btn" @click="openNewTenantModal">
            + New Tenant
          </button>
        </div>
        <p class="description">Select a tenant profile below to configure database mapping, integration keys, and journey flows.</p>

        <div class="tenants-list">
          <div 
            v-for="t in tenants" 
            :key="t.tenant_id" 
            class="tenant-item" 
            :class="{ active: selectedTenantId === t.tenant_id, suspended: t.status !== 'active' }"
            @click="selectTenant(t.tenant_id)"
          >
            <div class="tenant-meta">
              <span class="tenant-name">{{ t.name }}</span>
              <span class="tenant-id-label">{{ t.tenant_id }}</span>
              <span class="tenant-uuid-label" v-if="t.platform_uuid">UUID: {{ t.platform_uuid }}</span>
            </div>
            
            <div class="tenant-controls" @click.stop>
              <!-- Tenant Active/Inactive Toggle -->
              <label class="switch tiny-switch">
                <input type="checkbox" :checked="t.status === 'active'" @change="toggleTenantStatus(t)" />
                <span class="slider round"></span>
              </label>
              <span class="status-badge" :class="t.status">{{ t.status }}</span>
            </div>
          </div>
        </div>

        <!-- Create Tenant Modal Form (Overlay inside Card for space optimization) -->
        <div v-if="showNewTenantForm" class="overlay-form glass-panel">
          <div class="form-header">
            <h4>Register New Tenant</h4>
            <button class="close-btn" @click="showNewTenantForm = false">&times;</button>
          </div>
          <div class="form-body">
            <div class="form-group">
              <label>Unique Tenant ID</label>
              <input v-model="newTenant.tenant_id" type="text" class="glass-input" placeholder="e.g. tenant_cinecentre_prod" />
            </div>
            <div class="form-group">
              <label>Organization Name</label>
              <input v-model="newTenant.name" type="text" class="glass-input" placeholder="e.g. CineCentre" />
            </div>
            <div class="form-group">
              <label>Contact Email</label>
              <input v-model="newTenant.contact_email" type="email" class="glass-input" placeholder="e.g. support@cinecentre.co.za" />
            </div>
            <div class="form-group">
              <label>Subscription Status</label>
              <select v-model="newTenant.status" class="glass-input select-input">
                <option value="active">Active</option>
                <option value="suspended">Inactive / Suspended</option>
              </select>
            </div>
            <button class="glass-btn glass-btn-primary submit-btn" @click="createTenant">
              Submit Registration
            </button>
          </div>
        </div>
      </section>

      <!-- PANEL 2: Integration & Profile Configuration -->
      <section class="config-card glass-panel integration-section">
        <h3 class="panel-main-title">Tenant Settings & Integration Config</h3>
        <p class="description">Edit profile info, WhatsApp gateway credentials and endpoints for the selected tenant.</p>

        <div v-if="selectedTenantId && selectedTenant" class="form accordion-container">
          
          <!-- SECTION 1: Tenant Profile Details -->
          <div class="accordion-item" :class="{ open: expandedSections.profile }">
            <div class="accordion-header" @click="toggleSection('profile')">
              <h3>Tenant Profile Details</h3>
              <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <div class="accordion-content" v-show="expandedSections.profile">
              <div class="form-group">
                <label>Tenant ID</label>
                <input v-model="selectedTenant.tenant_id" type="text" class="glass-input" disabled />
              </div>
              <div class="form-group">
                <label>Platform UUID (Read Only)</label>
                <input v-model="selectedTenant.platform_uuid" type="text" class="glass-input code-val" disabled />
              </div>
              <div class="form-group">
                <label>Organization Name</label>
                <input v-model="selectedTenant.name" type="text" class="glass-input" />
              </div>
              <div class="form-group">
                <label>Contact Email</label>
                <input v-model="selectedTenant.contact_email" type="email" class="glass-input" />
              </div>
              <button class="glass-btn glass-btn-primary save-btn profile-save-btn" @click="saveTenantDetails">
                Update Profile Details
              </button>
            </div>
          </div>

          <!-- SECTION 2: Channel360 Credentials Config -->
          <div class="accordion-item" :class="{ open: expandedSections.credentials }">
            <div class="accordion-header" @click="toggleSection('credentials')">
              <h3>Channel360 Credentials Config</h3>
              <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <div class="accordion-content" v-show="expandedSections.credentials">
              <div class="form-group">
                <label>C360 Organization ID (org_id)</label>
                <input v-model="credentials.org_id" type="text" class="glass-input" placeholder="e.g. org_cinecentre_prod" />
              </div>
              <div class="form-group">
                <label>API Bearer Token</label>
                <input v-model="credentials.bearer_token" type="password" class="glass-input" placeholder="••••••••••••••••••••••••" />
              </div>
              <div class="form-group">
                <label>Channel Account Name</label>
                <input v-model="credentials.channel_account_name" type="text" class="glass-input" placeholder="e.g. CineCentre WhatsApp Account" />
              </div>
              <div class="form-group">
                <label>WatchManager Control Room URL</label>
                <input v-model="credentials.watch_manager_base_url" type="text" class="glass-input" placeholder="e.g. http://localhost:3002/mock_watchmanager" />
              </div>
              <div class="form-group check-group">
                <input v-model="credentials.is_test_mode" type="checkbox" id="cred_test_mode" />
                <label for="cred_test_mode">Enable Test Mode (Redirects gateway requests to mock callback server)</label>
              </div>
              
              <button class="glass-btn glass-btn-primary save-btn" @click="saveCredentials">
                Update Credentials
              </button>
            </div>
          </div>

          <!-- SECTION 3: Webhook Endpoints Configuration -->
          <div class="accordion-item" :class="{ open: expandedSections.webhooks }">
            <div class="accordion-header" @click="toggleSection('webhooks')">
              <h3>Webhook Endpoints Configuration</h3>
              <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <div class="accordion-content" v-show="expandedSections.webhooks">
              <div class="webhooks-panel">
                <p class="webhook-desc">Configure these callback addresses in your C360 gateway portal to route data to this state interpreter:</p>
                <div class="url-copy-box">
                  <span class="label">Inbound Message Webhook URL (Dynamic with Platform UUID)</span>
                  <code class="code-val">http://localhost:3001/api/{{ activeTenantPlatformUuid || 'PENDING' }}/whatsapp/messages</code>
                </div>
                <div class="url-copy-box">
                  <span class="label">Delivery Notifications URL (Dynamic with Platform UUID)</span>
                  <code class="code-val">http://localhost:3001/api/{{ activeTenantPlatformUuid || 'PENDING' }}/whatsapp/notifications</code>
                </div>
              </div>
            </div>
          </div>

          <!-- DANGER ZONE: Delete Customer (At the very end, outside expandable sections) -->
          <div class="danger-zone-section">
            <button class="glass-btn glass-btn-danger delete-customer-btn" @click="deleteCustomer">
              Delete Customer Account
            </button>
          </div>

        </div>
        <div v-else class="empty-state">
          Please select a tenant on the left to configure settings and credentials.
        </div>
      </section>

      <!-- PANEL 3: Tenant Associated Flows -->
      <section class="config-card glass-panel flows-section">
        <h3>Tenant Journeys & Flows</h3>
        <p class="description">Manage conversational flows compiled and linked to this specific tenant.</p>

        <div v-if="selectedTenantId" class="flows-list">
          <div v-for="j in tenantJourneys" :key="j.journey_id" class="flow-item">
            <div class="flow-meta">
              <span class="flow-name">{{ j.name }}</span>
              <span class="flow-id code-val">{{ j.journey_id }}</span>
            </div>
            <div class="flow-details">
              <span class="flow-keyword" v-if="j.ingress_trigger_keyword">Keyword: <strong>{{ j.ingress_trigger_keyword }}</strong></span>
              <span class="flow-keyword" v-else>Outbound Trigger Only</span>
              
              <div class="toggle-container">
                <span class="toggle-label">{{ j.is_active ? 'Active' : 'Inactive' }}</span>
                <label class="switch">
                  <input type="checkbox" v-model="j.is_active" @change="toggleJourneyState(j)" />
                  <span class="slider round"></span>
                </label>
              </div>
            </div>
          </div>
          <div v-if="tenantJourneys.length === 0" class="empty-state">
            No journeys registered for this tenant. Open the Journey Builder to compile a new blueprint flow.
          </div>
        </div>
        <div v-else class="empty-state">
          Select a tenant to view associated journeys.
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const tenants = ref([]);
const selectedTenantId = ref('');
const selectedTenant = ref(null);
const tenantJourneys = ref([]);
const showNewTenantForm = ref(false);

const expandedSections = ref({
  profile: true,
  credentials: false,
  webhooks: false
});

const toggleSection = (section) => {
  expandedSections.value[section] = !expandedSections.value[section];
};

const newTenant = ref({
  tenant_id: '',
  name: '',
  contact_email: '',
  status: 'active'
});

const credentials = ref({
  org_id: '',
  bearer_token: '',
  channel_account_name: '',
  watch_manager_base_url: 'http://localhost:3002/mock_watchmanager',
  is_test_mode: true
});

const activeTenantPlatformUuid = computed(() => {
  const match = tenants.value.find(t => t.tenant_id === selectedTenantId.value);
  return match ? match.platform_uuid : '';
});

const fetchTenants = async () => {
  try {
    const res = await axios.get('http://localhost:3001/api/admin/tenants');
    tenants.value = res.data;
    if (tenants.value.length > 0 && !selectedTenantId.value) {
      selectTenant(tenants.value[0].tenant_id);
    }
  } catch (err) {
    console.error('Failed to load tenants:', err.message);
  }
};

const selectTenant = async (tenantId) => {
  selectedTenantId.value = tenantId;
  const match = tenants.value.find(t => t.tenant_id === tenantId);
  if (match) {
    selectedTenant.value = { ...match };
  } else {
    selectedTenant.value = null;
  }
  
  const tenantHeader = { headers: { 'x-tenant-id': tenantId } };

  // Load tenant credentials
  try {
    const credResp = await axios.get('http://localhost:3001/api/admin/credentials', tenantHeader);
    if (credResp.data) {
      credentials.value = credResp.data;
    } else {
      credentials.value = {
        org_id: 'pending_c360_org_id',
        bearer_token: '',
        channel_account_name: '',
        watch_manager_base_url: 'http://localhost:3002/mock_watchmanager',
        is_test_mode: true
      };
    }
  } catch (e) {
    console.warn('Failed to load credentials for tenant:', tenantId);
  }

  // Load tenant journeys
  try {
    const journeysResp = await axios.get('http://localhost:3001/api/admin/journeys', tenantHeader);
    tenantJourneys.value = journeysResp.data;
  } catch (e) {
    console.warn('Failed to load journeys for tenant:', tenantId);
  }
};

const openNewTenantModal = () => {
  newTenant.value = {
    tenant_id: '',
    name: '',
    contact_email: '',
    status: 'active'
  };
  showNewTenantForm.value = true;
};

const createTenant = async () => {
  if (!newTenant.value.tenant_id || !newTenant.value.name || !newTenant.value.contact_email) {
    alert('Please fill out all fields.');
    return;
  }

  try {
    const res = await axios.post('http://localhost:3001/api/admin/tenants', newTenant.value);
    alert('Tenant successfully registered with auto-generated unique platform UUID!');
    showNewTenantForm.value = false;
    await fetchTenants();
    selectTenant(res.data.tenant_id);
  } catch (err) {
    alert('Failed to register tenant: ' + err.message);
  }
};

const saveTenantDetails = async () => {
  if (!selectedTenant.value || !selectedTenant.value.name || !selectedTenant.value.contact_email) {
    alert('Please fill out Name and Contact Email.');
    return;
  }
  try {
    await axios.post('http://localhost:3001/api/admin/tenants', {
      tenant_id: selectedTenant.value.tenant_id,
      name: selectedTenant.value.name,
      contact_email: selectedTenant.value.contact_email,
      status: selectedTenant.value.status
    });
    alert('Tenant profile details updated successfully!');
    await fetchTenants();
  } catch (err) {
    alert('Failed to update tenant profile: ' + err.message);
  }
};

const toggleTenantStatus = async (tenant) => {
  const nextStatus = tenant.status === 'active' ? 'suspended' : 'active';
  try {
    await axios.post('http://localhost:3001/api/admin/tenants', {
      tenant_id: tenant.tenant_id,
      name: tenant.name,
      contact_email: tenant.contact_email,
      status: nextStatus
    });
    tenant.status = nextStatus;
    if (selectedTenant.value && selectedTenant.value.tenant_id === tenant.tenant_id) {
      selectedTenant.value.status = nextStatus;
    }
    console.log(`Tenant ${tenant.tenant_id} status updated to ${nextStatus}`);
  } catch (err) {
    alert('Failed to update tenant status: ' + err.message);
  }
};

const deleteCustomer = async () => {
  if (!confirm(`Are you absolutely sure you want to delete tenant "${selectedTenantId.value}"? This will clean sweep all credentials, visual flows, and active sessions!`)) {
    return;
  }

  try {
    await axios.delete(`http://localhost:3001/api/admin/tenants/${selectedTenantId.value}`);
    alert('Customer and associated configurations deleted successfully!');
    selectedTenantId.value = '';
    selectedTenant.value = null;
    await fetchTenants();
  } catch (err) {
    alert('Failed to delete customer: ' + err.message);
  }
};

const saveCredentials = async () => {
  if (!credentials.value.org_id || !credentials.value.bearer_token || !credentials.value.channel_account_name) {
    alert('Please fill out C360 org ID, token, and account name.');
    return;
  }

  try {
    const tenantHeader = { headers: { 'x-tenant-id': selectedTenantId.value } };
    await axios.post('http://localhost:3001/api/admin/credentials', credentials.value, tenantHeader);
    alert('Tenant Integration credentials updated!');
  } catch (err) {
    alert('Failed to save credentials: ' + err.message);
  }
};

const toggleJourneyState = async (journey) => {
  try {
    const tenantHeader = { headers: { 'x-tenant-id': selectedTenantId.value } };
    await axios.post('http://localhost:3001/api/admin/journeys', journey, tenantHeader);
    console.log('Journey status toggled successfully.');
  } catch (err) {
    alert('Failed to update journey status: ' + err.message);
    journey.is_active = !journey.is_active;
  }
};

onMounted(() => {
  fetchTenants();
});
</script>

<style scoped>
.config-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 32px);
  gap: 16px;
}

.config-header {
  height: 70px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.config-header h2 {
  font-size: 1.2rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
}

.config-header h2 span {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--accent-cyan);
  border: 1px solid rgba(186, 100, 50, 0.2);
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(186, 100, 50, 0.05);
}

.config-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 16px;
  height: calc(100% - 86px);
  overflow: hidden;
}

.config-card {
  height: 100%;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  position: relative;
}

.config-card h3.panel-main-title {
  font-size: 1.05rem;
  font-weight: 600;
}

.config-card .description {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin-top: -6px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.add-btn {
  padding: 6px 12px;
  font-size: 0.8rem;
}

/* Tenant selection list */
.tenants-list {
  flex-grow: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tenant-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-light);
  padding: 12px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.tenant-item:hover {
  background: var(--bg-surface-hover);
  border-color: var(--accent-cyan);
}

.tenant-item.active {
  background: rgba(186, 100, 50, 0.08);
  border-color: var(--accent-cyan);
  box-shadow: var(--shadow-glow-cyan);
}

.tenant-item.suspended {
  border-color: rgba(255, 255, 255, 0.03);
  opacity: 0.7;
}

.tenant-item.suspended:hover {
  opacity: 1.0;
}

.tenant-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tenant-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.tenant-id-label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.tenant-uuid-label {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--text-dim);
  margin-top: 2px;
}

.tenant-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  text-transform: uppercase;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  width: 75px;
  text-align: center;
}

.status-badge.active { background: rgba(0, 200, 100, 0.15); color: var(--accent-green); }
.status-badge.suspended { background: rgba(255, 70, 90, 0.15); color: var(--accent-red); }

/* Accordion sections */
.integration-section {
  overflow-y: auto;
}

.accordion-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
}

.accordion-item {
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.2);
  overflow: hidden;
  transition: var(--transition-smooth);
}

.accordion-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.02);
  transition: var(--transition-smooth);
}

.accordion-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.accordion-header h3 {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0;
}

.chevron-icon {
  width: 18px;
  height: 18px;
  color: var(--text-muted);
  transition: transform 0.3s ease;
}

.accordion-item.open .chevron-icon {
  transform: rotate(180deg);
  color: var(--accent-cyan);
}

.accordion-content {
  padding: 20px;
  border-top: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: rgba(0, 0, 0, 0.1);
}

/* Form Styles */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.check-group {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.check-group label {
  text-transform: none;
  font-size: 0.85rem;
  cursor: pointer;
}

.save-btn {
  width: 100%;
  margin-top: 6px;
}

/* Danger Zone */
.danger-zone-section {
  border-top: 1px solid rgba(255, 70, 90, 0.2);
  padding-top: 16px;
  margin-top: 10px;
}

.delete-customer-btn {
  width: 100%;
  padding: 12px;
  font-weight: 600;
}

/* Webhooks Panel */
.webhooks-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.webhook-desc {
  font-size: 0.75rem;
  color: var(--text-dim);
  line-height: 1.3;
}

.url-copy-box {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.url-copy-box .label {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-weight: 500;
}

.code-val {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--accent-cyan);
  word-break: break-all;
}

/* Flows list */
.flows-list {
  flex-grow: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.flow-item {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-light);
  padding: 14px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.flow-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.flow-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.flow-id {
  font-size: 0.7rem;
  padding: 1px 6px;
}

.flow-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.flow-keyword {
  color: var(--text-muted);
}

.flow-keyword strong {
  color: var(--accent-cyan);
}

.toggle-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
}

/* Toggle Switch slider styles */
.switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
}

.switch.tiny-switch {
  width: 30px;
  height: 16px;
}

.switch input { 
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 12px;
  width: 12px;
  left: 3px;
  bottom: 3px;
  background-color: var(--text-muted);
  transition: .4s;
}

.switch.tiny-switch .slider:before {
  height: 10px;
  width: 10px;
  left: 2px;
  bottom: 2px;
}

input:checked + .slider {
  background-color: rgba(0, 220, 200, 0.15);
  border-color: var(--accent-cyan);
}

input:checked + .slider:before {
  transform: translateX(16px);
  background-color: var(--accent-cyan);
}

.switch.tiny-switch input:checked + .slider:before {
  transform: translateX(14px);
}

.slider.round {
  border-radius: 20px;
}

.slider.round:before {
  border-radius: 50%;
}

.select-input {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='hsl(215, 16%, 72%)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 16px;
  padding-right: 40px;
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

/* Overlay Form Modal inside card */
.overlay-form {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  bottom: 16px;
  background: hsl(222, 25%, 8%);
  z-index: 10;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-header h4 {
  font-size: 0.95rem;
  font-weight: 600;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.4rem;
  color: var(--text-muted);
  cursor: pointer;
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  flex-grow: 1;
}

.submit-btn {
  margin-top: 8px;
  width: 100%;
}
</style>
