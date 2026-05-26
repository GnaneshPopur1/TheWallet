const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ||= 'file:./prisma/test.db';
process.env.JWT_SECRET ||= 'test-secret';

const app = require('../src/app');

test('GET /health returns ok', async () => {
  const server = createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, { status: 'ok' });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
