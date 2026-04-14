const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.njtethmjihphnyzsdcqm:Rutsuki0412@3.39.47.126:5432/postgres?sslmode=disable"
    }
  }
});

async function main() {
  try {
    const casts = await prisma.cast.findMany({ take: 1 });
    console.log("Casts found:", casts.length);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
