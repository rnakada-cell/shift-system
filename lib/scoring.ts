import prisma from './db';
import { getCastPerformance } from './analysis';

export interface ScoringConfig {
  periodDays: number;
  weights: {
    hourlyRevenue: number;
    totalRevenue: number;
    transactionCount: number;
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

  const config: ScoringConfig = {
    periodDays: settings?.scorePeriodDays || 30,
    weights: {
      hourlyRevenue: settings?.scoreWeightHourlyRevenue ?? 0.4,
      totalRevenue: settings?.scoreWeightTotalRevenue ?? 0.3,
      transactionCount: settings?.scoreWeightCustomerCount ?? 0.2,
      attendanceRate: settings?.scoreWeightAttendanceRate ?? 0.1,
    }
  };

  console.log(`[SCORING] Updating scores using real POS performance data (14:00-00:00 range)`);
  
  // 1. POSデータから実績を取得
  const performanceData = await getCastPerformance('love_point', config.periodDays);
  const performanceMap = new Map(performanceData.map(p => [p.castName, p]));

  // 2. アクティブなキャストのみ取得
  const casts = await prisma.cast.findMany({
    where: { isActive: true }
  });
  
  // 正規化用の最大値を算出
  const maxTotalRevenue = Math.max(...performanceData.map(p => p.totalSales), 100000);
  const maxTxCount = Math.max(...performanceData.map(p => p.transactionCount), 10);

  for (const cast of casts) {
    const perf = performanceMap.get(cast.name);
    
    const hourlyRevenue = perf?.hourlyRevenueBySlot.overall || 0;
    const totalRevenue = perf?.totalSales || 0;
    const txCount = perf?.transactionCount || 0;
    const attendanceRate = Math.max(0, 1.0 - (cast.absenceRate || 0));

    // 各指標の正規化 (0.0 - 1.0)
    const normHourly = Math.min(1.0, hourlyRevenue / 15000); 
    const normTotal = Math.min(1.0, totalRevenue / maxTotalRevenue);
    const normAttendance = attendanceRate;
    const normTx = Math.min(1.0, txCount / maxTxCount);

    // 重み付きスコア計算 (0 - 100)
    let weightedScore = (
      (normHourly * config.weights.hourlyRevenue) +
      (normTotal * config.weights.totalRevenue) +
      (normTx * config.weights.transactionCount) +
      (normAttendance * config.weights.attendanceRate)
    ) * 100;

    // 前回のスコアを削除
    await prisma.castScore.deleteMany({ where: { castId: cast.id } });

    // スコア保存
    await prisma.castScore.create({
      data: {
        castId: cast.id,
        periodDays: config.periodDays,
        hourlyRevenue: hourlyRevenue,
        hourlyCustomers: txCount,
        attendanceRate,
        score: weightedScore,
        granularRevenue: perf?.hourlyRevenueBySlot || {} 
      }
    });

    // キャストマスタの更新
    await prisma.cast.update({
      where: { id: cast.id },
      data: {
        averageSales: perf?.arpu || 0,
        aiScore: Math.round(weightedScore * 10),
        // 入店日から2ヶ月以内なら強制的に isRookie = true
        isRookie: cast.joinedDate ? (new Date().getTime() - cast.joinedDate.getTime() < 60 * 24 * 60 * 60 * 1000) : cast.isRookie
      }
    });
  }

  console.log(`[SCORING] Finished updating scores for ${casts.length} active casts.`);
}
