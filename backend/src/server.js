require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint FIRST (before any middleware that might fail)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Security middleware
app.use(helmet());

// CORS - allow all for now (can restrict later)
app.use(cors());

// Stripe webhook needs raw body - must be before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Parse JSON for all other routes
app.use(express.json());

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  message: { error: 'Too many requests, please try again later.' }
});
app.use(globalLimiter);

// Load routes with error handling
try {
  const authRoutes = require('./routes/auth');
  const aiRoutes = require('./routes/ai');
  const stripeRoutes = require('./routes/stripe');
  const userRoutes = require('./routes/user');

  app.use('/api/auth', authRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/stripe', stripeRoutes);
  app.use('/api/user', userRoutes);

  console.log('All routes loaded successfully');
} catch (error) {
  console.error('Error loading routes:', error);
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server - listen on 0.0.0.0 for Railway
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ZedZen API Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
