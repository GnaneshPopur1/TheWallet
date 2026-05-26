const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../db');
const config = require('../../config');
const { authenticateToken } = require('../../middleware/auth.middleware');
const { isNonEmptyString, isValidEmail } = require('../../utils/validation');

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email) || !isNonEmptyString(password) || password.length < 8) {
      return res
        .status(400)
        .json({ error: 'A valid email and 8+ character password are required' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Generate simple verification token
    const verification_token = require('crypto').randomBytes(20).toString('hex');

    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        verification_token,
      },
    });

    // Mock sending email
    console.log(`\n\n[MOCK EMAIL] To: ${email}`);
    console.log(`Subject: Verify your email for TheWallet`);
    console.log(
      `Click this link to verify: ${config.publicApiUrl}/api/v1/auth/verify-email/${verification_token}\n\n`
    );

    const token = jwt.sign({ user_id: user.user_id, email: user.email }, config.jwtSecret, {
      expiresIn: '1h',
    });

    res.status(201).json({ token, message: 'User created successfully', user_id: user.user_id });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ error: 'Invalid email or password' });

    // Assuming MFA is passed or disabled for MVP simplicity, we issue the token here
    const token = jwt.sign({ user_id: user.user_id, email: user.email }, config.jwtSecret, {
      expiresIn: '1h',
    });

    res.json({ token, message: 'Logged in successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/mfa/verify', authenticateToken, async (req, res) => {
  // Mock MFA verify
  res.json({ message: 'MFA verified successfully' });
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      select: {
        user_id: true,
        email: true,
        created_at: true,
        round_up_balance: true,
        venmo_handle: true,
        is_email_verified: true,
        has_completed_onboarding: true,
      },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { venmo_handle } = req.body;
    const cleanVenmoHandle = isNonEmptyString(venmo_handle)
      ? venmo_handle.trim().replace(/^@/, '')
      : null;
    const user = await prisma.user.update({
      where: { user_id: req.user.user_id },
      data: { venmo_handle: cleanVenmoHandle },
      select: { user_id: true, email: true, venmo_handle: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const user = await prisma.user.findFirst({ where: { verification_token: token } });

    if (!user) {
      return res.status(400).send('Invalid or expired verification link.');
    }

    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { is_email_verified: true, verification_token: null },
    });

    res.send('<h1>Email Verified Successfully!</h1><p>You can now return to the app.</p>');
  } catch (error) {
    res.status(500).send('Internal server error');
  }
});

router.post('/me/complete-onboarding', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { user_id: req.user.user_id },
      data: { has_completed_onboarding: true },
      select: { user_id: true, has_completed_onboarding: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.patch('/me/password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (
      !isNonEmptyString(current_password) ||
      !isNonEmptyString(new_password) ||
      new_password.length < 8
    ) {
      return res
        .status(400)
        .json({ error: 'Current password and an 8+ character new password are required' });
    }

    const user = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(current_password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(new_password, salt);

    await prisma.user.update({
      where: { user_id: req.user.user_id },
      data: { password_hash },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete account (cascading delete handles all related records)
router.delete('/me', authenticateToken, async (req, res) => {
  try {
    await prisma.user.delete({
      where: { user_id: req.user.user_id },
    });
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
