const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_session_token_key_12345';

module.exports = async (req, res, next) => {
  // Allow OPTIONS preflight calls
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await mongoose.model('sys_users').findOne({ username: decoded.username });
    
    if (!user) {
      return res.status(401).json({ error: 'User record not found' });
    }
    
    if (user.status === 'disabled') {
      return res.status(403).json({ error: 'This user account is disabled' });
    }

    // Attach decoded user info to request context
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication token is invalid or expired' });
  }
};
