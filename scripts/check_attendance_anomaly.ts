import 'dotenv/config';
import prisma from '../lib/db';

async function main() {
    const now = new Date('2026-03-24'); // Fixed date for consistency
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    
    const castAttendances = await prisma.cast.findMany({
        include: {
            _count: {
                select: { attendances: { where: { date: { gte: firstDay } } } }
            }
        }
    });

    for (const c of castAttendances) {
        if (c._count.attendances > 31) {
            console.log(`Cast ${c.name} (ID: ${c.id}) has ${c._count.attendances} attendances since ${firstDay}.`);
            
            const detailed = await prisma.castAttendance.findMany({
                where: { castId: c.id, date: { gte: firstDay } },
                orderBy: { date: 'asc' }
            });
            
            const dates = detailed.map(a => a.date);
            const counts: any = {};
            dates.forEach(d => counts[d] = (counts[d] || 0) + 1);
            
            for (const d in counts) {
                if (counts[d] > 1) {
                    console.log(`  Duplicate on ${d}: ${counts[d]} records`);
                }
            }
        }
    }
}

main().catch(console.error);
