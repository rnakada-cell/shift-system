import 'dotenv/config';
import { prisma } from '../lib/db';

async function check() {
  try {
    console.log("Checking DB connection with adapter...");
    const start = Date.now();
    const count = await prisma.cast.count();
    console.log(`Connection OK. Cast count: ${count} (took ${Date.now() - start}ms)`);
  } catch (e) {
    console.error("DB Connection Failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
