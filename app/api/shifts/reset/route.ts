import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { startDate, endDate, shopId = 'love_point' } = body;

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Missing date range' }, { status: 400 });
        }

        await prisma.shift.deleteMany({
            where: {
                shopId,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Reset shift error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
