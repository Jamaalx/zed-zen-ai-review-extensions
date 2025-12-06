const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getTodayUsage, incrementUsage, logRequest } = require('../models/database');
const { getDailyLimit } = require('../../config/plans');

const router = express.Router();

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4';

// System prompts for different languages and tones
const SYSTEM_PROMPTS = {
  base: `You are a professional customer service representative responding to customer reviews.
Your responses should be helpful, empathetic, and maintain a positive brand image.
Keep responses concise (2-3 sentences) and always thank the customer for their feedback.`,

  tones: {
    professional: 'Maintain a formal, business-like tone while being warm and appreciative.',
    friendly: 'Use a warm, conversational tone that feels personal and genuine.',
    apologetic: 'Express sincere apology and commitment to improvement. Acknowledge any issues mentioned.',
    grateful: 'Express deep appreciation and highlight how much the customer\'s feedback means.'
  },

  languages: {
    en: 'Respond in English.',
    ro: 'Respond in Romanian (Română).',
    es: 'Respond in Spanish (Español).',
    fr: 'Respond in French (Français).',
    de: 'Respond in German (Deutsch).',
    it: 'Respond in Italian (Italiano).'
  }
};

// Build system prompt based on options
function buildSystemPrompt(language = 'en', tone = 'professional') {
  const langInstruction = SYSTEM_PROMPTS.languages[language] || SYSTEM_PROMPTS.languages.en;
  const toneInstruction = SYSTEM_PROMPTS.tones[tone] || SYSTEM_PROMPTS.tones.professional;

  return `${SYSTEM_PROMPTS.base}\n\n${langInstruction}\n${toneInstruction}`;
}

// POST /api/ai/generate-response
router.post('/generate-response', requireAuth, async (req, res) => {
  try {
    const { reviewText, language, tone, model } = req.body;
    const userId = req.user.id;
    const userPlan = req.user.plan;

    // Validate input
    if (!reviewText || reviewText.trim().length === 0) {
      return res.status(400).json({ error: 'Review text is required' });
    }

    if (reviewText.length > 5000) {
      return res.status(400).json({ error: 'Review text is too long (max 5000 characters)' });
    }

    // Check daily usage limit
    const dailyLimit = getDailyLimit(userPlan);
    const todayUsage = getTodayUsage(userId);

    if (todayUsage.requests_count >= dailyLimit) {
      return res.status(429).json({
        error: 'Daily limit reached',
        message: `You have reached your daily limit of ${dailyLimit} requests. Upgrade your plan for more.`,
        usage: {
          used: todayUsage.requests_count,
          limit: dailyLimit,
          plan: userPlan
        }
      });
    }

    // Build the prompt
    const systemPrompt = buildSystemPrompt(language, tone);
    const userPrompt = `Please write a professional response to this customer review:\n\n"${reviewText}"`;

    // Make request to OpenAI
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 250,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', response.status, errorData);

      if (response.status === 429) {
        return res.status(503).json({ error: 'AI service is temporarily busy. Please try again in a moment.' });
      }

      return res.status(502).json({ error: 'Failed to generate response. Please try again.' });
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content?.trim();

    if (!generatedText) {
      return res.status(502).json({ error: 'No response generated. Please try again.' });
    }

    // Track usage
    const tokensUsed = (data.usage?.total_tokens) || 0;
    incrementUsage(userId, tokensUsed);
    logRequest(userId, '/api/ai/generate-response', data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0, model || DEFAULT_MODEL);

    // Get updated usage
    const updatedUsage = getTodayUsage(userId);

    res.json({
      response: generatedText,
      usage: {
        used: updatedUsage.requests_count,
        limit: dailyLimit,
        remaining: dailyLimit - updatedUsage.requests_count,
        plan: userPlan
      }
    });

  } catch (error) {
    console.error('Generate response error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ai/usage
// Get current usage statistics
router.get('/usage', requireAuth, (req, res) => {
  const userId = req.user.id;
  const userPlan = req.user.plan;
  const dailyLimit = getDailyLimit(userPlan);
  const todayUsage = getTodayUsage(userId);

  res.json({
    usage: {
      used: todayUsage.requests_count,
      limit: dailyLimit,
      remaining: Math.max(0, dailyLimit - todayUsage.requests_count),
      tokensUsed: todayUsage.tokens_used,
      plan: userPlan
    }
  });
});

// GET /api/ai/models
// Get available models
router.get('/models', requireAuth, (req, res) => {
  res.json({
    models: [
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and efficient' },
      { id: 'gpt-4', name: 'GPT-4', description: 'Most capable, best quality' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Fast and powerful' }
    ],
    default: DEFAULT_MODEL
  });
});

module.exports = router;
