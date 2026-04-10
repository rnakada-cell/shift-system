import 'dotenv/config';
import prisma from '../lib/db';

async function main() {
  const count = await prisma.castDailySales.count();
  console.log(`Total CastDailySales: ${count}`);
  
  const marchCount = await prisma.castDailySales.count({
    where: { date: { startsWith: '2026-03' } }
  });
  console.log(`March CastDailySales: ${marchCount}`);

  const febCount = await prisma.castDailySales.count({
      where: { date: { startsWith: '2026-02' } }
  });
  console.log(`February CastDailySales: ${febCount}`);
}

main().catch(console.error);
