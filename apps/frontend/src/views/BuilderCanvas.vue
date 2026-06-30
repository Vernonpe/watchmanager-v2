<template>
  <div class="builder-view animated-fade-in">
    <!-- Main workspace header -->
    <header class="workspace-header-layout glass-panel">
      <!-- Row 1: Scope Selection (Tenant / Edit Journey) & Actions -->
      <div class="header-top-row">
        <div class="scope-selectors">
          <!-- Tenant Dropdown -->
          <div class="scope-item">
            <span class="scope-label">Tenant Scope</span>
            <div class="select-wrapper">
              <select v-model="selectedTenantId" class="glass-input select-input tenant-selector" @change="fetchJourneys">
                <option v-for="t in tenants" :key="t.tenant_id" :value="t.tenant_id">{{ t.name }}</option>
              </select>
            </div>
          </div>

          <!-- Journey Selector -->
          <div class="scope-item">
            <span class="scope-label">Journey Blueprint</span>
            <div class="select-wrapper">
              <select v-model="selectedJourneyId" class="glass-input select-input journey-selector" @change="loadSelectedJourney">
                <option value="">-- Start New Blueprint --</option>
                <option v-for="j in journeys" :key="j.journey_id" :value="j.journey_id">{{ j.name }} ({{ j.journey_id }})</option>
              </select>
            </div>
          </div>

          <!-- Mode Switcher -->
          <div class="scope-item">
            <span class="scope-label">Workspace Mode</span>
            <div class="mode-switcher-container">
              <button 
                class="mode-switch-btn" 
                :class="{ active: editorMode === 'canvas' }" 
                @click="editorMode = 'canvas'"
              >
                Journey Flow
              </button>
              <button 
                class="mode-switch-btn" 
                :class="{ active: editorMode === 'menu' }" 
                @click="loadMenuConfig"
              >
                Main Menu Router
              </button>
            </div>
          </div>
        </div>

        <!-- Global Actions -->
        <div class="workspace-actions">
          <button class="glass-btn glass-btn-secondary" @click="addDemoFlow">Load Demo</button>
          <button class="glass-btn glass-btn-secondary" @click="createNewFreshJourney">Clear Canvas</button>
          <button class="glass-btn glass-btn-primary" @click="saveJourney">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Save Blueprint
          </button>
        </div>
      </div>

      <!-- Row 2: Journey Configuration Settings -->
      <div class="header-bottom-row">
        <div class="config-grid">
          <!-- Card A: Identity -->
          <div class="config-card">
            <div class="card-title">Identity</div>
            <div class="card-body">
              <div class="input-group">
                <label>Journey ID</label>
                <input v-model="journeyId" type="text" class="glass-input card-input journey-id-field" placeholder="journey_id (unique)" :disabled="!!selectedJourneyId" />
              </div>
              <div class="input-group">
                <label>Journey Name</label>
                <input v-model="journeyName" type="text" class="glass-input card-input name-input-field" placeholder="Journey Name" />
              </div>
            </div>
          </div>

          <!-- Card B: Ingress Triggers -->
          <div class="config-card">
            <div class="card-title">Ingress Trigger</div>
            <div class="card-body">
              <div class="input-group">
                <label>Keyword</label>
                <input v-model="triggerKeyword" type="text" class="glass-input card-input keyword-input-field" placeholder="e.g. service" />
              </div>
              <div class="input-group">
                <label>Priority</label>
                <input v-model.number="priority" type="number" class="glass-input card-input priority-input-field" min="1" max="10" />
              </div>
            </div>
          </div>

          <!-- Card C: State Management -->
          <div class="config-card">
            <div class="card-title">Lifecycle & Expiration</div>
            <div class="card-body">
              <div class="input-group">
                <label>Timeout (minutes)</label>
                <input v-model.number="sessionTimeout" type="number" class="glass-input card-input timeout-input-field" min="1" />
              </div>
              <div class="input-group">
                <label>Exit Keys</label>
                <input v-model="exitKeywordsStr" type="text" class="glass-input card-input exit-input-field" placeholder="exit, stop" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="workspace-body">
      <!-- 1. Canvas Flow Editor Mode -->
      <template v-if="editorMode === 'canvas'">
        <!-- Node addition panel -->
        <aside class="palette-sidebar glass-panel">
          <h3>Node Palette</h3>
          <p class="description">Click to insert a new functional block onto the canvas:</p>
          <div class="palette-grid">
            <button class="palette-item" @click="addNode('prompt_text')">
              <div class="palette-badge text-badge">Text</div>
              <span>Prompt Text</span>
            </button>
            <button class="palette-item" @click="addNode('prompt_buttons')">
              <div class="palette-badge buttons-badge">Buttons</div>
              <span>Prompt Buttons</span>
            </button>
            <button class="palette-item" @click="addNode('prompt_list')">
              <div class="palette-badge list-badge">List</div>
              <span>Prompt List</span>
            </button>
            <button class="palette-item" @click="addNode('action_http')">
              <div class="palette-badge http-badge">API</div>
              <span>Outbound API</span>
            </button>
            <button class="palette-item" @click="addNode('action_db')">
              <div class="palette-badge db-badge">DB</div>
              <span>Database Ops</span>
            </button>
            <button class="palette-item" @click="addNode('condition_split')">
              <div class="palette-badge condition-badge">Split</div>
              <span>Condition Split</span>
            </button>
          </div>

          <div class="canvas-help">
            <h4>Controls</h4>
            <ul>
              <li>Drag nodes to rearrange</li>
              <li>Connect dots to link flows</li>
              <li>Click a node to configure</li>
              <li>Press Backspace to delete edge</li>
            </ul>
          </div>
        </aside>

        <!-- Vue Flow visual workspace -->
        <div class="canvas-container glass-panel">
          <VueFlow
            v-model:nodes="nodes"
            v-model:edges="edges"
            :default-viewport="{ x: 0, y: 0, zoom: 0.85 }"
            :min-zoom="0.2"
            :max-zoom="4"
            fit-view-on-init
            class="flow-workspace"
            @node-click="onNodeClick"
            @connect="onConnect"
          >
            <Background pattern-color="#aaa" gap="16" />
            <Controls />

            <!-- Active Journey Title Overlay -->
            <div class="canvas-active-title-overlay glass-panel animate-slide-down">
              <span class="active-title-label">Editing Blueprint</span>
              <span class="active-title-name">{{ journeyName || 'New Blueprint' }}</span>
              <span class="active-title-id"><code>{{ journeyId || 'unsaved' }}</code></span>
            </div>

            <!-- FLOATING TOOLBAR -->
            <div class="canvas-toolbar glass-panel">
              <button class="toolbar-btn" @click="zoomIn" title="Zoom In">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <button class="toolbar-btn" @click="zoomOut" title="Zoom Out">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <button class="toolbar-btn" @click="fitView({ padding: 0.15 })" title="Fit View">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M15 3h6v6M9 21H3v-6M21 15v6h-6M3 9V3h6" />
                </svg>
              </button>
              <button class="toolbar-btn layout-btn" @click="autoLayoutFlow" title="Auto Layout Graph">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <circle cx="12" cy="5" r="3" />
                  <circle cx="6" cy="19" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="M12 8v8M6 16l6-8M18 16l-6-8" />
                </svg>
                <span>Auto Layout</span>
              </button>
            </div>
          </VueFlow>
        </div>

        <!-- Properties Drawer Panel -->
        <transition name="slide">
          <aside v-if="selectedNode" class="properties-drawer glass-panel">
            <div class="drawer-header">
              <h3>Configure Node</h3>
              <button class="close-btn" @click="selectedNode = null">&times;</button>
            </div>

            <div class="drawer-content">
              <div class="form-group">
                <label>Node ID</label>
                <input v-model="selectedNode.id" type="text" class="glass-input" disabled />
              </div>

              <div class="form-group">
                <label>Node Type</label>
                <span class="type-badge" :class="selectedNode.type + '-color'">{{ selectedNode.type }}</span>
              </div>

              <hr class="divider" />

              <!-- 1. Text configuration fields -->
              <div v-if="selectedNode.type === 'prompt_text'">
                <div class="form-group">
                  <label>Message Content</label>
                  <textarea v-model="selectedNode.config.message" class="glass-input" rows="4" placeholder="Enter message text..."></textarea>
                </div>
                <div class="form-group row-align">
                  <label class="checkbox-container">
                    <input v-model="selectedNode.config.await_response" type="checkbox" />
                    <span>Await user response</span>
                  </label>
                </div>
                <div v-if="selectedNode.config.await_response">
                  <div class="form-group">
                    <label>Save Input Variable Name</label>
                    <input v-model="selectedNode.config.input_variable" type="text" class="glass-input" placeholder="e.g. user_choice" />
                  </div>
                  <div class="form-group">
                    <label>Regex Input Validation Pattern</label>
                    <input v-model="selectedNode.config.validation_regex" type="text" class="glass-input" placeholder="e.g. ^[0-9]{4}$" />
                  </div>
                  <div class="form-group">
                    <label>Validation Failure Error Prompt</label>
                    <textarea v-model="selectedNode.config.validation_error_message" class="glass-input" rows="2" placeholder="Invalid input. Please try again:"></textarea>
                  </div>
                </div>
              </div>

              <!-- 2. Interactive Buttons configuration fields -->
              <div v-if="selectedNode.type === 'prompt_buttons'">
                <div class="form-group">
                  <label>Message Content</label>
                  <textarea v-model="selectedNode.config.message" class="glass-input" rows="3" placeholder="Enter message text..."></textarea>
                </div>
                <div class="form-group">
                  <label>Save Input Variable Name</label>
                  <input v-model="selectedNode.config.input_variable" type="text" class="glass-input" placeholder="e.g. selection" />
                </div>
                <div class="buttons-builder-list">
                  <label>Quick Reply Buttons (Max 3)</label>
                  <div v-for="(btn, index) in selectedNode.config.buttons" :key="index" class="button-row">
                    <input v-model="btn.id" type="text" class="glass-input sub-input" placeholder="Button ID" />
                    <input v-model="btn.title" type="text" class="glass-input sub-input" placeholder="Button Title" />
                    <button class="delete-sub-btn" @click="selectedNode.config.buttons.splice(index, 1)">&times;</button>
                  </div>
                  <button v-if="selectedNode.config.buttons.length < 3" class="glass-btn glass-btn-secondary inline-btn" @click="selectedNode.config.buttons.push({ id: '', title: '' })">+ Add Button</button>
                </div>
              </div>

              <!-- 3. Interactive list configuration fields -->
              <div v-if="selectedNode.type === 'prompt_list'">
                <div class="form-group">
                  <label>Main Body Description</label>
                  <textarea v-model="selectedNode.config.description" class="glass-input" rows="3" placeholder="Enter list description..."></textarea>
                </div>
                <div class="form-group">
                  <label>Header Title</label>
                  <input v-model="selectedNode.config.title" type="text" class="glass-input" placeholder="e.g. Main Menu" />
                </div>
                <div class="form-group">
                  <label>Button Text Label</label>
                  <input v-model="selectedNode.config.button_text" type="text" class="glass-input" placeholder="e.g. View Options" />
                </div>
                <div class="form-group">
                  <label>Save Input Variable Name</label>
                  <input v-model="selectedNode.config.input_variable" type="text" class="glass-input" placeholder="e.g. selected_item" />
                </div>

                <div class="list-sections-builder">
                  <label>List Sections & Rows (Max 10)</label>
                  <div v-for="(row, index) in selectedNode.config.sections[0].rows" :key="index" class="list-row-entry">
                    <input v-model="row.id" type="text" class="glass-input sub-input" placeholder="Row Choice ID" />
                    <input v-model="row.title" type="text" class="glass-input sub-input" placeholder="Row Title" />
                    <input v-model="row.description" type="text" class="glass-input sub-input" placeholder="Description detail" />
                  </div>
                  <button v-if="selectedNode.config.sections[0].rows.length < 10" class="glass-btn glass-btn-secondary inline-btn" @click="selectedNode.config.sections[0].rows.push({ id: '', title: '', description: '' })">+ Add Menu Row</button>
                </div>
              </div>

              <!-- 4. HTTP integration configurations -->
              <div v-if="selectedNode.type === 'action_http'">
                <div class="form-group">
                  <label>HTTP Request Method</label>
                  <select v-model="selectedNode.config.method" class="glass-input select-input">
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Endpoint URL</label>
                  <input v-model="selectedNode.config.url" type="text" class="glass-input" placeholder="https://api.watchmanager.co.za/v1/alert" />
                </div>
                <div class="form-group">
                  <label>Request Headers (JSON)</label>
                  <textarea v-model="headersJson" class="glass-input code-text" rows="3" placeholder='{ "X-Tenant-ID": "{{tenant_id}}" }'></textarea>
                </div>
                <div class="form-group">
                  <label>Request Body Payload (JSON Template)</label>
                  <textarea v-model="bodyJson" class="glass-input code-text" rows="6" placeholder='{ "name": "{{collected_data.fullname}}" }'></textarea>
                </div>
              </div>

              <!-- 5. DB configurations -->
              <div v-if="selectedNode.type === 'action_db'">
                <div class="form-group">
                  <label>Target MongoDB Collection</label>
                  <select v-model="selectedNode.config.collection" class="glass-input select-input">
                    <option value="cache_reward_mechanics">cache_reward_mechanics</option>
                    <option value="sys_platform_configs">sys_platform_configs</option>
                    <option value="audit_webhook_stream">audit_webhook_stream</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Database Operation</label>
                  <select v-model="selectedNode.config.operation" class="glass-input select-input">
                    <option value="find">find</option>
                    <option value="create">create</option>
                    <option value="update">update</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Query Template (JSON)</label>
                  <textarea v-model="queryJson" class="glass-input code-text" rows="3" placeholder='{ "mobile": "{{mobile}}" }'></textarea>
                </div>
                <div class="form-group">
                  <label>Write / Update Data (JSON)</label>
                  <textarea v-model="dataJson" class="glass-input code-text" rows="3" placeholder='{ "status": "active" }'></textarea>
                </div>
              </div>

              <!-- 6. Condition split configurations -->
              <div v-if="selectedNode.type === 'condition_split'">
                <div class="form-group">
                  <label>Variable Path</label>
                  <input v-model="selectedNode.config.variable" type="text" class="glass-input" placeholder="collected_data.fullname" />
                </div>
                <div class="form-group">
                  <label>Operator</label>
                  <select v-model="selectedNode.config.operator" class="glass-input select-input">
                    <option value="equals">equals</option>
                    <option value="contains">contains</option>
                    <option value="matches">matches regex</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Compare Value</label>
                  <input v-model="selectedNode.config.value" type="text" class="glass-input" placeholder="e.g. 1234" />
                </div>
              </div>

              <!-- Fallback templates configuration for prompt nodes -->
              <div v-if="selectedNode.type && selectedNode.type.startsWith('prompt_')" class="fallback-template-section">
                <hr class="divider" />
                <h4 class="section-sub-title">24h Support Window Template Fallback</h4>
                <div class="form-group">
                  <label>Meta Template Name</label>
                  <input v-model="selectedNode.config.fallback_template_name" type="text" class="glass-input" placeholder="e.g. service_reinitiate" />
                </div>
                <div class="form-group" style="margin-top: 8px;">
                  <label>Template Parameters (comma separated)</label>
                  <input 
                    :value="(selectedNode.config.fallback_template_params || []).join(', ')" 
                    @input="e => selectedNode.config.fallback_template_params = e.target.value.split(',').map(s => s.trim()).filter(Boolean)"
                    type="text" 
                    class="glass-input" 
                    placeholder="e.g. collected_data.fullname" 
                  />
                </div>
              </div>

              <div class="drawer-actions">
                <button class="glass-btn glass-btn-danger" @click="deleteSelectedNode">Delete Node</button>
              </div>
            </div>
          </aside>
        </transition>
      </template>

      <!-- 2. Main Menu Router Mode -->
      <template v-else-if="editorMode === 'menu'">
        <div class="menu-router-workspace animated-fade-in">
          <!-- Left Column: Menu Configuration Panel -->
          <div class="menu-config-panel glass-panel">
            <div class="panel-section-title">Main Menu Settings</div>
            
            <div class="form-group row-align-checkbox">
              <label class="switch-container">
                <input v-model="menuConfig.enabled" type="checkbox" />
                <span class="switch-slider"></span>
              </label>
              <span class="switch-label">Enable Main Menu gateway for incoming chats</span>
            </div>

            <div class="form-group" style="margin-top: 12px;">
              <label>Menu Header Title</label>
              <input v-model="menuConfig.menu_title" type="text" class="glass-input text-field" placeholder="e.g. Main Menu" />
            </div>

            <div class="form-group" style="margin-top: 12px;">
              <label>Menu Introduction Body Text</label>
              <textarea v-model="menuConfig.menu_description" class="glass-input textarea-field" rows="3" placeholder="e.g. Please select an option:"></textarea>
            </div>

            <hr class="divider" />
            
            <div class="options-header">
              <h4>Interactive Menu Items</h4>
              <button class="glass-btn glass-btn-primary btn-xs" @click="addMenuItem">+ Add Item</button>
            </div>

            <div class="menu-items-list">
              <div v-for="(item, index) in menuConfig.items" :key="index" class="menu-item-row glass-panel">
                <div class="item-index-col">
                  <label>Index</label>
                  <input v-model.number="item.index" type="number" class="glass-input number-input" min="1" />
                </div>
                <div class="item-label-col">
                  <label>Menu Option Label</label>
                  <input v-model="item.label" type="text" class="glass-input text-input" placeholder="e.g. Log a service call" />
                </div>
                <div class="item-journey-col">
                  <label>Target Subflow</label>
                  <select v-model="item.target_journey_id" class="glass-input select-input">
                    <option v-for="j in journeys" :key="j.journey_id" :value="j.journey_id">{{ j.name }}</option>
                  </select>
                </div>
                <div class="item-hidden-col">
                  <label class="checkbox-container" title="Hide option from menu list, but keep it active">
                    <input v-model="item.is_hidden" type="checkbox" />
                    <span>Hide Option</span>
                  </label>
                </div>
                <button class="delete-item-btn" @click="removeMenuItem(index)">&times;</button>
              </div>
            </div>

            <div class="menu-save-container">
              <button class="glass-btn glass-btn-primary" @click="saveMenuConfig">
                Save Router Settings
              </button>
            </div>
          </div>

          <!-- Right Column: Visual Routing Map -->
          <div class="menu-visual-map glass-panel">
            <div class="panel-section-title">Visual Routing Map</div>
            <p class="description">Review routing mappings, subflow configuration completeness, and active statuses:</p>

            <div class="visual-map-container">
              <!-- Menu Trigger Node -->
              <div class="menu-source-block glass-panel" :class="{ disabled: !menuConfig.enabled }">
                <div class="block-badge">Gateway</div>
                <h4>{{ menuConfig.menu_title || 'Main Menu' }}</h4>
                <p>{{ menuConfig.enabled ? 'Active Inbound Gateway' : 'Inactive (Bypassed)' }}</p>
              </div>

              <!-- Connector Lines and Destination Blocks -->
              <div class="menu-connections-list">
                <div v-for="item in menuConfig.items" :key="item.index" class="map-connection-row">
                  <div class="connector-line" :class="{ 'line-hidden': item.is_hidden, 'line-disabled': !menuConfig.enabled }">
                    <span class="connector-label">Option {{ item.index }}</span>
                  </div>

                  <div class="destination-journey-block glass-panel" :class="getJourneyStatusClass(item.target_journey_id)">
                    <div class="dest-badge">
                      {{ getJourneyStatusText(item.target_journey_id) }}
                    </div>
                    <h5>{{ getJourneyName(item.target_journey_id) }}</h5>
                    <p class="journey-meta-info">
                      Keyword: <code>{{ getJourneyKeyword(item.target_journey_id) }}</code> 
                      <span v-if="item.is_hidden" class="hidden-pill">Hidden Option</span>
                    </p>
                    <button class="inspect-flow-btn" @click="inspectJourney(item.target_journey_id)">
                      Configure Flow &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import axios from 'axios';

const { zoomIn, zoomOut, fitView } = useVueFlow();

// Load default vue flow styles
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';

const tenants = ref([]);
const journeys = ref([]);
const selectedTenantId = ref('tenant_watchmanager_prod_01');
const selectedJourneyId = ref('');
const editorMode = ref('canvas');
const menuConfig = ref({
  enabled: false,
  menu_title: 'Main Menu',
  menu_description: 'Please select an option from the list below:',
  items: []
});

const journeyName = ref('WatchManager Unified Journey');
const triggerKeyword = ref('service');
const priority = ref(1);
const journeyId = ref('journey_watchmanager_v2');
const sessionTimeout = ref(1440);
const exitKeywordsStr = ref('exit, stop');

// Initial Vue Flow states
const nodes = ref([]);
const edges = ref([]);

const selectedNode = ref(null);

// JSON bindings inside properties panel
const headersJson = ref('{}');
const bodyJson = ref('{}');
const queryJson = ref('{}');
const dataJson = ref('{}');

// Sync JSON text fields to selectedNode config
watch(headersJson, (val) => {
  if (selectedNode.value && selectedNode.value.type === 'action_http') {
    try { selectedNode.value.config.headers = JSON.parse(val); } catch (e) {}
  }
});
watch(bodyJson, (val) => {
  if (selectedNode.value && selectedNode.value.type === 'action_http') {
    try { selectedNode.value.config.body_template = JSON.parse(val); } catch (e) {}
  }
});
watch(queryJson, (val) => {
  if (selectedNode.value && selectedNode.value.type === 'action_db') {
    try { selectedNode.value.config.query = JSON.parse(val); } catch (e) {}
  }
});
watch(dataJson, (val) => {
  if (selectedNode.value && selectedNode.value.type === 'action_db') {
    try { selectedNode.value.config.data = JSON.parse(val); } catch (e) {}
  }
});

// Watch when selected node switches
watch(selectedNode, (node) => {
  if (node) {
    if (node.type === 'action_http') {
      headersJson.value = JSON.stringify(node.config.headers || {}, null, 2);
      bodyJson.value = JSON.stringify(node.config.body_template || {}, null, 2);
    } else if (node.type === 'action_db') {
      queryJson.value = JSON.stringify(node.config.query || {}, null, 2);
      dataJson.value = JSON.stringify(node.config.data || {}, null, 2);
    }
  }
});

// Fetch tenant accounts
const fetchTenants = async () => {
  try {
    const res = await axios.get('/api/admin/tenants');
    tenants.value = res.data;
    if (tenants.value.length > 0) {
      // Find default selected tenant if present
      const match = tenants.value.find(t => t.tenant_id === selectedTenantId.value);
      if (!match) {
        selectedTenantId.value = tenants.value[0].tenant_id;
      }
      await fetchJourneys();
    }
  } catch (err) {
    console.error('Failed to load tenants:', err.message);
  }
};

// Fetch journeys for selected tenant
const fetchJourneys = async () => {
  try {
    const tenantHeader = { headers: { 'x-tenant-id': selectedTenantId.value } };
    const res = await axios.get('/api/admin/journeys', tenantHeader);
    journeys.value = res.data;
    selectedJourneyId.value = '';
  } catch (err) {
    console.error('Failed to load journeys:', err.message);
  }
};

// Load selected journey into flow editor canvas
const loadSelectedJourney = () => {
  if (!selectedJourneyId.value) {
    createNewFreshJourney();
    return;
  }
  const j = journeys.value.find(x => x.journey_id === selectedJourneyId.value);
  if (j) {
    journeyId.value = j.journey_id;
    journeyName.value = j.name;
    triggerKeyword.value = j.ingress_trigger_keyword || '';
    priority.value = j.priority || 1;
    sessionTimeout.value = j.session_timeout_minutes || 1440;
    exitKeywordsStr.value = (j.exit_keywords || ['exit', 'stop']).join(', ');
    
    // Map database nodes into Vue Flow nodes
    nodes.value = (j.nodes || []).map(n => ({
      id: n.id,
      type: n.type,
      position: n.position || { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      label: `${n.type.toUpperCase()} block`,
      config: n.config || {}
    }));
    
    // Map database edges into Vue Flow edges
    edges.value = (j.edges || []).map(e => ({
      id: e.id || `e-${e.source}-${e.sourceHandle || e.source_handle || 'success'}-${e.target}`,
      source: e.source,
      sourceHandle: e.sourceHandle || e.source_handle || 'success',
      target: e.target,
      targetHandle: e.targetHandle || 'default'
    }));

    selectedNode.value = null;
  }
};

// Clear canvas and reset configuration IDs for new flow
const createNewFreshJourney = () => {
  selectedJourneyId.value = '';
  journeyId.value = 'journey_' + Math.random().toString(36).substring(7);
  journeyName.value = 'New Conversational Journey';
  triggerKeyword.value = '';
  priority.value = 1;
  sessionTimeout.value = 1440;
  exitKeywordsStr.value = 'exit, stop';
  nodes.value = [];
  edges.value = [];
  selectedNode.value = null;
};

// Event hook when node is clicked in canvas
const onNodeClick = (event) => {
  selectedNode.value = event.node;
};

// Vue Flow drag connection edges creation handler
const onConnect = (connection) => {
  // connection is an object containing { source, target, sourceHandle, targetHandle }
  const newEdge = {
    id: `e-${connection.source}-${connection.sourceHandle || 'success'}-${connection.target}`,
    source: connection.source,
    sourceHandle: connection.sourceHandle || 'success',
    target: connection.target,
    targetHandle: connection.targetHandle || 'default'
  };
  
  // Prevent duplicate edge linking
  const exists = edges.value.some(e => e.source === newEdge.source && e.sourceHandle === newEdge.sourceHandle && e.target === newEdge.target);
  if (!exists) {
    edges.value.push(newEdge);
  }
};

// Add node on canvas
let nodeCount = 0;
const addNode = (type) => {
  nodeCount++;
  const id = `node_${type}_${nodeCount}`;
  
  let config = {};
  if (type === 'prompt_text') {
    config = { message: 'Text question goes here...', await_response: true, input_variable: `var_${nodeCount}`, validation_regex: '.*', validation_error_message: 'Invalid input' };
  } else if (type === 'prompt_buttons') {
    config = { message: 'Select status:', input_variable: `var_${nodeCount}`, buttons: [{ id: 'yes', title: 'Yes' }, { id: 'no', title: 'No' }] };
  } else if (type === 'prompt_list') {
    config = { button_text: 'Select Option', title: 'Choices', description: 'Please pick an item:', input_variable: `var_${nodeCount}`, sections: [{ title: 'Category', rows: [{ id: 'opt_1', title: 'Option 1', description: 'Detail description' }] }] };
  } else if (type === 'action_http') {
    config = { url: 'https://api.watchmanager.co.za/v1/', method: 'POST', headers: {}, body_template: {} };
  } else if (type === 'action_db') {
    config = { collection: 'cache_reward_mechanics', operation: 'find', query: {}, data: {} };
  } else if (type === 'condition_split') {
    config = { variable: 'collected_data.status', operator: 'equals', value: 'active' };
  }

  const newNode = {
    id,
    type,
    position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 150 },
    label: `${type.toUpperCase()} block`,
    config
  };

  nodes.value.push(newNode);
  selectedNode.value = newNode;
};

const deleteSelectedNode = () => {
  if (selectedNode.value) {
    nodes.value = nodes.value.filter(n => n.id !== selectedNode.value.id);
    edges.value = edges.value.filter(e => e.source !== selectedNode.value.id && e.target !== selectedNode.value.id);
    selectedNode.value = null;
  }
};

// Add Demo checklist blueprint
const addDemoFlow = () => {
  nodes.value = [
    {
      id: "node_start",
      type: "prompt_text",
      position: { x: 50, y: 200 },
      config: {
        message: "Welcome to *WatchManager Technical Assistance Portal*.\n\nPlease tell us your full name to proceed:",
        await_response: true,
        input_variable: "fullname",
        validation_regex: "^.{2,100}$",
        validation_error_message: "Invalid Name. Name must be between 2 and 100 characters. Please try again:"
      }
    },
    {
      id: "node_address",
      type: "prompt_text",
      position: { x: 320, y: 200 },
      config: {
        message: "Thank you {{collected_data.fullname}}.\n\nPlease provide your physical site address:",
        await_response: true,
        input_variable: "address",
        validation_regex: "^.{5,200}$",
        validation_error_message: "Invalid Address. Address must be between 5 and 200 characters. Please try again:"
      }
    },
    {
      id: "node_fault_menu",
      type: "prompt_list",
      position: { x: 600, y: 200 },
      config: {
        button_text: "Select Fault",
        title: "Technical Faults",
        description: "Please select the option that matches your issue:",
        input_variable: "fault_type",
        sections: [
          {
            title: "Available Categories",
            rows: [
              { id: "flt_bt_001", title: "Battery Failure", description: "Main power outage warning" },
              { id: "flt_sn_002", title: "Sensor Issue", description: "Continuous false alarms" }
            ]
          }
        ]
      }
    },
    {
      id: "node_api_dispatch",
      type: "action_http",
      position: { x: 880, y: 200 },
      config: {
        url: "http://localhost:3002/mock_watchmanager/mobile_tech",
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body_template: {
          "subscriber_name": "{{collected_data.fullname}}",
          "site_address": "{{collected_data.address}}",
          "fault_category": "{{collected_data.fault_type}}",
          "subscriber_phone": "{{mobile}}"
        }
      }
    },
    {
      id: "node_end",
      type: "prompt_text",
      position: { x: 1150, y: 200 },
      config: {
        message: "Thank you! A technical assistance request has been registered.\n\nJob Ticket Reference: *{{api_response.ticket_id}}*.",
        await_response: false
      }
    }
  ];

  edges.value = [
    { id: "e1", source: "node_start", sourceHandle: "success", target: "node_address" },
    { id: "e2", source: "node_address", sourceHandle: "success", target: "node_fault_menu" },
    { id: "e3", source: "node_fault_menu", sourceHandle: "flt_bt_001", target: "node_api_dispatch" },
    { id: "e4", source: "node_fault_menu", sourceHandle: "flt_sn_002", target: "node_api_dispatch" },
    { id: "e5", source: "node_api_dispatch", sourceHandle: "success", target: "node_end" }
  ];
  
  journeyName.value = 'WatchManager Technical Assistance';
  triggerKeyword.value = 'service';
  priority.value = 1;
};

// Save blueprint back to Express MongoDB API
const saveJourney = async () => {
  if (!journeyId.value || !journeyName.value) {
    alert('Please enter a journey ID and journey name.');
    return;
  }

  // Format nodes & edges mapping for API schema, keeping positions intact
  const payload = {
    journey_id: journeyId.value,
    name: journeyName.value,
    version: 1,
    priority: priority.value,
    ingress_trigger_keyword: triggerKeyword.value,
    session_timeout_minutes: sessionTimeout.value,
    exit_keywords: exitKeywordsStr.value.split(',').map(s => s.trim()).filter(Boolean),
    menu_keywords: ['menu'],
    back_keywords: ['back'],
    nodes: nodes.value.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position,
      config: n.config
    })),
    edges: edges.value.map(e => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle || 'success',
      target: e.target,
      targetHandle: e.targetHandle || 'default'
    }))
  };

  try {
    const tenantHeader = { headers: { 'x-tenant-id': selectedTenantId.value } };
    await axios.post('/api/admin/journeys', payload, tenantHeader);
    alert('Blueprint saved successfully to local database!');
    await fetchJourneys();
    selectedJourneyId.value = journeyId.value;
  } catch (err) {
    console.error(err);
    alert('Error saving blueprint: ' + err.message);
  }
};

// Main Menu Router functions
const loadMenuConfig = async () => {
  try {
    const tenantHeader = { headers: { 'x-tenant-id': selectedTenantId.value } };
    const res = await axios.get('/api/admin/menu', tenantHeader);
    if (res.data) {
      menuConfig.value = {
        enabled: res.data.enabled || false,
        menu_title: res.data.menu_title || "Main Menu",
        menu_description: res.data.menu_description || "Please select an option from the list below:",
        items: res.data.items || []
      };
    }
    editorMode.value = 'menu';
  } catch (err) {
    console.error('[Menu Load Error]', err);
    alert('Error loading Main Menu config: ' + err.message);
  }
};

const saveMenuConfig = async () => {
  try {
    const tenantHeader = { headers: { 'x-tenant-id': selectedTenantId.value } };
    await axios.post('/api/admin/menu', menuConfig.value, tenantHeader);
    alert('Main Menu settings saved successfully!');
  } catch (err) {
    console.error('[Menu Save Error]', err);
    alert('Error saving Main Menu config: ' + err.message);
  }
};

const addMenuItem = () => {
  const nextIdx = menuConfig.value.items.length + 1;
  menuConfig.value.items.push({
    index: nextIdx,
    label: '',
    target_journey_id: journeys.value[0]?.journey_id || '',
    is_hidden: false
  });
};

const removeMenuItem = (index) => {
  menuConfig.value.items.splice(index, 1);
};

const getJourneyName = (journeyId) => {
  const j = journeys.value.find(x => x.journey_id === journeyId);
  return j ? j.name : 'Unknown Subflow';
};

const getJourneyKeyword = (journeyId) => {
  const j = journeys.value.find(x => x.journey_id === journeyId);
  return j ? (j.ingress_trigger_keyword || 'None') : 'None';
};

const getJourneyStatusText = (journeyId) => {
  const j = journeys.value.find(x => x.journey_id === journeyId);
  if (!j) return 'Missing';
  return j.is_active ? 'Active' : 'Inactive';
};

const getJourneyStatusClass = (journeyId) => {
  const j = journeys.value.find(x => x.journey_id === journeyId);
  if (j && j.is_active) return 'status-active';
  return 'status-inactive';
};

const inspectJourney = (journeyId) => {
  selectedJourneyId.value = journeyId;
  loadSelectedJourney();
  editorMode.value = 'canvas';
};

const autoLayoutFlow = () => {
  if (nodes.value.length === 0) return;

  // 1. Identify first node
  let rootNode = nodes.value.find(n => n.id === 'node_start') ||
                 nodes.value.find(n => n.type === 'start') ||
                 nodes.value.find(n => {
                   return !edges.value.some(e => e.target === n.id);
                 }) ||
                 nodes.value[0];

  if (!rootNode) return;

  // 2. Build adjacency list of children
  const adj = {};
  nodes.value.forEach(n => {
    adj[n.id] = [];
  });
  edges.value.forEach(e => {
    if (adj[e.source]) {
      adj[e.source].push(e.target);
    }
  });

  // 3. BFS to determine level rank
  const levels = {};
  const visited = new Set();
  const queue = [{ id: rootNode.id, level: 0 }];

  while (queue.length > 0) {
    const { id, level } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    levels[id] = level;

    const children = adj[id] || [];
    children.forEach(childId => {
      queue.push({ id: childId, level: level + 1 });
    });
  }

  // Handle any orphan/disconnected nodes
  nodes.value.forEach(n => {
    if (levels[n.id] === undefined) {
      levels[n.id] = 0; 
    }
  });

  // 4. Group nodes by level
  const groups = {};
  nodes.value.forEach(n => {
    const lvl = levels[n.id];
    if (!groups[lvl]) groups[lvl] = [];
    groups[lvl].push(n);
  });

  // 5. Calculate coordinates in place
  const verticalGap = 160;
  const horizontalGap = 240;
  const startX = 400;
  const startY = 80;

  Object.keys(groups).forEach(lvlStr => {
    const lvl = parseInt(lvlStr, 10);
    const grp = groups[lvl];
    const count = grp.length;

    grp.forEach((node, idx) => {
      const xOffset = (idx - (count - 1) / 2) * horizontalGap;
      node.position = {
        x: startX + xOffset,
        y: startY + lvl * verticalGap
      };
    });
  });

  // Center view on the new layout
  setTimeout(() => {
    fitView({ padding: 0.15 });
  }, 100);
};

onMounted(() => {
  fetchTenants();
});
</script>

<style scoped>
.builder-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 32px);
  gap: 16px;
}

.workspace-header-layout {
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
  gap: 16px;
  background: var(--bg-glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-glass);
  border-radius: 12px;
}

.header-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.scope-selectors {
  display: flex;
  gap: 24px;
  align-items: center;
}

.scope-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.scope-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent-cyan);
}

.tenant-selector,
.journey-selector {
  width: 220px;
}

.header-bottom-row {
  border-top: 1px solid var(--border-glass);
  padding-top: 12px;
}

.config-grid {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.config-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.config-card .card-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.config-card .card-body {
  display: flex;
  gap: 12px;
  align-items: center;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-group label {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.card-input {
  height: 32px;
  padding: 0 10px;
  font-size: 0.85rem;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-light);
  color: var(--text-main);
  outline: none;
  transition: all 0.3s ease;
}

.card-input:focus {
  border-color: var(--accent-cyan);
  background: rgba(255, 255, 255, 0.05);
}

.journey-id-field {
  width: 150px;
}

.name-input-field {
  width: 240px;
}

.keyword-input-field {
  width: 120px;
}

.priority-input-field {
  width: 60px;
  text-align: center;
}

.timeout-input-field {
  width: 80px;
  text-align: center;
}

.exit-input-field {
  width: 150px;
}

.workspace-actions {
  display: flex;
  gap: 12px;
}

.workspace-body {
  display: flex;
  flex: 1;
  gap: 16px;
  min-height: 0;
  overflow: hidden;
}

.palette-sidebar {
  width: 240px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
}

.palette-sidebar h3 {
  font-size: 1rem;
  font-weight: 600;
}

.palette-sidebar .description {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.3;
}

.palette-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-light);
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: var(--transition-smooth);
  width: 100%;
  text-align: left;
}

.palette-item:hover {
  background: var(--bg-surface-hover);
  border-color: var(--accent-cyan);
  transform: translateX(3px);
}

.palette-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  width: 60px;
  text-align: center;
}

.text-badge { background: rgba(50, 150, 255, 0.15); color: var(--accent-blue); }
.buttons-badge { background: rgba(200, 100, 255, 0.15); color: var(--accent-purple); }
.list-badge { background: rgba(0, 220, 200, 0.15); color: var(--accent-cyan); }
.http-badge { background: rgba(255, 170, 0, 0.15); color: var(--accent-orange); }
.db-badge { background: rgba(0, 200, 100, 0.15); color: var(--accent-green); }
.condition-badge { background: rgba(255, 70, 90, 0.15); color: var(--accent-red); }

.canvas-help {
  margin-top: auto;
  background: rgba(0, 0, 0, 0.15);
  padding: 12px;
  border-radius: 8px;
  border: 1px dashed var(--border-light);
}

.canvas-help h4 {
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text-muted);
}

.canvas-help ul {
  list-style: none;
  font-size: 0.75rem;
  color: var(--text-dim);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.canvas-container {
  flex-grow: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
}

/* Properties Drawer styles */
.properties-drawer {
  width: 380px;
  height: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 24px;
  z-index: 10;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.drawer-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
}

.drawer-content {
  flex-grow: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-right: 4px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.8rem;
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
  font-size: 0.9rem;
  cursor: pointer;
}

.type-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  align-self: flex-start;
}

.prompt_text-color { background: rgba(50, 150, 255, 0.15); color: var(--accent-blue); }
.prompt_buttons-color { background: rgba(200, 100, 255, 0.15); color: var(--accent-purple); }
.prompt_list-color { background: rgba(0, 220, 200, 0.15); color: var(--accent-cyan); }
.action_http-color { background: rgba(255, 170, 0, 0.15); color: var(--accent-orange); }
.action_db-color { background: rgba(0, 200, 100, 0.15); color: var(--accent-green); }
.condition_split-color { background: rgba(255, 70, 90, 0.15); color: var(--accent-red); }

.code-text {
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.divider {
  border: 0;
  border-top: 1px solid var(--border-light);
  margin: 8px 0;
}

.nested-field {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.nested-field-column {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border-light);
}

.horizontal-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.sub-input {
  font-size: 0.85rem;
  padding: 6px 10px;
}

.inline {
  flex-grow: 1;
}

.remove-btn {
  background: transparent;
  border: none;
  color: var(--accent-red);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 4px;
}

.inline-btn {
  width: 100%;
  padding: 6px;
  font-size: 0.8rem;
  margin-top: 4px;
}

.select-input {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='hsl(215, 16%, 72%)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 16px;
  padding-right: 40px;
}

.drawer-actions {
  margin-top: auto;
  border-top: 1px solid var(--border-light);
  padding-top: 16px;
}

.drawer-actions button {
  width: 100%;
}

/* Slide Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

/* Floating Workspace Toolbar */
.canvas-toolbar {
  position: absolute;
  bottom: 20px;
  left: 20px;
  display: flex;
  gap: 8px;
  padding: 8px;
  z-index: 10;
  border-radius: 12px;
  background: rgba(10, 15, 30, 0.65);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-dark);
  backdrop-filter: blur(10px);
}

.toolbar-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-light);
  color: var(--text-muted);
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.toolbar-btn:hover {
  background: var(--bg-surface-hover);
  color: var(--accent-cyan);
  border-color: var(--accent-cyan);
  box-shadow: var(--shadow-glow-cyan);
}

.toolbar-btn svg {
  transition: transform 0.2s ease;
}

.toolbar-btn:hover svg {
  transform: scale(1.1);
}

.toolbar-btn.layout-btn {
  width: auto;
  padding: 0 14px;
  gap: 8px;
  font-weight: 600;
  font-size: 0.78rem;
  font-family: var(--font-main);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Workspace Mode Switcher Styles */
.mode-switcher-container {
  display: flex;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 2px;
  height: 32px;
}

.mode-switch-btn {
  background: transparent;
  border: none;
  padding: 0 12px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-switch-btn:hover {
  color: var(--text-main);
}

.mode-switch-btn.active {
  background: var(--accent-cyan);
  color: #000;
}

/* Main Menu Router Layout Styles */
.menu-router-workspace {
  display: flex;
  gap: 20px;
  width: 100%;
  height: 100%;
  padding: 4px;
  overflow: hidden;
}

.menu-config-panel,
.menu-visual-map {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  min-width: 0;
}

.panel-section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 8px;
  border-bottom: 2px solid var(--border-light);
  padding-bottom: 8px;
}

/* Switch container toggle */
.switch-container {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 22px;
  flex-shrink: 0;
}

.switch-container input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.1);
  transition: .3s;
  border-radius: 34px;
  border: 1px solid var(--border-light);
}

.switch-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: var(--text-muted);
  transition: .3s;
  border-radius: 50%;
}

input:checked + .switch-slider {
  background-color: rgba(0, 220, 200, 0.2);
  border-color: var(--accent-cyan);
}

input:checked + .switch-slider:before {
  transform: translateX(22px);
  background-color: var(--accent-cyan);
}

.row-align-checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.02);
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.switch-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-main);
}

.options-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  margin-bottom: 12px;
}

.options-header h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--accent-cyan);
}

.menu-items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
  max-height: 380px;
  overflow-y: auto;
  padding-right: 4px;
}

.menu-item-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  position: relative;
}

.item-index-col { width: 60px; }
.item-label-col { flex: 2; min-width: 0; }
.item-journey-col { flex: 2; min-width: 0; }
.item-hidden-col { 
  display: flex; 
  align-items: center; 
  height: 32px; 
  margin-bottom: 4px;
  padding-left: 4px;
}

.menu-item-row label {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-bottom: 4px;
  display: block;
}

.menu-item-row .number-input {
  width: 100%;
  text-align: center;
}

.delete-item-btn {
  position: absolute;
  top: 4px;
  right: 6px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
  transition: color 0.2s;
}

.delete-item-btn:hover {
  color: var(--accent-orange);
}

.menu-save-container {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

/* Visual Mapping styles */
.visual-map-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  margin-top: 24px;
  width: 100%;
}

.menu-source-block {
  width: 280px;
  padding: 16px;
  text-align: center;
  border-left: 4px solid var(--accent-cyan);
  background: rgba(0, 220, 200, 0.03);
  border-radius: 8px;
}

.menu-source-block.disabled {
  border-color: var(--text-muted);
  background: rgba(255, 255, 255, 0.02);
  opacity: 0.5;
}

.menu-source-block .block-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--accent-cyan);
  background: rgba(0, 220, 200, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 8px;
}

.menu-source-block h4 {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 4px;
}

.menu-source-block p {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.menu-connections-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  align-items: center;
}

.map-connection-row {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
  max-width: 600px;
}

.connector-line {
  flex: 1;
  height: 2px;
  background: var(--accent-cyan);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
}

.connector-line.line-disabled {
  background: var(--text-muted);
}

.connector-line.line-hidden {
  background: transparent;
  border-top: 2px dashed var(--accent-purple);
}

.connector-label {
  position: absolute;
  top: -16px;
  font-size: 0.65rem;
  font-family: var(--font-mono);
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  background: var(--bg-surface);
  padding: 0 6px;
  border-radius: 4px;
}

.destination-journey-block {
  width: 300px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-left: 4px solid var(--border-light);
  border-radius: 8px;
  text-align: left;
}

.destination-journey-block.status-active {
  border-color: var(--accent-green);
  background: rgba(0, 200, 100, 0.02);
}

.destination-journey-block.status-inactive {
  border-color: var(--accent-orange);
  background: rgba(255, 170, 0, 0.02);
}

.destination-journey-block.status-active .dest-badge {
  color: var(--accent-green);
  background: rgba(0, 200, 100, 0.1);
}

.destination-journey-block.status-inactive .dest-badge {
  color: var(--accent-orange);
  background: rgba(255, 170, 0, 0.1);
}

.dest-badge {
  align-self: flex-start;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
}

.destination-journey-block h5 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
}

.journey-meta-info {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.journey-meta-info code {
  color: var(--accent-cyan);
  font-family: var(--font-mono);
}

.hidden-pill {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--accent-purple);
  background: rgba(200, 100, 255, 0.1);
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: 6px;
  display: inline-block;
}

.inspect-flow-btn {
  margin-top: 4px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-light);
  color: var(--text-muted);
  padding: 6px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.inspect-flow-btn:hover {
  background: var(--accent-cyan);
  color: #000;
  border-color: var(--accent-cyan);
}

/* Active Blueprint Canvas Title Overlay Styles */
.canvas-active-title-overlay {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 16px;
  z-index: 10;
  border-radius: 10px;
  background: rgba(10, 15, 30, 0.7);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-dark);
  backdrop-filter: blur(10px);
  pointer-events: none;
}

.canvas-active-title-overlay .active-title-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent-cyan);
}

.canvas-active-title-overlay .active-title-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-main);
}

.canvas-active-title-overlay .active-title-id {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.canvas-active-title-overlay .active-title-id code {
  color: var(--accent-purple);
  font-family: var(--font-mono);
}

.animate-slide-down {
  animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes slideDown {
  from {
    transform: translateY(-10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
