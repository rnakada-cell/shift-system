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
        
        let rawSegments = (settings.defaultSegments as any[]) || [];
        
        // Phase 10: 14:00枠が欠落している場合の自動補完
        if (rawSegments.length < 5) {
            console.log("Segment count low, injecting default expanded segments.");
            rawSegments = [
                { id: 'SEG_14_16', label: '14:00 - 16:00', hours: 2, demandFactor: 0.6, maxCapacity: 17 },
                { id: 'SEG_16_18', label: '16:00 - 18:00', hours: 2, demandFactor: 0.8, maxCapacity: 17 },
                { id: 'SEG_18_20', label: '18:00 - 20:00', hours: 2, demandFactor: 1.0, maxCapacity: 17 },
                { id: 'SEG_20_22', label: '20:00 - 22:00', hours: 2, demandFactor: 1.3, maxCapacity: 17 },
                { id: 'SEG_22_24', label: '22:00 - 24:00', hours: 2, demandFactor: 1.1, maxCapacity: 17 },
                { id: 'SEG_00_02', label: '00:00 - 02:00', hours: 2, demandFactor: 0.9, maxCapacity: 12 },
                { id: 'SEG_02_04', label: '02:00 - 04:00', hours: 2, demandFactor: 0.7, maxCapacity: 8 },
                { id: 'SEG_04_06', label: '04:00 - 06:00', hours: 2, demandFactor: 0.5, maxCapacity: 8 },
            ];
        }

        // Ensure defaults for missing fields
        const safeSettings = {
            ...settings,
            defaultSegments: rawSegments,
            rankDefaultWages: settings.rankDefaultWages || { "S": 3500, "A": 3000, "B": 2500, "C": 2000 },
            scoreWeightHourlyRevenue: settings.scoreWeightHourlyRevenue ?? 0.4,
            scoreWeightTotalRevenue: settings.scoreWeightTotalRevenue ?? 0.3,
            scoreWeightCustomerCount: settings.scoreWeightCustomerCount ?? 0.2,
            scoreWeightAttendanceRate: settings.scoreWeightAttendanceRate ?? 0.1,
            scorePeriodDays: settings.scorePeriodDays ?? 30,
            defaultCapacity: settings.defaultCapacity || { min1F: 5, max1F: 6, min2F: 3, max2F: 4 },
            lineChannelAccessToken: settings.lineChannelAccessToken || '',
            lineChannelSecret: settings.lineChannelSecret || '',
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
                lineChannelAccessToken: body.lineChannelAccessToken,
                lineChannelSecret: body.lineChannelSecret,
            },
            create: {
                id: 'main-store',
                name: body.name || 'Future Shift Store',
                businessStart: body.businessStart || '14:00',
                businessEnd: body.businessEnd || '06:00',
                defaultSegments: body.defaultSegments || [
                    { id: 'SEG_14_16', label: '14:00 - 16:00', hours: 2, demandFactor: 0.6, maxCapacity: 17 },
                    { id: 'SEG_16_18', label: '16:00 - 18:00', hours: 2, demandFactor: 0.8, maxCapacity: 17 },
                    { id: 'SEG_18_20', label: '18:00 - 20:00', hours: 2, demandFactor: 1.0, maxCapacity: 17 },
                    { id: 'SEG_20_22', label: '20:00 - 22:00', hours: 2, demandFactor: 1.3, maxCapacity: 17 },
                    { id: 'SEG_22_24', label: '22:00 - 24:00', hours: 2, demandFactor: 1.1, maxCapacity: 17 },
                    { id: 'SEG_00_02', label: '00:00 - 02:00', hours: 2, demandFactor: 0.9, maxCapacity: 12 },
                    { id: 'SEG_02_04', label: '02:00 - 04:00', hours: 2, demandFactor: 0.7, maxCapacity: 8 },
                    { id: 'SEG_04_06', label: '04:00 - 06:00', hours: 2, demandFactor: 0.5, maxCapacity: 8 },
                ],
                scoreWeightHourlyRevenue: body.scoreWeightHourlyRevenue ?? 0.4,
                scoreWeightTotalRevenue: body.scoreWeightTotalRevenue ?? 0.3,
                scoreWeightCustomerCount: body.scoreWeightCustomerCount ?? 0.2,
                scoreWeightAttendanceRate: body.scoreWeightAttendanceRate ?? 0.1,
                scorePeriodDays: body.scorePeriodDays ?? 30,
                rankDefaultWages: body.rankDefaultWages || { "S": 3500, "A": 3000, "B": 2500, "C": 2000 },
                defaultCapacity: body.defaultCapacity || { min1F: 5, max1F: 6, min2F: 3, max2F: 4 },
                lineChannelAccessToken: body.lineChannelAccessToken || '',
                lineChannelSecret: body.lineChannelSecret || '',
            },
        });
        return NextResponse.json({ success: true, data: settings });
    } catch (error: any) {
        console.error('[SETTINGS_POST_ERROR]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
