import { NextResponse } from 'next/server';
import { optimizeShift, OptimizationMode, OptimizationScope, CastAvailability, Cast as OptimizerCast } from '@/lib/optimizer';
import { getDateRange } from '@/lib/utils';
import prisma from '@/lib/db';
import { getCastPerformance, getStoreTrends, getDemandTrends } from '@/lib/analysis';
import { getScrapedStoreData } from '@/lib/scraper';
import { Cast as PrismaCast, CastPairRule as PrismaPairRule } from '@prisma/client';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get('mode') as OptimizationMode) || 'REVENUE_MAX';
    const scope = (searchParams.get('scope') as OptimizationScope) || 'daily';
    const date = searchParams.get('date');

    return handleOptimization({ mode, scope, date });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        return handleOptimization(body);
    } catch (error: any) {
        console.error('Optimizer error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

async function handleOptimization(body: any) {
    try {
        console.time('optimizer_total');
        const mode: OptimizationMode = body.mode || 'REVENUE_MAX';
        const scope: OptimizationScope = body.scope || 'daily';

        // 日付の範囲を決定
        let dates: string[] = [];
        const today = new Date().toISOString().split('T')[0];
        if (scope === 'daily') {
            dates = [body.date || today];
        } else if (scope === 'weekly' || scope === 'monthly') {
            const start = body.startDate || today;
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 6);
            const defaultEnd = tomorrow.toISOString().split('T')[0];
            const end = body.endDate || defaultEnd;
            dates = getDateRange(start, end);
        }

        console.time('db_fetch');
        // DBから当該期間のシフト希望を取得
        const dbAvailabilities = await prisma.availability.findMany({
            where: {
                date: { in: dates }
            }
        });

        // DBから基本設定（時間帯など）を取得
        const settings = await prisma.storeSetting.findUnique({
            where: { id: 'main-store' }
        });
        if (!settings) throw new Error('Store settings not found');
        const rawSegments = settings.defaultSegments as any[];
        const timeSegments = rawSegments.map(s => {
            // "18:00 - 20:00" のようなラベルから時間を推測（なければ2hとする）
            let fallbackHours = 2;
            if (s.label && s.label.includes(' - ')) {
                const [start, end] = s.label.split(' - ');
                const startHour = parseInt(start.split(':')[0]);
                let endHour = parseInt(end.split(':')[0]);
                if (endHour < startHour) endHour += 24; // 日またぎ対応
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

        // DBデータをオプティマイザ用のフォーマット (CastAvailability[]) に変換
        const availabilityMap = new Map<string, any>();
        dbAvailabilities.forEach((avail: any) => {
            if (!availabilityMap.has(avail.castId)) {
                availabilityMap.set(avail.castId, { castId: avail.castId, availability: [] });
            }
            availabilityMap.get(avail.castId).availability.push({
                date: avail.date,
                startTime: avail.startTime,
                endTime: avail.endTime,
                segments: avail.segments || []
            });
        });
        const customAvailabilities: CastAvailability[] = Array.from(availabilityMap.values());

        const weights = body.weights || {
            revenueWeight: 1.0,
            profitWeight: 1.2,
            ltvBaseWeight: 0.8,
            rookieBonusWeight: 2.0,
        };

        const constraints = body.constraints || {
            maxWeeklyHours: 40,
            minWeeklyHours: 0,
            maxConsecutiveDays: 5,
            laborCostLimit: 9999999,
        };

        // DBからキャストマスタを取得（AIスコアも含める）
        const dbCasts = await prisma.cast.findMany({
            include: {
                castScores: {
                    orderBy: { calculatedAt: 'desc' },
                    take: 1
                }
            }
        });

        // ペアルールを取得
        const dbPairRules = await prisma.castPairRule.findMany({
            where: { isActive: true }
        });

        console.log('DB Casts count:', dbCasts.length);
        console.log('DB Pair Rules count:', dbPairRules.length);
        console.timeEnd('db_fetch');

        // Phase 5 & 8: アイテム別分析および需要トレンドの取得
        console.time('analysis_layer');
        let performanceData: any[] = [];
        let storeTrends: any[] = [];
        let demandTrends: any[] = [];
        try {
            [performanceData, storeTrends, demandTrends] = await Promise.all([
                getCastPerformance('love_point', 30),
                getStoreTrends('love_point', 30),
                getDemandTrends('love_point', 90) // 過去90日間の需要トレンド
            ]);
        } catch (e) {
            console.warn('Failed to fetch analysis data for optimization', e);
        }
        console.timeEnd('analysis_layer');

        const casts: OptimizerCast[] = dbCasts.map((c: PrismaCast) => {
            const perf = performanceData.find(p => p.castName === c.name);
            return {
                id: c.id,
                name: c.name,
                rank: c.rank,
                hourlyWage: Number(c.hourlyWage) || 0,
                drinkBackRate: Number(c.drinkBackRate) || 0,
                chekiBackRate: Number(c.chekiBackRate) || 0,
                averageSales: Number(c.averageSales) || 0,
                nominationRate: Number(c.nominationRate) || 0,
                snsFollowers: c.snsFollowers || 0,
                absenceRate: c.absenceRate || 0,
                floorPreference: c.floorPreference || 'ANY',
                canOpen: c.canOpen || false,
                canClose: c.canClose || false,
                isRookie: c.isRookie || false,
                isUnderage: c.isUnderage || false,
                isLeader: c.isLeader || false,
                preferredSegments: c.preferredSegments as string[],
                aiScore: (c as any).castScores?.[0]?.score || 0,
                // Phase 5 & 8: 実力ベースの売上予測用データ
                arpu: perf?.arpu || 0,
                strengthItems: perf?.topItems?.map((i: any) => i.itemName) || [],
                hourlyRevenue: (c as any).castScores?.[0]?.hourlyRevenue || 0,
                granularRevenue: (c as any).castScores?.[0]?.granularRevenue || (null as any)
            };
        });

        // ペアルールのマッピング
        const pairRules = dbPairRules.map((r: PrismaPairRule) => ({
            castNameA: r.castNameA,
            castNameB: r.castNameB,
            ruleType: r.ruleType as 'ng' | 'synergy',
            penalty: Number(r.penalty)
        }));

        // 日×時間帯の可変定員（フロントから送られてきた値）
        const dayCapacities = body.dayCapacities || [];

        // スクレイピングデータから最新の情報を取得（ライブラリを直接呼び出し）
        console.time('scraping_layer');
        let expectedArpu = 4600;
        let trendingItems: string[] = [];
        try {
            const scrapeData = await getScrapedStoreData();
            if (scrapeData) {
                expectedArpu = scrapeData.menu.estimatedArpu;
                trendingItems = scrapeData.events; // or some other mapping
                // storeTrends からのアイテム補完も可能
                if (storeTrends.length > 0) {
                    trendingItems = [...new Set([...trendingItems, ...storeTrends.slice(0, 5).map(i => i.itemName)])];
                }
                console.log(`Using scraped ARPU: ¥${expectedArpu}`);
            }
        } catch (e) {
            console.warn('Failed to get scraped data, using fallback.', e);
        }
        console.timeEnd('scraping_layer');

        const scrapedData = { 
            expectedArpu,
            trendingItems,
            demandTrends
        };

        console.time('optimizer_core');
        const result = optimizeShift(
            dates,
            casts,
            customAvailabilities,
            timeSegments,
            mode,
            scope,
            weights,
            constraints,
            dayCapacities,
            pairRules,
            scrapedData
        );

        console.timeEnd('optimizer_core');

        console.log('Optimization summary:', JSON.stringify(result.summary));
        console.timeEnd('optimizer_total');
        
        // フロントエンドの「比較ビュー」用に希望シフトデータを付与
        (result as any).availabilities = customAvailabilities;

        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        console.error('Optimizer error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
