import 'dotenv/config';
import prisma from '../lib/db';

async function main() {
    console.log('--- Calibrating Cast Scores ---');
    const casts = await prisma.cast.findMany();
    const shopId = 'love_point';
    const days = 60; // Include Feb and March
    
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    const dateStr = dateLimit.toISOString().split('T')[0];

    for (const cast of casts) {
        // 1. Get attendance hours
        const attendances = await prisma.castAttendance.findMany({
            where: { castId: cast.id, date: { gte: dateStr }, status: 'attend' }
        });

        let totalHours = 0;
        attendances.forEach(att => {
            if (!att.checkIn || !att.checkOut) return;
            const [inH, inM] = att.checkIn.split(':').map(Number);
            const [outH, outM] = att.checkOut.split(':').map(Number);
            let duration = (outH + outM/60) - (inH + inM/60);
            if (duration < 0) duration += 24;
            totalHours += duration;
        });

        // 2. Get sales
        const sales = await prisma.castDailySales.findMany({
            where: { castName: cast.name, date: { gte: dateStr }, shopId }
        });
        const totalSales = sales.reduce((sum, s) => sum + s.totalSales, 0);

        const hourlyRevenue = totalHours > 0 ? totalSales / totalHours : 0;
        
        // 3. Upsert Score
        await prisma.castScore.create({
            data: {
                castId: cast.id,
                periodDays: days,
                hourlyRevenue,
                score: Math.min(100, (hourlyRevenue / 10000) * 100) // Simple normalization
            }
        });

        console.log(`Cast ${cast.name}: Total Sales ¥${totalSales.toLocaleString()}, Hours ${totalHours.toFixed(1)}, HR ¥${Math.round(hourlyRevenue).toLocaleString()}`);
    }
    console.log('Calibration complete.');
}

main().catch(console.error);
