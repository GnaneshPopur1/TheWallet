const express = require('express');
const router = express.Router();
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const prisma = require('../../db');
const config = require('../../config');
const { authenticateToken } = require('../../middleware/auth.middleware');
const { decryptSecret, encryptSecret } = require('../../utils/crypto');

const configuration = new Configuration({
  basePath: PlaidEnvironments[config.plaidEnv],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': config.plaidClientId,
      'PLAID-SECRET': config.plaidSecret,
    },
  },
});

const client = new PlaidApi(configuration);

// 1. Create Link Token
router.post('/create_link_token', authenticateToken, async (req, res) => {
  try {
    if (!config.plaidClientId || !config.plaidSecret) {
      return res.status(503).json({ error: 'Plaid is not configured' });
    }

    const request = {
      user: { client_user_id: req.user.user_id },
      client_name: 'TheWallet',
      products: ['auth', 'transactions'],
      country_codes: ['US'],
      language: 'en',
    };

    const response = await client.linkTokenCreate(request);
    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// 2. Exchange Public Token for Access Token
router.post('/set_access_token', authenticateToken, async (req, res) => {
  try {
    const { public_token, institution_name } = req.body;
    const response = await client.itemPublicTokenExchange({ public_token });
    const access_token = response.data.access_token;

    // Save Bank_Connection to DB
    const connection = await prisma.bank_Connection.create({
      data: {
        user_id: req.user.user_id,
        institution_name: institution_name || 'My Bank',
        access_token: encryptSecret(access_token),
        status: 'active',
      },
    });

    res.status(201).json({ connection_id: connection.connection_id });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

// 3. Sync Accounts & Transactions
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const connections = await prisma.bank_Connection.findMany({
      where: { user_id: req.user.user_id, status: 'active' },
    });

    let newAccountsCount = 0;
    let newTransactionsCount = 0;

    for (const conn of connections) {
      const accessToken = decryptSecret(conn.access_token);

      // Fetch Accounts
      const accountsResponse = await client.accountsGet({ access_token: accessToken });
      const accounts = accountsResponse.data.accounts;

      for (const acc of accounts) {
        // Upsert requires a unique constraint, but account_id is @id, so we can check manually if upsert fails
        const existingAccount = await prisma.account.findUnique({
          where: { account_id: acc.account_id },
        });
        if (existingAccount) {
          await prisma.account.update({
            where: { account_id: acc.account_id },
            data: { current_balance: acc.balances.current || 0 },
          });
        } else {
          await prisma.account.create({
            data: {
              account_id: acc.account_id,
              user_id: req.user.user_id,
              connection_id: conn.connection_id,
              account_type: acc.subtype || acc.type || 'unknown',
              current_balance: acc.balances.current || 0,
            },
          });
        }
        newAccountsCount++;
      }

      // Fetch Transactions (Last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];
      const endDate = now.toISOString().split('T')[0];

      const transactionsResponse = await client.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
      });

      const transactions = transactionsResponse.data.transactions;

      for (const t of transactions) {
        const existingTx = await prisma.transaction.findUnique({
          where: { transaction_id: t.transaction_id },
        });
        if (!existingTx) {
          await prisma.transaction.create({
            data: {
              transaction_id: t.transaction_id,
              account_id: t.account_id,
              amount: t.amount * -1, // Plaid makes expenses positive, we want negative
              merchant_name: t.merchant_name || t.name || 'Unknown',
              date: new Date(t.date),
              is_recurring: t.merchant_name ? true : false, // naive recurring logic for MVP
            },
          });
          newTransactionsCount++;
        }
      }
    }

    res.json({
      message: `Synced ${newAccountsCount} accounts and ${newTransactionsCount} transactions`,
    });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to sync with Plaid' });
  }
});

module.exports = router;
