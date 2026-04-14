const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function check() {
    const pool = new Pool({
        connectionString: "postgresql://postgres.njtethmjihphnyzsdcqg:Rutsuki0412@3.39.47.126:5432/postgres?sslmode=disable",
        ssl: { rejectUnauthorized: false }
    });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        const shifts = await prisma.shift.findMany({
            where: {
                OR: [
                    { isSwapRequested: true },
                    { swapStatus: 'APPLIED' }
                ]
            }
        });
        console.log("Found Shifts under Swap:", JSON.stringify(shifts, null, 2));
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}
check();
