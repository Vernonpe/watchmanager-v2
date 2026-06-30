<template>
  <div class="builder-view animated-fade-in">
    <!-- Main workspace header -->
    <header class="workspace-header glass-panel">
      <div class="workspace-info">
        <div class="meta-item">
          <span>Tenant:</span>
          <select v-model="selectedTenantId" class="glass-input select-input selector-width" @change="fetchJourneys">
            <option v-for="t in tenants" :key="t.tenant_id" :value="t.tenant_id">{{ t.name }}</option>
          </select>
        </div>

        <div class="meta-item">
          <span>Edit Journey:</span>
          <select v-model="selectedJourneyId" class="glass-input select-input selector-width" @change="loadSelectedJourney">
            <option value="">-- Start New --</option>
            <option v-for="j in journeys" :key="j.journey_id" :value="j.journey_id">{{ j.name }} ({{ j.journey_id }})</option>
          </select>
        </div>

        <input v-model="journeyId" type="text" class="journey-id-input glass-input" placeholder="journey_id (unique)" :disabled="!!selectedJourneyId" />
        <input v-model="journeyName" type="text" class="journey-name-input glass-input" placeholder="Journey Name" />

        <div class="meta-item">
          <span>Keyword:</span>
          <input v-model="triggerKeyword" type="text" class="trigger-keyword-input" placeholder="e.g. service" />
        </div>
        <div class="meta-item">
          <span>Priority:</span>
          <input v-model.number="priority" type="number" class="priority-input" min="1" max="10" />
        </div>
      </div>
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
    </header>

    <div class="workspace-body">
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
          @node-click="onNodeClick"
          @pane-click="selectedNode = null"
          @connect="onConnect"
        >
          <Background pattern-color="#ffffff" :gap="16" :size="1" />
          <Controls />
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
                <textarea v-model="selectedNode.config.message" class="glass-input code-text" rows="4" placeholder="Enter text (supports {{collected_data.fullname}})"></textarea>
              </div>
              <div class="form-group check-group">
                <input v-model="selectedNode.config.await_response" type="checkbox" id="await_resp" />
                <label for="await_resp">Await Response from User</label>
              </div>
              <div v-if="selectedNode.config.await_response">
                <div class="form-group">
                  <label>Assign to Variable</label>
                  <input v-model="selectedNode.config.input_variable" type="text" class="glass-input" placeholder="e.g. fullname" />
                </div>
                <div class="form-group">
                  <label>Validation Regex Pattern</label>
                  <input v-model="selectedNode.config.validation_regex" type="text" class="glass-input" placeholder="e.g. ^.{2,100}$" />
                </div>
                <div class="form-group">
                  <label>Validation Error Message</label>
                  <input v-model="selectedNode.config.validation_error_message" type="text" class="glass-input" placeholder="Invalid input. Please try again." />
                </div>
              </div>
            </div>

            <!-- 2. Button configuration fields -->
            <div v-if="selectedNode.type === 'prompt_buttons'">
              <div class="form-group">
                <label>Message Text</label>
                <textarea v-model="selectedNode.config.message" class="glass-input" rows="3" placeholder="Select one option:"></textarea>
              </div>
              <div class="form-group">
                <label>Assign to Variable</label>
                <input v-model="selectedNode.config.input_variable" type="text" class="glass-input" placeholder="e.g. confirm_status" />
              </div>
              <div class="form-group">
                <label>Buttons (Max 3)</label>
                <div v-for="(btn, index) in selectedNode.config.buttons" :key="index" class="nested-field">
                  <input v-model="btn.id" type="text" class="glass-input inline" placeholder="Choice ID (e.g. yes)" />
                  <input v-model="btn.title" type="text" class="glass-input inline" placeholder="Button Title (e.g. Yes)" />
                  <button class="remove-btn" @click="selectedNode.config.buttons.splice(index, 1)">&times;</button>
                </div>
                <button v-if="selectedNode.config.buttons.length < 3" class="glass-btn glass-btn-secondary inline-btn" @click="selectedNode.config.buttons.push({ id: '', title: '' })">+ Add Button</button>
              </div>
            </div>

            <!-- 3. List configuration fields -->
            <div v-if="selectedNode.type === 'prompt_list'">
              <div class="form-group">
                <label>List Dropdown Button Label</label>
                <input v-model="selectedNode.config.button_text" type="text" class="glass-input" placeholder="Select Option" />
              </div>
              <div class="form-group">
                <label>List Panel Title</label>
                <input v-model="selectedNode.config.title" type="text" class="glass-input" placeholder="Available Choices" />
              </div>
              <div class="form-group">
                <label>List Description Text</label>
                <textarea v-model="selectedNode.config.description" class="glass-input" rows="2" placeholder="Choose from menu:"></textarea>
              </div>
              <div class="form-group">
                <label>Assign to Variable</label>
                <input v-model="selectedNode.config.input_variable" type="text" class="glass-input" placeholder="e.g. fault_category" />
              </div>
              <div class="form-group">
                <label>Menu Rows (Max 10)</label>
                <div v-for="(row, idx) in selectedNode.config.sections[0].rows" :key="idx" class="nested-field-column">
                  <div class="horizontal-row">
                    <input v-model="row.id" type="text" class="glass-input inline" placeholder="ID (e.g. opt_1)" />
                    <input v-model="row.title" type="text" class="glass-input inline" placeholder="Title" />
                    <button class="remove-btn" @click="selectedNode.config.sections[0].rows.splice(idx, 1)">&times;</button>
                  </div>
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

            <div class="drawer-actions">
              <button class="glass-btn glass-btn-danger" @click="deleteSelectedNode">Delete Node</button>
            </div>
          </div>
        </aside>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import axios from 'axios';

// Load default vue flow styles
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';

const tenants = ref([]);
const journeys = ref([]);
const selectedTenantId = ref('tenant_watchmanager_prod_01');
const selectedJourneyId = ref('');

const journeyName = ref('WatchManager Unified Journey');
const triggerKeyword = ref('service');
const priority = ref(1);
const journeyId = ref('journey_watchmanager_v2');

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
    const res = await axios.get('http://localhost:3001/api/admin/tenants');
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
    const res = await axios.get('http://localhost:3001/api/admin/journeys', tenantHeader);
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
    await axios.post('http://localhost:3001/api/admin/journeys', payload, tenantHeader);
    alert('Blueprint saved successfully to local database!');
    await fetchJourneys();
    selectedJourneyId.value = journeyId.value;
  } catch (err) {
    console.error(err);
    alert('Error saving blueprint: ' + err.message);
  }
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

.workspace-header {
  height: 70px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.workspace-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.selector-width {
  width: 140px;
}

.journey-id-input {
  width: 130px;
}

.journey-name-input {
  background: transparent;
  border: none;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-main);
  border-bottom: 2px solid transparent;
  outline: none;
  width: 200px;
  transition: var(--transition-smooth);
}

.journey-name-input:focus {
  border-color: var(--accent-cyan);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.trigger-keyword-input {
  width: 100px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-light);
  color: var(--text-main);
  border-radius: 4px;
  padding: 4px 8px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.priority-input {
  width: 50px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-light);
  color: var(--text-main);
  border-radius: 4px;
  padding: 4px 6px;
  text-align: center;
}

.workspace-actions {
  display: flex;
  gap: 12px;
}

.workspace-body {
  display: flex;
  flex-grow: 1;
  gap: 16px;
  height: calc(100% - 86px);
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
</style>
