const mongoose = require('mongoose');

// ==========================================
// 1. SYSTEM & PLATFORM CONFIGURATION (sys_)
// ==========================================

const sysTenantsSchema = new mongoose.Schema({
  tenant_id: { type: String, unique: true, required: true },
  platform_uuid: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['active', 'suspended', 'trial'], default: 'active' },
  contact_email: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});
sysTenantsSchema.index({ tenant_id: 1 });
sysTenantsSchema.index({ platform_uuid: 1 });

const sysChannel360CredentialsSchema = new mongoose.Schema({
  tenant_id: { type: String, ref: 'sys_tenants', required: true, unique: true },
  org_id: { type: String, required: true },
  bearer_token: { type: String, required: true },
  channel_account_name: { type: String, required: true },
  watch_manager_base_url: { type: String, required: true },
  is_test_mode: { type: Boolean, default: true },
  allow_template_messages: { type: Boolean, default: true }, // Whether tenant is allowed to send templates
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});
sysChannel360CredentialsSchema.index({ tenant_id: 1 });
sysChannel360CredentialsSchema.index({ org_id: 1 });

const sysPlatformConfigsSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String },
  updated_at: { type: Date, default: Date.now }
});
sysPlatformConfigsSchema.index({ key: 1 });

// ==========================================
// 2. JOURNEY BUILDER & DESIGN (builder_)
// ==========================================

const builderJourneysSchema = new mongoose.Schema({
  tenant_id: { type: String, ref: 'sys_tenants', required: true },
  journey_id: { type: String, required: true },
  name: { type: String, required: true },
  version: { type: Number, default: 1 },
  is_active: { type: Boolean, default: true },
  priority: { type: Number, default: 1 }, // 10 for alarms, 1 for chats
  ingress_trigger_keyword: { type: String }, // e.g. "service" or "job"
  tag: { type: String, default: "" }, // Memorable user tag
  session_timeout_minutes: { type: Number, default: 1440 }, // defaults to 24 hours
  exit_keywords: { type: [String], default: ['exit', 'stop'] },
  menu_keywords: { type: [String], default: ['menu'] },
  back_keywords: { type: [String], default: ['back'] },
  nodes: { type: Array, required: true }, // Visual VueFlow nodes array
  edges: { type: Array, required: true }, // Visual VueFlow edges array
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});
builderJourneysSchema.index({ tenant_id: 1, journey_id: 1 }, { unique: true });
builderJourneysSchema.index({ tenant_id: 1, ingress_trigger_keyword: 1 });

const builderConversationalTemplatesSchema = new mongoose.Schema({
  tenant_id: { type: String, ref: 'sys_tenants', required: true },
  key: { type: String, required: true },
  message_text: { type: String, required: true },
  description: { type: String }
});
builderConversationalTemplatesSchema.index({ tenant_id: 1, key: 1 }, { unique: true });

const builderMenusSchema = new mongoose.Schema({
  tenant_id: { type: String, ref: 'sys_tenants', required: true, unique: true },
  enabled: { type: Boolean, default: false },
  menu_title: { type: String, default: "Main Menu" },
  menu_description: { type: String, default: "Please select an option from the list below:" },
  items: [{
    index: { type: Number, required: true },
    label: { type: String, required: true },
    target_journey_id: { type: String, required: true },
    is_hidden: { type: Boolean, default: false }
  }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// ==========================================
// 3. ACTIVE SESSION & RUNTIME (runtime_)
// ==========================================

const runtimeWhatsappSessionsSchema = new mongoose.Schema({
  tenant_id: { type: String, ref: 'sys_tenants', required: true },
  mobile: { type: String, required: true },
  active_journey_id: { type: String, required: true },
  current_node_id: { type: String, required: true },
  priority: { type: Number, default: 1 },
  collected_data: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  state_history: [{ type: String }],
  suspended_sessions: [{
    active_journey_id: { type: String, required: true },
    current_node_id: { type: String, required: true },
    priority: { type: Number, required: true },
    collected_data: { type: Map, of: mongoose.Schema.Types.Mixed },
    state_history: [{ type: String }],
    pushed_at: { type: Date, default: Date.now }
  }],
  processed_message_ids: [{ type: String }],
  whatsapp_number: { type: String },
  whatsapp_name: { type: String },
  last_user_message_at: { type: Date, default: Date.now },
  is_at_main_menu: { type: Boolean, default: false },
  expires_at: { type: Date, required: true }
});
runtimeWhatsappSessionsSchema.index({ tenant_id: 1, mobile: 1 }, { unique: true });
runtimeWhatsappSessionsSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const runtimeAlarmTriggersSchema = new mongoose.Schema({
  tenant_id: { type: String, ref: 'sys_tenants', required: true },
  message_id: { type: String, required: true, unique: true },
  event_uuid: { type: String, required: true },
  mobile: { type: String, required: true },
  raw_payload: { type: mongoose.Schema.Types.Mixed },
  passwords: [{ type: String }],
  duress_codes: [{ type: String }],
  created_at: { type: Date, default: Date.now, expires: 86400 } // 24-hour TTL purge
});
runtimeAlarmTriggersSchema.index({ tenant_id: 1, mobile: 1 });

// ==========================================
// 4. AUDIT TRAILS & LOGS (audit_)
// ==========================================

const auditWebhookStreamSchema = new mongoose.Schema({
  tenant_id: { type: String, ref: 'sys_tenants' },
  direction: { type: String, enum: ['inbound', 'outbound_receipt', 'notification_status'], required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  created_at: { type: Date, default: Date.now, expires: 2592000 } // 30 days
});
auditWebhookStreamSchema.index({ created_at: -1 });

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

const auditSystemExceptionsSchema = new mongoose.Schema({
  tenant_id: { type: String, ref: 'sys_tenants' },
  exception_type: { type: String, required: true },
  message: { type: String, required: true },
  stack_trace: { type: String },
  request_context: { type: mongoose.Schema.Types.Mixed },
  created_at: { type: Date, default: Date.now, expires: 2592000 }
});
auditSystemExceptionsSchema.index({ created_at: -1 });

const sysUsersSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password_hash: { type: String, required: true },
  password_plain: { type: String }, // Clear text password for testing context
  email: { type: String, required: true },
  role: { type: String, enum: ['admin', 'operator'], default: 'admin' },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  created_at: { type: Date, default: Date.now }
});
sysUsersSchema.index({ username: 1 });

// Initialize Mongoose Models
const SysTenants = mongoose.model('sys_tenants', sysTenantsSchema);
const SysChannel360Credentials = mongoose.model('sys_channel360_credentials', sysChannel360CredentialsSchema);
const SysPlatformConfigs = mongoose.model('sys_platform_configs', sysPlatformConfigsSchema);
const SysUsers = mongoose.model('sys_users', sysUsersSchema);
const BuilderJourneys = mongoose.model('builder_journeys', builderJourneysSchema);
const BuilderConversationalTemplates = mongoose.model('builder_conversational_templates', builderConversationalTemplatesSchema);
const BuilderMenus = mongoose.model('builder_menus', builderMenusSchema);
const RuntimeWhatsappSessions = mongoose.model('runtime_whatsapp_sessions', runtimeWhatsappSessionsSchema);
const RuntimeAlarmTriggers = mongoose.model('runtime_alarm_triggers', runtimeAlarmTriggersSchema);
const AuditWebhookStream = mongoose.model('audit_webhook_stream', auditWebhookStreamSchema);
const AuditApiOutboundLogs = mongoose.model('audit_api_outbound_logs', auditApiOutboundLogsSchema);
const AuditSystemExceptions = mongoose.model('audit_system_exceptions', auditSystemExceptionsSchema);

module.exports = {
  SysTenants,
  SysChannel360Credentials,
  SysPlatformConfigs,
  SysUsers,
  BuilderJourneys,
  BuilderConversationalTemplates,
  BuilderMenus,
  RuntimeWhatsappSessions,
  RuntimeAlarmTriggers,
  AuditWebhookStream,
  AuditApiOutboundLogs,
  AuditSystemExceptions
};
