require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Load Mongoose models
require('./db/schemas');

const webhookRoutes = require('./routes/webhooks');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/WatchManagerV2';

// Express setup
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', webhookRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);

// Simple health probe
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Serve static frontend files in production
const path = require('path');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}

// Database connection & startup
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log(`[Database] Mongoose successfully connected to ${MONGO_URI}`);
    
    // Seed initial admin user if collection is empty
    try {
      const User = mongoose.model('sys_users');
      const count = await User.countDocuments({});
      if (count === 0) {
        const password_hash = await bcrypt.hash('admin_novare_123', 10);
        await User.create({
          username: 'admin',
          password_hash,
          email: 'admin@novare.co.za',
          role: 'admin',
          status: 'active'
        });
        console.log('[Database] Seeded default administrator user: admin / admin_novare_123');
      }
    } catch (seedErr) {
      console.error('[Database] Failed to seed default user:', seedErr.message);
    }

    app.listen(PORT, () => {
      console.log(`[Server] Backend service running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('[Fatal Startup Error] MongoDB connection failed:', err);
    process.exit(1);
  });
