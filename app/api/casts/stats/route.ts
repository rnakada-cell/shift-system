import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const castName = searchParams.get('name');
        if (!castName) {
            return NextResponse.json({ success: false, error: 'Cast name is required' }, { status: 400 });
        }

        // 過去30日間の売上実績
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];

        const sales = await prisma.castDailySales.findMany({
            where: {
                castName: castName,
                date: { gte: startDateStr }
            },
            orderBy: { date: 'asc' }
        });

        // グラフ用に整形
        const chartData = sales.map(s => ({
            date: s.date,
            sales: s.totalSales,
        }));

        // 最新のスコア詳細
        const lastScore = await prisma.castScore.findFirst({
            where: { cast: { name: castName } },
            orderBy: { calculatedAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            data: {
                chartData,
                score: lastScore
            }
        });
    } catch (error: any) {
        console.error('Error fetching stats:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
