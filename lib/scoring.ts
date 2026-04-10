/**
 * lib/scoring.ts
 * 
 * キャスト評価AI スコアリングエンジン
 * 
 * 重要な仕様:
 * POSCONEのランキングAPIは「期間合計」しか返せない。
 * DBの CastDailySales には「30日間の合計売上」が1エントリとして保存されている。
 * 
 * スコア計算:
 * 1日平均売上 = 期間合計 ÷ 推定出勤日数
 * 時速売上 = 1日平均売上 ÷ 1日の推定稼働時間
 */

import prisma from './db';
import { getCastPerformance } from './analysis';

export interface ScoringConfig {
  periodDays: number;
  estimatedWorkHoursPerDay: number;
  weights: {
    hourlyRevenue: number;
    totalRevenue: number;
    customerCount: number;
    attendanceRate: number;
  };
}

/**
 * 全キャストのスコアを再計算して保存する
 */
export async function updateAllCastScores() {
  const settings = await prisma.storeSetting.findUnique({
    where: { id: 'main-store' }
  });

  const config = {
    periodDays: settings?.scorePeriodDays || 30,
    estimatedWorkHoursPerDay: 5,
    weights: {
      hourlyRevenue: settings?.scoreWeightHourlyRevenue ?? 0.4,
      totalRevenue: settings?.scoreWeightTotalRevenue ?? 0.3,
      customerCount: settings?.scoreWeightCustomerCount ?? 0.2,
      attendanceRate: settings?.scoreWeightAttendanceRate ?? 0.1,
    }
  };

  const now = new Date();
  const startDate = new Date();
  startDate.setDate(now.getDate() - config.periodDays);
  const startDateStr = startDate.toISOString().split('T')[0];

  console.log(`[SCORING] Updating scores using CastDailySales aggregate data`);
  
  // 1. 全キャストの30日間の売上実績を取得 (CastDailySales から)
  const salesData = await prisma.castDailySales.findMany({
    where: { date: { gte: startDateStr } }
  });
  
  const casts = await prisma.cast.findMany();
  
  // 店舗全体の最大値を算出（正規化用）
  const maxTotalRevenue = Math.max(...salesData.map(s => s.totalSales), 1);

  for (const cast of casts) {
    // このキャストの全店舗分の売上を合算
    const castSales = salesData.filter(s => s.castName === cast.name);
    const periodTotalRevenue = castSales.reduce((sum, s) => sum + s.totalSales, 0);
    
    // 出勤日数の推定 (デフォルト10日)
    const estimatedDays = Math.max(1, (cast as any).monthlyAttendanceCount || 10); 
    
    // 売上が極端に低い（5,000円未満）場合は 0 にする (14円/h問題の対策)
    const hourlyRevenue = (periodTotalRevenue > 5000) 
      ? (periodTotalRevenue / (estimatedDays * 5))
      : 0;

    const attendanceRate = Math.max(0, 1.0 - (cast.absenceRate || 0));

    // 各指標の正規化 (0.0 - 1.0)
    // 期間売上100万円以上で満点に近い評価になるように調整
    const normHourly = Math.min(1.0, hourlyRevenue / 15000); 
    const normTotal = Math.min(1.0, periodTotalRevenue / Math.max(maxTotalRevenue, 1000000));
    const normAttendance = attendanceRate;
    const normCustomers = Math.min(1.0, (periodTotalRevenue / 8000) / 100); // 推定客数（単価8000円計算）

    // 重み付きスコア計算 (0 - 100)
    const weightedScore = (
      (normHourly * config.weights.hourlyRevenue) +
      (normTotal * config.weights.totalRevenue) +
      (normCustomers * config.weights.customerCount) +
      (normAttendance * config.weights.attendanceRate)
    ) * 100;

    // 前回のスコアを削除
    await prisma.castScore.deleteMany({ where: { castId: cast.id } });

    const estimatedCustomers = Math.max(1, Math.round(periodTotalRevenue / 8000));

    await prisma.castScore.create({
      data: {
        castId: cast.id,
        periodDays: config.periodDays,
        hourlyRevenue: hourlyRevenue,
        hourlyCustomers: estimatedCustomers, // 推定客数
        attendanceRate,
        score: weightedScore,
        granularRevenue: {} 
      }
    });

    await prisma.cast.update({
      where: { id: cast.id },
      data: {
        // 1客あたりの平均売上を算出
        averageSales: Math.round(periodTotalRevenue / estimatedCustomers),
        // aiScore（1000点満点）
        aiScore: Math.round(weightedScore * 10) 
      }
    });
  }

  console.log(`[SCORING] Finished updating scores with ARPU integration.`);
}

/** "HH:mm" 文字列をミリ秒に変換 */
function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return d.getTime();
}
