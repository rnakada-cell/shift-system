const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function testSwapWorkflow() {
    console.log("Starting Full Swap Workflow Test...");

    const pool = new Pool({
        connectionString: "postgresql://postgres.njtethmjihphnyzsdcqg:Rutsuki0412@3.39.47.126:5432/postgres?sslmode=disable",
        ssl: { rejectUnauthorized: false }
    });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        // 1. Setup Test Casts
        let castA = await prisma.cast.findFirst({ where: { name: 'TestCastA' } });
        if (!castA) castA = await prisma.cast.create({ data: { name: 'TestCastA', hourlyWage: 2000, averageSales: 50000, rank: 'B' } });
        
        let castB = await prisma.cast.findFirst({ where: { name: 'TestCastB' } });
        if (!castB) castB = await prisma.cast.create({ data: { name: 'TestCastB', hourlyWage: 2000, averageSales: 50000, rank: 'B' } });

        console.log(`Casts: A=${castA.id}, B=${castB.id}`);

        // 2. Create a test shift
        const date = "2026-03-99"; // Dummy date
        await prisma.shift.deleteMany({ where: { date } }); // Cleanup
        
        const shiftData = {
            date,
            shopId: 'love_point',
            segmentId: '12:00-12:30',
            castId: castA.id,
            floor: '1F'
        };
        await prisma.shift.create({ data: shiftData });
        console.log(`Test Shift created for ${castA.name} on ${date}`);

        // 3. Request Swap (Cast A)
        console.log("Action: Cast A requests swap...");
        await prisma.shift.updateMany({
            where: { date, castId: castA.id },
            data: { isSwapRequested: true, swapStatus: 'REQUESTED', swapNote: 'I am sick' }
        });

        // 4. Apply for Swap (Cast B)
        console.log("Action: Cast B applies for swap...");
        await prisma.shift.updateMany({
            where: { date, castId: castA.id, isSwapRequested: true },
            data: { swapApplicantId: castB.id, swapStatus: 'APPLIED' }
        });

        // 5. Check Manager View
        let app = await prisma.shift.findFirst({ where: { date, isSwapRequested: true, swapStatus: 'APPLIED' } });
        console.log("Manager sees Application:", { applicant: app.swapApplicantId });

        // 6. Manager Approve
        console.log("Action: Manager approves swap...");
        await prisma.$transaction(async (tx) => {
            await tx.shift.updateMany({
                where: { date, castId: castA.id, swapApplicantId: castB.id },
                data: {
                    castId: castB.id,
                    isSwapRequested: false,
                    swapApplicantId: null,
                    swapStatus: 'NONE',
                    swapNote: null
                }
            });
        });

        // 7. Verify Result
        let result = await prisma.shift.findFirst({ where: { date } });
        console.log("Final State:", { castId: result.castId, name: result.castId === castB.id ? 'TestCastB' : 'Error' });

        if (result.castId === castB.id) {
            console.log("✅ Full Swap Workflow Success!");
        } else {
            console.log("❌ Full Swap Workflow Failed.");
        }

        // Cleanup
        await prisma.shift.deleteMany({ where: { date } });
        // Keep casts for next time or delete them
        // await prisma.cast.delete({ where: { id: castA.id } });
        // await prisma.cast.delete({ where: { id: castB.id } });

    } catch (e) {
        console.error("Test Error:", e);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

testSwapWorkflow();
