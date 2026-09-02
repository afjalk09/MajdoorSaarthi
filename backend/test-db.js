require('dotenv').config();
const prisma = require('./src/lib/prisma');

async function test() {
  try {
    const users = await prisma.user.findMany();
    console.log('Users:', users);
    console.log('DB connection OK');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
