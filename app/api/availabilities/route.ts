import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';


export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { castId, availabilities } = body;

        if (!castId || !availabilities || !Array.isArray(availabilities)) {
            return NextResponse.json({ success: false, error: 'Invalid data format' }, { status: 400 });
        }

        // Transaction to delete existing availabilities for the submitted dates and insert new ones
        const dates = availabilities.map((a: any) => a.date);

        await prisma.$transaction(async (tx) => {
            // Remove old entries for these specific dates
            await tx.availability.deleteMany({
                where: {
                    castId: castId,
                    date: { in: dates }
                }
            });

            // Insert new entries
            await tx.availability.createMany({
                data: availabilities.map((a: any) => ({
                    castId,
                    date: a.date,
                    startTime: a.startTime || null,
                    endTime: a.endTime || null,
                    targetFloor: a.targetFloor || 'ANY',
                    segments: a.segments || []
                }))
            });
        });

        return NextResponse.json({ success: true, message: 'Availabilities saved successfully' });
    } catch (error: any) {
        console.error('Error saving availabilities:', error);
        return NextResponse.json({ success: false, error: 'Failed to save availabilities' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const castId = searchParams.get('castId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    try {
        const query: any = {};
        if (castId) query.castId = castId;
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.gte = startDate;
            if (endDate) query.date.lte = endDate;
        }

        const availabilities = await prisma.availability.findMany({
            where: query,
            orderBy: { date: 'asc' }
        });

        return NextResponse.json({ success: true, data: availabilities });
    } catch (error: any) {
        console.error('Error fetching availabilities:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch availabilities' }, { status: 500 });
    }
}
