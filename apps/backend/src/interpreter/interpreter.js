const mongoose = require('mongoose');
const axios = require('axios');
const { checkAndRestoreSession } = require('./preemptionManager');

/**
 * Main state machine graph interpreter loop
 */
async function runInterpreterLoop(session, webhookPayload, credentials) {
  const userMessageText = (webhookPayload.messages && webhookPayload.messages[0] && webhookPayload.messages[0].text ? webhookPayload.messages[0].text : (webhookPayload.message && webhookPayload.message.text || '')).trim();
  const selectedChoiceId = webhookPayload.messages && webhookPayload.messages[0] && webhookPayload.messages[0].payload ? webhookPayload.messages[0].payload : (webhookPayload.message && webhookPayload.message.payload); // From quick-replies / lists

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
  const exitKeywords = (journey.exit_keywords || ['exit', 'stop']).map(k => k.toLowerCase().trim());
  const menuKeywords = (journey.menu_keywords || ['menu']).map(k => k.toLowerCase().trim());
  const backKeywords = (journey.back_keywords || ['back']).map(k => k.toLowerCase().trim());

  const normalizedInput = userMessageText.toLowerCase().trim();

  if (exitKeywords.includes(normalizedInput)) {
    // Reset session back to start of the current journey
    let startNodeId = journey.nodes[0].id;
    const triggerNode = journey.nodes.find(n => n.type === 'trigger_webhook');
    if (triggerNode) {
      const outEdge = journey.edges.find(e => e.source === triggerNode.id);
      if (outEdge) startNodeId = outEdge.target;
    }

    session.current_node_id = startNodeId;
    session.collected_data.clear();
    session.state_history = [];
    await session.save();
    await sendWhatsAppMessage(credentials, session.mobile, { text: "Conversation reset. Starting over." }, session.app_user_id);
    
    // Trigger prompt for the first node
    const firstNode = journey.nodes.find(n => n.id === session.current_node_id);
    if (firstNode) {
      await sendNodeWhatsAppPrompt(credentials, session.mobile, firstNode, session);
    }
    return;
  }

  // menu keyword
  if (menuKeywords.includes(normalizedInput)) {
    const menuObj = await mongoose.model('builder_menus').findOne({ tenant_id: session.tenant_id, enabled: true });
    if (menuObj) {
      session.is_at_main_menu = true;
      session.active_journey_id = 'journey_main_menu';
      session.current_node_id = 'node_main_menu';
      session.collected_data.clear();
      session.state_history = [];
      await session.save();
      await sendMainMenuPrompt(credentials, session.mobile, menuObj, session);
      return;
    }

    // Redirect user to the root main menu node
    const mainMenuNode = journey.nodes.find(n => n.id === 'node_main_menu' || n.id === 'node_fault_menu');
    if (mainMenuNode) {
      session.current_node_id = mainMenuNode.id;
      session.state_history.push(currentNode.id);
      await session.save();
      await sendNodeWhatsAppPrompt(credentials, session.mobile, mainMenuNode, session);
    } else {
      await sendWhatsAppMessage(credentials, session.mobile, { text: "Menu command entered, but no menu node is registered." }, session.app_user_id);
    }
    return;
  }

  // back keyword
  if (backKeywords.includes(normalizedInput) && session.state_history.length > 0) {
    const rolledBackNodeId = session.state_history.pop();
    session.current_node_id = rolledBackNodeId;
    
    // Clean up the variable collected at that node if possible
    const prevNode = journey.nodes.find(n => n.id === rolledBackNodeId);
    if (prevNode && prevNode.config && prevNode.config.input_variable) {
      session.collected_data.delete(prevNode.config.input_variable);
    }
    
    await session.save();
    // Recursively call interpreter on the restored state with empty message to trigger prompt
    return runInterpreterLoop(session, { ...webhookPayload, message: { text: '' } }, credentials);
  }

  // help keyword
  if (userMessageText.toLowerCase() === 'help') {
    const helpTemplate = await mongoose.model('builder_conversational_templates').findOne({
      tenant_id: session.tenant_id,
      key: 'help_guidelines'
    });
    
    const helpText = helpTemplate ? helpTemplate.message_text : "To navigate this conversation, type 'back' to go to the previous question, 'menu' to return to the main menu, or 'exit' to clear all progress.";
    await sendWhatsAppMessage(credentials, session.mobile, { text: helpText }, session.app_user_id);
    
    // Re-prompt the active node
    await sendNodeWhatsAppPrompt(credentials, session.mobile, currentNode, session);
    return;
  }

  let nextNodeId = null;
  let exitHandle = 'success';

  // 4. Execute Node Logics
  if (currentNode.type === 'prompt_text' && currentNode.config.await_response) {
    if (userMessageText === '') {
      // Empty input (e.g. from a state recovery or trigger), just prompt the node
      await sendNodeWhatsAppPrompt(credentials, session.mobile, currentNode, session);
      return;
    }

    // Validate user input format using regex mapping
    const regex = new RegExp(currentNode.config.validation_regex || '.*');
    if (!regex.test(userMessageText)) {
      const errorMsg = currentNode.config.validation_error_message || "Invalid input. Please try again:";
      await sendWhatsAppMessage(credentials, session.mobile, { text: errorMsg }, session.app_user_id);
      return; // Halt and wait for correct input
    }

    // Save validated response parameter
    session.collected_data.set(currentNode.config.input_variable, userMessageText);
    session.state_history.push(currentNode.id);
  } 
  
  else if (currentNode.type === 'prompt_buttons' || currentNode.type === 'prompt_list') {
    let resolvedChoice = selectedChoiceId;
    
    // Check if they typed a hidden keyword manually
    if (!resolvedChoice && userMessageText) {
      const hiddenKws = (currentNode.config.hidden_keywords || '').split(',').map(s => s.trim()).filter(Boolean);
      const typed = userMessageText.toLowerCase();
      // Case insensitive match against defined keywords
      const matchedKw = hiddenKws.find(kw => kw.toLowerCase() === typed);
      if (matchedKw) {
        resolvedChoice = matchedKw;
      }
    }

    if (!resolvedChoice) {
      // No reply payload or matching keyword found (either invalid text or fresh prompt)
      await sendNodeWhatsAppPrompt(credentials, session.mobile, currentNode, session);
      return;
    }
    
    session.collected_data.set(currentNode.config.input_variable, resolvedChoice);
    session.state_history.push(currentNode.id);
    exitHandle = resolvedChoice; // Route along the edge matching the button/list selection ID or matched keyword
  }

  else if (currentNode.type === 'action_http') {
    const renderedUrl = interpolateTemplate(currentNode.config.url, session);
    const renderedBody = interpolateTemplate(currentNode.config.body_template, session);
    
    const startTime = Date.now();
    let responseStatus = 200;
    let responseBody = {};

    try {
      const headersStr = interpolateTemplate(JSON.stringify(currentNode.config.headers || {}), session);
      const requestHeaders = JSON.parse(headersStr);

      const response = await axios({
        method: currentNode.config.method || 'POST',
        url: renderedUrl,
        headers: {
          'Content-Type': 'application/json',
          ...requestHeaders
        },
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
      // Record API diagnostic log
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

  else if (currentNode.type === 'action_db') {
    // Allows updating/syncing Mongoose values locally
    try {
      const targetCollection = currentNode.config.collection;
      const operation = currentNode.config.operation; // 'create', 'update', 'find'
      const query = interpolateTemplate(currentNode.config.query || {}, session);
      const data = interpolateTemplate(currentNode.config.data || {}, session);

      const model = mongoose.model(targetCollection);
      if (operation === 'create') {
        await model.create(data);
      } else if (operation === 'update') {
        await model.updateOne(query, data, { upsert: true });
      } else if (operation === 'find') {
        const doc = await model.findOne(query).lean();
        if (doc) {
          session.collected_data.set('db_response', doc);
        }
      }
    } catch (err) {
      console.error('[Interpreter] action_db Node Execution error:', err);
      exitHandle = 'failure';
    }
  }

  else if (currentNode.type === 'condition_split') {
    // Condition splitting based on variables
    const checkVar = interpolateTemplate(`{{${currentNode.config.variable}}}`, session);
    const operator = currentNode.config.operator; // 'equals', 'contains', 'matches'
    const compareValue = currentNode.config.value;

    let isMatch = false;
    if (operator === 'equals') {
      isMatch = String(checkVar) === String(compareValue);
    } else if (operator === 'contains') {
      isMatch = String(checkVar).includes(compareValue);
    } else if (operator === 'matches') {
      const matchRegex = new RegExp(compareValue, 'i');
      isMatch = matchRegex.test(String(checkVar));
    }

    exitHandle = isMatch ? 'true' : 'false';
  }

  else if (currentNode.type === 'action_jump') {
    const targetJourneyId = currentNode.config.target_journey_id;
    if (targetJourneyId) {
      const targetJourney = await mongoose.model('builder_journeys').findOne({
        tenant_id: session.tenant_id,
        journey_id: targetJourneyId,
        is_active: true
      });

      if (targetJourney && targetJourney.nodes && targetJourney.nodes.length > 0) {
        console.log(`[Interpreter Jump] Transitioning user ${session.mobile} to journey: ${targetJourney.journey_id}`);
        session.active_journey_id = targetJourney.journey_id;
        session.current_node_id = targetJourney.nodes[0].id; // Reset to start of new journey
        session.state_history = []; // Clear history for the new journey scope
        await session.save();
        
        // Immediately invoke interpreter recursively to process the first node of the new journey
        return runInterpreterLoop(session, webhookPayload, credentials);
      } else {
        console.error(`[Interpreter] Jump target journey ${targetJourneyId} not found or disabled.`);
        exitHandle = 'failure';
      }
    } else {
      exitHandle = 'failure';
    }
  }

  // 5. Traverse Matching Output Edge
  const activeEdge = journey.edges.find(e => e.source === currentNode.id && (e.sourceHandle === exitHandle || e.source_handle === exitHandle));
  if (activeEdge) {
    nextNodeId = activeEdge.target;
  } else {
    // Use fallback default edge if specific handle matching failed
    const fallbackEdge = journey.edges.find(e => e.source === currentNode.id && (e.sourceHandle === 'success' || e.source_handle === 'success'));
    if (fallbackEdge) nextNodeId = fallbackEdge.target;
  }

  if (nextNodeId) {
    session.current_node_id = nextNodeId;
    await session.save();

    // Check if next node is a non-blocking background task (like an API call), allowing recursive processing
    const nextNode = journey.nodes.find(n => n.id === nextNodeId);
    if (nextNode && (
      nextNode.type === 'action_http' || 
      nextNode.type === 'action_db' ||
      nextNode.type === 'condition_split' ||
      (nextNode.type === 'prompt_text' && !nextNode.config.await_response)
    )) {
      return runInterpreterLoop(session, webhookPayload, credentials);
    } else if (nextNode) {
      // Send the WhatsApp template prompt linked to the newly entered node and exit
      await sendNodeWhatsAppPrompt(credentials, session.mobile, nextNode, session);
    }
  } else {
    // Journey has completed. Attempt Preemption restoration
    const hasRestored = await checkAndRestoreSession(session);
    if (hasRestored) {
      // Load the journey again as it might have changed
      const restoredJourney = await mongoose.model('builder_journeys').findOne({
        tenant_id: session.tenant_id,
        journey_id: session.active_journey_id,
        is_active: true
      });
      const restoredNode = restoredJourney.nodes.find(n => n.id === session.current_node_id);
      await sendWhatsAppMessage(credentials, session.mobile, { text: "⚠️ Safe status confirmed. Let's resume your previous technical fault report:" }, session.app_user_id);
      await sendNodeWhatsAppPrompt(credentials, session.mobile, restoredNode, session);
    } else {
      // Absolute clean finish - archive session record
      const sessionObj = session.toObject();
      sessionObj.completion_reason = 'completed';
      await mongoose.model('archived_whatsapp_sessions').create(sessionObj);
      await session.deleteOne();
    }
  }
}

/**
 * Interpolates string variables matching double-brackets {{collected_data.var}} with active session keys.
 */
function interpolateTemplate(template, session) {
  if (typeof template !== 'string') {
    // If it's an object or array, interpolate properties recursively
    if (template && typeof template === 'object') {
      const result = Array.isArray(template) ? [] : {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = interpolateTemplate(value, session);
      }
      return result;
    }
    return template;
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
    } else if (keys[0] === 'db_response') {
      const dbResp = session.collected_data.get('db_response') || {};
      return dbResp[keys[1]] || '';
    }
    return '';
  });
}

/**
 * Sends a raw text or template message to the Channel360 gateway
 */
async function sendWhatsAppMessage(credentials, mobile, payload, appUserId) {
  const isTest = credentials.is_test_mode;
  const isTemplate = payload && payload.type === 'template';
  
  const endpoint = isTemplate ? 'template' : 'reply';
  const targetId = appUserId || mobile;
  const baseUrl = isTest ? (process.env.MOCK_SERVER_URL || 'http://localhost:3002') : `https://www.channel360.co.za/v1.1/org/${credentials.org_id}/whatsapp/appuser`;
  const url = isTest ? `${baseUrl}/whatsapp_reply` : `${baseUrl}/${targetId}/${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${credentials.bearer_token}`
  };

  const body = isTest ? { mobile, payload } : payload;

  try {
    const res = await axios.post(url, body, { headers, timeout: 5000 });
    
    // Record audit trail of outbound message
    await mongoose.model('audit_webhook_stream').create({
      tenant_id: credentials.tenant_id,
      direction: 'outbound_message',
      payload: { recipient: mobile, appUserId, payload, response: res.data }
    });

    return res.data;
  } catch (err) {
    const responseBody = err.response ? err.response.data : {};
    console.error(`[Channel360 REST Error] Failed to send message to ${targetId}:`, err.message, responseBody);
    await mongoose.model('audit_system_exceptions').create({
      tenant_id: credentials.tenant_id,
      exception_type: 'Channel360_REST_Error',
      message: err.message,
      stack_trace: err.stack,
      request_context: { url, payload: body, response: responseBody }
    });
    throw err;
  }
}

/**
 * Sends the dynamic WhatsApp interactive prompt depending on the Node Type, or falls back to template if support window expired.
 */
async function sendNodeWhatsAppPrompt(credentials, mobile, node, session) {
  let payload = {};

  const lastMsgTime = session.last_user_message_at ? new Date(session.last_user_message_at).getTime() : 0;
  const timeElapsed = Date.now() - lastMsgTime;
  const isExpiredWindow = timeElapsed > 24 * 60 * 60 * 1000;

  if (isExpiredWindow && node.config && node.config.fallback_template_name) {
    console.log(`[Interpreter 24h Guard] Support window expired (${Math.round(timeElapsed/3600000)}h). Sending template fallback.`);
    const params = (node.config.fallback_template_params || []).map(p => {
      return interpolateTemplate(p, session);
    });
    
    payload = {
      type: 'template',
      template_name: node.config.fallback_template_name,
      parameters: params
    };
  } else {
    if (node.type === 'prompt_text') {
      const msg = interpolateTemplate(node.config.message, session);
      payload = { text: msg };
    } 
    
    else if (node.type === 'prompt_buttons') {
      const text = interpolateTemplate(node.config.message, session);
      const buttons = node.config.buttons.map(btn => ({
        id: btn.id,
        title: btn.title
      }));
      payload = { text, buttons };
    } 
    
    else if (node.type === 'prompt_list') {
      payload = {
        button_text: node.config.button_text,
        title: node.config.title,
        description: interpolateTemplate(node.config.description, session),
        sections: node.config.sections
      };
    }
  }



  return sendWhatsAppMessage(credentials, mobile, payload, session.app_user_id);
}

/**
 * Formats and sends the Main Menu prompt text to the subscriber
 */
async function sendMainMenuPrompt(credentials, mobile, menu, session) {
  const visibleItems = (menu.items || []).filter(item => !item.is_hidden);
  
  const text = `*${menu.menu_title}*\n${menu.menu_description}\n\n` + 
               visibleItems.map(item => `${item.index}. ${item.label}`).join('\n');
  const payload = { text };



  return sendWhatsAppMessage(credentials, mobile, payload, session.app_user_id);
}

module.exports = {
  runInterpreterLoop,
  interpolateTemplate,
  sendWhatsAppMessage,
  sendNodeWhatsAppPrompt,
  sendMainMenuPrompt
};
