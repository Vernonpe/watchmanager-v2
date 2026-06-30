const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Helper to authenticate/resolve tenant (for simplification, we read tenant_id from headers)
const resolveTenant = (req, res, next) => {
  req.tenant_id = req.headers['x-tenant-id'] || 'tenant_watchmanager_prod_01';
  next();
};

router.use(resolveTenant);

/**
 * Journeys CRUD
 */
router.get('/journeys', async (req, res) => {
  try {
    const list = await mongoose.model('builder_journeys').find({ tenant_id: req.tenant_id });
    res.status(200).json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/journeys/:journey_id', async (req, res) => {
  try {
    const journey = await mongoose.model('builder_journeys').findOne({ 
      tenant_id: req.tenant_id, 
      journey_id: req.params.journey_id 
    });
    if (!journey) return res.status(404).json({ error: 'Journey not found' });
    res.status(200).json(journey);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/journeys', async (req, res) => {
  const { journey_id, name, version, priority, ingress_trigger_keyword, tag, session_timeout_minutes, exit_keywords, nodes, edges, is_active } = req.body;
  try {
    const journey = await mongoose.model('builder_journeys').findOneAndUpdate(
      { tenant_id: req.tenant_id, journey_id },
      { 
        name, 
        version: version || 1, 
        priority: priority || 1,
        ingress_trigger_keyword, 
        tag,
        session_timeout_minutes,
        exit_keywords,
        nodes, 
        edges, 
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date()
      },
      { upsert: true, new: true }
    );
    res.status(200).json(journey);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Main Menu CRUD
 */
router.get('/menu', async (req, res) => {
  try {
    let menu = await mongoose.model('builder_menus').findOne({ tenant_id: req.tenant_id });
    if (!menu) {
      menu = {
        tenant_id: req.tenant_id,
        enabled: false,
        menu_title: "Main Menu",
        menu_description: "Please select an option from the list below:",
        items: []
      };
    }
    res.status(200).json(menu);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/menu', async (req, res) => {
  const { enabled, menu_title, menu_description, items } = req.body;
  try {
    const menu = await mongoose.model('builder_menus').findOneAndUpdate(
      { tenant_id: req.tenant_id },
      { 
        enabled: enabled !== undefined ? enabled : false,
        menu_title: menu_title || "Main Menu",
        menu_description: menu_description || "Please select an option from the list below:",
        items: items || [],
        updated_at: new Date()
      },
      { upsert: true, new: true }
    );
    res.status(200).json(menu);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Tenants CRUD
 */
router.get('/tenants', async (req, res) => {
  try {
    const tenants = await mongoose.model('sys_tenants').find({});
    res.status(200).json(tenants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tenants', async (req, res) => {
  const { tenant_id, name, status, contact_email } = req.body;
  const crypto = require('crypto');
  try {
    const existing = await mongoose.model('sys_tenants').findOne({ tenant_id });
    const isNew = !existing;
    let platformUuid;

    if (existing) {
      platformUuid = existing.platform_uuid || crypto.randomUUID();
    } else {
      platformUuid = crypto.randomUUID();
    }

    const tenant = await mongoose.model('sys_tenants').findOneAndUpdate(
      { tenant_id },
      { name, status, contact_email, platform_uuid: platformUuid },
      { upsert: true, new: true }
    );

    if (isNew) {
      await mongoose.model('sys_channel360_credentials').create({
        tenant_id,
        org_id: 'pending_c360_org_id',
        bearer_token: 'pending',
        channel_account_name: `${name} Gateway`,
        watch_manager_base_url: 'http://localhost:3002/mock_watchmanager',
        is_test_mode: true
      });
      console.log(`[Admin] Registered credentials with auto-generated Platform UUID: ${platformUuid} for tenant ${tenant_id}`);
    }

    res.status(200).json(tenant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tenants/:tenant_id', async (req, res) => {
  const { tenant_id } = req.params;
  try {
    await mongoose.model('sys_tenants').deleteOne({ tenant_id });
    await mongoose.model('sys_channel360_credentials').deleteOne({ tenant_id });
    await mongoose.model('builder_journeys').deleteMany({ tenant_id });
    await mongoose.model('runtime_whatsapp_sessions').deleteMany({ tenant_id });
    console.log(`[Admin] Deleted tenant ${tenant_id} and clean swept all related tables.`);
    res.status(200).json({ success: true, message: `Tenant ${tenant_id} deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Credentials setup
 */
router.get('/credentials', async (req, res) => {
  try {
    const creds = await mongoose.model('sys_channel360_credentials').findOne({ tenant_id: req.tenant_id });
    res.status(200).json(creds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/credentials', async (req, res) => {
  const { org_id, bearer_token, channel_account_name, watch_manager_base_url, is_test_mode, allow_template_messages } = req.body;
  try {
    const creds = await mongoose.model('sys_channel360_credentials').findOneAndUpdate(
      { tenant_id: req.tenant_id },
      { 
        org_id, 
        bearer_token, 
        channel_account_name, 
        watch_manager_base_url, 
        is_test_mode: is_test_mode !== undefined ? is_test_mode : true,
        allow_template_messages: allow_template_messages !== undefined ? allow_template_messages : true,
        updated_at: new Date()
      },
      { upsert: true, new: true }
    );
    res.status(200).json(creds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Live Feed diagnostics portal (Audit logs endpoint)
 */
router.get('/live_feed', async (req, res) => {
  try {
    const logs = await mongoose.model('audit_webhook_stream')
      .find({ tenant_id: req.tenant_id })
      .sort({ created_at: -1 })
      .limit(50)
      .lean();
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Database Sync API Comparator UI endpoint
 */
router.get('/sync_compare', async (req, res) => {
  try {
    // 1. Fetch cached mechanics locally
    const localCaches = await mongoose.model('cache_reward_mechanics').find({ tenant_id: req.tenant_id }).lean();
    
    // 2. Fetch live database or external API values (we emulate this by querying the Mock WatchManager server if active)
    let liveValues = [];
    try {
      const isTestCreds = await mongoose.model('sys_channel360_credentials').findOne({ tenant_id: req.tenant_id });
      if (isTestCreds && isTestCreds.is_test_mode) {
        // Mock server query
        const mockUrl = `${process.env.MOCK_SERVER_URL}/test_logs`;
        const axios = require('axios');
        const resp = await axios.get(mockUrl, { timeout: 3000 });
        liveValues = resp.data;
      }
    } catch (mockErr) {
      console.warn('[SyncCompare] Mock server call failed, using empty live array');
    }

    res.status(200).json({
      local: localCaches,
      live: liveValues,
      sync_status: localCaches.length === liveValues.length ? 'synchronized' : 'mismatch'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Platform dashboard statistics aggregator
 */
router.get('/dashboard_stats', async (req, res) => {
  const tenant_id = req.tenant_id;
  try {
    const totalTenants = await mongoose.model('sys_tenants').countDocuments({});
    const activeTenants = await mongoose.model('sys_tenants').countDocuments({ status: 'active' });
    
    const totalJourneys = await mongoose.model('builder_journeys').countDocuments({ tenant_id });
    const activeSessions = await mongoose.model('runtime_whatsapp_sessions').countDocuments({ tenant_id });
    
    const inboundMessagesCount = await mongoose.model('audit_webhook_stream').countDocuments({ tenant_id, direction: 'inbound' });
    const deliveryReceiptsCount = await mongoose.model('audit_webhook_stream').countDocuments({ tenant_id, direction: 'outbound_receipt' });
    const outboundMessagesCount = await mongoose.model('audit_api_outbound_logs').countDocuments({ tenant_id });
    const systemExceptionsCount = await mongoose.model('audit_system_exceptions').countDocuments({ tenant_id });

    // Fetch last 5 activities
    const recentWebhooks = await mongoose.model('audit_webhook_stream')
      .find({ tenant_id })
      .sort({ created_at: -1 })
      .limit(5)
      .lean();

    const recentActivities = recentWebhooks.map(w => ({
      id: w._id,
      timestamp: w.created_at,
      type: w.direction === 'inbound' ? 'Inbound Msg' : 'Delivery Rcpt',
      message: w.direction === 'inbound' 
        ? `From ${w.payload.mobile || 'User'}: "${w.payload.message && w.payload.message.text || 'N/A'}"`
        : `Confirmed delivery receipt payload`
    }));

    res.status(200).json({
      tenants: {
        total: totalTenants,
        active: activeTenants
      },
      journeys: {
        total: totalJourneys
      },
      sessions: {
        active: activeSessions
      },
      traffic: {
        inbound: inboundMessagesCount,
        outbound: outboundMessagesCount,
        receipts: deliveryReceiptsCount,
        exceptions: systemExceptionsCount
      },
      activities: recentActivities,
      status: {
        database: 'Connected',
        gateway: 'Active',
        mock_server: 'Online'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Active Sessions list
 */
router.get('/sessions', async (req, res) => {
  try {
    const list = await mongoose.model('runtime_whatsapp_sessions').find({ tenant_id: req.tenant_id }).lean();
    res.status(200).json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Unified search & inspection logs database query
 */
router.get('/logs', async (req, res) => {
  const { type, search } = req.query;
  const tenant_id = req.tenant_id;
  try {
    let results = [];

    // 1. Fetch Inbound/Receipt webhooks
    if (!type || type === 'all' || type === 'inbound' || type === 'receipt') {
      let query = { tenant_id };
      if (type === 'inbound') query.direction = 'inbound';
      if (type === 'receipt') query.direction = 'outbound_receipt';
      
      const webhooks = await mongoose.model('audit_webhook_stream')
        .find(query)
        .sort({ created_at: -1 })
        .limit(100)
        .lean();
        
      results = results.concat(webhooks.map(w => ({
        id: w._id,
        timestamp: w.created_at,
        type: w.direction === 'inbound' ? 'Inbound WhatsApp' : 'Delivery Receipt',
        category: w.direction === 'inbound' ? 'inbound' : 'receipt',
        summary: w.direction === 'inbound' 
          ? `From: ${w.payload.mobile || (w.payload.message && w.payload.message.from) || 'Unknown'} - Text: "${w.payload.message && w.payload.message.text || 'N/A'}"`
          : `Delivery confirmation callback`,
        details: w.payload
      })));
    }

    // 2. Fetch API Outbound logs
    if (!type || type === 'all' || type === 'outbound') {
      const outbounds = await mongoose.model('audit_api_outbound_logs')
        .find({ tenant_id })
        .sort({ created_at: -1 })
        .limit(100)
        .lean();

      results = results.concat(outbounds.map(o => ({
        id: o._id,
        timestamp: o.created_at,
        type: 'Outbound API Call',
        category: 'outbound',
        summary: `${o.journey_id || 'Global'} (${o.node_id || 'N/A'}) ➔ ${o.endpoint_url} [HTTP ${o.response_code}]`,
        details: {
          endpoint_url: o.endpoint_url,
          response_code: o.response_code,
          duration_ms: o.duration_ms,
          request_payload: o.request_payload,
          response_body: o.response_body
        }
      })));
    }

    // 3. Fetch exceptions
    if (!type || type === 'all' || type === 'exception') {
      const exceptions = await mongoose.model('audit_system_exceptions')
        .find({ tenant_id })
        .sort({ created_at: -1 })
        .limit(100)
        .lean();

      results = results.concat(exceptions.map(e => ({
        id: e._id,
        timestamp: e.created_at,
        type: `Error: ${e.exception_type}`,
        category: 'exception',
        summary: e.message,
        details: {
          exception_type: e.exception_type,
          message: e.message,
          stack_trace: e.stack_trace,
          request_context: e.request_context
        }
      })));
    }

    // Sort combined results by timestamp descending
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Simple keyword filtering if search is provided
    if (search) {
      const lower = search.toLowerCase();
      results = results.filter(r => 
        r.type.toLowerCase().includes(lower) || 
        r.summary.toLowerCase().includes(lower) || 
        JSON.stringify(r.details).toLowerCase().includes(lower)
      );
    }

    res.status(200).json(results.slice(0, 100));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * User Account Administration Console REST API
 */
router.get('/users', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Permission denied. Administrators only.' });
  }
  try {
    const users = await mongoose.model('sys_users').find({}, { password_hash: 0 });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Permission denied. Administrators only.' });
  }
  const { username, password, email, role } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ error: 'Username, password, and email are required.' });
  }
  const bcrypt = require('bcryptjs');
  try {
    const existing = await mongoose.model('sys_users').findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Username already exists.' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const newUser = await mongoose.model('sys_users').create({
      username,
      password_hash,
      password_plain: password,
      email,
      role: role || 'admin',
      status: 'active'
    });
    
    const userObj = newUser.toObject();
    delete userObj.password_hash;
    res.status(201).json(userObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/:username/status', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Permission denied. Administrators only.' });
  }
  const { username } = req.params;
  const { status } = req.body;
  
  if (req.user.username === username && status === 'disabled') {
    return res.status(400).json({ error: 'Cannot disable your own administrative account.' });
  }

  try {
    const user = await mongoose.model('sys_users').findOneAndUpdate(
      { username },
      { status },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.status(200).json({ username: user.username, status: user.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
