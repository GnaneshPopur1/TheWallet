require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createTempUser() {
  const email = 'test@example.com';
  const rawPassword = 'password123';
  const firstName = 'Test';
  const lastName = 'User';

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.log('Test account already exists!');
      console.log(`Email: ${email}\nPassword: ${rawPassword}`);
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    await prisma.user.create({
      data: {
        email,
        password_hash: passwordHash,
      }
    });

    console.log('🎉 Temporary account generated successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${rawPassword}`);
  } catch (error) {
    console.error('Failed to create test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTempUser();
