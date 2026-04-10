import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';


// 全キャスト取得
export async function GET() {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

        const casts = await prisma.cast.findMany({
            include: {
                castScores: {
                    orderBy: { calculatedAt: 'desc' },
                    take: 1
                },
                _count: {
                    select: { 
                        attendances: {
                            where: { date: { gte: firstDayOfMonth } }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // _count.attendances を frontend で扱いやすい名前（monthlyAttendanceCount）にする
        const formattedCasts = casts.map(c => ({
            ...c,
            monthlyAttendanceCount: (c as any)._count?.attendances || 0
        }));

        return NextResponse.json({ success: true, data: formattedCasts });
    } catch (error: any) {
        console.error('Error fetching casts:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch casts' }, { status: 500 });
    }
}

// キャスト作成または更新 (Upsert)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const cast = await prisma.cast.upsert({
            where: { id: body.id || 'new' },
            update: {
                name: body.name,
                rank: body.rank,
                hourlyWage: body.hourlyWage,
                drinkBackRate: body.drinkBackRate,
                chekiBackRate: body.chekiBackRate,
                averageSales: body.averageSales,
                nominationRate: body.nominationRate,
                snsFollowers: body.snsFollowers,
                absenceRate: body.absenceRate,
                floorPreference: body.floorPreference,
                canOpen: body.canOpen,
                canClose: body.canClose,
                isRookie: body.isRookie,
                isUnderage: body.isUnderage,
                isLeader: body.isLeader,
                preferredSegments: body.preferredSegments
            },
            create: {
                id: body.id,
                name: body.name,
                rank: body.rank || '7',
                hourlyWage: body.hourlyWage || 1300,
                drinkBackRate: body.drinkBackRate || 0.0,
                chekiBackRate: body.chekiBackRate || 0.0,
                averageSales: body.averageSales || 10000,
                nominationRate: body.nominationRate || 0.5,
                snsFollowers: body.snsFollowers || 0,
                absenceRate: body.absenceRate || 0.0,
                floorPreference: body.floorPreference || 'ANY',
                canOpen: body.canOpen || false,
                canClose: body.canClose || false,
                isRookie: body.isRookie || false,
                isUnderage: body.isUnderage || false,
                isLeader: body.isLeader || false,
                preferredSegments: body.preferredSegments || []
            }
        });
        return NextResponse.json({ success: true, data: cast });
    } catch (error: any) {
        console.error('Error upserting cast:', error);
        return NextResponse.json({ success: false, error: 'Failed to save cast' }, { status: 500 });
    }
}

// キャスト削除
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

        await prisma.cast.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting cast:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete cast' }, { status: 500 });
    }
}
