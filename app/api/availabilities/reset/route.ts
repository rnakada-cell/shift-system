import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { castId, startDate, endDate } = body;

        const where: any = {};
        if (castId) where.castId = castId;
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = startDate;
            if (endDate) where.date.lte = endDate;
        }

        const result = await prisma.availability.deleteMany({ where });
        
        return NextResponse.json({ 
            success: true, 
            message: `${result.count}件のシフト申請をリセットしました。`,
            count: result.count
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
