<template>
  <div class="builder-view animated-fade-in">
    <!-- Suspended Tenant Warning Banner -->
    <div v-if="isCurrentTenantSuspended" class="suspended-tenant-banner animate-slide-down">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" class="warning-icon">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span><strong>WARNING:</strong> This tenant account is currently <strong>SUSPENDED</strong>. All messaging webhook endpoints and visual automated journeys are disabled.</span>
    </div>

    <!-- Main workspace header -->
    <header class="workspace-header-layout glass-panel">
      <!-- Row 1: Scope Selection (Tenant / Edit Journey) & Actions -->
      <div class="header-top-row">
        <div class="scope-selectors">
          <!-- Tenant Dropdown -->
          <div class="scope-item">
            <span class="scope-label">Tenant Scope</span>
            <div class="select-wrapper" :class="{ 'suspended-border': isCurrentTenantSuspended }">
              <select v-model="selectedTenantId" class="glass-input select-input tenant-selector" @change="fetchJourneys">
                <option v-for="t in tenants" :key="t.tenant_id" :value="t.tenant_id">
                  {{ t.name }} {{ t.status === 'suspended' ? '⚠️ (SUSPENDED)' : '' }}
                </option>
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
        </div>

        <!-- Global Actions -->
        <div class="workspace-actions">
          <div class="debug-toggle-wrapper">
            <span class="debug-icon" :class="{ pulse: liveDebugMode }">📡</span>
            <span class="debug-label">Live Debug</span>
            <label class="toggle-switch">
              <input type="checkbox" v-model="liveDebugMode" @change="toggleLiveDebug" />
              <span class="slider round"></span>
            </label>
          </div>
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
          <!-- Card A: Workspace Mode -->
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
      <template>
        <!-- Node addition panel -->
        <aside class="palette-sidebar glass-panel">
          <h3>Node Palette</h3>
          <p class="description">Click to insert a new functional block onto the canvas:</p>
          <div class="palette-grid">
            <button 
              v-for="nodeDef in paletteNodes" 
              :key="nodeDef.type"
              class="palette-item" 
              @click="addNode(nodeDef.type)"
            >
              <div class="palette-badge" :class="nodeDef.palette_badge_class">
                {{ nodeDef.icon_emoji }}
              </div>
              <span>{{ nodeDef.label }}</span>
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
            @edge-click="onEdgeClick"
            @pane-click="onPaneClick"
            @connect="onConnect"
          >
            <template #edge-custom="props">
              <CustomEdge v-bind="props" :is-selected="selectedEdgeId === props.id" @remove-edge="removeEdgeById" />
            </template>

            <Background pattern-color="#aaa" gap="16" />
            <Controls />

            <!-- Active Journey Title Overlay -->
            <div class="canvas-active-title-overlay glass-panel animate-slide-down">
              <div class="active-title-header-row">
                <span class="active-title-label">Editing Blueprint</span>
                <!-- Edit Toggle Button -->
                <button 
                  v-if="!isEditingName" 
                  class="edit-title-btn" 
                  @click="isEditingName = true" 
                  title="Edit Blueprint Details"
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>
                <!-- Save Button -->
                <button 
                  v-else 
                  class="save-title-btn" 
                  @click="saveJourneyInline" 
                  title="Save Details"
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Save</span>
                </button>
              </div>

              <!-- Inline Name & Tag Fields -->
              <div class="title-fields-container">
                <!-- Name Field -->
                <div v-if="!isEditingName" class="active-title-name-display" @click="isEditingName = true">
                  {{ journeyName || 'New Blueprint' }}
                </div>
                <input 
                  v-else 
                  v-model="journeyName" 
                  type="text" 
                  class="active-title-input-field" 
                  placeholder="Enter Journey Name..." 
                />

                <!-- Memorable Tag Field -->
                <div class="memorable-tag-row">
                  <span class="tag-label">Tag:</span>
                  <span v-if="!isEditingName" class="tag-display" :class="{ empty: !journeyTag }" @click="isEditingName = true">
                    {{ journeyTag || 'Add memorable tag...' }}
                  </span>
                  <input 
                    v-else 
                    v-model="journeyTag" 
                    type="text" 
                    class="active-title-tag-input" 
                    placeholder="e.g. customer support, fallback" 
                  />
                </div>
              </div>

              <div class="active-title-id-row">
                <span class="active-title-id-label">ID:</span>
                <span class="active-title-id-value"><code>{{ journeyId || 'unsaved' }}</code></span>
              </div>
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

            <!-- Custom Node Templates -->
            <template #node-trigger_webhook="props">
              <div class="custom-node trigger-node">
                <div class="node-header"><span class="icon">⚡</span> Webhook Entry</div>
                <div class="node-custom-label" v-if="(nodes.find(n => n.id === props.id)?.label)">{{ nodes.find(n => n.id === props.id)?.label }}</div>
                <div class="node-body"><i>Keyword:</i> {{ (nodes.find(n => n.id === props.id)?.config)?.keyword || '*' }}</div>
                <Handle type="source" :position="Position.Right" id="success" class="custom-handle" />
              </div>
            </template>

            <template #node-trigger_menu="props">
              <div class="custom-node trigger-node">
                <div class="node-header"><span class="icon">⚡</span> Menu Entry</div>
                <div class="node-custom-label" v-if="(nodes.find(n => n.id === props.id)?.label)">{{ nodes.find(n => n.id === props.id)?.label }}</div>
                <div class="node-body"><i>Option:</i> {{ (nodes.find(n => n.id === props.id)?.config)?.mapped_option || 'N/A' }}</div>
                <Handle type="source" :position="Position.Right" id="success" class="custom-handle" />
              </div>
            </template>

            <template #node-prompt_text="props">
              <div class="custom-node text-node">
                <div class="node-header"><span class="icon">💬</span> Prompt Text</div>
                <div class="node-custom-label" v-if="(nodes.find(n => n.id === props.id)?.label)">{{ nodes.find(n => n.id === props.id)?.label }}</div>
                <div class="node-body"><i>Var:</i> {{ (nodes.find(n => n.id === props.id)?.config)?.input_variable }}</div>
                <Handle type="target" :position="Position.Left" id="default" class="custom-handle" />
                <Handle type="source" :position="Position.Right" id="success" class="custom-handle" />
              </div>
            </template>

            <template #node-prompt_buttons="props">
              <div class="custom-node buttons-node">
                <div class="node-header"><span class="icon">🔘</span> Prompt Buttons</div>
                <div class="node-custom-label" v-if="(nodes.find(n => n.id === props.id)?.label)">{{ nodes.find(n => n.id === props.id)?.label }}</div>
                <div class="node-body"><i>Var:</i> {{ (nodes.find(n => n.id === props.id)?.config)?.input_variable }}</div>
                <Handle type="target" :position="Position.Left" id="default" class="custom-handle" />
                <!-- Generic output handle if single_output is toggled -->
                <Handle 
                  v-if="(nodes.find(n => n.id === props.id)?.config)?.single_output" 
                  type="source" 
                  :position="Position.Bottom" 
                  id="success" 
                  class="custom-handle" 
                />
                <template v-else>
                  <!-- Dynamic Source Handles for each button -->
                  <Handle 
                    v-for="(btn, idx) in (nodes.find(n => n.id === props.id)?.config)?.buttons || []" 
                    :key="btn.id" 
                    type="source" 
                    :position="Position.Right" 
                    :id="btn.id" 
                    class="custom-handle"
                    :style="{ top: (35 + (idx * 20)) + 'px' }" 
                  />
                  <!-- Hidden Keywords Handles -->
                  <Handle 
                    v-for="(kw, idx) in ((nodes.find(n => n.id === props.id)?.config)?.hidden_keywords || '').split(',').map(s => s.trim()).filter(Boolean)" 
                    :key="'hidden_'+kw" 
                    type="source" 
                    :position="Position.Right" 
                    :id="kw" 
                    class="custom-handle handle-hidden"
                    :style="{ top: (35 + (((nodes.find(n => n.id === props.id)?.config)?.buttons?.length || 0) + idx) * 20) + 'px', backgroundColor: '#a855f7' }" 
                  />
                </template>
              </div>
            </template>

            <template #node-prompt_list="props">
              <div class="custom-node list-node">
                <div class="node-header"><span class="icon">📋</span> Prompt List</div>
                <div class="node-custom-label" v-if="(nodes.find(n => n.id === props.id)?.label)">{{ nodes.find(n => n.id === props.id)?.label }}</div>
                <div class="node-body"><i>Var:</i> {{ (nodes.find(n => n.id === props.id)?.config)?.input_variable }}</div>
                <Handle type="target" :position="Position.Left" id="default" class="custom-handle" />
                <!-- Generic output handle if single_output is toggled -->
                <Handle 
                  v-if="(nodes.find(n => n.id === props.id)?.config)?.single_output" 
                  type="source" 
                  :position="Position.Bottom" 
                  id="success" 
                  class="custom-handle" 
                />
                <template v-else>
                  <!-- Dynamic Source Handles for each list row -->
                  <Handle 
                    v-for="(row, idx) in ((nodes.find(n => n.id === props.id)?.config)?.sections?.[0]?.rows || [])" 
                    :key="row.id" 
                    type="source" 
                    :position="Position.Right" 
                    :id="row.id" 
                    class="custom-handle"
                    :style="{ top: (35 + (idx * 15)) + 'px' }" 
                  />
                  <!-- Hidden Keywords Handles -->
                  <Handle 
                    v-for="(kw, idx) in ((nodes.find(n => n.id === props.id)?.config)?.hidden_keywords || '').split(',').map(s => s.trim()).filter(Boolean)" 
                    :key="'hidden_'+kw" 
                    type="source" 
                    :position="Position.Right" 
                    :id="kw" 
                    class="custom-handle handle-hidden"
                    :style="{ top: (35 + (((nodes.find(n => n.id === props.id)?.config)?.sections?.[0]?.rows?.length || 0) + idx) * 15) + 'px', backgroundColor: '#a855f7' }" 
                  />
                </template>
              </div>
            </template>

            <template #node-action_http="props">
              <div class="custom-node http-node">
                <div class="node-header"><span class="icon">🌐</span> API Request</div>
                <div class="node-custom-label" v-if="(nodes.find(n => n.id === props.id)?.label)">{{ nodes.find(n => n.id === props.id)?.label }}</div>
                <div class="node-body">{{ (nodes.find(n => n.id === props.id)?.config)?.method || 'POST' }} Req</div>
                <Handle type="target" :position="Position.Left" id="default" class="custom-handle" />
                <Handle type="source" :position="Position.Right" id="success" class="custom-handle" />
                <Handle type="source" :position="Position.Right" id="failure" class="custom-handle handle-error" style="top: 70%;" />
              </div>
            </template>

              <template #node-action_jump="props">
                <div class="custom-node jump-node" style="border-left: 4px solid #a855f7;">
                  <div class="node-header"><span class="icon">↪️</span> Jump to Blueprint</div>
                  <div class="node-custom-label" v-if="(nodes.find(n => n.id === props.id)?.label)">{{ nodes.find(n => n.id === props.id)?.label }}</div>
                  <div class="node-body"><i>Target:</i> {{ (nodes.find(n => n.id === props.id)?.config)?.target_journey_id || 'None' }}</div>
                  <Handle type="target" :position="Position.Left" id="default" class="custom-handle" />
                </div>
              </template>

              <template #node-action_db="props">
              <div class="custom-node db-node">
                <div class="node-header"><span class="icon">🗄️</span> DB Operation</div>
                <div class="node-custom-label" v-if="(nodes.find(n => n.id === props.id)?.label)">{{ nodes.find(n => n.id === props.id)?.label }}</div>
                <div class="node-body"><i>{{ (nodes.find(n => n.id === props.id)?.config)?.operation || 'op' }}</i></div>
                <Handle type="target" :position="Position.Left" id="default" class="custom-handle" />
                <Handle type="source" :position="Position.Right" id="success" class="custom-handle" />
                <Handle type="source" :position="Position.Right" id="failure" class="custom-handle handle-error" style="top: 70%;" />
              </div>
            </template>

            <template #node-condition_split="props">
              <div class="custom-node condition-node">
                <div class="node-header"><span class="icon">🔀</span> Condition Split</div>
                <div class="node-custom-label" v-if="(nodes.find(n => n.id === props.id)?.label)">{{ nodes.find(n => n.id === props.id)?.label }}</div>
                <div class="node-body">{{ (nodes.find(n => n.id === props.id)?.config)?.variable }}</div>
                <Handle type="target" :position="Position.Left" id="default" class="custom-handle" />
                <Handle type="source" :position="Position.Right" id="true" class="custom-handle handle-success" style="top: 30%;" />
                <Handle type="source" :position="Position.Right" id="false" class="custom-handle handle-error" style="top: 70%;" />
              </div>
            </template>

          </VueFlow>
        </div>

        <!-- Properties Drawer Panel -->
        <transition name="slide">
          <aside v-if="selectedNode || selectedEdgeId" class="properties-drawer glass-panel">
            <div class="drawer-header">
              <h3>{{ selectedNode ? 'Configure Node' : 'Configure Connection' }}</h3>
              <button class="close-btn" @click="selectedNode = null; selectedEdgeId = null">&times;</button>
            </div>

            <div class="drawer-content" v-if="selectedNode">
              <div class="form-group">
                <label>Node ID</label>
                <input v-model="selectedNode.id" type="text" class="glass-input" disabled />
              </div>

              <div class="form-group">
                <label>Node Display Name (Optional)</label>
                <input v-model="selectedNode.label" type="text" class="glass-input" placeholder="e.g. Welcome Message" />
              </div>

              <div class="form-group">
                <label>Node Type</label>
                <span class="type-badge" :class="selectedNode.type + '-color'">{{ selectedNode.type }}</span>
              </div>

              <hr class="divider" />

              <!-- Trigger Webhook configuration -->
              <div v-if="selectedNode.type === 'trigger_webhook'">
                <div class="form-group">
                  <label>Trigger Keyword</label>
                  <input v-model="selectedNode.config.keyword" type="text" class="glass-input" placeholder="e.g. service" />
                </div>
                <div class="form-group checkbox-group">
                  <label>
                    <input v-model="selectedNode.config.catch_all" type="checkbox" />
                    Catch-All (Trigger on any unhandled message)
                  </label>
                </div>
              </div>

              <!-- Trigger Menu configuration -->
              <div v-if="selectedNode.type === 'trigger_menu'">
                <div class="form-group">
                  <label>Mapped Option Value</label>
                  <input v-model="selectedNode.config.mapped_option" type="text" class="glass-input" placeholder="e.g. 1" />
                  <span class="help-text">The value users select in the Global Main Menu to trigger this flow.</span>
                </div>
              </div>

              <!-- 1. Text configuration fields -->
              <div v-if="selectedNode.type === 'prompt_text'">
                <div class="form-group">
                  <label>Message Content</label>
                  <textarea v-model="selectedNode.config.message" class="glass-input" rows="4" placeholder="Enter message text..."></textarea>
                  <div class="variable-picker" v-if="availableVariables.length > 0">
                    <span class="picker-label">Insert Token:</span>
                    <button v-for="v in availableVariables" :key="v" class="var-pill" @click="insertVariable(v, 'message')" title="Insert variable">
                      {{ v }}
                    </button>
                  </div>
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
                  <div class="variable-picker" v-if="availableVariables.length > 0">
                    <span class="picker-label">Insert Token:</span>
                    <button v-for="v in availableVariables" :key="v" class="var-pill" @click="insertVariable(v, 'message')" title="Insert variable">
                      {{ v }}
                    </button>
                  </div>
                </div>
                <div class="form-group">
                  <label>Save Input Variable Name</label>
                  <input v-model="selectedNode.config.input_variable" type="text" class="glass-input" placeholder="e.g. selection" />
                </div>
                <div class="form-group row-align-checkbox" style="margin-top: 12px; margin-bottom: 12px;">
                  <label class="switch-container">
                    <input v-model="selectedNode.config.single_output" type="checkbox" />
                    <span class="switch-slider"></span>
                  </label>
                  <span class="switch-label">Combine routing into a single output handle</span>
                </div>
                <div class="form-group" style="margin-bottom: 16px;">
                  <label>Hidden Keywords (comma separated)</label>
                  <input v-model="selectedNode.config.hidden_keywords" type="text" class="glass-input" placeholder="e.g. admin_login, bypass" />
                </div>
                <div class="buttons-builder-list">
                  <label style="margin-bottom: 12px; display: block;">Quick Reply Buttons (Max 3)</label>
                  
                  <div v-for="(btn, index) in selectedNode.config.buttons" :key="index" class="button-group-card">
                    <div class="button-group-header">
                      <span>Button {{ index + 1 }}</span>
                      <button class="delete-sub-btn" @click="selectedNode.config.buttons.splice(index, 1)" title="Delete Button">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                    
                    <div class="form-group-inline">
                      <label>ID (System):</label>
                      <input :value="btn.id" @input="updateHandleId(btn, $event.target.value)" type="text" class="glass-input sub-input" placeholder="e.g. opt_yes" />
                    </div>
                    
                    <div class="form-group-inline" style="margin-top: 8px;">
                      <label>Title (Max 20):</label>
                      <input v-model="btn.title" type="text" class="glass-input sub-input" placeholder="e.g. Yes" maxlength="20" />
                    </div>
                  </div>
                  
                  <button v-if="selectedNode.config.buttons.length < 3" class="glass-btn glass-btn-secondary inline-btn" style="margin-top: 8px;" @click="selectedNode.config.buttons.push({ id: '', title: '' })">+ Add Button</button>
                </div>
              </div>

              <!-- 3. Interactive list configuration fields -->
              <div v-if="selectedNode.type === 'prompt_list'">
                <div class="form-group">
                  <label>Main Body Description</label>
                  <textarea v-model="selectedNode.config.description" class="glass-input" rows="3" placeholder="Enter list description..."></textarea>
                  <div class="variable-picker" v-if="availableVariables.length > 0">
                    <span class="picker-label">Insert Token:</span>
                    <button v-for="v in availableVariables" :key="v" class="var-pill" @click="insertVariable(v, 'description')" title="Insert variable">
                      {{ v }}
                    </button>
                  </div>
                </div>
                <div class="form-group">
                  <label>Header Title (Max 24 chars)</label>
                  <input v-model="selectedNode.config.title" type="text" class="glass-input" placeholder="e.g. Main Menu" maxlength="24" />
                </div>
                <div class="form-group">
                  <label>Global Button Text (Max 20 chars)</label>
                  <input v-model="selectedNode.config.button_text" type="text" class="glass-input" placeholder="e.g. View Options" maxlength="20" />
                </div>
                <div class="form-group">
                  <label>Save Input Variable Name</label>
                  <input v-model="selectedNode.config.input_variable" type="text" class="glass-input" placeholder="e.g. selected_item" />
                </div>
                <div class="form-group row-align-checkbox" style="margin-top: 12px; margin-bottom: 12px;">
                  <label class="switch-container">
                    <input v-model="selectedNode.config.single_output" type="checkbox" />
                    <span class="switch-slider"></span>
                  </label>
                  <span class="switch-label">Combine routing into a single output handle</span>
                </div>
                <div class="form-group" style="margin-bottom: 16px;">
                  <label>Hidden Keywords (comma separated)</label>
                  <input v-model="selectedNode.config.hidden_keywords" type="text" class="glass-input" placeholder="e.g. admin_login, bypass" />
                </div>

                <div class="list-sections-builder">
                  <label style="margin-bottom: 12px; display: block;">List Sections & Rows (Max 10)</label>
                  
                  <div v-for="(row, index) in selectedNode.config.sections[0].rows" :key="index" class="button-group-card">
                    <div class="button-group-header">
                      <span>Row {{ index + 1 }}</span>
                      <button class="delete-sub-btn" @click="selectedNode.config.sections[0].rows.splice(index, 1)" title="Delete Row">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                    
                    <div class="form-group-inline">
                      <label>ID (System):</label>
                      <input :value="row.id" @input="updateHandleId(row, $event.target.value)" type="text" class="glass-input sub-input" placeholder="e.g. row_1" maxlength="200" />
                    </div>
                    
                    <div class="form-group-inline" style="margin-top: 8px;">
                      <label>Title (Max 24):</label>
                      <input v-model="row.title" type="text" class="glass-input sub-input" placeholder="e.g. Support" maxlength="24" />
                    </div>
                    
                    <div class="form-group-inline" style="margin-top: 8px;">
                      <label>Desc (Max 72):</label>
                      <input v-model="row.description" type="text" class="glass-input sub-input" placeholder="e.g. Technical support and help" maxlength="72" />
                    </div>
                  </div>
                  
                  <button v-if="selectedNode.config.sections[0].rows.length < 10" class="glass-btn glass-btn-secondary inline-btn" style="margin-top: 8px;" @click="selectedNode.config.sections[0].rows.push({ id: '', title: '', description: '' })">+ Add Menu Row</button>
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

              <!-- 7. Action Jump configuration -->
              <div v-if="selectedNode.type === 'action_jump'">
                <div class="form-group">
                  <label>Target Blueprint</label>
                  <select v-model="selectedNode.config.target_journey_id" class="glass-input select-input">
                    <option value="">-- Select a Blueprint --</option>
                    <option v-for="j in journeys" :key="j.journey_id" :value="j.journey_id">{{ j.name }}</option>
                  </select>
                </div>
              </div>

              <!-- Fallback templates configuration for prompt nodes -->
              <div v-if="selectedNode.type && selectedNode.type.startsWith('prompt_')" class="fallback-template-section">
                <hr class="divider" />
                <h4 class="section-sub-title">24h Support Window Template Fallback</h4>
                
                <div v-if="!allowTemplateMessages" class="template-disabled-alert">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" class="lock-icon">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Template messages are disabled in Channel360 Credentials config.</span>
                </div>

                <div class="form-group">
                  <label>Meta Template Name</label>
                  <input 
                    v-model="selectedNode.config.fallback_template_name" 
                    type="text" 
                    class="glass-input" 
                    placeholder="e.g. service_reinitiate" 
                    :disabled="!allowTemplateMessages"
                  />
                </div>
                <div class="form-group" style="margin-top: 8px;">
                  <label>Template Parameters (comma separated)</label>
                  <input 
                    :value="(selectedNode.config.fallback_template_params || []).join(', ')" 
                    @input="e => selectedNode.config.fallback_template_params = e.target.value.split(',').map(s => s.trim()).filter(Boolean)"
                    type="text" 
                    class="glass-input" 
                    placeholder="e.g. collected_data.fullname" 
                    :disabled="!allowTemplateMessages"
                  />
                </div>
              </div>

              <div class="drawer-actions">
                <button class="glass-btn glass-btn-danger" @click="deleteSelectedNode">Delete Node</button>
              </div>
            </div>
            
            <div class="drawer-content" v-else-if="selectedEdgeId">
              <div class="form-group">
                <label>Connection ID</label>
                <input :value="selectedEdgeId" type="text" class="glass-input" disabled />
              </div>
              
              <div class="form-group" style="margin-top: 24px;">
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">
                  Connections determine the logical flow path of the user journey. Removing this connection will break the flow between the source and target nodes.
                </p>
                <button class="glass-btn glass-btn-danger" style="width: 100%;" @click="removeEdgeById(selectedEdgeId); selectedEdgeId = null;">
                  🗑️ Delete Connection
                </button>
              </div>
            </div>
          </aside>
        </transition>
      </template>

    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { VueFlow, useVueFlow, Handle, Position } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import axios from 'axios';
import CustomEdge from '../components/CustomEdge.vue';

const { zoomIn, zoomOut, fitView } = useVueFlow();

// Load default vue flow styles
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';

const tenants = ref([]);
const journeys = ref([]);
const selectedTenantId = ref('tenant_watchmanager_prod_01');
const selectedJourneyId = ref('');


// Live Debug State
const liveDebugMode = ref(false);
const liveSessions = ref([]);
let debugPollInterval = null;

const fetchLiveSessions = async () => {
  try {
    const res = await axios.get('/api/admin/sessions/active', {
      headers: { 'x-tenant-id': selectedTenantId.value }
    });
    // Filter to only this journey
    liveSessions.value = res.data.filter(s => s.active_journey_id === journeyId.value);
    
    // Apply visual classes to nodes natively supported by VueFlow
    nodes.value.forEach(node => {
      const activeSessionsCount = liveSessions.value.filter(s => s.current_node_id === node.id).length;
      if (activeSessionsCount > 0) {
        node.class = 'node-live-pulse';
      } else {
        node.class = '';
      }
    });
  } catch (err) {
    console.error('Failed fetching live debug sessions:', err);
  }
};

const toggleLiveDebug = async () => {
  if (liveDebugMode.value) {
    await fetchLiveSessions();
    debugPollInterval = setInterval(fetchLiveSessions, 3000);
  } else {
    clearInterval(debugPollInterval);
    liveSessions.value = [];
    nodes.value.forEach(node => node.class = '');
  }
};

onUnmounted(() => {
  if (debugPollInterval) clearInterval(debugPollInterval);
});

const isCurrentTenantSuspended = computed(() => {
  const t = tenants.value.find(x => x.tenant_id === selectedTenantId.value);
  return t ? t.status === 'suspended' : false;
});
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
const journeyTag = ref('');
const isEditingName = ref(false);

const saveJourneyInline = async () => {
  await saveJourney();
  isEditingName.value = false;
};

// Initial Vue Flow states
const nodes = ref([]);
const paletteNodes = ref([]);
const edges = ref([]);

const selectedNode = ref(null);
const selectedEdgeId = ref(null);

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

// Phase 3: Interactive Variable Token Insertion
const availableVariables = computed(() => {
  const vars = new Set();
  nodes.value.forEach(n => {
    if (n.config && n.config.input_variable) {
      vars.add(n.config.input_variable);
    }
  });
  return Array.from(vars).filter(Boolean);
});

const insertVariable = (varName, fieldName) => {
  if (!selectedNode.value) return;
  const currentVal = selectedNode.value.config[fieldName] || '';
  selectedNode.value.config[fieldName] = currentVal + `{{${varName}}}`;
};

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
const allowTemplateMessages = ref(true);

const fetchJourneys = async () => {
  try {
    const tenantHeader = { headers: { 'x-tenant-id': selectedTenantId.value } };
    const res = await axios.get('/api/admin/journeys', tenantHeader);
    journeys.value = res.data;
    selectedJourneyId.value = '';
    
    // Fetch Channel360 credentials to check allow_template_messages flag
    try {
      const credRes = await axios.get('/api/admin/credentials', tenantHeader);
      if (credRes.data) {
        allowTemplateMessages.value = credRes.data.allow_template_messages !== false;
      } else {
        allowTemplateMessages.value = true;
      }
    } catch (credErr) {
      console.warn('Failed to load credentials for template message check:', credErr.message);
      allowTemplateMessages.value = true;
    }
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
    journeyTag.value = j.tag || '';
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
      type: 'custom',
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
  
  const currentTenant = tenants.value.find(t => t.tenant_id === selectedTenantId.value);
  const tenantSlug = currentTenant ? currentTenant.name.toLowerCase().replace(/[^a-z0-9]/g, '') : 'tenant';
  const uniqueTimestamp = Date.now();
  journeyId.value = `wm_${tenantSlug}_${uniqueTimestamp}`;
  
  journeyName.value = 'New Conversational Journey';
  journeyTag.value = '';
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
  selectedEdgeId.value = null;
};

const onEdgeClick = (event) => {
  selectedEdgeId.value = event.edge.id;
  selectedNode.value = null;
};

const onPaneClick = () => {
  selectedNode.value = null;
  selectedEdgeId.value = null;
};

// Vue Flow drag connection edges creation handler
const onConnect = (connection) => {
  // connection is an object containing { source, target, sourceHandle, targetHandle }
  const newEdge = {
    id: `e-${connection.source}-${connection.sourceHandle || 'success'}-${connection.target}`,
    type: 'custom',
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

// Dynamically update edge handles if a user changes an ID inside the properties drawer
const updateHandleId = (item, newId) => {
  const oldId = item.id;
  if (!oldId || oldId === newId) {
    item.id = newId;
    return;
  }
  
  if (selectedNode.value) {
    const nodeId = selectedNode.value.id;
    edges.value.forEach(edge => {
      // If there's an existing edge pinned to the old ID, proactively migrate it to the new ID
      if (edge.source === nodeId && edge.sourceHandle === oldId) {
        edge.sourceHandle = newId;
        // Update the VueFlow deterministic ID to prevent collision errors
        edge.id = `e-${edge.source}-${newId}-${edge.target}`;
      }
    });
  }
  
  item.id = newId;
};

// Add node on canvas
let nodeCount = 0;
const addNode = (type) => {
  nodeCount++;
  const id = `node_${type}_${nodeCount}`;
  
  // Dynamic palette config lookup
  const nodeDef = paletteNodes.value.find(n => n.type === type);
  // Deep clone default config to prevent passing references between nodes
  let config = nodeDef && nodeDef.default_config ? JSON.parse(JSON.stringify(nodeDef.default_config)) : {};
  
  // Dynamic injection of default var names to prevent collisions
  if (config.input_variable !== undefined) {
    config.input_variable = `var_${nodeCount}`;
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

const removeEdgeById = (edgeId) => {
  edges.value = edges.value.filter(e => e.id !== edgeId);
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
    { id: "e1", type: "custom", source: "node_start", sourceHandle: "success", target: "node_address" },
    { id: "e2", type: "custom", source: "node_address", sourceHandle: "success", target: "node_fault_menu" },
    { id: "e3", type: "custom", source: "node_fault_menu", sourceHandle: "flt_bt_001", target: "node_api_dispatch" },
    { id: "e4", type: "custom", source: "node_fault_menu", sourceHandle: "flt_sn_002", target: "node_api_dispatch" },
    { id: "e5", type: "custom", source: "node_api_dispatch", sourceHandle: "success", target: "node_end" }
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
    tag: journeyTag.value,
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

const fetchPaletteNodes = async () => {
  try {
    const res = await axios.get('/api/admin/nodes');
    paletteNodes.value = res.data;
  } catch (err) {
    console.error('Failed to load node palette:', err.message);
  }
};

onMounted(() => {
  fetchPaletteNodes();
  fetchTenants();
});
</script>

 