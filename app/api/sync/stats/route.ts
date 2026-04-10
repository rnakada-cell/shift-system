import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const attendanceCount = await prisma.castAttendance.count();
        const monthAttendanceCount = await prisma.castAttendance.count({
            where: { date: { gte: firstDayOfMonth, lte: lastDayOfMonth } }
        });

        const transactionCount = await prisma.posTransaction.count();
        const monthTransactionCount = await prisma.posTransaction.count({
            where: { closedAt: { gte: new Date(firstDayOfMonth), lte: new Date(lastDayOfMonth + 'T23:59:59') } }
        });

        const summaryCount = await prisma.dailySummary.count();

        return NextResponse.json({
            success: true,
            stats: {
                totalAttendance: attendanceCount,
                monthAttendance: monthAttendanceCount,
                totalTransactions: transactionCount,
                monthTransactions: monthTransactionCount,
                totalSummaries: summaryCount,
                firstDayOfMonth,
                lastDayOfMonth
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
