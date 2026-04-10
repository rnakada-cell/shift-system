import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { analyzePredictionAccuracy } from '@/lib/feedback';
import { PosTransaction, Shift } from '@prisma/client';

/**
 * AI Calibration API: 
 * POSデータと予測値を比較し、キャスト個別の実力値（hourlyRevenue / granularRevenue）を自動更新する
 */
export async function POST(req: Request) {
    try {
        const { date } = await req.json();
        if (!date) return NextResponse.json({ success: false, error: "Date is required" }, { status: 400 });

        // 1. 精度分析の実行
        const report = await analyzePredictionAccuracy(date);
        
        // 2. キャストごとの実効売上を計算
        // セグメントごとの実際の売上を、そのセグメントに出勤していたキャストに案分する
        const transactions = await prisma.posTransaction.findMany({
            where: {
                closedAt: {
                    gte: new Date(`${date}T00:00:00`),
                    lte: new Date(`${date}T23:59:59`)
                }
            }
        });

        const shifts = await prisma.shift.findMany({
            where: { date }
        });

        if (shifts.length === 0) {
            return NextResponse.json({ success: true, message: "No shifts to calibrate", report });
        }

        // セグメントごとの実績売上を集計
        const segmentActuals: Record<string, number> = {};
        transactions.forEach((tx: PosTransaction) => {
            const hour = tx.closedAt.getHours();
            const segmentId = `SEG_${hour}_${hour + 2}`; // 簡易的なセグメントマッピング
            segmentActuals[segmentId] = (segmentActuals[segmentId] || 0) + (tx.totalPrice || 0);
        });

        const updates = [];

        // キャストごとにその日の平均時間売上を算出
        const castPerformance: Record<string, { totalActual: number, segments: number }> = {};
        
        shifts.forEach((s: Shift) => {
            const segActual = segmentActuals[s.segmentId || ''] || 0;
            const castCount = shifts.filter((sh: Shift) => sh.segmentId === s.segmentId).length;
            const sharedRevenue = castCount > 0 ? segActual / castCount : 0;

            if (!castPerformance[s.castId]) {
                castPerformance[s.castId] = { totalActual: 0, segments: 0 };
            }
            castPerformance[s.castId].totalActual += sharedRevenue;
            castPerformance[s.castId].segments += 1;
        });

        // 3. CastScore テーブルを更新（最新の実力値を反映）
        for (const [castId, perf] of Object.entries(castPerformance)) {
            const dailyHourlyRevenue = perf.segments > 0 ? (perf.totalActual / (perf.segments * 2)) : 0; // 1セグメント2h計算

            // 既存の最新スコアを取得
            const latestScore = await prisma.castScore.findFirst({
                where: { castId },
                orderBy: { calculatedAt: 'desc' }
            });

            if (latestScore) {
                // 指数移動平均(EMA)的な更新: 0.7 * 旧 + 0.3 * 新
                const updatedHourlyRevenue = Math.round(((latestScore.hourlyRevenue || 0) * 0.7) + (dailyHourlyRevenue * 0.3));
                
                // GranularRevenueもスロットに合わせて徐々に更新（ここでは簡易的に全体を一律調整）
                const granular = latestScore.granularRevenue as Record<string, number> || {};
                const updatedGranular = { ...granular };
                Object.keys(updatedGranular).forEach(slot => {
                    updatedGranular[slot] = Math.round(updatedGranular[slot] * (updatedHourlyRevenue / (latestScore.hourlyRevenue || 1)));
                });

                await prisma.castScore.create({
                    data: {
                        castId,
                        periodDays: latestScore.periodDays || 30,
                        score: latestScore.score, // スコアの基本計算は別のロジック(recalculate)で行う
                        hourlyRevenue: updatedHourlyRevenue,
                        granularRevenue: updatedGranular,
                        calculatedAt: new Date()
                    }
                });
                
                updates.push({ castId, old: latestScore.hourlyRevenue, new: updatedHourlyRevenue });
            }
        }

        return NextResponse.json({
            success: true,
            calibrationDate: date,
            accuracyReport: report,
            updatesCount: updates.length,
            updates
        });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
