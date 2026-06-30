const express = require('express');
const app = express();
app.use(express.json());

const apiLogs = [];

app.post('/whatsapp_reply', (req, res) => {
  const { mobile, payload } = req.body;
  console.log(`[MOCK GATEWAY] Outbound message dispatched to ${mobile}. Payload:`, JSON.stringify(payload));
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

// Endpoint to clear logs between tests
app.post('/clear_logs', (req, res) => {
  apiLogs.length = 0;
  res.status(200).json({ status: 'cleared' });
});

app.listen(3002, () => console.log('QA Mock Callback Integration Server listening on port 3002'));
