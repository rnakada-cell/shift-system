
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
    console.log('--- Checking ShiftRequest ---');
    const srCount = await prisma.shiftRequest.count();
    console.log('ShiftRequest count:', srCount);
    
    const srLast = await prisma.shiftRequest.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
    });
    console.log('Last 5 ShiftRequests:', JSON.stringify(srLast, null, 2));

    console.log('\n--- Checking Availability ---');
    const avCount = await prisma.availability.count();
    console.log('Availability count:', avCount);
    
    const avLast = await prisma.availability.findMany({
        take: 5,
        orderBy: { date: 'desc' }
    });
    console.log('Last 5 Availabilities:', JSON.stringify(avLast, null, 2));
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
