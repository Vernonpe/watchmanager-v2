# System Architecture & Technical Specification: Multi-Tenant WhatsApp Journey Builder Platform

This document defines the comprehensive system architecture, database design, runtime interpreter, and visual builder specifications for the unified **Multi-Tenant WhatsApp Journey Builder Platform**. It serves as a production-grade blueprint for the automated AI coding agent, **Antigravity**, to implement a zero-defect build.

---

## Section 1: System Architecture & Integration Flow

The platform is designed as a secure, scalable, multi-tenant software-as-a-service (SaaS) application. It bridges client-side visual graph builders, a robust conversational state-machine interpreter, third-party WhatsApp service providers (Channel360), and customer-defined external APIs.

### 1.1 High-Level Architecture Model

```
       +-------------------------------------------------------------+
       |                  VUE 3 VISUAL FRONTEND                      |
       |                                                             |
       |  +---------------------+  +------------------------------+  |
       |  |  Vue Flow Workspace |  |     Properties Panel &       |  |
       |  |  (Nodes & Edges)    |  |     API Drop-in Interface    |  |
       |  +----------+----------+  +--------------+---------------+  |
       |             |                            |                  |
       +-------------|----------------------------|------------------+
                     | Compile JSON Graph         | Authenticate JWT
                     v                            v
       +-------------------------------------------------------------+
       |                  NODE.JS EXPRESS BACKEND                    |
       |                                                             |
       |  +--------------------+  +-------------------------------+  |
       |  | Admin API Router   |  |   Inbound Webhook Receiver    |  |
       |  | /api/admin/journeys|  |   /api/webhook/whatsapp       |  |
       |  +---------+----------+  +---------------+---------------+  |
       |            |                             |                  |
       |            | Read/Write                  | Process State    |
       |            v                             v                  |
       |  +-------------------------------------------------------+  |
       |  |          State-Machine Runtime Interpreter            |  |
       |  |  (Concurrency Lock, Deduplication, Preemption Engine) |  |
       |  +---------------------------+---------------------------+  |
       +------------------------------|------------------------------+
                                      | Read/Write
                                      v
       +-------------------------------------------------------------+
       |                     MONGODB CLUSTER                         |
       |  - sys_tenants                - builder_journeys            |
       |  - sys_channel360_credentials - runtime_whatsapp_sessions   |
       |  - audit_webhook_stream       - audit_api_outbound_logs     |
       +-------------------------------------------------------------+
```

### 1.2 Multi-Tenant Routing Protocol
The platform operates under a single deployed backend instance serving multiple commercial tenants. Isolation is achieved by matching ingress request parameters to unique database credentials:

1. **Inbound WhatsApp Messages**: Webhooks dispatched by Channel360 contain an `orgId` header or metadata parameter. The backend uses this `orgId` to query `sys_channel360_credentials` and resolve the matching `tenant_id`.
2. **Egress Webhook Triggers**: External systems trigger outbound alerts (like emergency alarm notifications) by sending a request to `/api/webhook/tenant/:tenant_id/egress/:journey_trigger_key`. Tenant isolation is enforced directly through the URL parameter.
3. **Admin Panel Control**: Dashboard users must supply a valid JSON Web Token (JWT) containing their `tenant_id` claims. Vue Router employs a client-side navigation guard (`beforeEach`) to ensure administrative isolation, while the backend verifies the JWT and restricts queries to the active tenant.

---

## Section 2: Unified MongoDB Database Schema Specification

All database collections are organized using a standardized, lowercase `snake_case` prefix namespace to prevent collisions and streamline indexing.

### 2.1 System & Platform Configuration (`sys_`)

#### `sys_tenants`
Tracks subscription records and administrative profiles of commercial platform consumers.
```javascript
const sysTenantsSchema = new mongoose.Schema({
  tenant_id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['active', 'suspended', 'trial'], default: 'active' },
  contact_email: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});
sysTenantsSchema.index({ tenant_id: 1 });
```

#### `sys_channel360_credentials`
Holds API integration parameters to talk to the Channel360 gateway dynamically. Replaces the legacy `wmConfigs` collection.
```javascript
const sysChannel360CredentialsSchema = new mongoose.Schema({
  tenant_id: { type: String, ref: 'sys_tenants', required: true, unique: true },
  org_id: { type: String, required: true },
  bearer_token: { type: String, required: true },
  channel_account_name: { type: String, required: true },
  watch_manager_base_url: { type: String, required: true },
  is_test_mode: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});
sysChannel360CredentialsSchema.index({ tenant_id: 1 });
sysChannel360CredentialsSchema.index({ org_id: 1 });
```

#### `sys_platform_configs`
Stores global environmental settings. Replaces the legacy `appConfigs` collection.
```javascript
const sysPlatformConfigsSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String },
  updated_at: { type: Date, default: Date.now }
});
sysPlatformConfigsSchema.index({ key: 1 });
```

---

### 2.2 Journey Builder & Design (`builder_`)

#### `builder_journeys`
Holds compiled JSON flow schemas representing visual graphs designed in the UI.
```javascript
const builderJourneysSchema = new mongoose.Schema({
  tenant_id: { type: String, ref: 'sys_tenants', required: true },
  journey_id: { type: String, required: true },
  name: { type: String, required: true },
  version: { type: Number, default: 1 },
  is_active: { type: Boolean, default: true },
  priority: { type: Number, default: 1 }, // Determines priority during state preemption (e.g. 10 for alarms, 1 for chats)
  ingress_trigger_keyword: { type: String }, // e.g. "job" or "help" (can be empty for outbound-only)
  nodes: { type: Array, required: true }, // Compiled Vue Flow nodes array
  edges: { type: Array, required: true }, // Compiled Vue Flow edges array
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});
builderJourneysSchema.index({ tenant_id: 1, journey_id: 1 }, { unique: true });
builderJourneysSchema.index({ tenant_id: 1, ingress_trigger_keyword: 1 });
```

#### `builder_conversational_templates`
Externalized system copy patterns managed via the administrative UI. Replaces the legacy `botMessages` collection.
```javascript
const builderConversationalTemplatesSchema = new mongoose.Schema({
  tenant_id: { type: String, ref: 'sys_tenants', required: true },
  key: { type: String, required: true },
  message_text: { type: String, required: true },
  description: { type: String }
});
builderConversationalTemplatesSchema.index({ tenant_id: 1, key: 1 }, { unique: true });
```

---

### 2.3 Active Session & Runtime (`runtime_`)

#### `runtime_whatsapp_sessions`
Tracks conversational state, variable state-machines, navigation layers, and priority override stacks during active customer chats. Replaces the legacy `nodeSessions` and `alarm_sessions` collections.
```javascript
const runtimeWhatsappSessionsSchema = new mongoose.Schema({
  tenant_id: { type: String, ref: 'sys_tenants', required: true },
  mobile: { type: String, required: true },
  active_journey_id: { type: String, required: true },
  current_node_id: { type: String, required: true },
  priority: { type: Number, default: 1 },
  collected_data: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }, // Flat KV map of captured variables
  state_history: [{ type: String }], // Array stack tracking previous node IDs for "back" navigation
  suspended_sessions: [{
    active_journey_id: { type: String, required: true },
    current_node_id: { type: String, required: true },
    priority: { type: Number, required: true },
    collected_data: { type: Map, of: mongoose.Schema.Types.Mixed },
    state_history: [{ type: String }],
    pushed_at: { type: Date, default: Date.now }
  }], // Preemption stack to handle overrides (e.g. incoming alarm alerting)
  processed_message_ids: [{ type: String }], // Circular array buffer of size 20 for idempotency
  whatsapp_number: { type: String },
  whatsapp_name: { type: String },
  expires_at: { type: Date, required: true } // TTL target
});

// Indexes mandated for sub-millisecond query performance and TTL cleanup
runtimeWhatsappSessionsSchema.index({ tenant_id: 1, mobile: 1 }, { unique: true });
runtimeWhatsappSessionsSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
```

#### `runtime_alarm_triggers`
Stores active incident metadata, such as verification codes, site references, and duress parameters, which are evaluated by action nodes. Replaces the legacy `alarmAlertEvents` collection.
```javascript
const runtimeAlarmTriggersSchema = new mongoose.Schema({
  tenant_id: { type: String, ref: 'sys_tenants', required: true },
  message_id: { type: String, required: true, unique: true },
  event_uuid: { type: String, required: true },
  mobile: { type: String, required: true },
  raw_payload: { type: mongoose.Schema.Types.Mixed },
  passwords: [{ type: String }], // Allowed cancellation pins (e.g. ['1234', '5678'])
  duress_codes: [{ type: String }], // Silent dispatch alarm words (e.g. ['BRAVO2024'])
  created_at: { type: Date, default: Date.now, expires: 86400 } // Auto-purge trigger records after 24 hours
});
runtimeAlarmTriggersSchema.index({ tenant_id: 1, mobile: 1 });
```

---

### 2.4 Audit Trails & Logs (`audit_`)

#### `audit_webhook_stream`
Centralized, immutable register recording all inbound webhook traffic from provider APIs. Replaces `nodeC360Inbound` and `whatsappMessages`.
```javascript
const auditWebhookStreamSchema = new mongoose.Schema({
  tenant_id: { type: String, ref: 'sys_tenants' },
  direction: { type: String, enum: ['inbound', 'outbound_receipt'], required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  created_at: { type: Date, default: Date.now, expires: 2592000 } // Purge audit entries after 30 days
});
auditWebhookStreamSchema.index({ created_at: -1 });
```

#### `audit_api_outbound_logs`
Logs duration and response details for all outgoing external integrations. Replaces `apiLogs`.
```javascript
const auditApiOutboundLogsSchema = new mongoose.Schema({
  tenant_id: { type: String, ref: 'sys_tenants', required: true },
  journey_id: { type: String },
  node_id: { type: String },
  endpoint_url: { type: String, required: true },
  request_payload: { type: mongoose.Schema.Types.Mixed },
  response_code: { type: Number },
  response_body: { type: mongoose.Schema.Types.Mixed },
  duration_ms: { type: Number },
  created_at: { type: Date, default: Date.now, expires: 2592000 }
});
auditApiOutboundLogsSchema.index({ created_at: -1 });
```

#### `audit_system_exceptions`
Captures runtime failures and unhandled network errors across the cluster. Replaces `errors`.
```javascript
const auditSystemExceptionsSchema = new mongoose.Schema({
  tenant_id: { type: String, ref: 'sys_tenants' },
  exception_type: { type: String, required: true },
  message: { type: String, required: true },
  stack_trace: { type: String },
  request_context: { type: mongoose.Schema.Types.Mixed },
  created_at: { type: Date, default: Date.now, expires: 2592000 }
});
```

---

## Section 3: The Unified JSON Journey Schema

Journeys are represented as directed graphs where conversational flow traverses from node to node through defined pathways. 

### 3.1 Node Definitions

The visual builder supports six standardized functional nodes:

1. **`prompt_text`**: Sends a string message over WhatsApp. If `await_response` is true, the state machine halts execution at this node and waits for user input. If false, it acts as a pass-through node, transitioning instantly along the default edge.
2. **`prompt_buttons`**: Sends up to 3 interactive Quick-Reply buttons. Halts execution and maps each button payload directly to a downstream edge.
3. **`prompt_list`**: Sends a structured list menu (up to 10 rows). Ideal for category-based selectors (e.g. selecting fault types).
4. **`action_http`**: Initiates a dynamic outbound request. Supports payload binding using double-bracket interpolation mapping parameters from the session's `collected_data` store (e.g., `{{collected_data.fullname}}`).
5. **`action_db`**: Updates or performs a localized Mongoose database operation (such as loading cached references or recording an event).
6. **`condition_split`**: Inspects dynamic session variables or user text inputs using Boolean parameters or Regex checks, branching paths based on matching outputs.

### 3.2 Formal JSON Schema Example

Below is a complete representation of a visual journey. This JSON payload is compiled by the frontend designer and stored directly in `builder_journeys`:

```json
{
  "tenant_id": "tenant_watchmanager_prod_01",
  "journey_id": "journey_watchmanager_v2",
  "name": "WatchManager Unified Journey",
  "version": 1,
  "is_active": true,
  "priority": 1,
  "ingress_trigger_keyword": "service",
  "nodes": [
    {
      "id": "node_start",
      "type": "prompt_text",
      "config": {
        "message": "Welcome to *WatchManager Technical Assistance Portal*.\n\nPlease tell us your full name to proceed:",
        "await_response": true,
        "input_variable": "fullname",
        "validation_regex": "^.{2,100}$",
        "validation_error_message": "Invalid Name. Name must be between 2 and 100 characters. Please try again:"
      }
    },
    {
      "id": "node_address",
      "type": "prompt_text",
      "config": {
        "message": "Thank you {{collected_data.fullname}}.\n\nPlease provide your physical site address:",
        "await_response": true,
        "input_variable": "address",
        "validation_regex": "^.{5,200}$",
        "validation_error_message": "Invalid Address. Address must be between 5 and 200 characters. Please try again:"
      }
    },
    {
      "id": "node_fault_menu",
      "type": "prompt_list",
      "config": {
        "button_text": "Select Fault",
        "title": "Technical Faults",
        "description": "Please select the option that matches your issue:",
        "input_variable": "fault_type",
        "sections": [
          {
            "title": "Available Categories",
            "rows": [
              { "id": "flt_bt_001", "title": "Battery Failure", "description": "Main power outage / battery backup warning" },
              { "id": "flt_sn_002", "title": "Sensor Issue", "description": "Continuous false alarms or faulty beams" },
              { "id": "flt_kp_003", "title": "Keypad Fault", "description": "Screen blank / buttons non-responsive" },
              { "id": "flt_oth_004", "title": "Other Issue", "description": "Any other technical or hardware failure" }
            ]
          }
        ]
      }
    },
    {
      "id": "node_api_dispatch",
      "type": "action_http",
      "config": {
        "url": "https://api.watchmanager.co.za/v1/mobile_tech",
        "method": "POST",
        "headers": {
          "Content-Type": "application/json",
          "X-Tenant-ID": "{{tenant_id}}"
        },
        "body_template": {
          "subscriber_name": "{{collected_data.fullname}}",
          "site_address": "{{collected_data.address}}",
          "fault_category": "{{collected_data.fault_type}}",
          "subscriber_phone": "{{mobile}}"
        }
      }
    },
    {
      "id": "node_end",
      "type": "prompt_text",
      "config": {
        "message": "Thank you! A technical assistance request has been registered with our operations center. \n\nJob Ticket Reference: *{{api_response.ticket_id}}*.",
        "await_response": false
      }
    }
  ],
  "edges": [
    { "source": "node_start", "source_handle": "success", "target": "node_address" },
    { "source": "node_address", "source_handle": "success", "target": "node_fault_menu" },
    { "source": "node_fault_menu", "source_handle": "flt_bt_001", "target": "node_api_dispatch" },
    { "source": "node_fault_menu", "source_handle": "flt_sn_002", "target": "node_api_dispatch" },
    { "source": "node_fault_menu", "source_handle": "flt_kp_003", "target": "node_api_dispatch" },
    { "source": "node_fault_menu", "source_handle": "flt_oth_004", "target": "node_api_dispatch" },
    { "source": "node_api_dispatch", "source_handle": "success", "target": "node_end" }
  ]
}
```

---

## Section 4: Conversational State Machine & Runtime Interpreter

The backend's primary execution node resolves user replies, handles concurrency, guards idempotency, manages multi-path navigation, and implements priority-based state preemption.

### 4.1 Request Lifecycle & Webhook Intake Controller

To prevent Gateway Timeout retry loops from Channel360 (which dispatch duplicate user signals during downstream latency spikes), the intake controller must adhere strictly to this processing loop:

```
[ Incoming HTTP POST Webhook ]
              │
              ├──► 1. Read Request Body & Headers
              │
              ├──► 2. Validate Origin & Extract `orgId`/`tenant_id`
              │
              ├──► 3. Send HTTP 200 OK Response (Immediate Acknowledgment)
              │
              ▼
[ Thread Enters In-Memory Promise Lock (Keyed by tenant_id + mobile) ]
              │
              ▼
[ Idempotency Deduplication Check (Circular Array Buffer Verification) ]
              │
              ▼
[ Intercept Global Keyword Command Overrides ("exit", "back", "menu") ]
              │
              ▼
[ Resolve Active Session State & Evaluate Compiled JSON Graph ]
              │
              ▼
[ Execute Target Node Logic & Update collected_data Variables ]
              │
              ▼
[ Traverse Active Edge Pathway to Transition Session State ]
              │
              ▼
[ Dispatch Dynamic WhatsApp Response templates via Channel360 Rest API ]
              │
              ▼
[ Execute Single Consolidated Save Database Write on Session Document ]
              │
              ▼
[ Release Concurrency Map Lock Chain for Next Message ]
```

---

### 4.2 State Preemption (Override & Restore) Engine

When a critical incident (like an active burglar alarm trigger) occurs, it must bypass any lower-priority journey currently active on the customer's phone line, suspend their state, process the high-priority flow, and cleanly restore their original location when resolved.

```
                  +-----------------------------------+
                  |   User in standard "Job Card"     |
                  |     Journey (Priority = 1)        |
                  +-----------------+-----------------+
                                    |
              ( Outbound Alarm Triggered / Priority = 10 )
                                    |
                                    v
                  +-----------------------------------+
                  |     Preemption Interception       |
                  |                                   |
                  | - Read active user session document|
                  | - Check priorities: 10 > 1        |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  |      Execute Snapshot Push        |
                  |                                   |
                  | - Push current active state & variables|
                  |   to `suspended_sessions` stack   |
                  | - Set active fields to "Alarm Flow"|
                  | - Set session priority to 10      |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  |   User completes PIN challenge    |
                  |       (Alarm Journey Ends)        |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  |         Pop & Restore Stack       |
                  |                                   |
                  | - Check if suspended array has data|
                  | - Verify time elapsed < 30 mins   |
                  | - Pop oldest snapshot back to root|
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  |   Dispatch "Resume" Notification  |
                  |   "Now let's go back to..."       |
                  +-----------------------------------+
```

#### Detailed Preemption Ingress Algorithm
1. **Trigger Inbound**: External event hits `POST /api/webhook/tenant/:tenant_id/egress/alarmAlert`.
2. **Check Session**: Search `runtime_whatsapp_sessions` matching `tenant_id` and the customer's `mobile`.
3. **Determine Preemption**:
   * *Scenario A: No session exists*. Initialize a new session record, mapping it to the Alarm Journey (`priority: 10`, `current_node_id: "node_alarm_buttons"`, `expires_at: Date.now() + 23 hours`).
   * *Scenario B: Session exists and active journey priority is LESS than 10 (e.g. Priority 1 Job Card)*.
     * Copy `active_journey_id`, `current_node_id`, `priority`, `collected_data`, and `state_history` into a snapshot object.
     * Prepend/Push the snapshot into the session's `suspended_sessions` array, assigning a `pushed_at: new Date()` timestamp.
     * Overwrite root fields: `active_journey_id` = `"journey_alarm_notifications_v1"`, `current_node_id` = `"node_alarm_buttons"`, `priority` = `10`.
     * Dispatch the Channel360 interactive quick-reply alarm buttons immediately.
   * *Scenario C: Session exists and active journey priority is EQUAL or GREATER than 10*. Ignore preemption to prevent disrupting an active duress verification sequence.
4. **Resolution Stack Restoration**:
   * When the session reaches an Alarm end-state node (e.g. PIN confirmed, help requested), the interpreter checks the length of the `suspended_sessions` array.
   * If entries exist, it shifts the latest element off the array.
   * **Stale Session Validation Check**: If `Date.now() - pushed_at > 1800000` (30 minutes), the suspended session is deemed stale. The array is cleared, and standard session termination is executed.
   * If valid, the interpreter overwrites the session's root attributes with the popped snapshot variables and dispatches a resume instruction over WhatsApp, guiding the customer seamlessly back into their lower-priority conversation.

---

### 4.3 Back-Navigation and History Tracking

To support smooth user corrections inside multi-step forms (Track B checklists):
1. **Forward Traversal**: Every time the user successfully validates an input and progresses, the *previous* `current_node_id` is pushed onto the `state_history` string array stack.
2. **"back" Command Interception**:
   * If the customer inputs the exact text `back` (case-insensitive), the runtime engine intercepts it.
   * It pops the last element off the `state_history` array and sets it as the active `current_node_id`.
   * It deletes the variable matching the popped state's variable assignment from the `collected_data` store to clear incorrect inputs.
   * It fetches the configuration parameters of the restored node and re-sends the corresponding prompt over WhatsApp.

---

### 4.4 Conversational Control Commands Overrides

Prior to passing user inputs into the active node validation logic, the incoming message text must be intercepted and cross-referenced with three global keywords:

* **`exit` (or Tenant Bypass Override Keyword)**:
  * Triggers an immediate reset of the active session.
  * Completely clears `collected_data`, `state_history`, and `suspended_sessions`.
  * Restores the session's `current_node_id` to the designated entry node of the primary inbound journey or displays a fallback menu.
  * *Onboarding Exception Guard*: If the user is currently in a mandatory verification or billing PIN state, the system intercepts and blocks the `exit` keyword, requiring compliance before release.
* **`menu`**:
  * Aborts sub-menu navigation instantly and routes the user directly back to the root `node_main_menu`.
  * Re-uses the same security verification release guards as `exit` to prevent unverified bypasses.
* **`help`**:
  * Resolves the corresponding context-aware guide message from the `builder_conversational_templates` collection.
  * Dispatches the guide text over WhatsApp while maintaining the user's active state without altering any session variables.

---

## Section 5: Vue 3 Visual Journey Builder Frontend Spec

The management system interface is designed as an interactive, single-page application built on Vue 3, Vite, and Tailwind CSS.

### 5.1 Workspace Visual Canvas (Vue Flow)

* **Library**: `vue-flow` (Vue 3 equivalent of React Flow).
* **Grid Rendering**: Displays an infinite visual canvas allowing the dragging, snapping, and connecting of journey nodes.
* **Node Visual Representation**:
  * Node header displays the node type (e.g. `Action API`, `List Prompt`) in colored cards matching the design palette.
  * Node bodies render input fields showing active messaging strings or targeted variables.
  * Handles: Input handle on the left edge (target pathway), output handles on the right edge representing matching state transitions.
* **Edge Connection Mechanics**: Linking a node's output handle to a target node's input handle registers a record inside the journey's `edges` array, tracking `source`, `source_handle`, and `target`.

### 5.2 Property Settings Drawer

Clicking on any node on the canvas slides open a Tailwind-styled sidebar drawer containing contextual configuration options:

```
+-------------------------------------------------------+
|  Node Properties Panel                                |
+-------------------------------------------------------+
|  Node ID: node_api_dispatch                           |
|  Type: action_http                                    |
+-------------------------------------------------------+
|  [ API Configuration Card ]                           |
|                                                       |
|  Request Method:                                      |
|  [ POST   | GET | PUT | DELETE ]                      |
|                                                       |
|  Endpoint URL:                                        |
|  [ https://api.watchmanager.co.za/v1/mobile_tech   ]  |
|                                                       |
|  HTTP Headers (JSON):                                 |
|  { "X-Tenant-ID": "{{tenant_id}}" }                   |
|                                                       |
|  JSON Body Payload Template:                           |
|  {                                                    |
|     "subscriber_name": "{{collected_data.fullname}}", |
|     "site_address": "{{collected_data.address}}",     |
|     "fault_category": "{{collected_data.fault_type}}" |
|  }                                                    |
+-------------------------------------------------------+
|  [ Edge Routing Handles ]                             |
|                                                       |
|  Handle Name:   [ success ]  ──► Target: [ node_end ] |
|  Handle Name:   [ failure ]  ──► Target: [ node_err ] |
+-------------------------------------------------------+
```

### 5.3 Administrative Dashboards

* **Live Feed Portal**: Real-time message streaming console utilizing server-sent events (SSE) or WebSockets. It intercepts raw webhook signals hitting `audit_webhook_stream` and displays interactive text bubble dialogues of customer-to-bot chats.
* **Tenant State Toggle Manager**: A clean administrative panel allowing staff to manage global variables, update Channel360 credentials, and use a simple switch component to change the state of a journey (`builder_journeys.is_active` to `true`/`false`).
* **API Sync Comparator**: Features a local vs. live database synchronization comparison utility. It fetches records locally via cached Mongoose maps, queries external Technocore or WatchManager webhooks using `?source=live` parameters, indexes both results, and highlights missing records or key mismatches in a colored JSON editor view.

---

## Section 6: "Antigravity" Prompt & Implementation Templates

Provide this Section's templates directly to **Antigravity** to compile the core components of the platform with exact, production-grade JavaScript execution.

### Template 6.1: Promise-Map Concurrency Lock Wrapper

Ensures that incoming message bursts from the same user are queued and executed sequentially.

```javascript
// /workspace/scratch/concurrency-lock.js
const sessionLocks = new Map();

/**
 * Executes an operation within an in-memory queue chain for a specific phone number.
 * @param {string} lockKey - Unique identifier (tenant_id + mobile)
 * @param {Function} operation - Async function to run
 * @returns {Promise<any>}
 */
function acquireLock(lockKey, operation) {
  if (!sessionLocks.has(lockKey)) {
    sessionLocks.set(lockKey, Promise.resolve());
  }

  const existingChain = sessionLocks.get(lockKey);
  
  const nextChain = existingChain
    .then(async () => {
      try {
        return await operation();
      } catch (err) {
        console.error(`[ConcurrencyLock] Execution failed for Key ${lockKey}:`, err);
        throw err;
      }
    })
    .finally(() => {
      // Clean up the map if no other threads are waiting behind this execution
      if (sessionLocks.get(lockKey) === nextChain) {
        sessionLocks.delete(lockKey);
      }
    });

  sessionLocks.set(lockKey, nextChain);
  return nextChain;
}

module.exports = { acquireLock };
```

### Template 6.2: Idempotency & Message Intake Middleware

Processes incoming webhooks, logs raw payloads, checks message duplication, and sends immediate responses.

```javascript
// /workspace/scratch/intake-middleware.js
const mongoose = require('mongoose');
const { acquireLock } = require('./concurrency-lock');

async function handleWhatsAppWebhook(req, res) {
  const payload = req.body;
  const orgId = req.headers['x-channel360-org-id'] || payload.orgId;
  const messageId = payload.messageId || (payload.message && payload.message.id);
  const mobile = payload.mobile || (payload.message && payload.message.from);

  // 1. Immediately acknowledge webhook receipt to avoid gateway retries
  res.status(200).send({ status: 'received' });

  if (!orgId || !mobile || !messageId) {
    return; // Silent discard for invalid payload parameters
  }

  // Run the state machine asynchronously under the concurrency lock wrapper
  const lockKey = `${orgId}_${mobile}`;
  acquireLock(lockKey, async () => {
    // 2. Resolve Tenant Credentials
    const credentials = await mongoose.model('sys_channel360_credentials').findOne({ org_id: orgId });
    if (!credentials) {
      console.warn(`[Intake] No tenant mapping registered for org_id: ${orgId}`);
      return;
    }
    const tenant_id = credentials.tenant_id;

    // 3. Log Inbound Webhook Signal
    await mongoose.model('audit_webhook_stream').create({
      tenant_id,
      direction: 'inbound',
      payload
    });

    // 4. Resolve/Create Session Record
    let session = await mongoose.model('runtime_whatsapp_sessions').findOne({ tenant_id, mobile });
    const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000); // Standard 23-hour WhatsApp window

    if (!session) {
      // Find default ingress journey mapped to the incoming system trigger keyword
      const defaultJourney = await mongoose.model('builder_journeys').findOne({
        tenant_id,
        is_active: true,
        ingress_trigger_keyword: { $exists: true }
      });

      if (!defaultJourney) {
        console.warn(`[Intake] No active ingress journey found for tenant: ${tenant_id}`);
        return;
      }

      session = await mongoose.model('runtime_whatsapp_sessions').create({
        tenant_id,
        mobile,
        active_journey_id: defaultJourney.journey_id,
        current_node_id: defaultJourney.nodes[0].id,
        priority: defaultJourney.priority,
        processed_message_ids: [],
        expires_at: expiresAt
      });
    }

    // 5. Idempotency Check via 20-Size Circular Message Buffer
    if (session.processed_message_ids.includes(messageId)) {
      console.log(`[Idempotency] Duplicate webhook signal detected for Message ID ${messageId}. Silently dropped.`);
      return;
    }

    // Maintain circular queue size boundary of 20 elements
    session.processed_message_ids.push(messageId);
    if (session.processed_message_ids.length > 20) {
      session.processed_message_ids.shift();
    }

    // 6. Execute Graph Interpreter Loop
    await runInterpreterLoop(session, payload, credentials);
  });
}
```

### Template 6.3: State Preemption Stack Manager

Processes high-priority outbound incident interrupts, pushing active low-priority chats to `suspended_sessions`.

```javascript
// /workspace/scratch/preemption-manager.js
const mongoose = require('mongoose');

/**
 * Triggers a high-priority alarm notification event on a subscriber line, preempting active chats.
 */
async function triggerAlarmPreemption(tenantId, mobile, alarmEventData) {
  const runtimeSessionsModel = mongoose.model('runtime_whatsapp_sessions');
  const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000);

  // Look for any existing session on the mobile line
  let session = await runtimeSessionsModel.findOne({ tenant_id: tenantId, mobile });

  if (!session) {
    // Scenario A: No active session exists. Initialize a fresh alarm session.
    await runtimeSessionsModel.create({
      tenant_id: tenantId,
      mobile,
      active_journey_id: 'journey_alarm_notifications_v1',
      current_node_id: 'node_alarm_buttons',
      priority: 10,
      collected_data: { alarm_id: alarmEventData.alarm_id, location: alarmEventData.location },
      expires_at: expiresAt
    });
  } else if (session.priority < 10) {
    // Scenario B: Lower priority standard session active. Perform Preemption Stack Push.
    const snapshot = {
      active_journey_id: session.active_journey_id,
      current_node_id: session.current_node_id,
      priority: session.priority,
      collected_data: Object.fromEntries(session.collected_data || new Map()),
      state_history: session.state_history,
      pushed_at: new Date()
    };

    session.suspended_sessions.push(snapshot);
    session.active_journey_id = 'journey_alarm_notifications_v1';
    session.current_node_id = 'node_alarm_buttons';
    session.priority = 10;
    
    // Clear dynamic inputs from standard flows to avoid contamination
    session.collected_data.set('alarm_id', alarmEventData.alarm_id);
    session.collected_data.set('location', alarmEventData.location);
    session.expires_at = expiresAt;

    await session.save();
  }
  
  // Dispatch alarm interactive button panel here via Channel360 API calls...
}

/**
 * Checks and restores suspended lower-priority sessions when an override clears.
 */
async function checkAndRestoreSession(session) {
  if (!session.suspended_sessions || session.suspended_sessions.length === 0) {
    return false; // No suspended processes to restore
  }

  // Pop the latest suspended item
  const snapshot = session.suspended_sessions.pop();
  const thirtyMinutesMs = 30 * 60 * 1000;

  // Stale session validation guard
  if (Date.now() - new Date(snapshot.pushed_at).getTime() > thirtyMinutesMs) {
    console.log(`[Preemption] Suspended session for ${session.mobile} expired on stack. Clearing.`);
    return false;
  }

  // Restore snapshot parameters back to the session root
  session.active_journey_id = snapshot.active_journey_id;
  session.current_node_id = snapshot.current_node_id;
  session.priority = snapshot.priority;
  session.collected_data = new Map(Object.entries(snapshot.collected_data));
  session.state_history = snapshot.state_history;
  session.expires_at = new Date(Date.now() + 23 * 60 * 60 * 1000);

  await session.save();
  return true; // Successfully restored
}

module.exports = { triggerAlarmPreemption, checkAndRestoreSession };
```

### Template 6.4: The Journey Graph State Interpreter Loop

Dynamically resolves compiled JSON elements and parses customer responses.

```javascript
// /workspace/scratch/interpreter.js
const mongoose = require('mongoose');
const axios = require('axios');
const { checkAndRestoreSession } = require('./preemption-manager');

/**
 * Evaluates the active node inside the session, applies input responses, and transitions along matching edges.
 */
async function runInterpreterLoop(session, webhookPayload, credentials) {
  const userMessageText = (webhookPayload.message && webhookPayload.message.text || '').trim();
  const selectedChoiceId = webhookPayload.message && webhookPayload.message.payload; // For quick-replies / lists

  // 1. Load active compiled journey graph
  const journey = await mongoose.model('builder_journeys').findOne({
    tenant_id: session.tenant_id,
    journey_id: session.active_journey_id,
    is_active: true
  });

  if (!journey) {
    console.error(`[Interpreter] Active journey ${session.active_journey_id} not found or disabled.`);
    return;
  }

  // 2. Resolve Active Node Settings
  let currentNode = journey.nodes.find(n => n.id === session.current_node_id);
  if (!currentNode) {
    console.error(`[Interpreter] Node ${session.current_node_id} not registered inside journey.`);
    return;
  }

  // 3. Global Control Keyword Overrides Interception
  if (userMessageText.toLowerCase() === 'exit') {
    session.current_node_id = journey.nodes[0].id;
    session.collected_data.clear();
    session.state_history = [];
    await session.save();
    await sendWhatsAppMessage(credentials, session.mobile, "Conversation reset. Starting over.");
    return;
  }

  if (userMessageText.toLowerCase() === 'back' && session.state_history.length > 0) {
    const rolledBackNodeId = session.state_history.pop();
    session.current_node_id = rolledBackNodeId;
    await session.save();
    // Recursively call interpreter on the restored state with empty message to trigger prompt
    return runInterpreterLoop(session, { ...webhookPayload, message: { text: '' } }, credentials);
  }

  let nextNodeId = null;
  let exitHandle = 'success';

  // 4. Execute Node Logics
  if (currentNode.type === 'prompt_text' && currentNode.config.await_response) {
    // Validate user input format using regex mapping
    const regex = new RegExp(currentNode.config.validation_regex || '.*');
    if (!regex.test(userMessageText)) {
      await sendWhatsAppMessage(credentials, session.mobile, currentNode.config.validation_error_message);
      return; // Stop execution loop and keep session in current node awaiting correction
    }

    // Save validated response parameter
    session.collected_data.set(currentNode.config.input_variable, userMessageText);
    session.state_history.push(currentNode.id);
  } 
  
  else if (currentNode.type === 'prompt_buttons' || currentNode.type === 'prompt_list') {
    // Quick reply or list menus match transitions using the payload choice identifier
    if (!selectedChoiceId) {
      await sendWhatsAppMessage(credentials, session.mobile, "Please tap one of the options below to proceed:");
      return; // Re-prompt and wait
    }
    
    session.collected_data.set(currentNode.config.input_variable, selectedChoiceId);
    session.state_history.push(currentNode.id);
    exitHandle = selectedChoiceId; // Route transition along edge matching the button/list selection ID
  }

  else if (currentNode.type === 'action_http') {
    // Evaluate template parameters dynamically using session variable interpolation
    const renderedUrl = interpolateTemplate(currentNode.config.url, session);
    const renderedBody = interpolateTemplate(currentNode.config.body_template, session);
    
    const startTime = Date.now();
    let responseStatus = 200;
    let responseBody = {};

    try {
      const response = await axios({
        method: currentNode.config.method,
        url: renderedUrl,
        headers: JSON.parse(interpolateTemplate(JSON.stringify(currentNode.config.headers), session)),
        data: renderedBody,
        timeout: 10000
      });
      responseBody = response.data;
      // Inject API outputs to session so downstream nodes can interpolate reference tokens
      session.collected_data.set('api_response', response.data);
    } catch (err) {
      responseStatus = err.response ? err.response.status : 500;
      responseBody = err.response ? err.response.data : { error: err.message };
      exitHandle = 'failure';
    } finally {
      // Record complete API diagnostic log to database cluster
      await mongoose.model('audit_api_outbound_logs').create({
        tenant_id: session.tenant_id,
        journey_id: session.active_journey_id,
        node_id: currentNode.id,
        endpoint_url: renderedUrl,
        request_payload: renderedBody,
        response_code: responseStatus,
        response_body: responseBody,
        duration_ms: Date.now() - startTime
      });
    }
  }

  // 5. Traverse Matching Output Edge
  const activeEdge = journey.edges.find(e => e.source === currentNode.id && e.source_handle === exitHandle);
  if (activeEdge) {
    nextNodeId = activeEdge.target;
  } else {
    // Use fallback default edge if specific handle matching failed
    const fallbackEdge = journey.edges.find(e => e.source === currentNode.id && e.source_handle === 'success');
    if (fallbackEdge) nextNodeId = fallbackEdge.target;
  }

  if (nextNodeId) {
    session.current_node_id = nextNodeId;
    await session.save();

    // Check if next node is a non-blocking background task (like an API call), allowing recursive processing
    const nextNode = journey.nodes.find(n => n.id === nextNodeId);
    if (nextNode && (nextNode.type === 'action_http' || (nextNode.type === 'prompt_text' && !nextNode.config.await_response))) {
      return runInterpreterLoop(session, webhookPayload, credentials);
    } else if (nextNode) {
      // Send the WhatsApp template prompt linked to the newly entered node and exit thread execution
      await sendNodeWhatsAppPrompt(credentials, session.mobile, nextNode, session);
    }
  } else {
    // Journey has completed. Attempt Preemption restoration
    const hasRestored = await checkAndRestoreSession(session);
    if (hasRestored) {
      const restoredNode = journey.nodes.find(n => n.id === session.current_node_id);
      await sendWhatsAppMessage(credentials, session.mobile, `⚠️ Safe status confirmed. Let's resume your previous technical fault report:`);
      await sendNodeWhatsAppPrompt(credentials, session.mobile, restoredNode, session);
    } else {
      // Absolute clean finish - expire session record
      session.expires_at = new Date();
      await session.save();
    }
  }
}

/**
 * Interpolates string variables matching double-brackets {{collected_data.var}} with active session keys.
 */
function interpolateTemplate(template, session) {
  if (typeof template !== 'string') {
    return template; // Deep properties evaluated recursively inside parent routines
  }
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (match, path) => {
    const keys = path.split('.');
    if (keys[0] === 'collected_data') {
      return session.collected_data.get(keys[1]) || '';
    } else if (keys[0] === 'mobile') {
      return session.mobile || '';
    } else if (keys[0] === 'tenant_id') {
      return session.tenant_id || '';
    } else if (keys[0] === 'api_response') {
      const apiResp = session.collected_data.get('api_response') || {};
      return apiResp[keys[1]] || '';
    }
    return '';
  });
}

async function sendWhatsAppMessage(credentials, mobile, text) {
  // Dispatches simple text strings to the Channel360 reply gateway...
}

async function sendNodeWhatsAppPrompt(credentials, mobile, node, session) {
  // Resolves properties of list dropdowns, quick replies, or text blocks and posts the JSON template to Channel360...
}
```

---

## Section 7: QA Testing & Local Mock Server Guide

To allow Antigravity and automated test runs (`test_flows.js`) to verify conversational journeys locally without sending physical WhatsApp payloads (saving costs and avoiding billing limits) and without triggering real emergency dispatches:

### 7.1 Simulated Test Mode Architecture

1. When `sys_channel360_credentials.is_test_mode` is set to `true`, all downstream API gateways and Channel360 REST calls are redirected.
2. Rather than calling:
   `https://www.channel360.co.za/v1.1/org/{orgId}/whatsapp/appuser/{mobile}/reply`
   The engine redirects the call locally to:
   `http://localhost:3002/whatsapp_reply`
3. Rather than calling live WatchManager APIs (`/mobile_panic`, `/mobile_cancel`, `/mobile_tech`), the engine redirects calls to the local mock callback endpoints:
   `http://localhost:3002/mock_watchmanager/mobile_panic`
   `http://localhost:3002/mock_watchmanager/mobile_tech`

### 7.2 Mock Verification Server Implementation

You can write this mock web service to `/workspace/scratch/mock-server.js` to assert payload structures during testing:

```javascript
// /workspace/scratch/mock-server.js
const express = require('express');
const app = express();
app.use(express.json());

const apiLogs = [];

app.post('/whatsapp_reply', (req, res) => {
  const { mobile, payload } = req.body;
  console.log(`[MOCK GATEWAY] Outbound SMS dispatched to ${mobile}. Payload:`, JSON.stringify(payload));
  apiLogs.push({ type: 'whatsapp', recipient: mobile, payload, timestamp: new Date() });
  res.status(200).send({ status: 'sent_to_mock' });
});

app.post('/mock_watchmanager/mobile_panic', (req, res) => {
  console.log(`[MOCK CONTROL ROOM] Panic Trigger Received:`, req.body);
  apiLogs.push({ type: 'panic_escalation', payload: req.body, timestamp: new Date() });
  res.status(200).send({ status: 'success', ticket_id: 'panic_' + Math.random().toString(36).substr(2, 9) });
});

app.post('/mock_watchmanager/mobile_tech', (req, res) => {
  console.log(`[MOCK CONTROL ROOM] Tech Fault Ticket Received:`, req.body);
  apiLogs.push({ type: 'tech_ticket', payload: req.body, timestamp: new Date() });
  res.status(200).send({ status: 'success', ticket_id: 'tech_' + Math.random().toString(36).substr(2, 9) });
});

app.get('/test_logs', (req, res) => {
  res.status(200).json(apiLogs);
});

app.listen(3002, () => console.log('QA Mock Callback Integration Server listening on port 3002'));
```

---
Generated by NotebookLM. Technical Blueprint Specification.