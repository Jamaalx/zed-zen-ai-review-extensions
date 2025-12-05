const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.dirname(process.env.DATABASE_PATH || './data/zedzen.db');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || './data/zedzen.db';
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize database schema
function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      plan TEXT DEFAULT 'free',
      stripe_customer_id TEXT UNIQUE,
      stripe_subscription_id TEXT,
      subscription_status TEXT DEFAULT 'none',
      subscription_current_period_end INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Daily usage tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      requests_count INTEGER DEFAULT 0,
      tokens_used INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, date)
    )
  `);

  // Request logs (for analytics)
  db.exec(`
    CREATE TABLE IF NOT EXISTS request_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL,
      tokens_input INTEGER DEFAULT 0,
      tokens_output INTEGER DEFAULT 0,
      model TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
    CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_usage(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_request_logs_user ON request_logs(user_id);
  `);

  console.log('Database initialized successfully');
}

// User operations
const userQueries = {
  create: db.prepare(`
    INSERT INTO users (email, password_hash, name)
    VALUES (?, ?, ?)
  `),

  findByEmail: db.prepare(`
    SELECT * FROM users WHERE email = ?
  `),

  findById: db.prepare(`
    SELECT * FROM users WHERE id = ?
  `),

  findByStripeCustomerId: db.prepare(`
    SELECT * FROM users WHERE stripe_customer_id = ?
  `),

  updateStripeCustomer: db.prepare(`
    UPDATE users SET stripe_customer_id = ?, updated_at = strftime('%s', 'now')
    WHERE id = ?
  `),

  updateSubscription: db.prepare(`
    UPDATE users SET
      plan = ?,
      stripe_subscription_id = ?,
      subscription_status = ?,
      subscription_current_period_end = ?,
      updated_at = strftime('%s', 'now')
    WHERE id = ?
  `),

  updatePlan: db.prepare(`
    UPDATE users SET plan = ?, updated_at = strftime('%s', 'now')
    WHERE id = ?
  `)
};

// Usage operations
const usageQueries = {
  getToday: db.prepare(`
    SELECT * FROM daily_usage
    WHERE user_id = ? AND date = date('now')
  `),

  incrementUsage: db.prepare(`
    INSERT INTO daily_usage (user_id, date, requests_count, tokens_used)
    VALUES (?, date('now'), 1, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      requests_count = requests_count + 1,
      tokens_used = tokens_used + excluded.tokens_used
  `),

  logRequest: db.prepare(`
    INSERT INTO request_logs (user_id, endpoint, tokens_input, tokens_output, model)
    VALUES (?, ?, ?, ?, ?)
  `)
};

// Helper functions
function createUser(email, passwordHash, name = null) {
  try {
    const result = userQueries.create.run(email, passwordHash, name);
    return { id: result.lastInsertRowid, email, name, plan: 'free' };
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Email already exists');
    }
    throw error;
  }
}

function findUserByEmail(email) {
  return userQueries.findByEmail.get(email);
}

function findUserById(id) {
  return userQueries.findById.get(id);
}

function findUserByStripeCustomerId(customerId) {
  return userQueries.findByStripeCustomerId.get(customerId);
}

function updateStripeCustomer(userId, customerId) {
  return userQueries.updateStripeCustomer.run(customerId, userId);
}

function updateSubscription(userId, plan, subscriptionId, status, periodEnd) {
  return userQueries.updateSubscription.run(plan, subscriptionId, status, periodEnd, userId);
}

function getTodayUsage(userId) {
  return usageQueries.getToday.get(userId) || { requests_count: 0, tokens_used: 0 };
}

function incrementUsage(userId, tokensUsed = 0) {
  return usageQueries.incrementUsage.run(userId, tokensUsed);
}

function logRequest(userId, endpoint, tokensInput, tokensOutput, model) {
  return usageQueries.logRequest.run(userId, endpoint, tokensInput, tokensOutput, model);
}

// Initialize on load
initializeDatabase();

module.exports = {
  db,
  createUser,
  findUserByEmail,
  findUserById,
  findUserByStripeCustomerId,
  updateStripeCustomer,
  updateSubscription,
  getTodayUsage,
  incrementUsage,
  logRequest
};
