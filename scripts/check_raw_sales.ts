import 'dotenv/config';
import { prisma } from '../lib/db';

async function main() {
    // 日別集計を確認
    console.log('=== DailySummary (店舗全体の日別売上) ===');
    const summaries = await prisma.dailySummary.findMany({
        orderBy: { date: 'desc' },
        take: 10,
    });
    summaries.forEach(s => {
        console.log(`  ${s.date} [${s.shopId}] 売上: ¥${s.salesInclTax?.toLocaleString()} 客数: ${s.customerCount} 客単価: ¥${s.avgUnitPrice?.toLocaleString()}`);
    });

    // キャスト別日次売上を確認
    console.log('\n=== CastDailySales (キャスト別日次売上 上位10件) ===');
    const castSales = await prisma.castDailySales.findMany({
        orderBy: { totalSales: 'desc' },
        take: 10,
    });
    castSales.forEach(s => {
        console.log(`  ${s.date} [${s.castName}] 売上: ¥${s.totalSales?.toLocaleString()}`);
    });

    // 1日の全キャスト合計を計算
    const latestDate = castSales[0]?.date;
    if (latestDate) {
        const daySales = await prisma.castDailySales.aggregate({
            where: { date: latestDate },
            _sum: { totalSales: true }
        });
        console.log(`\n📊 ${latestDate} の全キャスト合計売上: ¥${daySales._sum.totalSales?.toLocaleString()}`);
    }

    // AIスコアを確認
    console.log('\n=== CastScores (AIスコア = 時速売上) ===');
    const scores = await prisma.castScore.findMany({
        include: { cast: true },
        orderBy: { score: 'desc' },
        take: 10
    });
    scores.forEach((s, i) => {
        console.log(`  ${i+1}. [${s.cast.name}] ¥${Math.round(s.score).toLocaleString()}/h`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
