// Pricing plans configuration
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    dailyLimit: 5,
    priceMonthly: 0,
    stripePriceId: null,
    features: [
      '5 responses per day',
      'All languages supported',
      'Basic tones'
    ]
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    dailyLimit: 25,
    priceMonthly: 5.00, // EUR
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: [
      '25 responses per day',
      'All languages supported',
      'All tones available',
      'Priority support'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    dailyLimit: 100,
    priceMonthly: 9.90, // EUR
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      '100 responses per day',
      'All languages supported',
      'All tones available',
      'Priority support',
      'Custom prompts (coming soon)'
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
