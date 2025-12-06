const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { findUserById, getTodayUsage } = require('../models/database');
const { getPlan, getDailyLimit, getAllPlans } = require('../../config/plans');

const router = express.Router();

// GET /api/user/profile
// Get complete user profile with subscription and usage info
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const plan = getPlan(user.plan);
    const dailyLimit = getDailyLimit(user.plan);
    const todayUsage = getTodayUsage(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: new Date(user.created_at * 1000).toISOString()
      },
      subscription: {
        plan: user.plan,
        planName: plan.name,
        status: user.subscription_status,
        currentPeriodEnd: user.subscription_current_period_end
          ? new Date(user.subscription_current_period_end * 1000).toISOString()
          : null,
        features: plan.features
      },
      usage: {
        today: {
          used: todayUsage.requests_count,
          limit: dailyLimit,
          remaining: Math.max(0, dailyLimit - todayUsage.requests_count),
          tokensUsed: todayUsage.tokens_used
        }
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/user/subscription
// Get subscription details
router.get('/subscription', requireAuth, async (req, res) => {
  try {
    const user = findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentPlan = getPlan(user.plan);
    const allPlans = getAllPlans();

    res.json({
      current: {
        planId: user.plan,
        planName: currentPlan.name,
        dailyLimit: currentPlan.dailyLimit,
        priceMonthly: currentPlan.priceMonthly,
        status: user.subscription_status,
        currentPeriodEnd: user.subscription_current_period_end
          ? new Date(user.subscription_current_period_end * 1000).toISOString()
          : null
      },
      availablePlans: allPlans.map(plan => ({
        id: plan.id,
        name: plan.name,
        dailyLimit: plan.dailyLimit,
        priceMonthly: plan.priceMonthly,
        features: plan.features,
        isCurrent: plan.id === user.plan,
        canUpgrade: plan.priceMonthly > currentPlan.priceMonthly
      }))
    });

  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

module.exports = router;
