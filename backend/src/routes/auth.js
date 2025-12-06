const express = require('express');
const bcrypt = require('bcryptjs');
const { createUser, findUserByEmail } = require('../models/database');
const { generateToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Password validation
function isValidPassword(password) {
  return password && password.length >= 6;
}

// Email validation
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return email && emailRegex.test(email);
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = findUserByEmail(email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = createUser(email.toLowerCase(), passwordHash, name || null);

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: 'free'
      },
      token
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = findUserByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        subscriptionStatus: user.subscription_status
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.user
  });
});

// POST /api/auth/logout - Client-side token removal, this is just for logging
router.post('/logout', requireAuth, (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // This endpoint exists for future token blacklisting if needed
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
