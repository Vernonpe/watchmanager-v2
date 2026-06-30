require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const axios = require('axios');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}/api`;
const MOCK_URL = `http://localhost:3002`;

// Load models
require('../src/db/schemas');

// Simulated journey graphs
const defaultChecklistJourney = {
  tenant_id: "tenant_watchmanager_prod_01",
  journey_id: "journey_watchmanager_v2",
  name: "WatchManager Technical Assistance",
  version: 1,
  is_active: true,
  priority: 1,
  ingress_trigger_keyword: "service",
  nodes: [
    {
      id: "node_start",
      type: "prompt_text",
      config: {
        message: "Welcome to *WatchManager Technical Assistance Portal*.\n\nPlease tell us your full name to proceed:",
        await_response: true,
        input_variable: "fullname",
        validation_regex: "^.{2,100}$",
        validation_error_message: "Invalid Name. Name must be between 2 and 100 characters. Please try again:",
        fallback_template_name: "service_reinitiate",
        fallback_template_params: ["collected_data.fullname"]
      }
    },
    {
      id: "node_address",
      type: "prompt_text",
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
      config: {
        url: "http://localhost:3002/mock_watchmanager/mobile_tech",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": "{{tenant_id}}"
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
      config: {
        message: "Thank you! A technical assistance request has been registered.\n\nJob Ticket Reference: *{{api_response.ticket_id}}*.",
        await_response: false
      }
    }
  ],
  edges: [
    { source: "node_start", source_handle: "success", target: "node_address" },
    { source: "node_address", source_handle: "success", target: "node_fault_menu" },
    { source: "node_fault_menu", source_handle: "flt_bt_001", target: "node_api_dispatch" },
    { source: "node_fault_menu", source_handle: "flt_sn_002", target: "node_api_dispatch" },
    { source: "node_api_dispatch", source_handle: "success", target: "node_end" }
  ]
};

const alarmJourney = {
  tenant_id: "tenant_watchmanager_prod_01",
  journey_id: "journey_alarm_notifications_v1",
  name: "WatchManager Alarm Verification",
  version: 1,
  is_active: true,
  priority: 10,
  ingress_trigger_keyword: "",
  nodes: [
    {
      id: "node_alarm_buttons",
      type: "prompt_buttons",
      config: {
        message: "⚠️ WatchManager Alarm Triggered at {{collected_data.location}}.\n\nPlease select option or reply with site PIN:",
        input_variable: "user_action",
        buttons: [
          { id: "send_help", title: "Send Help" },
          { id: "false_alarm", title: "Safe / False Alarm" }
        ],
        fallback_template_name: "alarm_alert_template",
        fallback_template_params: ["{{collected_data.location}}"]
      }
    },
    {
      id: "node_verify_pin",
      type: "prompt_text",
      config: {
        message: "Please enter your cancellation PIN to confirm Safe Status:",
        await_response: true,
        input_variable: "cancel_pin",
        validation_regex: "^\\d{4}$",
        validation_error_message: "PIN must be exactly 4 digits. Please try again:"
      }
    },
    {
      id: "node_verify_code_action",
      type: "condition_split",
      config: {
        variable: "collected_data.cancel_pin",
        operator: "equals",
        value: "1234" // Valid PIN matching raw trigger credentials
      }
    },
    {
      id: "node_alarm_cancel",
      type: "action_http",
      config: {
        url: "http://localhost:3002/mock_watchmanager/mobile_panic",
        method: "POST",
        body_template: {
          "event_uuid": "{{collected_data.event_uuid}}",
          "action": "cancel",
          "pin": "{{collected_data.cancel_pin}}"
        }
      }
    },
    {
      id: "node_alarm_dispatch",
      type: "action_http",
      config: {
        url: "http://localhost:3002/mock_watchmanager/mobile_panic",
        method: "POST",
        body_template: {
          "event_uuid": "{{collected_data.event_uuid}}",
          "action": "dispatch"
        }
      }
    },
    {
      id: "node_cancellation_success",
      type: "prompt_text",
      config: {
        message: "Alarm cancelled successfully. Control room notified of false alarm.",
        await_response: false
      }
    },
    {
      id: "node_dispatch_triggered",
      type: "prompt_text",
      config: {
        message: "Control room has dispatched armed response to your site.",
        await_response: false
      }
    }
  ],
  edges: [
    { source: "node_alarm_buttons", source_handle: "false_alarm", target: "node_verify_pin" },
    { source: "node_alarm_buttons", source_handle: "send_help", target: "node_alarm_dispatch" },
    { source: "node_verify_pin", source_handle: "success", target: "node_verify_code_action" },
    { source: "node_verify_code_action", source_handle: "true", target: "node_alarm_cancel" },
    { source: "node_verify_code_action", source_handle: "false", target: "node_verify_pin" }, // Loop back on invalid PIN
    { source: "node_alarm_cancel", source_handle: "success", target: "node_cancellation_success" },
    { source: "node_alarm_dispatch", source_handle: "success", target: "node_dispatch_triggered" }
  ]
};

async function setupTestData() {
  console.log('[Setup] Cleaning up test collections...');
  await mongoose.model('sys_tenants').deleteMany({});
  await mongoose.model('sys_channel360_credentials').deleteMany({});
  await mongoose.model('builder_journeys').deleteMany({});
  await mongoose.model('runtime_whatsapp_sessions').deleteMany({});
  await mongoose.model('runtime_alarm_triggers').deleteMany({});
  await mongoose.model('audit_webhook_stream').deleteMany({});
  await mongoose.model('audit_api_outbound_logs').deleteMany({});

  console.log('[Setup] Inserting mock tenant & credential records...');
  await mongoose.model('sys_tenants').create({
    tenant_id: "tenant_watchmanager_prod_01",
    platform_uuid: "platform_watchmanager_test_uuid",
    name: "WatchManager Inc",
    status: "active",
    contact_email: "support@watchmanager.co.za"
  });

  await mongoose.model('sys_channel360_credentials').create({
    tenant_id: "tenant_watchmanager_prod_01",
    org_id: "org_watchmanager_test",
    bearer_token: "bearer_test_token_999",
    channel_account_name: "WatchManager Gateway",
    watch_manager_base_url: "http://localhost:3002/mock_watchmanager",
    is_test_mode: true
  });

  console.log('[Setup] Creating Visual Journey Blueprints...');
  await mongoose.model('builder_journeys').create(defaultChecklistJourney);
  await mongoose.model('builder_journeys').create(alarmJourney);

  // Clear mock server logs
  await axios.post(`${MOCK_URL}/clear_logs`).catch(() => {});
  console.log('[Setup] Test data initialized.');
}

async function waitForSessionState(mobile, checkFn, timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const session = await mongoose.model('runtime_whatsapp_sessions').findOne({ mobile });
    if (session && checkFn(session)) {
      return session;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const session = await mongoose.model('runtime_whatsapp_sessions').findOne({ mobile });
  throw new Error(`Timeout waiting for expected session state. Current session data: ${JSON.stringify(session)}`);
}

async function runTests() {
  console.log('\n--- BEGIN DYNAMIC STATE MACHINE SIMULATION ---\n');

  const clientMobile = "27836520670";
  const headers = {
    'Content-Type': 'application/json',
    'X-Channel360-Org-ID': 'org_watchmanager_test'
  };

  // Step 1: Simulate user typing ingress trigger keyword 'service' using the dynamic UUID messages route
  console.log(`[Test] 1. Dispatching Inbound Ingress keyword "service" from ${clientMobile} via dynamic messages route...`);
  await axios.post(`${BASE_URL}/platform_watchmanager_test_uuid/whatsapp/messages`, {
    messageId: "msg_inbound_001",
    mobile: clientMobile,
    message: {
      id: "msg_inbound_001",
      from: clientMobile,
      text: "service"
    }
  }, { headers });

  // Get active session with polling
  let session = await waitForSessionState(clientMobile, s => s.current_node_id === 'node_start');
  console.log('  [PASS] Session successfully initialized at Node:', session.current_node_id);

  // Step 2: Provide full name 'John Doe'
  console.log('[Test] 2. Dispatching user full name "John Doe"...');
  await axios.post(`${BASE_URL}/webhook/whatsapp`, {
    messageId: "msg_inbound_002",
    mobile: clientMobile,
    message: {
      id: "msg_inbound_002",
      from: clientMobile,
      text: "John Doe"
    }
  }, { headers });

  session = await waitForSessionState(clientMobile, s => s.current_node_id === 'node_address' && s.collected_data.get('fullname') === 'John Doe');
  console.log('  [PASS] Transitioned to address. Variables cached:', JSON.stringify(Object.fromEntries(session.collected_data)));

  // Step 3: Trigger alarm panic (Priority 10) in the middle of standard flow (Priority 1)
  console.log('\n[Test] 3. TRIGGERING EMERGENCY ALARM INCIDENT OVERRIDE (Priority 10)...');
  const alarmTriggerResponse = await axios.post(`${BASE_URL}/webhook/alarm/trigger`, {
    tenant_id: "tenant_watchmanager_prod_01",
    mobile: clientMobile,
    alarm_id: "alarm_incident_888",
    location: "Section 5 - Main Office Building",
    event_uuid: "event_uuid_101010",
    passwords: ["1234"],
    duress_codes: ["SILENT"]
  });

  session = await waitForSessionState(clientMobile, s => s.priority === 10 && s.active_journey_id === 'journey_alarm_notifications_v1' && s.suspended_sessions.length === 1);
  console.log('  [PASS] State preempted successfully.');
  console.log('  Active Journey shifted to:', session.active_journey_id);
  console.log('  Pushed suspended snapshot stack size:', session.suspended_sessions.length);
  console.log('  Snapshot active journey was:', session.suspended_sessions[0].active_journey_id);

  // Step 4: Try to reply "Safe / False Alarm" via quick reply buttons
  console.log('[Test] 4. User replies "Safe / False Alarm" button selection...');
  await axios.post(`${BASE_URL}/webhook/whatsapp`, {
    messageId: "msg_inbound_003",
    mobile: clientMobile,
    message: {
      id: "msg_inbound_003",
      from: clientMobile,
      payload: "false_alarm" // Button choice ID
    }
  }, { headers });

  session = await waitForSessionState(clientMobile, s => s.current_node_id === 'node_verify_pin');
  console.log('  [PASS] Transitioned to node:', session.current_node_id);

  // Step 5: Input WRONG pin (invalid regex/pattern check)
  console.log('[Test] 5. User enters invalid regex PIN "abc" (must be 4 digits)...');
  await axios.post(`${BASE_URL}/webhook/whatsapp`, {
    messageId: "msg_inbound_004",
    mobile: clientMobile,
    message: {
      id: "msg_inbound_004",
      from: clientMobile,
      text: "abc"
    }
  }, { headers });

  // Wait a small bit and check that session is still at node_verify_pin
  await new Promise(resolve => setTimeout(resolve, 500));
  session = await mongoose.model('runtime_whatsapp_sessions').findOne({ mobile: clientMobile });
  if (!session || session.current_node_id !== 'node_verify_pin') {
    throw new Error('Test Step 5 Failed: Wrong PIN regex did not block progression');
  }
  console.log('  [PASS] Invalid regex PIN rejected. Session remained in node:', session.current_node_id);

  // Step 6: Input VALID pin `1234`
  console.log('[Test] 6. User enters correct cancellation PIN "1234"...');
  await axios.post(`${BASE_URL}/webhook/whatsapp`, {
    messageId: "msg_inbound_005",
    mobile: clientMobile,
    message: {
      id: "msg_inbound_005",
      from: clientMobile,
      text: "1234"
    }
  }, { headers });

  // Verification - polling until popped snapshot is restored
  session = await waitForSessionState(clientMobile, s => s.active_journey_id === 'journey_watchmanager_v2' && s.current_node_id === 'node_address' && s.suspended_sessions.length === 0);
  console.log('  [PASS] Alarm verified. Preemption Stack restored.');
  console.log('  Returned to Journey:', session.active_journey_id);
  console.log('  Active Node restored:', session.current_node_id);
  console.log('  Name restored:', session.collected_data.get('fullname'));

  // Step 7: Check mock server logs for outbounds
  console.log('\n[Test] 7. Inspecting mock gateway logs...');
  const logsResp = await axios.get(`${MOCK_URL}/test_logs`);
  const logs = logsResp.data;
  
  console.log(`  Outbound logs captured: ${logs.length}`);
  const whatsappReplies = logs.filter(l => l.type === 'whatsapp');
  const panicEscalations = logs.filter(l => l.type === 'panic_escalation');

  console.log('  WhatsApp outbounds:');
  whatsappReplies.forEach((w, i) => console.log(`    [${i+1}] to: ${w.recipient}, content:`, JSON.stringify(w.payload)));

  console.log('  Panic escalations:');
  panicEscalations.forEach((p, i) => console.log(`    [${i+1}] payload:`, JSON.stringify(p.payload)));

  if (panicEscalations.length !== 1 || panicEscalations[0].payload.action !== 'cancel') {
    throw new Error('Test Step 7 Failed: Panic cancellation HTTP dispatch not recorded on mock server');
  }
  console.log('  [PASS] Control room successfully notified of alarm cancellation.');

  // Step 8: Verify active/inactive tenant validation blocking
  console.log('\n[Test] 8. Suspending tenant account to test dynamic endpoint deactivation...');
  await mongoose.model('sys_tenants').updateOne(
    { tenant_id: "tenant_watchmanager_prod_01" },
    { status: "suspended" }
  );

  try {
    console.log('  Dispatching message to suspended tenant dynamic endpoint...');
    await axios.post(`${BASE_URL}/platform_watchmanager_test_uuid/whatsapp/messages`, {
      messageId: "msg_inbound_suspended",
      mobile: clientMobile,
      message: {
        id: "msg_inbound_suspended",
        from: clientMobile,
        text: "hello"
      }
    }, { headers });
    throw new Error('Test Step 8 Failed: Request succeeded on suspended tenant endpoint but should have failed with 403');
  } catch (err) {
    if (err.response && err.response.status === 403) {
      console.log('  [PASS] Endpoint successfully blocked with status 403 Forbidden.');
    } else {
      throw new Error(`Test Step 8 Failed: Expected 403 status code but got: ${err.response ? err.response.status : err.message}`);
    }
  }

  // Restore tenant status back to active
  await mongoose.model('sys_tenants').updateOne(
    { tenant_id: "tenant_watchmanager_prod_01" },
    { status: "active" }
  );

  console.log('\n[Test] 9. Verifying customizable session timeouts...');
  // Update journey timeout setting
  await mongoose.model('builder_journeys').updateOne(
    { journey_id: "journey_watchmanager_v2" },
    { session_timeout_minutes: 45 }
  );
  // Delete existing session to force a fresh one
  await mongoose.model('runtime_whatsapp_sessions').deleteMany({ mobile: clientMobile });
  
  await axios.post(`${BASE_URL}/platform_watchmanager_test_uuid/whatsapp/messages`, {
    messageId: "msg_inbound_timeout_test",
    mobile: clientMobile,
    message: {
      id: "msg_inbound_timeout_test",
      from: clientMobile,
      text: "service"
    }
  }, { headers });

  session = await waitForSessionState(clientMobile, s => s.current_node_id === 'node_start');
  const durationMinutes = Math.round((new Date(session.expires_at).getTime() - Date.now()) / 60000);
  if (durationMinutes < 40 || durationMinutes > 50) {
    throw new Error(`Test Step 9 Failed: Session timeout calculation error. Expected ~45 mins, got: ${durationMinutes} mins`);
  }
  console.log('  [PASS] Session expires_at set dynamically to:', session.expires_at, `(~${durationMinutes} minutes)`);

  console.log('\n[Test] 10. Verifying customizable exit keywords...');
  // Update journey keywords
  await mongoose.model('builder_journeys').updateOne(
    { journey_id: "journey_watchmanager_v2" },
    { exit_keywords: ['cancel_session', 'abort_flow'] }
  );
  // Send some input to transition node
  await axios.post(`${BASE_URL}/webhook/whatsapp`, {
    messageId: "msg_inbound_name",
    mobile: clientMobile,
    message: {
      id: "msg_inbound_name",
      from: clientMobile,
      text: "Alice"
    }
  }, { headers });
  session = await waitForSessionState(clientMobile, s => s.current_node_id === 'node_address');
  
  // Try sending the default 'exit' command (should now be ignored as a command override)
  console.log("  Sending default 'exit' (should be processed as normal address input)...");
  await axios.post(`${BASE_URL}/webhook/whatsapp`, {
    messageId: "msg_inbound_exit_ignored",
    mobile: clientMobile,
    message: {
      id: "msg_inbound_exit_ignored",
      from: clientMobile,
      text: "exit"
    }
  }, { headers });
  
  await new Promise(resolve => setTimeout(resolve, 300));
  session = await mongoose.model('runtime_whatsapp_sessions').findOne({ mobile: clientMobile });
  if (session.current_node_id === 'node_start') {
    throw new Error(`Test Step 10 Failed: Default 'exit' incorrectly triggered reset when it was overridden. Current node: ${session.current_node_id}`);
  }
  
  // Send the custom exit keyword 'cancel_session' (should trigger reset)
  console.log("  Sending custom exit keyword 'cancel_session' (should trigger session reset)...");
  await axios.post(`${BASE_URL}/webhook/whatsapp`, {
    messageId: "msg_inbound_exit_custom",
    mobile: clientMobile,
    message: {
      id: "msg_inbound_exit_custom",
      from: clientMobile,
      text: "cancel_session"
    }
  }, { headers });
  
  session = await waitForSessionState(clientMobile, s => s.current_node_id === 'node_start' && s.collected_data.size === 0);
  console.log('  [PASS] Session successfully reset to start using custom keyword "cancel_session".');

  console.log('\n[Test] 11. Verifying 24-Hour support window template fallbacks...');
  // Force last message time to 25 hours ago
  session.last_user_message_at = new Date(Date.now() - 25 * 60 * 60 * 1000);
  await session.save();

  // Clear mock server logs to isolate output
  await axios.post(`${MOCK_URL}/clear_logs`).catch(() => {});

  // Trigger outbound alarm preemption override
  console.log("  Simulating outbound alarm preemption override outside support window...");
  await axios.post(`${BASE_URL}/webhook/alarm/trigger`, {
    tenant_id: "tenant_watchmanager_prod_01",
    mobile: clientMobile,
    alarm_id: "alarm_incident_999",
    location: "Warehouse C - Main Gates",
    event_uuid: "event_uuid_202020",
    passwords: ["1234"]
  });

  // Check mock server logs for the template payload
  await new Promise(resolve => setTimeout(resolve, 800));
  const logsResp2 = await axios.get(`${MOCK_URL}/test_logs`);
  const logs2 = logsResp2.data;
  const templateMsg = logs2.find(l => l.type === 'whatsapp' && l.payload && l.payload.type === 'template');
  
  if (!templateMsg) {
    throw new Error('Test Step 11 Failed: No template fallback message found in mock logs.');
  }
  if (templateMsg.payload.template_name !== 'alarm_alert_template' || templateMsg.payload.parameters[0] !== 'Warehouse C - Main Gates') {
    throw new Error(`Test Step 11 Failed: Template content mismatch. Got: ${JSON.stringify(templateMsg.payload)}`);
  }
  console.log('  [PASS] Successfully intercepted freeform message and sent template fallback instead:');
  console.log('  Template Name:', templateMsg.payload.template_name);
  console.log('  Parameters:', JSON.stringify(templateMsg.payload.parameters));

  console.log('\n[Test] 12. Verifying delivery status notification logging...');
  await axios.post(`${BASE_URL}/platform_watchmanager_test_uuid/whatsapp/notifications`, {
    orgId: "org_watchmanager_test",
    messageId: "msg_inbound_reprompt",
    status: "read",
    mobile: clientMobile
  }, { headers });

  await new Promise(resolve => setTimeout(resolve, 300));

  const notifications = await mongoose.model('audit_webhook_stream').find({
    tenant_id: "tenant_watchmanager_prod_01",
    direction: "notification_status"
  });
  if (notifications.length === 0) {
    throw new Error('Test Step 12 Failed: Notification receipt not logged in audit_webhook_stream');
  }
  console.log('  [PASS] Delivery status update logged in audit stream:', JSON.stringify(notifications[0].payload));

  console.log('\n[Test] 13. Verifying Main Menu routing gateway...');
  // 1. Create/Update Menu Configuration via Admin CRUD Route
  await axios.post(`${BASE_URL}/admin/menu`, {
    enabled: true,
    menu_title: "Help Desk",
    menu_description: "Please select:",
    items: [
      { index: 1, label: "Log service request", target_journey_id: "journey_watchmanager_v2", is_hidden: false }
    ]
  }, { headers });

  // 2. Clear existing session
  await mongoose.model('runtime_whatsapp_sessions').deleteMany({ tenant_id: "tenant_watchmanager_prod_01", mobile: clientMobile });

  // 3. Send generic message to webhook ingress to trigger main menu
  await axios.post(`${BASE_URL}/platform_watchmanager_test_uuid/whatsapp/messages`, {
    orgId: "org_watchmanager_test",
    messageId: "msg_menu_hello",
    message: { text: "hello" },
    mobile: clientMobile
  }, { headers });

  await new Promise(resolve => setTimeout(resolve, 300));

  // Assert session is created and is_at_main_menu is true
  const sessionAfterHello = await mongoose.model('runtime_whatsapp_sessions').findOne({
    tenant_id: "tenant_watchmanager_prod_01",
    mobile: clientMobile
  });

  if (!sessionAfterHello || !sessionAfterHello.is_at_main_menu) {
    throw new Error('Test Step 13 Failed: Session not created in Main Menu state.');
  }
  console.log('  [PASS] Session correctly created in Main Menu state.');

  // 4. Send option reply "1" to transition to journey_watchmanager_v2
  await axios.post(`${BASE_URL}/platform_watchmanager_test_uuid/whatsapp/messages`, {
    orgId: "org_watchmanager_test",
    messageId: "msg_menu_select_1",
    message: { text: "1" },
    mobile: clientMobile
  }, { headers });

  await new Promise(resolve => setTimeout(resolve, 300));

  // Assert session transitioned to journey_watchmanager_v2 and is_at_main_menu is false
  const sessionAfterSelect = await mongoose.model('runtime_whatsapp_sessions').findOne({
    tenant_id: "tenant_watchmanager_prod_01",
    mobile: clientMobile
  });

  if (!sessionAfterSelect) {
    throw new Error('Test Step 13 Failed: Session lost after menu selection.');
  }
  if (sessionAfterSelect.is_at_main_menu) {
    throw new Error('Test Step 13 Failed: Session still at Main Menu after selection.');
  }
  if (sessionAfterSelect.active_journey_id !== 'journey_watchmanager_v2') {
    throw new Error(`Test Step 13 Failed: Transition destination mismatch. Got: ${sessionAfterSelect.active_journey_id}`);
  }
  console.log('  [PASS] Session transitioned to subflow journey_watchmanager_v2 successfully.');

  console.log('\n🎉 ALL STATE MACHINE & PREEMPTION FLOW INTEGRATION TESTS PASSED VERIFICATION 🎉\n');
}

// Boot up Mongoose connection and run setups
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/WatchManager')
  .then(async () => {
    try {
      await setupTestData();
      await runTests();
      process.exit(0);
    } catch (err) {
      console.error('\n❌ TEST RUN FAILED:', err.message);
      console.error(err.stack);
      process.exit(1);
    }
  });
