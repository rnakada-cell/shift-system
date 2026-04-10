import 'dotenv/config';
import prisma from '../lib/db';

async function main() {
    console.log('--- Syncing Cast Average Sales (30d) ---');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const casts = await prisma.cast.findMany();

    for (const cast of casts) {
        const sales = await prisma.castDailySales.findMany({
            where: {
                castName: cast.name,
                date: { gte: startDateStr }
            }
        });

        const totalSales = sales.reduce((sum, s) => sum + s.totalSales, 0);

        await prisma.cast.update({
            where: { id: cast.id },
            data: { averageSales: totalSales }
        });

        console.log(`Updated ${cast.name}: 30d Sales ¥${totalSales.toLocaleString()}`);
    }
    console.log('Sync complete.');
}

main().catch(console.error);
