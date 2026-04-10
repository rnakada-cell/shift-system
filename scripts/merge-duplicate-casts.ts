import 'dotenv/config';
import prisma from '../lib/db';

async function main() {
    console.log('--- Consolidation Script Started ---');

    const pairsToMerge = [
        { target: '音', duplicate: 'おと' },
        { target: 'ルイ', duplicate: 'るい' },
        { target: 'リム', duplicate: 'りむ' },
        { target: 'チャム', duplicate: 'ちゃむ' },
        { target: 'ムギ', duplicate: 'むぎ' },
        { target: 'みー', duplicate: 'みい' },
        { target: 'なな', duplicate: 'ナナ' }, // Normalize to one
    ];

    for (const { target, duplicate } of pairsToMerge) {
        console.log(`\nProcessing: ${duplicate} -> ${target}`);

        const targetCast = await prisma.cast.findFirst({ where: { name: target } });
        const duplicateCast = await prisma.cast.findFirst({ where: { name: duplicate } });

        if (!targetCast || !duplicateCast) {
            console.log(`Skipping "${duplicate}" -> "${target}": One or both not found.`);
            // Special case: if target doesn't exist but duplicate does, rename duplicate
            if (!targetCast && duplicateCast) {
                await prisma.cast.update({ where: { id: duplicateCast.id }, data: { name: target } });
                console.log(`Renamed "${duplicate}" to "${target}"`);
            }
            continue;
        }

        const tid = targetCast.id;
        const did = duplicateCast.id;

        console.log(`Merging ${did} into ${tid}...`);

        // Transfer relationships
        await prisma.availability.updateMany({ where: { castId: did }, data: { castId: tid } }).catch(() => {});
        await prisma.shift.updateMany({ where: { castId: did }, data: { castId: tid } }).catch(() => {});
        await prisma.castAttendance.updateMany({ where: { castId: did }, data: { castId: tid } }).catch(() => {});
        await prisma.castScore.updateMany({ where: { castId: did }, data: { castId: tid } }).catch(() => {});

        // Delete duplicate
        await prisma.cast.delete({ where: { id: did } });
        console.log(`Deleted duplicate cast record for "${duplicate}"`);
    }

    // Clean up unwanted accounts
    const cleanupNames = ['1F店舗', '2F店舗'];
    for (const name of cleanupNames) {
        const cast = await prisma.cast.findFirst({ where: { name } });
        if (cast) {
            await prisma.cast.delete({ where: { id: cast.id } });
            console.log(`Deleted placeholder account: ${name}`);
        }
    }

    // Update Pair Rules naming consistency
    console.log('\nFinalizing naming in CastPairRule...');
    const rules = await prisma.castPairRule.findMany();
    for (const rule of rules) {
        let updatedA = rule.castNameA;
        let updatedB = rule.castNameB;
        let changed = false;

        const renameMap: Record<string, string> = {
            'おと': '音',
            'るい': 'ルイ',
            'りむ': 'リム',
            'ちゃむ': 'チャム',
            'むぎ': 'ムギ',
            'みい': 'みー',
            'ナナ': 'なな'
        };

        if (renameMap[updatedA]) { updatedA = renameMap[updatedA]; changed = true; }
        if (renameMap[updatedB]) { updatedB = renameMap[updatedB]; changed = true; }

        if (changed) {
            const [n1, n2] = [updatedA, updatedB].sort();
            try {
                await prisma.castPairRule.update({
                    where: { id: rule.id },
                    data: { castNameA: n1, castNameB: n2 }
                });
                console.log(`Updated rule ${rule.id}: ${rule.castNameA}/${rule.castNameB} -> ${n1}/${n2}`);
            } catch (e) {
                // If unique constraint fails, it means the rule already exists for the correct names
                await prisma.castPairRule.delete({ where: { id: rule.id } });
                console.log(`Deleted duplicate rule ${rule.id}`);
            }
        }
    }

    console.log('\n--- Consolidation Script Completed ---');
}

main().finally(() => prisma.$disconnect());
