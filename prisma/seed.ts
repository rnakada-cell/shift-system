import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { mockCasts, mockAvailabilities, storeSettings } from '../lib/mockData'

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
})

async function main() {
    console.log('Seeding Database...');

    // 1. Create default StoreSetting
    await prisma.storeSetting.upsert({
        where: { id: 'main-store' },
        update: {
            name: 'Demo Store',
            businessStart: '18:00',
            businessEnd: '05:00',
            defaultSegments: storeSettings.defaultSegments as any,
        },
        create: {
            id: 'main-store',
            name: 'Demo Store',
            businessStart: '18:00',
            businessEnd: '05:00',
            defaultSegments: storeSettings.defaultSegments as any,
        },
    });

    // 2. Create Casts
    for (const cast of mockCasts) {
        await prisma.cast.upsert({
            where: { id: cast.id },
            update: {
                name: cast.name,
                hourlyWage: cast.hourlyWage,
                averageSales: cast.averageSales,
                nominationRate: cast.nominationRate,
                isRookie: cast.isRookie,
                preferredSegments: cast.preferredSegments,
            },
            create: {
                id: cast.id,
                name: cast.name,
                hourlyWage: cast.hourlyWage,
                averageSales: cast.averageSales,
                nominationRate: cast.nominationRate,
                isRookie: cast.isRookie,
                preferredSegments: cast.preferredSegments,
            },
        });
    }

    // 3. Create Availabilities
    for (const castAvail of mockAvailabilities) {
        for (const dayAvail of castAvail.availability) {
            await prisma.availability.upsert({
                where: {
                    castId_date: {
                        castId: castAvail.castId,
                        date: dayAvail.date,
                    }
                },
                update: {
                    startTime: dayAvail.startTime,
                    endTime: dayAvail.endTime,
                    segments: dayAvail.segments as any,
                },
                create: {
                    castId: castAvail.castId,
                    date: dayAvail.date,
                    startTime: dayAvail.startTime,
                    endTime: dayAvail.endTime,
                    segments: dayAvail.segments as any,
                },
            });
        }
    }

    console.log('Database Seeding Completed');
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
