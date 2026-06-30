require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Load Mongoose models
require('./db/schemas');

const webhookRoutes = require('./routes/webhooks');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/WatchManager';

// Express setup
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', webhookRoutes);
app.use('/api/admin', adminRoutes);

// Simple health probe
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Database connection & startup
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log(`[Database] Mongoose successfully connected to ${MONGO_URI}`);
    app.listen(PORT, () => {
      console.log(`[Server] Backend service running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('[Fatal Startup Error] MongoDB connection failed:', err);
    process.exit(1);
  });
