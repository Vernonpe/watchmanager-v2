# Test Cases

## TC-001: Automatic unique orgId UUID Generation on Tenant Registration
### Description
Verify that creating a new tenant automatically registers a matching C360 credentials record in MongoDB with an auto-generated unique UUID.
### Action
1. Open the Config Panel at `http://localhost:5173/config`.
2. Click **+ New Tenant**.
3. Fill out Tenant ID: `tenant_movie_prod_02`, Org Name: `MoviePortal`, Email: `tech@movieportal.com`, Status: `Active`.
4. Click **Submit Registration**.
### Expected Results
- Tenant is successfully registered in `sys_tenants`.
- A matching record is created in `sys_channel360_credentials` with a unique UUID string populated in the `org_id` field.
- The C360 integration panel pre-populates the generated UUID in the Organization ID field.

---

## TC-002: Dynamic Webhook URL Formatting on Config Panel
### Description
Verify that the Webhook URL displays show the actual generated UUID (`org_id`) in their endpoint formats on the Config Panel.
### Action
1. Select the newly created tenant `MoviePortal` (`tenant_movie_prod_02`) in the Commercial Tenants list.
2. Scroll to the "Webhook Endpoints for Channel360 Configuration" card.
### Expected Results
- Inbound Message Webhook URL displays: `http://localhost:3001/api/{{UUID}}/whatsapp/messages` (with `{{UUID}}` replaced by the actual generated orgId string, e.g. `http://localhost:3001/api/3b246a48-f86a-4b92-8406-38efd42dbb99/whatsapp/messages`).
- Delivery Notifications URL displays the dynamic format: `http://localhost:3001/api/{{UUID}}/whatsapp/notifications` (with `{{UUID}}` replaced by the actual generated orgId string).

---

## TC-003: Dynamic Endpoint Validation Blocking for Suspended Tenants
### Description
Verify that if a tenant status is switched to suspended (Inactive), the webhooks `/api/:orgId/whatsapp/messages` and `/api/:orgId/whatsapp/notifications` reject requests with `403 Forbidden` and halt execution.
### Action
1. Select tenant `MoviePortal` in the list.
2. Click the status toggle switch next to its name in the list to update its status to `suspended`.
3. Dispatch a mock webhook request to `POST http://localhost:3001/api/{{UUID}}/whatsapp/messages` (using the generated UUID).
### Expected Results
- The API responds with `403 Forbidden` status.
- Payload body contains: `{ "error": "Tenant account is inactive or suspended" }`.
- State machine interpreter loop is bypassed, and no database sessions are created or mutated.

---

## TC-004: Clean-Sweep Deletion of Customer Accounts
### Description
Verify that deleting a tenant account purges all associated records from all namespace collections (`sys_`, `builder_`, `runtime_`).
### Action
1. Select tenant `MoviePortal` in the list.
2. Click **Delete Customer** on the configuration panel.
3. Confirm the modal deletion alert.
### Expected Results
- The tenant is removed from `sys_tenants`.
- The matching credentials document is deleted from `sys_channel360_credentials`.
- All visual journeys for this tenant are deleted from `builder_journeys`.
- Any active sessions are cleared from `runtime_whatsapp_sessions`.
- The UI refreshes and clears the panel.

---

## TC-005: Visual Flow Node Handle Connections
### Description
Verify that dragging lines between connection points (handles) on the Flowbuilder workspace successfully draws edges.
### Action
1. Go to the Journey Builder at `http://localhost:5173/builder`.
2. Add two nodes (e.g. Text and Buttons) by clicking on them in the Node Palette sidebar.
3. Drag from the green connection handle on the right side of the Text node to the connection handle on the left side of the Buttons node.
### Expected Results
- A connection line is drawn and visual edge linking remains active.
- Edges array increases in size and is registered in the state model.

---

## TC-006: Loading, Editing, and Saving Tenant Conversational Journeys
### Description
Verify that selecting a tenant and an existing journey displays the saved nodes and positions, allows changes, and saves the updated blueprint.
### Action
1. Go to the Journey Builder page.
2. Select the Tenant: `WatchManager Inc` from the dropdown list.
3. Select Edit Journey: `WatchManager Technical Assistance` (`journey_watchmanager_v2`).
4. Reposition one of the nodes by dragging it, change the journey trigger keyword to `support`, and click **Save Blueprint**.
5. Reload the browser page, select the tenant `WatchManager Inc`, and select Edit Journey `journey_watchmanager_v2` again.
### Expected Results
- Canvas successfully draws the nodes and edges with the saved coordinates/positions.
- Updated trigger keyword `support` is retained and loaded.
- Backend database collection `builder_journeys` reflects the updated node coordinates and trigger keyword.

---

## TC-007: Modifying Tenant Profile Details (Locked UUID)
### Description
Verify that selecting a tenant loads its profile, allows updating organization name and contact email, but locks the unique Platform UUID from edits.
### Action
1. Open the Config Panel at `http://localhost:5173/config`.
2. Select the tenant `WatchManager Inc` from the Commercial Tenants list.
3. In the "Tenant Profile Details" card, verify that:
   - "Tenant ID" and "Platform UUID" input fields are greyed out / disabled.
4. Modify "Organization Name" to `WatchManager Corporate` and change "Contact Email" to `admin@watchmanager.co.za`.
5. Click **Update Profile Details**.
### Expected Results
- A success toast is displayed.
- The list reflects the name update to `WatchManager Corporate`.
- The Platform UUID remains unchanged and locked in the database.

---

## TC-008: Auditing & Inspection Logs Dashboard
### Description
Verify that the Audit Logs menu compiles all incoming/outgoing messages, API calls, and exceptions in a unified dashboard with keyword search and category filters.
### Action
1. Open the Audit Logs view at `http://localhost:5173/logs`.
2. Click on the category pills (e.g. Inbound Messages, Outbound API Calls) to filter the feed list.
3. Enter `John Doe` in the keyword search box.
4. Click on any log row to inspect its parameters.
### Expected Results
- Clicking the category pills filters the feed list.
- Search box filters results containing the keyword `John Doe` (either in summary or details payload).
- Inspector card displays the selected log's formatted JSON details structure (e.g. headers, payload variables, API response body).

---

## TC-009: 24-Hour WhatsApp Session Support Window & Fallback Templates
### Description
Verify that when the last user interaction exceeds 24 hours, the system automatically redirects outgoing messages to use the pre-approved WhatsApp Template.
### Action
1. Go to the Journey Builder page.
2. Select a text prompt node (e.g. `node_start`).
3. In the properties panel, toggle "WhatsApp 24-Hour Window Fallback Template", input Template Name `service_reinitiate`, and Map parameter: `collected_data.fullname`.
4. Click **Save Blueprint**.
5. Manually force the session `last_user_message_at` field in MongoDB to a timestamp > 24 hours ago.
6. Trigger an outbound notification or step flow transition to that node.
### Expected Results
- The system checks `last_user_message_at` and detects support window expiration.
- The outbound payload sent to the Channel360 API matches the WhatsApp Template structure (containing `template_name` and parameters) rather than freeform text.

---

## TC-010: Customizable Session Inactivity Expiration Timeouts
### Description
Verify that the session timeout duration defaults to 24 hours but is overridden by the journey's custom `session_timeout_minutes` setting.
### Action
1. Go to the Journey Builder page.
2. In the journey settings header, set **Inactivity Timeout (minutes)** to `30` (30 minutes).
3. Save the journey blueprint.
4. Dispatch an inbound keyword message to initiate the journey session.
5. Query the newly created session record in `runtime_whatsapp_sessions`.
### Expected Results
- The session `expires_at` is set to exactly 30 minutes in the future from the creation time.

---

## TC-011: Custom Command Keywords Override (Exit, Menu, Back)
### Description
Verify that journeys can configure customized keyword arrays to handle state resets and back navigations.
### Action
1. Go to the Journey Builder page.
2. In the journey settings header, set custom **Exit Keywords** to `cancel_session`.
3. Save the journey.
4. Initiate a session and progress past the first node to collect data.
5. Send the message text `cancel_session` over WhatsApp.
### Expected Results
- The system intercepts the message as an exit override command.
- The session state resets to the starting node, and collected variables are cleared.
- Standard text `exit` is processed as a regular message input, not an override.

---

## TC-012: Inbound Delivery Status Notifications Logging
### Description
Verify that delivery status notifications (sent, delivered, read, failed) from the WhatsApp gateway are parsed and logged in the audit stream.
### Action
1. Send a mock HTTP payload representing a delivery status update to `/api/:platformUuid/whatsapp/notifications`.
2. Open the Audit Logs portal at `http://localhost:5173/logs`.
### Expected Results
- The notification event is stored in `audit_webhook_stream` with type/direction `notification_status`.
- The UI dashboard lists the delivery status updates in real-time.

---

## TC-013: Journey Builder Visual Header Two-Row Refactoring
### Description
Verify that the Journey Builder configuration header is divided into two rows: the top row for scope selection and global workspace actions, and the bottom row for detailed journey configuration cards.
### Action
1. Open the Journey Builder at `http://localhost:5173/builder`.
2. Inspect the top config panel.
### Expected Results
- The config panel is divided into two rows with a clean glassmorphic divider.
- The top row displays:
  - "Tenant Scope" dropdown selector.
  - "Journey Blueprint" dropdown selector.
  - Global action buttons ("Load Demo", "Clear Canvas", "Save Blueprint").
- The bottom row groups configuration fields into three card containers:
  - **Identity**: Journey ID & Journey Name fields.
  - **Ingress Trigger**: Trigger Keyword & Priority fields.
  - **Lifecycle & Expiration**: Timeout (minutes) & Exit Keys fields.
- The visual canvas area automatically expands and fits the remaining page height cleanly.



