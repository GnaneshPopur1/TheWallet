const express = require('express');
const router = express.Router();
const prisma = require('../../db');
const config = require('../../config');
const { authenticateToken } = require('../../middleware/auth.middleware');
const { GoogleGenerativeAI } = require('@google/generative-ai');

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    // 1. Fetch user's financial context
    const accounts = await prisma.account.findMany({
      where: { user_id: req.user.user_id },
      select: { account_type: true, current_balance: true },
    });

    const transactions = await prisma.transaction.findMany({
      where: { account: { user_id: req.user.user_id } },
      take: 10,
      orderBy: { date: 'desc' },
      select: { amount: true, merchant_name: true, date: true },
    });

    const contextPrompt = `
      You are a helpful, enthusiastic AI financial advisor for college students.
      The user is asking: "${message}"
      
      Here is their real-time financial context:
      Accounts: ${JSON.stringify(accounts)}
      Recent Transactions: ${JSON.stringify(transactions)}
      
      Give a concise, helpful response (max 2 paragraphs). Be encouraging!
    `;

    // 2. Call Gemini API if key exists, otherwise simulate
    if (config.geminiApiKey) {
      const genAI = new GoogleGenerativeAI(config.geminiApiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(contextPrompt);
      const responseText = result.response.text();
      return res.json({ reply: responseText });
    } else {
      // Simulated fallback
      const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0);
      const fallbackMsg = `[Simulated AI]: I see you have $${totalBalance.toFixed(2)} across your accounts, and your last transaction was at ${transactions[0]?.merchant_name || 'nowhere'}. To get real AI advice, add your GEMINI_API_KEY to the backend .env file!`;
      return res.json({ reply: fallbackMsg });
    }
  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

module.exports = router;
