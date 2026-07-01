const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { acquireLock } = require('../middleware/concurrency');
const { triggerAlarmPreemption } = require('../interpreter/preemptionManager');
const { runInterpreterLoop, sendNodeWhatsAppPrompt, sendMainMenuPrompt } = require('../interpreter/interpreter');

/**
 * Helper to process inbound WhatsApp messages after tenant validation
 */
async function executeInboundMessage(credentials, payload, messageId, mobile) {
  const tenant_id = credentials.tenant_id;
  const lockKey = `${credentials.org_id}_${mobile}`;

  acquireLock(lockKey, async () => {
    // 1. Log Inbound Webhook Stream
    await mongoose.model('audit_webhook_stream').create({
      tenant_id,
      direction: 'inbound',
      payload
    });

    // 2. Resolve / Create Session Record
    let session = await mongoose.model('runtime_whatsapp_sessions').findOne({ tenant_id, mobile });

    const userMessageText = (payload.messages && payload.messages[0] && payload.messages[0].text ? payload.messages[0].text : (payload.message && payload.message.text || '')).trim().toLowerCase();

    if (!session) {
      console.log(`[Webhook Session] No session found. Resolving journey for trigger: "${userMessageText}"`);
      // Find journey matching ingress trigger keyword exactly or via a webhook trigger node
      let targetJourney = await mongoose.model('builder_journeys').findOne({
        tenant_id,
        is_active: true,
        $or: [
          { ingress_trigger_keyword: userMessageText },
          { nodes: { $elemMatch: { type: 'trigger_webhook', 'config.keyword': userMessageText } } }
        ]
      });

      // Helper to resolve start node from a trigger node
      const resolveStartNode = (journey, triggerNode) => {
        if (!triggerNode) return journey.nodes[0].id;
        const outEdge = journey.edges.find(e => e.source === triggerNode.id);
        return outEdge ? outEdge.target : triggerNode.id;
      };

      if (targetJourney) {
        console.log(`[Webhook Session] Resolved journey by trigger keyword: ${targetJourney.journey_id}`);
        const minutes = targetJourney.session_timeout_minutes || 1440;
        const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

        const triggerNode = targetJourney.nodes.find(n => n.type === 'trigger_webhook' && n.config.keyword === userMessageText);
        const startNodeId = resolveStartNode(targetJourney, triggerNode);

        session = await mongoose.model('runtime_whatsapp_sessions').create({
          tenant_id,
          mobile,
          active_journey_id: targetJourney.journey_id,
          current_node_id: startNodeId,
          priority: targetJourney.priority || 1,
          processed_message_ids: [],
          last_user_message_at: new Date(),
          expires_at: expiresAt
        });
        console.log(`[Webhook Session] Created session, current_node_id: ${session.current_node_id}`);
        
        const firstNode = targetJourney.nodes.find(n => n.id === session.current_node_id);
        if (firstNode) {
          await sendNodeWhatsAppPrompt(credentials, mobile, firstNode, session);
        }
      } else {
        // Fallback to any active journey with a catch-all trigger or non-empty legacy ingress trigger
        const fallbackJourney = await mongoose.model('builder_journeys').findOne({
            tenant_id,
            is_active: true,
            $or: [
              { ingress_trigger_keyword: { $exists: true, $ne: "" } },
              { nodes: { $elemMatch: { type: 'trigger_webhook', 'config.catch_all': true } } }
            ]
          });

          if (!fallbackJourney) {
            console.warn(`[Webhook] No active ingress journey or Main Menu found for tenant: ${tenant_id}`);
            return;
          }

          console.log(`[Webhook Session] Fallback to default journey: ${fallbackJourney.journey_id}`);
          const minutes = fallbackJourney.session_timeout_minutes || 1440;
          const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

          const triggerNode = fallbackJourney.nodes.find(n => n.type === 'trigger_webhook' && n.config.catch_all === true);
          const startNodeId = resolveStartNode(fallbackJourney, triggerNode);

          session = await mongoose.model('runtime_whatsapp_sessions').create({
            tenant_id,
            mobile,
            active_journey_id: fallbackJourney.journey_id,
            current_node_id: startNodeId,
            priority: fallbackJourney.priority || 1,
            processed_message_ids: [],
            last_user_message_at: new Date(),
            expires_at: expiresAt
          });

          const firstNode = fallbackJourney.nodes.find(n => n.id === session.current_node_id);
          if (firstNode) {
            await sendNodeWhatsAppPrompt(credentials, mobile, firstNode, session);
          }
        }
      
      // Save message ID to idempotency list and persist session before exiting
      session.processed_message_ids.push(messageId);
      await session.save();
      return; 
    }

    // 3. Idempotency Check via 20-size circular buffer
    if (session.processed_message_ids.includes(messageId)) {
      console.log(`[Webhook] Duplicate message ID ${messageId} detected. Ignoring.`);
      return;
    }

    session.processed_message_ids.push(messageId);
    if (session.processed_message_ids.length > 20) {
      session.processed_message_ids.shift();
    }

    // Update session expiration & activity timestamps
    session.last_user_message_at = new Date();
    const activeJourney = await mongoose.model('builder_journeys').findOne({
      tenant_id,
      journey_id: session.active_journey_id,
      is_active: true
    });
    const minutes = activeJourney ? (activeJourney.session_timeout_minutes || 1440) : 1440;
    session.expires_at = new Date(Date.now() + minutes * 60 * 1000);

    // 4. Delegate to interpreter loop
    await runInterpreterLoop(session, payload, credentials);
  });
}

/**
 * 1. Inbound WhatsApp webhook from Channel360 (Static endpoint)
 */
router.post('/webhook/whatsapp', async (req, res) => {
  const payload = req.body;
  const orgId = req.headers['x-channel360-org-id'] || payload.orgId || (payload.app && payload.app._id);
  
  const messageId = payload.messageId || (payload.message && payload.message.id) || (payload.messages && payload.messages[0] && payload.messages[0]._id) || (payload.trigger === 'message:appUser' && payload.message && payload.message._id);
  const mobile = payload.mobile || (payload.message && payload.message.from) || (payload.client && payload.client.externalId) || (payload.client && payload.client.raw && payload.client.raw.from) || (payload.appUser && payload.appUser.externalId) || (payload.appUser && payload.appUser.raw && payload.appUser.raw.from);

  if (!orgId || !mobile || !messageId) {
    console.warn('[Webhook] Missing required variables orgId, mobile, or messageId. Webhook ignored.');
    return res.status(400).send({ error: 'Missing orgId, mobile, or messageId' }); 
  }

  try {
    // Resolve Tenant Credentials
    const credentials = await mongoose.model('sys_channel360_credentials').findOne({ org_id: orgId });
    if (!credentials) {
      console.warn(`[Webhook] No tenant configuration mapped for org_id: ${orgId}`);
      return res.status(404).send({ error: 'Config not found' });
    }

    // Validate active tenant status
    const tenant = await mongoose.model('sys_tenants').findOne({ tenant_id: credentials.tenant_id });
    if (!tenant || tenant.status !== 'active') {
      console.warn(`[Webhook] Inbound request blocked: Tenant ${credentials.tenant_id} is inactive.`);
      return res.status(403).send({ error: 'Tenant account is inactive or suspended' });
    }

    // Acknowledge receipt
    res.status(200).send({ status: 'received' });

    // Execute message loop
    await executeInboundMessage(credentials, payload, messageId, mobile);
  } catch (err) {
    console.error('[Webhook error]', err);
    if (!res.headersSent) {
      res.status(500).send({ error: err.message });
    }
  }
});

/**
 * 2. Inbound WhatsApp dynamic tenant messages webhook (/:orgId/whatsapp/messages)
 */
router.post('/:platformUuid/whatsapp/messages', async (req, res) => {
  const { platformUuid } = req.params;
  const payload = req.body;
  
  const messageId = payload.messageId || (payload.message && payload.message.id) || (payload.messages && payload.messages[0] && payload.messages[0]._id) || (payload.trigger === 'message:appUser' && payload.message && payload.message._id);
  const mobile = payload.mobile || (payload.message && payload.message.from) || (payload.client && payload.client.externalId) || (payload.client && payload.client.raw && payload.client.raw.from) || (payload.appUser && payload.appUser.externalId) || (payload.appUser && payload.appUser.raw && payload.appUser.raw.from);

  if (!platformUuid || !mobile || !messageId) {
    console.warn('[Webhook Dynamic] Missing required variables mobile, messageId or platformUuid. Webhook ignored.');
    return res.status(400).send({ error: 'Missing mobile or messageId' }); 
  }

  try {
    // Resolve Tenant by platform_uuid
    const tenant = await mongoose.model('sys_tenants').findOne({ platform_uuid: platformUuid });
    if (!tenant) {
      console.warn(`[Webhook Dynamic] No tenant configuration mapped for platform_uuid: ${platformUuid}`);
      return res.status(404).send({ error: 'Tenant not found' });
    }

    // Validate active tenant status
    if (tenant.status !== 'active') {
      console.warn(`[Webhook Dynamic] Inbound request blocked: Tenant ${tenant.tenant_id} is inactive.`);
      return res.status(403).send({ error: 'Tenant account is inactive or suspended' });
    }

    // Resolve Tenant Credentials using tenant_id
    const credentials = await mongoose.model('sys_channel360_credentials').findOne({ tenant_id: tenant.tenant_id });
    if (!credentials) {
      console.warn(`[Webhook Dynamic] Credentials not configured for tenant_id: ${tenant.tenant_id}`);
      return res.status(404).send({ error: 'Credentials not configured' });
    }

    // Acknowledge receipt
    res.status(200).send({ status: 'received' });

    // Execute message loop
    await executeInboundMessage(credentials, payload, messageId, mobile);
  } catch (err) {
    console.error('[Webhook Dynamic error]', err);
    if (!res.headersSent) {
      res.status(500).send({ error: err.message });
    }
  }
});

/**
 * 3. Inbound Delivery notifications / receipts from Channel360
 */
router.post('/webhook/whatsapp/notifications', async (req, res) => {
  const payload = req.body;
  const orgId = req.headers['x-channel360-org-id'] || payload.orgId;
  
  if (!orgId) {
    return res.status(400).send({ error: 'Missing orgId' });
  }

  try {
    const credentials = await mongoose.model('sys_channel360_credentials').findOne({ org_id: orgId });
    if (!credentials) {
      return res.status(404).send({ error: 'Config not found' });
    }

    // Validate active tenant status
    const tenant = await mongoose.model('sys_tenants').findOne({ tenant_id: credentials.tenant_id });
    if (!tenant || tenant.status !== 'active') {
      return res.status(403).send({ error: 'Tenant account is inactive or suspended' });
    }

    res.status(200).send({ status: 'notified' });

    // Audit delivery receipts
    await mongoose.model('audit_webhook_stream').create({
      tenant_id: credentials.tenant_id,
      direction: 'notification_status',
      payload
    });
  } catch (err) {
    console.error('[Webhook Notifications error]', err);
    if (!res.headersSent) {
      res.status(500).send({ error: err.message });
    }
  }
});

/**
 * Dynamic tenant notifications route (/:platformUuid/whatsapp/notifications)
 */
router.post('/:platformUuid/whatsapp/notifications', async (req, res) => {
  const { platformUuid } = req.params;
  const payload = req.body;
  
  if (!platformUuid) {
    return res.status(400).send({ error: 'Missing platformUuid' });
  }

  try {
    // Resolve Tenant by platform_uuid
    const tenant = await mongoose.model('sys_tenants').findOne({ platform_uuid: platformUuid });
    if (!tenant) {
      console.warn(`[Webhook Dynamic Notifications] No tenant found for platform_uuid: ${platformUuid}`);
      return res.status(404).send({ error: 'Tenant not found' });
    }

    // Validate active tenant status
    if (tenant.status !== 'active') {
      return res.status(403).send({ error: 'Tenant account is inactive or suspended' });
    }

    // Resolve credentials
    const credentials = await mongoose.model('sys_channel360_credentials').findOne({ tenant_id: tenant.tenant_id });
    if (!credentials) {
      return res.status(404).send({ error: 'Credentials not configured' });
    }

    res.status(200).send({ status: 'notified' });

    // Audit delivery receipts
    await mongoose.model('audit_webhook_stream').create({
      tenant_id: tenant.tenant_id,
      direction: 'notification_status',
      payload
    });
  } catch (err) {
    console.error('[Webhook Notifications error]', err);
    if (!res.headersSent) {
      res.status(500).send({ error: err.message });
    }
  }
});

/**
 * 4. Alarm Panic Trigger Ingress Route (called by external systems like n8n)
 */
router.post('/webhook/alarm/trigger', async (req, res) => {
  const { tenant_id, mobile, alarm_id, location, event_uuid, passwords, duress_codes } = req.body;

  if (!tenant_id || !mobile || !alarm_id) {
    return res.status(400).json({ error: 'Missing tenant_id, mobile, or alarm_id' });
  }

  try {
    // Validate active tenant status
    const tenant = await mongoose.model('sys_tenants').findOne({ tenant_id });
    if (!tenant || tenant.status !== 'active') {
      return res.status(403).send({ error: 'Tenant account is inactive or suspended' });
    }

    // Write dynamic trigger mapping
    await mongoose.model('runtime_alarm_triggers').create({
      tenant_id,
      message_id: 'msg_alarm_' + Date.now() + Math.random().toString(36).substring(7),
      event_uuid: event_uuid || new mongoose.Types.ObjectId().toString(),
      mobile,
      raw_payload: req.body,
      passwords: passwords || ['1234'],
      duress_codes: duress_codes || ['DUNDEE']
    });

    const preempted = await triggerAlarmPreemption(tenant_id, mobile, {
      alarm_id,
      location: location || 'Unknown Location',
      event_uuid: event_uuid || 'N/A'
    });

    if (preempted) {
      const credentials = await mongoose.model('sys_channel360_credentials').findOne({ tenant_id });
      const session = await mongoose.model('runtime_whatsapp_sessions').findOne({ tenant_id, mobile });
      const alarmJourney = await mongoose.model('builder_journeys').findOne({ tenant_id, journey_id: 'journey_alarm_notifications_v1' });
      if (credentials && session && alarmJourney) {
        const startNode = alarmJourney.nodes.find(n => n.id === 'node_alarm_buttons');
        if (startNode) {
          await sendNodeWhatsAppPrompt(credentials, mobile, startNode, session);
        }
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Alarm preemption processed',
      preempted
    });
  } catch (err) {
    console.error('[Webhook] Alarm Trigger Panics failed:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
