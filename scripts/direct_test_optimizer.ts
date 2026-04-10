import 'dotenv/config';
import { prisma } from '../lib/db';
import { optimizeShift } from '../lib/optimizer';

async function main() {
    console.log('🚀 Direct Optimization Test Starting...');
    
    // 明日の日付
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`📅 Target Date: ${dateStr}`);

    // キャスト、出勤希望、ペアルールの取得
    const [casts, availabilities, pairRules, settings] = await Promise.all([
        prisma.cast.findMany({ include: { castScores: { orderBy: { calculatedAt: 'desc' }, take: 1 } } }),
        prisma.availability.findMany({ where: { date: dateStr } }),
        prisma.castPairRule.findMany(),
        prisma.storeSetting.findUnique({ where: { id: 'main-store' } })
    ]);

    if (!settings) throw new Error('Store settings not found');
    const rawSegments = settings.defaultSegments as any[];
    const timeSegments = rawSegments.map(s => {
        let fallbackHours = 2;
        if (s.label && s.label.includes(' - ')) {
            const [start, end] = s.label.split(' - ');
            const startHour = parseInt(start.split(':')[0]);
            let endHour = parseInt(end.split(':')[0]);
            if (endHour < startHour) endHour += 24;
            fallbackHours = Math.max(1, endHour - startHour);
        }
        return {
            id: s.id,
            label: s.label,
            hours: Number(s.hours) || fallbackHours,
            demandFactor: Number(s.demandFactor) || 1.0,
            maxCapacity: Number(s.maxCapacity) || 4,
        };
    });

    if (availabilities.length === 0) {
        console.error('❌ No availabilities found for tomorrow. Please run create_mock_availability.ts first.');
        return;
    }

    console.log(`📊 Input: ${casts.length} casts, ${availabilities.length} avails, ${pairRules.length} rules.`);

    // 前処理（APIルートと同じロジック）
    const castData = casts.map(c => ({
        ...c,
        aiScore: c.castScores[0]?.score ?? 0
    }));

    // 修正: オプティマイザーが期待する CastAvailability[] 構造 (1キャストあたり1つの availability 配列)
    // 修正: オプティマイザーが期待する CastAvailability[] 構造
    const availData = casts.map(c => {
        const myAvails = availabilities.filter(a => a.castId === c.id);
        if (myAvails.length === 0) return null;
        
        return {
            castId: c.id,
            availability: myAvails.map(a => ({
                date: a.date,
                startTime: a.startTime,
                endTime: a.endTime,
                targetFloor: a.targetFloor as any,
                segments: a.segments as any || []
            }))
        } as any;
    }).filter(ad => ad !== null);

    console.log(`📊 Transformed: ${availData.length} casts have avails.`);

    console.log('⚙️ Running Optimizer logic...');
    const startTime = Date.now();
    
    const result = optimizeShift(
        [dateStr],
        casts as any,
        availData,
        timeSegments,
        'PROFIT_MAX',
        'daily',
        undefined, // weights
        undefined, // constraints
        undefined, // dayCapacities
        pairRules as any,
        undefined  // scrapedData
    );

    const endTime = Date.now();
    console.log(`✨ Optimization finished in ${(endTime - startTime) / 1000}s`);

    console.log(`\n💰 Results:`);
    console.log(`   - Total Revenue: ¥${result.summary.totalRevenue.toLocaleString()}`);
    console.log(`   - Total Cost: ¥${result.summary.totalCost.toLocaleString()}`);
    console.log(`   - Profit: ¥${result.summary.totalProfit.toLocaleString()}`);
    console.log(`   - Profit Margin: ${((result.summary.totalProfit / result.summary.totalRevenue) * 100).toFixed(1)}%`);

    const firstDay = result.dailyResults[0];
    if (firstDay) {
        console.log('\n📅 Segments Overview:');
        firstDay.segments.forEach(seg => {
            console.log(`\n  [Segment: ${seg.segmentId}]`);
            console.log(`     Cnt: ${seg.assignments?.length || 0} | Rev: ¥${seg.expectedRevenue.toLocaleString()}`);
            
            const f1 = (seg.assignments || []).filter(a => a.floor === '1F');
            const f2 = (seg.assignments || []).filter(a => a.floor === '2F');
            
            console.log(`     1F (${f1.length}): ${f1.map(a => a.castId.substring(0,4)).join(', ')}`);
            console.log(`     2F (${f2.length}): ${f2.map(a => a.castId.substring(0,4)).join(', ')}`);
        });
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
