const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');

/**
 * Public Request Logger Endpoint
 * POST /api/dev/logger
 */
router.post('/logger', async (req, res) => {
  try {
    const Config = mongoose.model('sys_platform_configs');
    const config = await Config.findOne({ key: 'dev_logger_enabled' });
    
    // If logger is disabled, return directly without logging anything
    if (!config || config.value !== true) {
      return res.status(200).json({ message: 'Developer request logging is currently disabled.' });
    }

    const DevApiLogs = mongoose.model('dev_api_logs');
    
    // Truncate payloads that are too large (limit to 100 KB)
    const payloadString = JSON.stringify(req.body || {});
    if (payloadString.length > 100 * 1024) {
      return res.status(400).json({ error: 'Payload body size exceeds 100 KB developer logger limit.' });
    }

    // Capture standard headers, filtering out sensitive authorization keys
    const filteredHeaders = { ...req.headers };
    delete filteredHeaders.authorization;
    delete filteredHeaders.cookie;

    const source = req.body?.source || req.headers['x-source'] || 'unknown';
    const notes = req.body?.notes || '';
    const purpose = req.body?.purpose || '';

    await DevApiLogs.create({
      method: req.method,
      path: req.originalUrl || req.path,
      headers: filteredHeaders,
      payload: req.body,
      source,
      notes,
      purpose
    });

    res.status(200).json({ success: true, message: 'Request captured successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Administrative Dev Logs APIs (JWT Protected)
 */

// 1. Get logged API requests
router.get('/admin/logs', authMiddleware, async (req, res) => {
  try {
    const DevApiLogs = mongoose.model('dev_api_logs');
    const logs = await DevApiLogs.find({}).sort({ timestamp: -1 }).limit(100);
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Update notes for a specific request log
router.post('/admin/logs/:id/notes', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { notes, source, purpose } = req.body;
  try {
    const DevApiLogs = mongoose.model('dev_api_logs');
    const log = await DevApiLogs.findByIdAndUpdate(
      id,
      { notes, source, purpose },
      { new: true }
    );
    if (!log) {
      return res.status(404).json({ error: 'Developer request log record not found.' });
    }
    res.status(200).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get developer logger toggle configuration
router.get('/admin/config', authMiddleware, async (req, res) => {
  try {
    const Config = mongoose.model('sys_platform_configs');
    let config = await Config.findOne({ key: 'dev_logger_enabled' });
    if (!config) {
      config = await Config.create({ key: 'dev_logger_enabled', value: false, description: 'Developer request logger toggle switch state' });
    }
    res.status(200).json({ enabled: config.value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update developer logger toggle configuration
router.post('/admin/config', authMiddleware, async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled state must be a boolean.' });
  }
  try {
    const Config = mongoose.model('sys_platform_configs');
    const config = await Config.findOneAndUpdate(
      { key: 'dev_logger_enabled' },
      { value: enabled },
      { new: true, upsert: true }
    );
    res.status(200).json({ enabled: config.value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Delete a specific request log record
router.delete('/admin/logs/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const DevApiLogs = mongoose.model('dev_api_logs');
    const log = await DevApiLogs.findByIdAndDelete(id);
    if (!log) {
      return res.status(404).json({ error: 'Developer request log record not found.' });
    }
    res.status(200).json({ success: true, message: 'Request log deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
