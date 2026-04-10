import 'dotenv/config';
import prisma from '../lib/db';

async function main() {
    console.log('--- Cleaning up Corrupted Attendance (Serial Dates) ---');
    
    // Find all records where date doesn't match YYYY-MM-DD pattern
    const allAtt = await prisma.castAttendance.findMany();
    let deleteCount = 0;

    for (const att of allAtt) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(att.date)) {
            console.log(`Deleting invalid date: [${att.date}] for castId: ${att.castId}`);
            await prisma.castAttendance.delete({ where: { id: att.id } });
            deleteCount++;
        }
    }

    console.log(`Cleaned up ${deleteCount} corrupted records.`);
}

main().catch(console.error);
