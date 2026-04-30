
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
    const segments = [
        { id: 'SEG_11_13', label: '11:00 - 13:00', hours: 2, demandFactor: 0.5, maxCapacity: 10 },
        { id: 'SEG_13_15', label: '13:00 - 15:00', hours: 2, demandFactor: 0.7, maxCapacity: 12 },
        { id: 'SEG_15_17', label: '15:00 - 17:00', hours: 2, demandFactor: 0.8, maxCapacity: 15 },
        { id: 'SEG_17_19', label: '17:00 - 19:00', hours: 2, demandFactor: 1.0, maxCapacity: 17 },
        { id: 'SEG_19_21', label: '19:00 - 21:00', hours: 2, demandFactor: 1.3, maxCapacity: 20 },
        { id: 'SEG_21_23', label: '21:00 - 23:00', hours: 2, demandFactor: 1.2, maxCapacity: 17 },
        { id: 'SEG_23_01', label: '23:00 - 01:00', hours: 2, demandFactor: 0.9, maxCapacity: 12 },
    ];

    const updated = await prisma.storeSetting.upsert({
        where: { id: 'main-store' },
        update: {
            businessStart: '11:00',
            businessEnd: '01:00',
            defaultSegments: segments
        },
        create: {
            id: 'main-store',
            name: 'Love Point',
            businessStart: '11:00',
            businessEnd: '01:00',
            defaultSegments: segments
        }
    });
    console.log('Updated Store Settings:', JSON.stringify(updated, null, 2));
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
