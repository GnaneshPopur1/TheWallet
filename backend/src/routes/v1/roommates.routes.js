const express = require('express');
const router = express.Router();
const prisma = require('../../db');
const { authenticateToken } = require('../../middleware/auth.middleware');
const { isNonEmptyString, parsePositiveNumber } = require('../../utils/validation');

// Create a new group
router.post('/group', authenticateToken, async (req, res) => {
  try {
    const { group_name } = req.body;

    if (!isNonEmptyString(group_name)) {
      return res.status(400).json({ error: 'group_name is required' });
    }

    // Create the group and immediately join the creating user
    const group = await prisma.roommate_Group.create({
      data: { group_name: group_name.trim() },
    });

    await prisma.user.update({
      where: { user_id: req.user.user_id },
      data: { roommate_group_id: group.group_id },
    });

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's current group and balances
router.get('/group', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      include: { Roommate_Group: { include: { Users: true } } },
    });

    if (!user.roommate_group_id) {
      return res.json({ group: null });
    }

    // Get net balances for the user (how much this user owes/is owed)
    const splitsOwedByMe = await prisma.expense_Split.findMany({
      where: { owed_by_user_id: req.user.user_id, is_settled: false },
      include: { expense: { include: { payer: { select: { email: true, venmo_handle: true } } } } },
    });

    const splitsOwedToMe = await prisma.expense_Split.findMany({
      where: { expense: { paid_by_user_id: req.user.user_id }, is_settled: false },
      include: { ower: { select: { email: true } } },
    });

    let totalIOwe = 0;
    splitsOwedByMe.forEach((s) => (totalIOwe += s.amount_owed));

    let totalOwedToMe = 0;
    splitsOwedToMe.forEach((s) => (totalOwedToMe += s.amount_owed));

    res.json({
      group: user.Roommate_Group,
      ledger: {
        totalIOwe,
        totalOwedToMe,
        netBalance: totalOwedToMe - totalIOwe,
      },
      splitsOwedByMe,
      splitsOwedToMe,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a shared expense
router.post('/expenses', authenticateToken, async (req, res) => {
  try {
    const { amount, description } = req.body;
    const expenseAmount = parsePositiveNumber(amount);

    if (!expenseAmount || !isNonEmptyString(description)) {
      return res.status(400).json({ error: 'Valid amount and description are required' });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      include: { Roommate_Group: { include: { Users: true } } },
    });

    if (!user.roommate_group_id) return res.status(400).json({ error: 'Not in a roommate group' });

    const groupUsers = user.Roommate_Group.Users;
    const splitAmount = expenseAmount / groupUsers.length;

    // Create the expense
    const expense = await prisma.shared_Expense.create({
      data: {
        group_id: user.roommate_group_id,
        paid_by_user_id: user.user_id,
        amount: expenseAmount,
        description: description.trim(),
      },
    });

    // Create splits for everyone else in the group
    const splitsToCreate = groupUsers
      .filter((u) => u.user_id !== user.user_id)
      .map((u) => ({
        expense_id: expense.expense_id,
        owed_by_user_id: u.user_id,
        amount_owed: splitAmount,
      }));

    if (splitsToCreate.length > 0) {
      await prisma.expense_Split.createMany({
        data: splitsToCreate,
      });
    }

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent expenses
router.get('/expenses', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
    if (!user.roommate_group_id) return res.json([]);

    const expenses = await prisma.shared_Expense.findMany({
      where: { group_id: user.roommate_group_id },
      orderBy: { date: 'desc' },
      include: {
        payer: { select: { email: true } },
        Splits: { include: { ower: { select: { email: true } } } },
      },
    });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark split as settled
router.patch('/splits/:splitId/settle', authenticateToken, async (req, res) => {
  try {
    const updated = await prisma.expense_Split.updateMany({
      where: {
        split_id: req.params.splitId,
        OR: [
          { owed_by_user_id: req.user.user_id },
          { expense: { paid_by_user_id: req.user.user_id } },
        ],
      },
      data: { is_settled: true },
    });

    if (updated.count === 0) {
      return res.status(404).json({ error: 'Split not found' });
    }

    res.json({ message: 'Split settled' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Split a real bank transaction with roommates
router.post('/split-transaction', authenticateToken, async (req, res) => {
  try {
    const { transaction_id } = req.body;

    // Get the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { transaction_id },
      include: { account: true },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Verify this transaction belongs to the user
    if (transaction.account.user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get the user's roommate group
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      include: { Roommate_Group: { include: { Users: true } } },
    });

    if (!user.roommate_group_id) {
      return res
        .status(400)
        .json({ error: 'You must be in a roommate group to split transactions' });
    }

    const groupUsers = user.Roommate_Group.Users;
    const expenseAmount = Math.abs(transaction.amount);
    const splitAmount = expenseAmount / groupUsers.length;

    // Create the shared expense
    const expense = await prisma.shared_Expense.create({
      data: {
        group_id: user.roommate_group_id,
        paid_by_user_id: user.user_id,
        amount: expenseAmount,
        description: `${transaction.merchant_name} (split from bank)`,
      },
    });

    // Create splits for everyone else
    const splitsToCreate = groupUsers
      .filter((u) => u.user_id !== user.user_id)
      .map((u) => ({
        expense_id: expense.expense_id,
        owed_by_user_id: u.user_id,
        amount_owed: splitAmount,
      }));

    if (splitsToCreate.length > 0) {
      await prisma.expense_Split.createMany({ data: splitsToCreate });
    }

    res.status(201).json({
      message: `Split $${expenseAmount.toFixed(2)} with ${groupUsers.length - 1} roommate(s)`,
      expense,
    });
  } catch (error) {
    console.error('Error splitting transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
