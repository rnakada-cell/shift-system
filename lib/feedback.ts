import prisma from './db';
import { optimizeShift, Cast, TimeSegment, CastAvailability } from './optimizer';

/**
 * 過去の特定の日の「予測売上」と「実績売上」を比較し、AIの誤差を分析する
 */
export async function analyzePredictionAccuracy(date: string) {
    // 1. その日の実際の売上を取得（1時間ごとの粒度）
    // NOTE: DBのTZ設定に注意が必要ですが、ここでは日付文字列ベースでの簡易検索とします
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59`);

    const actualTransactions = await prisma.posTransaction.findMany({
        where: {
            closedAt: {
                gte: start,
                lte: end
            }
        }
    });

    const actualRevenue = actualTransactions.reduce((sum, tx: any) => sum + (tx.totalPrice || 0), 0);

    // 2. その日に実際に入っていたシフト（確定済み）を取得
    const confirmedShifts = await prisma.shift.findMany({
        where: { date }
    });

    if (confirmedShifts.length === 0) {
        return { success: false, message: "No confirmed shifts found for this date.", actualRevenue };
    }

    // 3. 当時の予測値を再現するために、当時の状況でオプティマイザを走らせる
    // (実際には Shift テーブルに expectedRevenue を保存しておくのが理想だが、今は再計算でシミュレーション)
    
    // ストア設定、キャスト情報を取得
    const settings = await prisma.storeSetting.findUnique({ where: { id: 'main-store' } });
    if (!settings) return { success: false, message: "Settings not found" };

    const dbCasts = await prisma.cast.findMany({
        include: { castScores: { orderBy: { calculatedAt: 'desc' }, take: 1 } }
    });

    // 確定シフトを可用性データとして変換（その人たちがその時間に確実にいたと仮定）
    const simulatedAvailabilities: CastAvailability[] = dbCasts.map(c => {
        const myShifts = confirmedShifts.filter(s => s.castId === c.id);
        return {
            castId: c.id,
            availability: [{
                date,
                segments: myShifts.map(s => ({
                    segmentId: s.segmentId || 'SEG_0_0', // fallback
                    hasCompanion: false, // 過去の同伴フラグが不明なため一旦false
                    hasDropIn: false
                }))
            }]
        };
    });

    const timeSegments = (settings.defaultSegments as any[]).map(s => ({
        id: s.id,
        label: s.label,
        hours: Number(s.hours) || 2,
        demandFactor: Number(s.demandFactor) || 1.0,
        maxCapacity: Number(s.maxCapacity) || 10
    }));

    // オプティマイザ実行
    const result = optimizeShift(
        [date],
        dbCasts.map(c => ({
            id: c.id,
            name: c.name,
            rank: c.rank,
            hourlyWage: c.hourlyWage,
            drinkBackRate: c.drinkBackRate ?? 0,
            chekiBackRate: c.chekiBackRate ?? 0,
            averageSales: c.averageSales,
            nominationRate: c.nominationRate ?? 0,
            snsFollowers: c.snsFollowers ?? 0,
            absenceRate: c.absenceRate ?? 0,
            floorPreference: c.floorPreference ?? 'ANY',
            canOpen: c.canOpen ?? false,
            canClose: c.canClose ?? false,
            isRookie: c.isRookie ?? false,
            preferredSegments: c.preferredSegments,
            aiScore: (c as any).castScores?.[0]?.score || 0,
            hourlyRevenue: (c as any).castScores?.[0]?.hourlyRevenue || 0,
            granularRevenue: (c as any).castScores?.[0]?.granularRevenue || null
        })),
        simulatedAvailabilities,
        timeSegments,
        'REVENUE_MAX'
    );

    const predictedRevenue = result.summary.totalRevenue;

    return {
        date,
        actualRevenue,
        predictedRevenue,
        diff: actualRevenue - predictedRevenue,
        accuracy: predictedRevenue > 0 ? (actualRevenue / predictedRevenue) : 0,
        summary: result.summary,
        // AIがなぜそう予測したかの詳細
        segments: result.dailyResults[0].segments.map(seg => ({
            segmentId: seg.segmentId,
            predicted: seg.expectedRevenue,
            castIds: seg.assignedCastIds
        }))
    };
}
