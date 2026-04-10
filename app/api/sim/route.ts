import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { optimizeShift } from '@/lib/optimizer';
import { getStoreSettings } from '@/lib/storeSettings';

export async function GET() {
    try {
        const allCasts = await prisma.cast.findMany();

        let topCasts = [...allCasts].sort((a, b) => b.averageSales - a.averageSales).slice(0, 15);
        
        if (topCasts.length === 0 || topCasts[0].averageSales === 0) {
            topCasts = allCasts.slice(0, 15).map(c => ({
                ...c,
                averageSales: 300000 + Math.random() * 200000,
                hourlyWage: 3000 + Math.random() * 2000
            }));
        }

        const optimizerCasts = topCasts.map(c => {
            return {
                id: c.id,
                name: c.name,
                rank: (c as any).rank as 'S'|'A'|'B'|'C',
                hourlyWage: c.hourlyWage,
                averageSales: c.averageSales,
                aiScore: 800 + Math.random() * 200,
                isManualWage: (c as any).isManualWage || false,
                backRate: (c as any).backRate || 0,
                isManualBackRate: (c as any).isManualBackRate || false,
                absenceRate: c.absenceRate,
                isRookie: false,
                shopId: 'love_point'
            };
        });

        const storeConfig = getStoreSettings();
        const availData = optimizerCasts.map(c => {
            return {
                castId: c.id,
                availability: [
                    {
                        date: '2026-03-20',
                        targetFloor: 'ANY',
                        startTime: '12:00',
                        endTime: '24:00',
                        segments: storeConfig.defaultSegments.map(seg => ({ segmentId: seg.id }))
                    }
                ]
            };
        });

        const result = optimizeShift(
            ['2026-03-20'],
            optimizerCasts as any,
            availData as any,
            storeConfig.defaultSegments,
            'PROFIT_MAX',
            'daily',
            undefined,
            undefined
        );

        const dayResult = Object.values(result.dailyResults)[0] as any;
        if (!dayResult) throw new Error("No daily results returned");
        
        let dumpReasons = [];
        if (dayResult.segments.length > 0) dumpReasons = dayResult.segments[0].unassignedReasons;
        
        return NextResponse.json({
            success: true,
            results: {
                totalRevenue: dayResult.totalExpectedRevenue,
                totalCost: dayResult.totalExpectedCost,
                profit: dayResult.expectedProfit,
                margin: ((dayResult.expectedProfit / dayResult.totalExpectedRevenue) * 100).toFixed(1) + '%',
                averageHourlyWage: Math.round(optimizerCasts.reduce((sum, c) => sum + c.hourlyWage, 0) / optimizerCasts.length)
            },
            segments: dayResult.segments.map((seg: any) => ({
                id: seg.segmentId,
                count: seg.assignments.length,
                revenue: seg.expectedRevenue,
                cost: seg.expectedCost,
                assignment1F: seg.assignments.filter((a: any) => a.floor === '1F').map((a: any) => optimizerCasts.find(c => c.id === a.castId)?.name),
                assignment2F: seg.assignments.filter((a: any) => a.floor === '2F').map((a: any) => optimizerCasts.find(c => c.id === a.castId)?.name)
            })),
            reasons: dumpReasons
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
