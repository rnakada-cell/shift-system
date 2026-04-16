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
    console.log('--- 重複キャスト解消 ---\n');
    
    const allCasts = await prisma.cast.findMany();
    
    // 名前でグループ化して重複を探す
    const nameMap = {};
    for (const c of allCasts) {
        if (!nameMap[c.name]) nameMap[c.name] = [];
        nameMap[c.name].push(c);
    }
    
    for (const [name, entries] of Object.entries(nameMap)) {
        if (entries.length > 1) {
            console.log(`重複発見: "${name}" (${entries.length}件)`);
            // 一番古い（最初に作成された）ものを残し、それ以降を削除
            const sorted = entries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            for (let i = 1; i < sorted.length; i++) {
                await prisma.cast.delete({ where: { id: sorted[i].id } });
                console.log(`  🗑️ 重複削除: id=${sorted[i].id}`);
            }
        }
    }
    
    // りな（新人 → 名前修正
    const rina = allCasts.find(c => c.name === 'りな（新人）' || c.name === 'りな（新人');
    if (rina) {
        await prisma.cast.update({ where: { id: rina.id }, data: { name: 'りな' }});
        console.log('✏️ りな（新人 → りな に修正');
    }
    
    // 最終確認
    const final = await prisma.cast.findMany({ orderBy: [{ floorPreference: 'asc' }, { name: 'asc' }] });
    const active = final.filter(c => c.isActive);
    const inactive = final.filter(c => !c.isActive);
    
    console.log(`\n--- 最終結果 ---`);
    console.log(`\n【1F 在籍キャスト】`);
    active.filter(c => c.floorPreference === '1F').forEach(c => console.log(`  ${c.name}`));
    console.log(`\n【2F 在籍キャスト】`);
    active.filter(c => c.floorPreference === '2F').forEach(c => console.log(`  ${c.name}`));
    console.log(`\n【退店済み】`);
    inactive.forEach(c => console.log(`  ${c.name}`));
    console.log(`\n在籍: ${active.length}名 / 退店: ${inactive.length}名 / 合計: ${final.length}名`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
