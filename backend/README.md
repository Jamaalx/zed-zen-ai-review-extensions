# ZedZen API Server

Backend server for ZedZen Review Assistant SaaS version with authentication, Stripe payments, and AI proxy.

## Features

- **User Authentication** - JWT-based login/register/logout
- **Stripe Payments** - Checkout, webhooks, customer portal
- **AI Proxy** - Secure OpenAI API calls with your key
- **Rate Limiting** - Daily limits based on plan (5/25/100 per day)
- **Usage Tracking** - Per-user request and token tracking

## Pricing Plans

| Plan | Daily Limit | Price |
|------|-------------|-------|
| Free | 5/day | 0 EUR |
| Starter | 25/day | 5 EUR/month |
| Pro | 100/day | 9.90 EUR/month |

## Quick Deploy to Railway

### 1. Create Railway Project

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect this repository (backend folder)
4. Railway will auto-detect Node.js

### 2. Configure Environment Variables

In Railway dashboard, add these environment variables:

```
# Server
PORT=3000
NODE_ENV=production

# JWT (generate a random string: openssl rand -hex 32)
JWT_SECRET=your-super-secret-jwt-key-here

# OpenAI API Key (YOUR key)
OPENAI_API_KEY=sk-your-openai-api-key

# Stripe (from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_STARTER_PRICE_ID=price_xxxxx
STRIPE_PRO_PRICE_ID=price_xxxxx

# URLs
FRONTEND_URL=chrome-extension://your-extension-id
DASHBOARD_URL=https://your-domain.com

# Database (Railway provides persistent storage)
DATABASE_PATH=./data/zedzen.db
```

### 3. Setup Stripe Products

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Create two products:

**Starter Plan:**
- Name: "ZedZen Starter"
- Price: 5.00 EUR / month
- Copy the Price ID → `STRIPE_STARTER_PRICE_ID`

**Pro Plan:**
- Name: "ZedZen Pro"
- Price: 9.90 EUR / month
- Copy the Price ID → `STRIPE_PRO_PRICE_ID`

### 4. Setup Stripe Webhook

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. URL: `https://your-app.railway.app/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy Signing Secret → `STRIPE_WEBHOOK_SECRET`

### 5. Update Chrome Extension

In `popup.js` and `content.js`, update:

```javascript
const API_BASE_URL = 'https://your-app.railway.app';
```

## Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your values

# Run development server
npm run dev

# Server runs on http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### AI
- `POST /api/ai/generate-response` - Generate review response
- `GET /api/ai/usage` - Get usage statistics
- `GET /api/ai/models` - List available models

### Stripe
- `POST /api/stripe/create-checkout-session` - Start checkout
- `POST /api/stripe/create-portal-session` - Open customer portal
- `POST /api/stripe/webhook` - Webhook handler
- `GET /api/stripe/plans` - List pricing plans

### User
- `GET /api/user/profile` - Full user profile
- `GET /api/user/subscription` - Subscription details

## Security Notes

- JWT tokens expire after 7 days
- Passwords hashed with bcrypt (12 rounds)
- Rate limiting: 100 requests per 15 minutes per IP
- CORS configured for extension only
- API key never exposed to clients

## Database

SQLite database with the following tables:
- `users` - User accounts and subscription info
- `daily_usage` - Daily request tracking
- `request_logs` - Detailed request history

Database file is stored at `./data/zedzen.db` (persistent on Railway).
