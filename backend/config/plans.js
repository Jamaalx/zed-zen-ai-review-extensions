// Pricing plans configuration
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    dailyLimit: 5,
    priceMonthly: 0,
    currency: 'USD',
    stripePriceId: null,
    features: [
      '5 responses per day',
      'All languages supported',
      'Basic tones'
    ]
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    dailyLimit: 25,
    priceMonthly: 4.99,
    currency: 'USD',
    stripePriceId: process.env.STRIPE_BASIC_PRICE_ID,
    features: [
      '25 responses per day',
      'All languages supported',
      'All tones available',
      'Email support'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    dailyLimit: 100,
    priceMonthly: 14.99,
    currency: 'USD',
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    features: [
      '100 responses per day',
      'All languages supported',
      'All tones available',
      'Priority support',
      'Advanced analytics'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    dailyLimit: 500,
    priceMonthly: 49.99,
    currency: 'USD',
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      '500 responses per day',
      'All languages supported',
      'All tones available',
      '24/7 priority support',
      'Custom integrations',
      'Dedicated account manager'
    ]
  }
};

// Get plan by ID
function getPlan(planId) {
  return PLANS[planId] || PLANS.free;
}

// Get daily limit for a plan
function getDailyLimit(planId) {
  const plan = getPlan(planId);
  return plan.dailyLimit;
}

// Get all plans (for pricing page)
function getAllPlans() {
  return Object.values(PLANS);
}

// Get plan by Stripe Price ID
function getPlanByStripePriceId(priceId) {
  return Object.values(PLANS).find(plan => plan.stripePriceId === priceId) || PLANS.free;
}

module.exports = {
  PLANS,
  getPlan,
  getDailyLimit,
  getAllPlans,
  getPlanByStripePriceId
};
