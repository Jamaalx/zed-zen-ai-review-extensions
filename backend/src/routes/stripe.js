const express = require('express');
const Stripe = require('stripe');
const { requireAuth } = require('../middleware/auth');
const {
  findUserById,
  findUserByStripeCustomerId,
  updateStripeCustomer,
  updateSubscription
} = require('../models/database');
const { getPlanByStripePriceId, PLANS } = require('../../config/plans');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/stripe/create-checkout-session
// Creates a Stripe Checkout session for subscription
router.post('/create-checkout-session', requireAuth, async (req, res) => {
  try {
    const { planId } = req.body;
    const user = findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get plan details
    const plan = PLANS[planId];
    if (!plan || !plan.stripePriceId) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id.toString()
        }
      });
      customerId = customer.id;
      updateStripeCustomer(user.id, customerId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1
        }
      ],
      success_url: `${process.env.DASHBOARD_URL || process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DASHBOARD_URL || process.env.FRONTEND_URL}/cancel`,
      subscription_data: {
        metadata: {
          userId: user.id.toString(),
          planId: planId
        }
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto'
    });

    res.json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/stripe/create-portal-session
// Creates a Stripe Customer Portal session for managing subscription
router.post('/create-portal-session', requireAuth, async (req, res) => {
  try {
    const user = findUserById(req.user.id);

    if (!user || !user.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: process.env.DASHBOARD_URL || process.env.FRONTEND_URL
    });

    res.json({ url: session.url });

  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// POST /api/stripe/webhook
// Handles Stripe webhook events
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  console.log('Stripe webhook received:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle successful checkout
async function handleCheckoutComplete(session) {
  const customerId = session.customer;
  const user = findUserByStripeCustomerId(customerId);

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  // Subscription details will be handled by subscription.updated event
  console.log('Checkout completed for user:', user.email);
}

// Handle subscription updates
async function handleSubscriptionUpdate(subscription) {
  const customerId = subscription.customer;
  const user = findUserByStripeCustomerId(customerId);

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  // Get the price ID from the subscription
  const priceId = subscription.items.data[0]?.price?.id;
  const plan = getPlanByStripePriceId(priceId);

  // Update user subscription
  updateSubscription(
    user.id,
    plan.id,
    subscription.id,
    subscription.status,
    subscription.current_period_end
  );

  console.log(`Subscription updated for user ${user.email}: ${plan.id} (${subscription.status})`);
}

// Handle subscription cancellation
async function handleSubscriptionCanceled(subscription) {
  const customerId = subscription.customer;
  const user = findUserByStripeCustomerId(customerId);

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  // Revert to free plan
  updateSubscription(
    user.id,
    'free',
    null,
    'canceled',
    null
  );

  console.log(`Subscription canceled for user ${user.email}, reverted to free plan`);
}

// Handle failed payment
async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;
  const user = findUserByStripeCustomerId(customerId);

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  console.log(`Payment failed for user ${user.email}`);
  // Could send email notification here
}

// GET /api/stripe/plans
// Get available plans (public endpoint)
router.get('/plans', (req, res) => {
  const plans = Object.values(PLANS).map(plan => ({
    id: plan.id,
    name: plan.name,
    dailyLimit: plan.dailyLimit,
    priceMonthly: plan.priceMonthly,
    features: plan.features,
    hasStripePrice: !!plan.stripePriceId
  }));

  res.json({ plans });
});

module.exports = router;
