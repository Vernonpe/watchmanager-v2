const mongoose = require('mongoose');

/**
 * Triggers a high-priority alarm notification event on a subscriber line, preempting active chats.
 * @param {string} tenantId - Tenant identifier
 * @param {string} mobile - Subscriber phone number
 * @param {object} alarmEventData - Alarm details (alarm_id, location, event_uuid, passwords, duress_codes)
 * @returns {Promise<boolean>} - True if preempted or session created
 */
async function triggerAlarmPreemption(tenantId, mobile, alarmEventData) {
  const runtimeSessionsModel = mongoose.model('runtime_whatsapp_sessions');
  const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000);

  // Look for any existing session on the mobile line
  let session = await runtimeSessionsModel.findOne({ tenant_id: tenantId, mobile });

  if (!session) {
    // Scenario A: No active session exists. Initialize a fresh alarm session.
    session = await runtimeSessionsModel.create({
      tenant_id: tenantId,
      mobile,
      active_journey_id: 'journey_alarm_notifications_v1',
      current_node_id: 'node_alarm_buttons',
      priority: 10,
      collected_data: { 
        alarm_id: alarmEventData.alarm_id, 
        location: alarmEventData.location,
        event_uuid: alarmEventData.event_uuid 
      },
      expires_at: expiresAt
    });
    console.log(`[Preemption] Created new Alarm Session for ${mobile}`);
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
    
    // Clear dynamic inputs from standard flows to avoid contamination, then set alarm variables
    session.collected_data.clear();
    session.collected_data.set('alarm_id', alarmEventData.alarm_id);
    session.collected_data.set('location', alarmEventData.location);
    session.collected_data.set('event_uuid', alarmEventData.event_uuid);
    session.expires_at = expiresAt;

    await session.save();
    console.log(`[Preemption] Pushed session snapshot to preemption stack for ${mobile}`);
  } else {
    // Scenario C: Session exists and active journey priority is EQUAL or GREATER than 10.
    console.log(`[Preemption] Session for ${mobile} already running at Priority >= 10. Preemption skipped.`);
    return false;
  }
  
  return true;
}

/**
 * Checks and restores suspended lower-priority sessions when an override clears.
 * @param {object} session - Session document instance
 * @returns {Promise<boolean>} - True if successfully restored
 */
async function checkAndRestoreSession(session) {
  if (!session.suspended_sessions || session.suspended_sessions.length === 0) {
    return false; // No suspended processes to restore
  }

  // Pop the latest suspended item
  const snapshot = session.suspended_sessions.pop();
  const thirtyMinutesMs = 30 * 60 * 1000;

  // Stale session validation guard (30 mins TTL)
  if (Date.now() - new Date(snapshot.pushed_at).getTime() > thirtyMinutesMs) {
    console.log(`[Preemption] Suspended session for ${session.mobile} expired on stack. Clearing.`);
    // If we popped a stale one, recursively check if there's another one on the stack
    return checkAndRestoreSession(session);
  }

  // Restore snapshot parameters back to the session root
  session.active_journey_id = snapshot.active_journey_id;
  session.current_node_id = snapshot.current_node_id;
  session.priority = snapshot.priority;
  
  session.collected_data.clear();
  if (snapshot.collected_data) {
    for (const [key, val] of snapshot.collected_data.entries()) {
      session.collected_data.set(key, val);
    }
  }

  session.state_history = snapshot.state_history;
  session.expires_at = new Date(Date.now() + 23 * 60 * 60 * 1000);

  await session.save();
  console.log(`[Preemption] Successfully restored suspended session snapshot for ${session.mobile}`);
  return true; 
}

module.exports = { triggerAlarmPreemption, checkAndRestoreSession };
