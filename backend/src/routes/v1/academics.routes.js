const express = require('express');
const router = express.Router();
const prisma = require('../../db');
const { authenticateToken } = require('../../middleware/auth.middleware');
const { isNonEmptyString, parsePositiveNumber } = require('../../utils/validation');

router.post('/terms', authenticateToken, async (req, res) => {
  try {
    const { semester_name, tuition_total, aid_applied, dining_dollars_bal, end_date } = req.body;
    const tuitionTotal = parsePositiveNumber(tuition_total);
    const aidApplied = Number(aid_applied);
    const diningBalance = Number(dining_dollars_bal || 0);

    if (
      !isNonEmptyString(semester_name) ||
      !tuitionTotal ||
      !Number.isFinite(aidApplied) ||
      !Number.isFinite(diningBalance)
    ) {
      return res
        .status(400)
        .json({ error: 'Valid semester, tuition, aid, and dining values are required' });
    }

    const term = await prisma.academic_Term.create({
      data: {
        user_id: req.user.user_id,
        semester_name: semester_name.trim(),
        tuition_total: tuitionTotal,
        aid_applied: aidApplied,
        dining_dollars_bal: diningBalance,
        end_date: end_date ? new Date(end_date) : null,
      },
    });
    res.status(201).json({ term_id: term.term_id });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/terms', authenticateToken, async (req, res) => {
  try {
    const terms = await prisma.academic_Term.findMany({
      where: { user_id: req.user.user_id },
      orderBy: { created_at: 'desc' },
    });
    res.json(terms);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/terms/current', authenticateToken, async (req, res) => {
  try {
    // For MVP, just get the most recently created term
    const currentTerm = await prisma.academic_Term.findFirst({
      where: { user_id: req.user.user_id },
      orderBy: { created_at: 'desc' },
    });
    res.json(currentTerm || {});
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/terms/:termId/dining', authenticateToken, async (req, res) => {
  try {
    const { new_balance } = req.body;
    const newBalance = Number(new_balance);

    if (!Number.isFinite(newBalance) || newBalance < 0) {
      return res.status(400).json({ error: 'new_balance must be a non-negative number' });
    }

    const updatedTerm = await prisma.academic_Term.updateMany({
      where: {
        term_id: req.params.termId,
        user_id: req.user.user_id,
      },
      data: { dining_dollars_bal: newBalance },
    });

    if (updatedTerm.count === 0) return res.status(404).json({ error: 'Term not found' });

    // Return updated term
    const term = await prisma.academic_Term.findUnique({ where: { term_id: req.params.termId } });
    res.json(term);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate Dining Dollars Safe Daily Spend
router.get('/dining', authenticateToken, async (req, res) => {
  try {
    const term = await prisma.academic_Term.findFirst({
      where: { user_id: req.user.user_id },
      orderBy: { created_at: 'desc' },
    });

    if (!term) {
      return res.json({ safe_daily_spend: 0, days_remaining: 0, dining_dollars: 0 });
    }

    const now = new Date();
    const endDate = term.end_date || new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    let daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // If semester ended or starts in the future, handle edge cases
    if (daysRemaining <= 0) daysRemaining = 1;

    const safeDailySpend = term.dining_dollars_bal / daysRemaining;

    res.json({
      safe_daily_spend: safeDailySpend,
      days_remaining: daysRemaining,
      dining_dollars: term.dining_dollars_bal,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
