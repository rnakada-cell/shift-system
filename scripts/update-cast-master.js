
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('--- Updating Cast Master (JS Version) ---');

    // 1. Initialize existing casts joinedDate to 3 months ago
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    await prisma.cast.updateMany({
        data: {
            joinedDate: threeMonthsAgo,
            isActive: true
        }
    });
    console.log('✅ Initialized existing casts joinedDate');

    // 2. Rename みー to みい
    await prisma.cast.updateMany({
        where: { name: 'みー' },
        data: { name: 'みい' }
    });
    console.log('✅ Renamed みー to みい');

    // 3. Deactivate/Delete casts (isActive = false)
    const toDeactivate = ['みゆ', 'しほ', 'りな（新人）', 'ことね', 'さくら', 'かなの'];
    for (const name of toDeactivate) {
        await prisma.cast.updateMany({
            where: { name: name },
            data: { isActive: false }
        });
    }
    console.log('✅ Deactivated casts:', toDeactivate.join(', '));

    // 4. Add new casts
    const newCasts = [
        'きゃべつ', 'ましろ', 'るい', 'しるば', 'るる', 'なな', 'ぽち', 'まりあ', 
        'きらり', 'こあめ', 'いちご', 'みあ', 'もこ', 'まや', 'れい', 'ぽめる', 
        '犬山まゆたろう', 'すい'
    ];

    for (const name of newCasts) {
        // Check if exists
        const exists = await prisma.cast.findFirst({ where: { name } });
        if (!exists) {
            await prisma.cast.create({
                data: {
                    name,
                    rank: 'C',
                    hourlyWage: 2000,
                    averageSales: 0,
                    isActive: true,
                    joinedDate: new Date() // Today
                }
            });
        }
    }
    console.log('✅ Added new casts');

    // 5. Add internal cast
    const internalName = 'たんたんめん';
    const internalExists = await prisma.cast.findFirst({ where: { name: internalName } });
    if (!internalExists) {
        await prisma.cast.create({
            data: {
                name: internalName,
                rank: 'INTERNAL',
                hourlyWage: 2000,
                averageSales: 0,
                isActive: true,
                joinedDate: new Date()
            }
        });
    }
    console.log('✅ Added internal cast: たんたんめん');

    console.log('--- Cast Master Update Finished ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
