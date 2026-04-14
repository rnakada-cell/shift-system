import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { dailyResults, shopId = 'love_point' } = body;

        if (!dailyResults || !Array.isArray(dailyResults)) {
            return NextResponse.json({ error: 'Missing dailyResults' }, { status: 400 });
        }

        await prisma.$transaction(async (tx: any) => {
            for (const day of dailyResults) {
                const date = day.date;
                if (!date) continue;

                // Delete existing shifts for this date
                await tx.shift.deleteMany({
                    where: { date, shopId }
                });

                // Insert new assignments
                for (const seg of day.segments) {
                    const assignments = seg.assignments || [];
                    for (const asm of assignments) {
                        await tx.shift.create({
                            data: {
                                date,
                                shopId,
                                segmentId: seg.segmentId,
                                castId: asm.castId,
                                floor: asm.floor || "1F",
                            }
                        });
                    }
                }
            }
        });

        // Trigger notification to all affected casts
        notifyCastsOfPublication(dailyResults);

        return NextResponse.json({ success: true, count: dailyResults.length });
    } catch (error: any) {
        console.error('Confirm shift error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function notifyCastsOfPublication(dailyResults: any[]) {
    try {
        const { sendLineNotification, LINE_TEMPLATES } = await import('@/lib/line');
        
        // Extract unique castIds from the results
        const castIds = new Set<string>();
        dailyResults.forEach(day => {
            day.segments.forEach((seg: any) => {
                seg.assignments?.forEach((asm: any) => {
                    if (asm.castId) castIds.add(asm.castId);
                });
            });
        });

        const dates = dailyResults.map(d => d.date).sort();
        const rangeStr = dates.length > 1 ? `${dates[0]}〜${dates[dates.length - 1]}` : (dates[0] || '新しい');
        const message = LINE_TEMPLATES.SHIFT_PUBLISHED(rangeStr);

        for (const castId of castIds) {
            // In a real app, we'd fetch the actual LINE ID from the Cast table
            await sendLineNotification(castId, message);
        }
    } catch (e) {
        console.error('Notification error:', e);
    }
}
