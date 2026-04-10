import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * GET /api/shifts?date=YYYY-MM-DD&shopId=...
 * POST /api/shifts (Save/Confirm Shift)
 */

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const castId = searchParams.get('castId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const shopId = searchParams.get('shopId') || 'love_point';

    try {
        const where: any = { shopId };
        
        if (castId) {
            where.castId = castId;
        }

        if (date) {
            where.date = date;
        } else if (startDate && endDate) {
            where.date = {
                gte: startDate,
                lte: endDate
            };
        }

        const shifts = await prisma.shift.findMany({
            where,
            orderBy: { date: 'asc' }
        });
        return NextResponse.json(shifts);
    } catch (error: any) {
        console.error('Fetch shifts error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { date, shopId, assignments } = body;

        if (!date || !shopId || !assignments || !Array.isArray(assignments)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Transaction to ensure atomic update
        await prisma.$transaction(async (tx: any) => {
            // Delete existing shifts for this date/shop before saving new ones
            await tx.shift.deleteMany({
                where: { date, shopId }
            });

            // Batch insert new assignments
            for (const item of assignments) {
                // { segmentId: string, castId: string, floor: string }
                await tx.shift.create({
                    data: {
                        date,
                        shopId,
                        segmentId: item.segmentId,
                        castId: item.castId,
                        floor: item.floor,
                    }
                });
            }
        });

        return NextResponse.json({ success: true, count: assignments.length });
    } catch (error: any) {
        console.error('Save shift error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
