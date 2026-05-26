const express = require('express');
const router = express.Router();
const prisma = require('../../db');
const { authenticateToken } = require('../../middleware/auth.middleware');

// Get all subscriptions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { user_id: req.user.user_id },
      orderBy: { date_found: 'desc' }
    });
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI Deep Scan using real Transaction data
router.post('/scan-footprint', authenticateToken, async (req, res) => {
  try {
    // 1. Fetch recurring transactions from the user's accounts
    const recurringTxns = await prisma.transaction.findMany({
      where: {
        account: { user_id: req.user.user_id },
        is_recurring: true,
        amount: { lt: 0 } // Subscriptions are expenses (negative amount in our system)
      },
      orderBy: { date: 'desc' }
    });

    // 2. Group by merchant_name to find unique subscriptions
    const uniqueSubsMap = new Map();
    for (const txn of recurringTxns) {
      if (txn.merchant_name && !uniqueSubsMap.has(txn.merchant_name)) {
        uniqueSubsMap.set(txn.merchant_name, {
          merchant_name: txn.merchant_name,
          amount: Math.abs(txn.amount) // Store positive amount for the subscription display
        });
      }
    }

    const newSubs = [];

    // 3. Check existing subscriptions and create missing ones
    for (const [merchant_name, data] of uniqueSubsMap) {
      const existing = await prisma.subscription.findFirst({
        where: { user_id: req.user.user_id, merchant_name }
      });

      if (!existing) {
        const created = await prisma.subscription.create({
          data: {
            user_id: req.user.user_id,
            merchant_name: data.merchant_name,
            amount: data.amount,
            status: 'ACTIVE'
          }
        });
        newSubs.push(created);
      }
    }

    res.status(201).json({ message: 'Scan complete', subscriptions: newSubs });
  } catch (error) {
    console.error('Error scanning footprint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel a subscription (simulate AI agent)
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const subscription = await prisma.subscription.updateMany({
      where: { 
        subscription_id: req.params.id,
        user_id: req.user.user_id
      },
      data: { status: 'CANCELLED' }
    });

    if (subscription.count === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
