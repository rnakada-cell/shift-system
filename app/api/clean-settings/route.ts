import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { defaultStoreSettings } from '@/lib/storeSettings';

export async function GET() {
    try {
        console.log("Resetting StoreSetting to new 12:00-24:00 defaults...");

        const updated = await prisma.storeSetting.upsert({
            where: { id: defaultStoreSettings.id },
            update: {
                name: defaultStoreSettings.name,
                businessStart: defaultStoreSettings.businessHours.start,
                businessEnd: defaultStoreSettings.businessHours.end,
                defaultSegments: defaultStoreSettings.defaultSegments as any,
            },
            create: {
                id: defaultStoreSettings.id,
                name: defaultStoreSettings.name,
                businessStart: defaultStoreSettings.businessHours.start,
                businessEnd: defaultStoreSettings.businessHours.end,
                defaultSegments: defaultStoreSettings.defaultSegments as any,
            }
        });

        return NextResponse.json({ 
            success: true, 
            message: `StoreSettings for ${updated.id} successfully reset.`
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
