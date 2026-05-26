const express = require('express');
const router = express.Router();
const prisma = require('../../db');
const { authenticateToken } = require('../../middleware/auth.middleware');
const { parsePositiveNumber } = require('../../utils/validation');

const ALLOWED_PERIODS = new Set(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL']);

// Helper to get start date based on period
function getStartDateForPeriod(period) {
  const now = new Date();
  switch (period) {
    case 'WEEKLY':
      now.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      break;
    case 'MONTHLY':
      now.setDate(1); // Start of month
      break;
    case 'QUARTERLY':
      now.setMonth(Math.floor(now.getMonth() / 3) * 3);
      now.setDate(1);
      break;
    case 'SEMI_ANNUAL':
      now.setMonth(now.getMonth() < 6 ? 0 : 6);
      now.setDate(1);
      break;
    default:
      now.setDate(1);
  }
  now.setHours(0, 0, 0, 0);
  return now;
}

// Get budgets with current spent calculation
router.get('/', authenticateToken, async (req, res) => {
  try {
    const budgets = await prisma.budget.findMany({
      where: { user_id: req.user.user_id },
      orderBy: { start_date: 'desc' },
    });

    const budgetsWithSpent = await Promise.all(
      budgets.map(async (b) => {
        const startDate = getStartDateForPeriod(b.period);

        // Calculate spent amount from transactions (negative amounts)
        const transactions = await prisma.transaction.findMany({
          where: {
            account: { user_id: req.user.user_id },
            date: { gte: startDate },
            amount: { lt: 0 }, // expenses are negative
          },
        });

        const current_spent = transactions.reduce((acc, t) => acc + Math.abs(t.amount), 0);

        return {
          ...b,
          current_spent,
          period_start: startDate,
        };
      })
    );

    res.json(budgetsWithSpent);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new budget
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { period, amount_limit } = req.body;
    const amountLimit = parsePositiveNumber(amount_limit);

    if (!ALLOWED_PERIODS.has(period) || !amountLimit) {
      return res.status(400).json({ error: 'Valid period and positive amount_limit are required' });
    }

    // Check if budget for this period already exists
    const existing = await prisma.budget.findFirst({
      where: { user_id: req.user.user_id, period },
    });

    let budget;
    if (existing) {
      budget = await prisma.budget.update({
        where: { budget_id: existing.budget_id },
        data: { amount_limit: amountLimit },
      });
    } else {
      budget = await prisma.budget.create({
        data: {
          user_id: req.user.user_id,
          period,
          amount_limit: amountLimit,
        },
      });
    }

    res.status(201).json(budget);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
