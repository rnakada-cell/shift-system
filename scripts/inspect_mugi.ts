import 'dotenv/config';
import prisma from '../lib/db';

async function main() {
    const cast = await prisma.cast.findFirst({ where: { name: 'むぎ' } });
    if (!cast) return;
    
    const attendances = await prisma.castAttendance.findMany({
        where: { castId: cast.id },
        orderBy: { date: 'asc' }
    });
    
    console.log(`Cast: ${cast.name}, Total attendance records: ${attendances.length}`);
    attendances.forEach(a => {
        console.log(`Date: [${a.date}], ID: ${a.id}, Shop: ${a.shopId}`);
    });
}

main().catch(console.error);
