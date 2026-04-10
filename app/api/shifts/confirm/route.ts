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

        return NextResponse.json({ success: true, count: dailyResults.length });
    } catch (error: any) {
        console.error('Confirm shift error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
