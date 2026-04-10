import 'dotenv/config';
import prisma from '../lib/db';

async function main() {
  const scores = await prisma.castScore.findMany({
    include: { cast: true },
    orderBy: { calculatedAt: 'desc' }
  });
  
  for (const s of scores) {
    console.log(`Cast: ${s.cast.name}, HR: ¥${s.hourlyRevenue?.toLocaleString()}`);
  }
}

main().catch(console.error);
