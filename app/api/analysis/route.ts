import { NextResponse } from 'next/server';
import { getCastPerformance, getStoreTrends, getDemandTrends } from '@/lib/analysis';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get('shopId') || 'love_point';
  const days = parseInt(searchParams.get('days') || '30', 10);

  try {
    const [castPerformance, storeTrends, rawDemandTrends] = await Promise.all([
      getCastPerformance(shopId, days),
      getStoreTrends(shopId, days),
      getDemandTrends(shopId, 90) // 需要トレンドは少し長めの期間で取得
    ]);

    // フロントエンド（InsightAnalysis.tsx）の期待する形式に変換
    const demandTrends = rawDemandTrends
      .filter((t: any) => t.dayOfWeek === new Date().getDay()) // 今日と同じ曜日のデータのみ（抽出条件は要検討だが、まずはこれで表示確認）
      .map((t: any) => ({
        hour: t.hour,
        count: t.avgCustomerCount,
        suggestedSupply: Math.max(1, t.avgCustomerCount / 4) // 1人あたり4人を接客できると仮定して推奨人数を算出
      }))
      .sort((a: any, b: any) => a.hour - b.hour);

    return NextResponse.json({
      castPerformance,
      storeTrends,
      demandTrends,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ANALYSIS API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analysis' }, { status: 500 });
  }
}
