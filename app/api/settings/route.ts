import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const settings = await prisma.storeSetting.findUnique({
            where: { id: 'main-store' }
        });
        if (!settings) {
            return NextResponse.json({ success: false, error: 'Settings not found' }, { status: 404 });
        }
        
        // Ensure defaults for missing fields
        const safeSettings = {
            ...settings,
            rankDefaultWages: settings.rankDefaultWages || { "S": 3500, "A": 3000, "B": 2500, "C": 2000 },
            scoreWeightHourlyRevenue: settings.scoreWeightHourlyRevenue ?? 0.4,
            scoreWeightTotalRevenue: settings.scoreWeightTotalRevenue ?? 0.3,
            scoreWeightCustomerCount: settings.scoreWeightCustomerCount ?? 0.2,
            scoreWeightAttendanceRate: settings.scoreWeightAttendanceRate ?? 0.1,
            scorePeriodDays: settings.scorePeriodDays ?? 30,
            defaultCapacity: settings.defaultCapacity || { min1F: 5, max1F: 6, min2F: 3, max2F: 4 },
        };

        return NextResponse.json({ success: true, data: safeSettings });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        // 既存設定を取得して、bodyにないフィールド（defaultSegments等）を維持する
        const existing = await prisma.storeSetting.findUnique({
            where: { id: 'main-store' }
        });

        const settings = await prisma.storeSetting.upsert({
            where: { id: 'main-store' },
            update: {
                name: body.name,
                businessStart: body.businessStart,
                businessEnd: body.businessEnd,
                defaultSegments: body.defaultSegments !== undefined ? body.defaultSegments : existing?.defaultSegments || [],
                scoreWeightHourlyRevenue: body.scoreWeightHourlyRevenue,
                scoreWeightTotalRevenue: body.scoreWeightTotalRevenue,
                scoreWeightCustomerCount: body.scoreWeightCustomerCount,
                scoreWeightAttendanceRate: body.scoreWeightAttendanceRate,
                scorePeriodDays: body.scorePeriodDays,
                rankDefaultWages: body.rankDefaultWages,
                defaultCapacity: body.defaultCapacity,
            },
            create: {
                id: 'main-store',
                name: body.name || 'Future Shift Store',
                businessStart: body.businessStart || '18:00',
                businessEnd: body.businessEnd || '05:00',
                defaultSegments: body.defaultSegments || [],
                scoreWeightHourlyRevenue: body.scoreWeightHourlyRevenue ?? 0.4,
                scoreWeightTotalRevenue: body.scoreWeightTotalRevenue ?? 0.3,
                scoreWeightCustomerCount: body.scoreWeightCustomerCount ?? 0.2,
                scoreWeightAttendanceRate: body.scoreWeightAttendanceRate ?? 0.1,
                scorePeriodDays: body.scorePeriodDays ?? 30,
                rankDefaultWages: body.rankDefaultWages || { "S": 3500, "A": 3000, "B": 2500, "C": 2000 },
                defaultCapacity: body.defaultCapacity || { min1F: 5, max1F: 6, min2F: 3, max2F: 4 },
            },
        });
        return NextResponse.json({ success: true, data: settings });
    } catch (error: any) {
        console.error('[SETTINGS_POST_ERROR]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
