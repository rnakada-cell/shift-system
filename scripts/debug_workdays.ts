import 'dotenv/config';
import { prisma } from '../lib/db';

async function main() {
    // しゅうほのTransactionデータを確認
    const txDates = await prisma.posTransaction.findMany({
        where: { castName: 'しゅうほ' },
        select: { closedAt: true },
        orderBy: { closedAt: 'asc' }
    });
    
    const uniqueDays = new Set(txDates.map(tx => tx.closedAt.toISOString().split('T')[0]));
    console.log(`しゅうほ: ${txDates.length}件のTx / ${uniqueDays.size}日出勤`);
    console.log('出勤日:', [...uniqueDays].slice(0, 10));
    
    // 全キャストの出勤日数分布を確認
    const casts = await prisma.cast.findMany();
    for (const cast of casts.slice(0, 10)) {
        const txs = await prisma.posTransaction.findMany({
            where: { castName: cast.name },
            select: { closedAt: true }
        });
        const days = new Set(txs.map(tx => tx.closedAt.toISOString().split('T')[0])).size;
        const sales = await prisma.castDailySales.findFirst({ where: { castName: cast.name } });
        console.log(`${cast.name}: Tx出勤${days}日, 期間売上¥${sales?.totalSales?.toLocaleString()}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
