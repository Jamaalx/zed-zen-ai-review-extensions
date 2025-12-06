const jwt = require('jsonwebtoken');
const { findUserById } = require('../models/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token valid for 7 days

// Generate JWT token
function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Authentication middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Get user from database
  const user = findUserById(decoded.userId);

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // Attach user to request
  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    stripeCustomerId: user.stripe_customer_id,
    subscriptionStatus: user.subscription_status
  };

  next();
}

// Optional auth - doesn't fail if no token, but attaches user if valid
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (decoded) {
      const user = findUserById(decoded.userId);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan
        };
      }
    }
  }

  next();
}

module.exports = {
  generateToken,
  verifyToken,
  requireAuth,
  optionalAuth
};
