import prisma from './db';
import { PosTransaction, CastAttendance, Cast } from '@prisma/client';

export interface ItemStat {
  itemName: string;
  category: string;
  count: number;
  totalSales: number;
}

export interface CastAnalysis {
  castName: string;
  totalSales: number;
  transactionCount: number;
  arpu: number;
  topItems: ItemStat[];
  hourlyRevenueBySlot: {
    early: number; // 14-18
    mid: number;   // 18-21
    late: number;  // 21-00
    overall: number;
  };
}

/**
 * 過去N日間のキャスト別・アイテム別パフォーマンスを分析
 */
export async function getCastPerformance(shopId: string, days: number = 30) {
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);

  const [transactions, attendances] = await Promise.all([
    prisma.posTransaction.findMany({
      where: {
        shopId,
        closedAt: { gte: dateLimit }
      },
      select: {
          id: true,
          castName: true,
          totalPrice: true,
          quantity: true,
          closedAt: true,
          itemName: true,
          category: true
      }
    }),
    prisma.castAttendance.findMany({
      where: {
        shopId,
        date: { gte: dateLimit.toISOString().split('T')[0] },
        status: 'attend'
      },
      include: { cast: true }
    })
  ]);

  const castMap = new Map<string, { 
    totalSales: number, 
    count: number, 
    items: Map<string, ItemStat>,
    salesBySlot: { early: number, mid: number, late: number },
    hoursBySlot: { early: number, mid: number, late: number },
    txIds: Set<string>
  }>();

  // 1. 売上の計上（外れ値処理込み）
  transactions.forEach((tx) => {
    if (!castMap.has(tx.castName)) {
      castMap.set(tx.castName, { 
        totalSales: 0, count: 0, items: new Map(),
        salesBySlot: { early: 0, mid: 0, late: 0 },
        hoursBySlot: { early: 0, mid: 0, late: 0 },
        txIds: new Set<string>()
      });
    }
    const data = castMap.get(tx.castName)!;

    // 10万キャップ（外れ値除去）を確実に適用
    const cappedPrice = Math.min(tx.totalPrice || 0, 100000);
    
    data.totalSales += cappedPrice;
    data.count += tx.quantity || 0;
    data.txIds.add(tx.id.split('-')[0]);

    const date = new Date(tx.closedAt);
    const hour = date.getHours();

    if (hour >= 14 && hour < 18) {
      data.salesBySlot.early += cappedPrice;
    } else if (hour >= 18 && hour < 21) {
      data.salesBySlot.mid += cappedPrice;
    } else if (hour >= 21 || hour < 2) { // 21:00以降
      data.salesBySlot.late += cappedPrice;
    }

    if (!data.items.has(tx.itemName)) {
      data.items.set(tx.itemName, { itemName: tx.itemName, category: tx.category, count: 0, totalSales: 0 });
    }
    const item = data.items.get(tx.itemName)!;
    item.count += tx.quantity || 0;
    item.totalSales += cappedPrice;
  });

  // 2. 勤務時間の計上
  attendances.forEach((att: CastAttendance & { cast: Cast }) => {
    const castName = att.cast.name;
    if (!castMap.has(castName)) return;
    const data = castMap.get(castName)!;

    if (!att.checkIn || !att.checkOut) return;

    const [inH, inM] = att.checkIn.split(':').map(Number);
    const [outH, outM] = att.checkOut.split(':').map(Number);
    
    let duration = (outH + outM/60) - (inH + inM/60);
    if (duration < 0) duration += 24;

    if (inH >= 14 && inH < 18) {
      data.hoursBySlot.early += duration;
    } else if (inH >= 18 && inH < 21) {
      data.hoursBySlot.mid += duration;
    } else {
      data.hoursBySlot.late += duration;
    }
  });

  const analysis: CastAnalysis[] = Array.from(castMap.entries()).map(([castName, data]) => {
    const topItems = Array.from(data.items.values())
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5);

    const calcHr = (sales: number, hours: number) => hours > 0 ? Math.round(sales / hours) : 0;
    const totalHours = data.hoursBySlot.early + data.hoursBySlot.mid + data.hoursBySlot.late;

    return {
      castName,
      totalSales: data.totalSales,
      transactionCount: data.txIds.size,
      arpu: data.txIds.size > 0 ? Math.round(data.totalSales / data.txIds.size) : 0,
      topItems,
      hourlyRevenueBySlot: {
        early: calcHr(data.salesBySlot.early, data.hoursBySlot.early),
        mid: calcHr(data.salesBySlot.mid, data.hoursBySlot.mid),
        late: calcHr(data.salesBySlot.late, data.hoursBySlot.late),
        overall: calcHr(data.totalSales, totalHours)
      }
    };
  }).sort((a, b) => b.totalSales - a.totalSales);

  return analysis;
}

/**
 * 店舗全体の人気アイテムトレンドを分析
 */
export async function getStoreTrends(shopId: string, days: number = 30) {
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);

  const stats = await prisma.posTransaction.groupBy({
    by: ['itemName', 'category'],
    where: {
      shopId,
      closedAt: { gte: dateLimit }
    },
    _sum: { totalPrice: true, quantity: true },
    _count: { _all: true },
    orderBy: { _sum: { totalPrice: 'desc' } },
    take: 20
  });

  return stats.map((s: any) => ({
    itemName: s.itemName,
    category: s.category,
    totalSales: s._sum.totalPrice || 0,
    quantity: s._sum.quantity || 0,
    recordCount: s._count._all
  }));
}

/**
 * 店舗全体の需要トレンド（曜日×時間ごとの来客数・単価）を解析
 */
export async function getDemandTrends(shopId: string, days: number = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // SQLによる集計（PostgreSQL依存だがパフォーマンスは劇的に向上）
    const trends: any[] = await prisma.$queryRaw`
        SELECT 
            EXTRACT(DOW FROM "closedAt") as "dayOfWeek",
            EXTRACT(HOUR FROM "closedAt") as "hour",
            COUNT(DISTINCT split_part(id, '-', 1)) as "txCount",
            SUM("totalPrice") as "totalSales"
        FROM "PosTransaction"
        WHERE "shopId" = ${shopId} AND "closedAt" >= ${startDate}
        GROUP BY "dayOfWeek", "hour"
        ORDER BY "dayOfWeek", "hour"
    `;

    if (trends.length === 0) return [];

    const weekCount = Math.max(1, days / 7);

    return trends.map((t: any) => ({
        dayOfWeek: Number(t.dayOfWeek),
        hour: Number(t.hour),
        avgCustomerCount: Number(t.txCount) / weekCount,
        avgSales: Number(t.totalSales) / weekCount,
        avgArpu: Number(t.txCount) > 0 ? Number(t.totalSales) / Number(t.txCount) : 0
    }));
}
