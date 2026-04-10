import 'dotenv/config';
import prisma from '../lib/db';

async function main() {
  const start = '2026-03-01';
  const end = '2026-03-31';
  
  const count = await prisma.castAttendance.count({
    where: {
      date: { gte: start, lte: end }
    }
  });

  console.log(`March 2026 Attendance count: ${count}`);
  
  const sample = await prisma.castAttendance.findMany({
    where: { date: { gte: start, lte: end } },
    take: 5,
    include: { cast: true }
  });
  
  console.log('Sample:', JSON.stringify(sample, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
