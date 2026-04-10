import 'dotenv/config';
import prisma from '../lib/db';

async function main() {
    console.log('--- Registering Minutes Data ---');

    // 1. Define Pair Rules from Minutes
    // NG: (みー, なぎ & なぎ) × ねむ, みゆ
    const ngPairs = [
        { a: 'みー', b: 'ねむ', type: 'ng', note: '議事録より: 相性NG' },
        { a: 'なぎ', b: 'ねむ', type: 'ng', note: '議事録より: 相性NG' },
        { a: 'みー', b: 'みゆ', type: 'ng', note: '議事録より: 相性NG' },
        { a: 'なぎ', b: 'みゆ', type: 'ng', note: '議事録より: 相性NG' },
    ];

    // Synergy: みー & なぎ, にこ & ナナ, グミ & ムギ
    const synergyPairs = [
        { a: 'みー', b: 'なぎ', type: 'synergy', penalty: 0.3, note: '議事録より: 推奨ペア' },
        { a: 'にこ', b: 'ナナ', type: 'synergy', penalty: 0.2, note: '議事録より: 推奨ペア' },
        { a: 'グミ', b: 'ムギ', type: 'synergy', penalty: 0.2, note: '議事録より: 推奨ペア' },
    ];

    console.log('Upserting Pair Rules...');
    for (const p of [...ngPairs, ...synergyPairs]) {
        const [name1, name2] = [p.a, p.b].sort();
        await prisma.castPairRule.upsert({
            where: {
                castNameA_castNameB_ruleType: {
                    castNameA: name1,
                    castNameB: name2,
                    ruleType: p.type
                }
            },
            update: {
                penalty: (p as any).penalty ?? (p.type === 'ng' ? -1.0 : 0.2),
                note: p.note,
                isActive: true
            },
            create: {
                castNameA: name1,
                castNameB: name2,
                ruleType: p.type,
                penalty: (p as any).penalty ?? (p.type === 'ng' ? -1.0 : 0.2),
                note: p.note
            }
        });
    }

    // 2. Update Cast Attributes
    const leaders = ['リム', 'ルイ', 'うゆ', 'みー'];
    const p1f = ['めん', 'にこ', 'ねむ', 'ゆりか', 'なな', 'こあめ', 'しほ'];
    const p2f = ['ルイ', 'ムギ', 'グミ', '音', 'チャム', 'リム', 'みゆ'];

    console.log('Updating Cast attributes...');
    
    // Get all unique names mentioned
    const allNames = Array.from(new Set([...leaders, ...p1f, ...p2f]));

    for (const name of allNames) {
        const cast = await prisma.cast.findFirst({ where: { name } });
        
        const data: any = {
            isLeader: leaders.includes(name),
            floorPreference: p1f.includes(name) ? '1F' : (p2f.includes(name) ? '2F' : 'ANY')
        };

        if (cast) {
            await prisma.cast.update({
                where: { id: cast.id },
                data
            });
            console.log(`Updated cast: ${name}`);
        } else {
            // Create new cast if not found (default wage/sales)
            await prisma.cast.create({
                data: {
                    name,
                    rank: 'C',
                    hourlyWage: 1200,
                    averageSales: 0,
                    ...data,
                    preferredSegments: []
                }
            });
            console.log(`Created new cast: ${name}`);
        }
    }

    console.log('--- Registration Completed ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
