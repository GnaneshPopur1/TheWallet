const REQUIRED_IN_PRODUCTION = ['DATABASE_URL', 'JWT_SECRET'];

function readConfig() {
  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);

  if (missing.length > 0 && process.env.NODE_ENV !== 'test') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 3000),
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET || 'test-secret',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    publicApiUrl: process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3000}`,
    plaidClientId: process.env.PLAID_CLIENT_ID,
    plaidSecret: process.env.PLAID_SECRET,
    plaidEnv: process.env.PLAID_ENV || 'sandbox',
    geminiApiKey: process.env.GEMINI_API_KEY,
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    encryptionKey: process.env.ENCRYPTION_KEY,
  };
}

module.exports = readConfig();
