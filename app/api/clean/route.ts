import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        console.log("Cleaning up pseudo-casts (e.g. 1F店舗, 2F店舗)...");

        const deleted = await prisma.cast.deleteMany({
            where: {
                name: {
                    in: ['1F店舗', '2F店舗', '１Ｆ店舗', '２Ｆ店舗']
                }
            }
        });

        const deletedLike = await prisma.cast.deleteMany({
            where: {
                name: {
                    contains: '店舗'
                }
            }
        });

        return NextResponse.json({ 
            success: true, 
            deletedExact: deleted.count,
            deletedLike: deletedLike.count,
            message: `Deleted ${deleted.count + deletedLike.count} pseudo-cast records.`
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
