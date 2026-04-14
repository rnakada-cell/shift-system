const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function testSwapWorkflow() {
    console.log("Starting Swap Workflow Test (Direct Connection)...");

    const pool = new Pool({
        connectionString: "postgresql://postgres.njtethmjihphnyzsdcqg:Rutsuki0412@3.39.47.126:5432/postgres?sslmode=disable",
        ssl: { rejectUnauthorized: false }
    });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        // 1. Get a test shift
        const shift = await prisma.shift.findFirst();
        if (!shift) {
            console.log("No shifts found to test swap.");
            return;
        }

        const originalCastId = shift.castId;
        const date = shift.date;
        const shopId = shift.shopId;

        console.log(`Original Shift: Date=${date}, Cast=${originalCastId}`);

        // 2. Request Swap
        console.log("Requesting Swap...");
        await prisma.shift.updateMany({
            where: { date, castId: originalCastId, shopId },
            data: {
                isSwapRequested: true,
                swapStatus: 'REQUESTED',
                swapNote: 'Test Request'
            }
        });

        let updated = await prisma.shift.findFirst({ where: { date, castId: originalCastId, shopId } });
        console.log("After Request:", { isSwapRequested: updated?.isSwapRequested, swapStatus: updated?.swapStatus });

        // 3. Apply for Swap (Another cast)
        const anotherCast = await prisma.cast.findFirst({ where: { id: { not: originalCastId } } });
        if (!anotherCast) {
            console.log("No other cast found to apply.");
            return;
        }
        const applicantId = anotherCast.id;
        console.log(`Applying for Swap: Applicant=${applicantId}`);

        await prisma.shift.updateMany({
            where: { date, castId: originalCastId, shopId, isSwapRequested: true },
            data: {
                swapApplicantId: applicantId,
                swapStatus: 'APPLIED'
            }
        });

        updated = await prisma.shift.findFirst({ where: { date, castId: originalCastId, shopId } });
        console.log("After Apply:", { swapApplicantId: updated?.swapApplicantId, swapStatus: updated?.swapStatus });

        // 4. Manager Approve
        console.log("Approving Swap...");
        await prisma.$transaction(async (tx) => {
            await tx.shift.updateMany({
                where: { date, castId: originalCastId, shopId, swapApplicantId: applicantId },
                data: {
                    castId: applicantId, // SWAP!
                    isSwapRequested: false,
                    swapApplicantId: null,
                    swapStatus: 'NONE',
                    swapNote: null
                }
            });
        });

        updated = await prisma.shift.findFirst({ where: { date, castId: applicantId, shopId } });
        console.log("After Approve:", { castId: updated?.castId, isSwapRequested: updated?.isSwapRequested, swapStatus: updated?.swapStatus });

        if (updated?.castId === applicantId && !updated?.isSwapRequested) {
            console.log("✅ Swap Workflow Success!");
        } else {
            console.log("❌ Swap Workflow Failed.");
        }
    } catch (e) {
        console.error("Test Error:", e);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

testSwapWorkflow();
