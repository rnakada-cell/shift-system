import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const casts = await prisma.cast.findMany({
        select: { id: true, name: true }
    });
    console.log(JSON.stringify(casts));
}

main().finally(() => prisma.$disconnect());
