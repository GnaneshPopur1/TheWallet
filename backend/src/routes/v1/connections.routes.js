const express = require('express');
const router = express.Router();
const prisma = require('../../db');
const { authenticateToken } = require('../../middleware/auth.middleware');
const { encryptSecret } = require('../../utils/crypto');
const { isNonEmptyString } = require('../../utils/validation');

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
