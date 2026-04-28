const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const date = '2026-05-02';
  console.log(`Checking DB for date: ${date}`);
  
  const confirmed = await prisma.confirmedShift.findMany({
    where: { date }
  });
  
  const availability = await prisma.availability.findMany({
    where: { date }
  });
  
  console.log('Confirmed Shifts Count:', confirmed.length);
  if (confirmed.length > 0) {
    console.log('Confirmed Names:', confirmed.map(c => c.castName).join(', '));
  }
  
  console.log('Availability (Requested) Count:', availability.length);
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => console.error(e));
