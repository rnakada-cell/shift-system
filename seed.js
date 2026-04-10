require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { mockCasts, mockAvailabilities, storeSettings } = require('./lib/mockData.js');

const prisma = new PrismaClient();

// Since mockData uses TS and might not export properly via CJS, we define minimal data directly to guarantee seeding works.
const defaultStore = {
    id: 'main-store',
    name: 'Demo Store',
    businessStart: '18:00',
    businessEnd: '05:00',
    defaultSegments: [
        { id: 'SEG_18_20', label: '18:00 - 20:00', maxCapacity: 4 },
        { id: 'SEG_20_22', label: '20:00 - 22:00', maxCapacity: 8 },
        { id: 'SEG_22_24', label: '22:00 - 24:00', maxCapacity: 6 }
    ]
};

const defaultCasts = [
    { id: 'c1', name: 'さくら', hourlyWage: 3000, averageSales: 18000, nominationRate: 0.75, isRookie: false, preferredSegments: ['SEG_20_22', 'SEG_22_24'] },
    { id: 'c2', name: 'ことね', hourlyWage: 5000, averageSales: 20000, nominationRate: 0.90, isRookie: false, preferredSegments: ['SEG_20_22'] },
    { id: 'c3', name: 'りな（新人）', hourlyWage: 2500, averageSales: 4000, nominationRate: 0.10, isRookie: true, preferredSegments: ['SEG_18_20', 'SEG_20_22'] }
];

const defaultAvails = [
    { castId: 'c1', date: '2024-03-01', segments: [{ segmentId: 'SEG_20_22', hasDropIn: true }, { segmentId: 'SEG_22_24' }] },
    { castId: 'c2', date: '2024-03-01', segments: [{ segmentId: 'SEG_20_22', hasCompanion: true }] }
];

async function main() {
    console.log('Seeding Database with direct script...');

    await prisma.storeSetting.upsert({
        where: { id: 'main-store' },
        update: defaultStore,
        create: defaultStore,
    });

    for (const cast of defaultCasts) {
        await prisma.cast.upsert({
            where: { id: cast.id },
            update: cast,
            create: cast,
        });
    }

    for (const avail of defaultAvails) {
        await prisma.availability.upsert({
            where: { castId_date: { castId: avail.castId, date: avail.date } },
            update: { segments: avail.segments },
            create: { ...avail },
        });
    }

    console.log('Seeding Done.');
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
