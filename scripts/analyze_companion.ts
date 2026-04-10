import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Item Names containing 同伴 or 指名 ---');
  const items = await prisma.posTransaction.findMany({
    where: {
      OR: [
        { itemName: { contains: '同伴' } },
        { itemName: { contains: '指名' } },
        { itemName: { contains: 'SC' } },
        { category: 'charge' }
      ]
    },
    select: {
      itemName: true,
      category: true,
      unitPrice: true
    },
    distinct: ['itemName']
  });
  console.log(JSON.stringify(items, null, 2));

  console.log('\n--- Average Transaction Value by Category ---');
  const avgByCat = await prisma.posTransaction.groupBy({
    by: ['category'],
    _avg: { totalPrice: true },
    _count: { _all: true }
  });
  console.log(JSON.stringify(avgByCat, null, 2));

  // If there's an "entrance" or "set" category, check that too
  console.log('\n--- Companion Analysis ---');
  // Look for people who had a "同伴" item and calculate their total receipt value
  // We can group by receipt ID (which is the first part of tx.id in some setups)
  // Let's just find the transactions that ARE companion items
  const companionTxs = await prisma.posTransaction.findMany({
    where: { itemName: { contains: '同伴' } },
    take: 50
  });
  console.log('Sample companion transactions:', JSON.stringify(companionTxs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
