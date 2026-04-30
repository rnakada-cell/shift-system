
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const count = await prisma.availability.count();
    console.log('Availability count:', count);
    
    const last = await prisma.availability.findMany({
        take: 10,
        orderBy: { date: 'desc' },
        include: { cast: { select: { name: true } } }
    });
    console.log('Last 10 Availabilities:', JSON.stringify(last, null, 2));
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
