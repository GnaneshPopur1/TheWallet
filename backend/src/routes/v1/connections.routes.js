const express = require('express');
const router = express.Router();
const prisma = require('../../db');
const { authenticateToken } = require('../../middleware/auth.middleware');
const { encryptSecret } = require('../../utils/crypto');
const { isNonEmptyString } = require('../../utils/validation');

// Generate link token
router.post('/link-token', authenticateToken, async (req, res) => {
  // Mock Plaid link token generation
  res.json({ link_token: 'mock-link-token-12345' });
});

// Exchange public token for access token
router.post('/exchange-token', authenticateToken, async (req, res) => {
  try {
    const { public_token, institution_name } = req.body;

    if (!isNonEmptyString(public_token) || !isNonEmptyString(institution_name)) {
      return res.status(400).json({ error: 'public_token and institution_name are required' });
    }

    // Mock access token retrieval and store in DB
    const connection = await prisma.bank_Connection.create({
      data: {
        user_id: req.user.user_id,
        institution_name: institution_name.trim(),
        access_token: encryptSecret(public_token),
        status: 'active',
      },
    });

    res.status(200).json({ connection_id: connection.connection_id });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List connections
router.get('/', authenticateToken, async (req, res) => {
  try {
    const connections = await prisma.bank_Connection.findMany({
      where: { user_id: req.user.user_id },
      select: { connection_id: true, institution_name: true, status: true },
    });
    res.json(connections);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete connection
router.delete('/:connectionId', authenticateToken, async (req, res) => {
  try {
    await prisma.bank_Connection.deleteMany({
      where: {
        connection_id: req.params.connectionId,
        user_id: req.user.user_id,
      },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
