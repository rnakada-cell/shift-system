const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.castDailySales.count();
  console.log("CastDailySales count:", count);
  const sample = await prisma.castDailySales.findFirst();
  console.log("Sample:", sample);
  
  const casts = await prisma.cast.findMany({ select: { name: true } });
  console.log("Casts count:", casts.length);
  console.log("Casts sample:", casts.slice(0,3));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
