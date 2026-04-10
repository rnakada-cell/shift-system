import * as dotenv from 'dotenv';
dotenv.config();

import prisma from '../lib/db';

async function main() {
    console.log("Cleaning up pseudo-casts (e.g. 1F店舗, 2F店舗)...");

    const deleted = await prisma.cast.deleteMany({
        where: {
            name: {
                in: ['1F店舗', '2F店舗', '１Ｆ店舗', '２Ｆ店舗']
            }
        }
    });

    // Also try to find any that includes '店舗' just to be safe
    const deletedLike = await prisma.cast.deleteMany({
        where: {
            name: {
                contains: '店舗'
            }
        }
    });

    console.log(`Deleted ${deleted.count + deletedLike.count} pseudo-cast records.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
