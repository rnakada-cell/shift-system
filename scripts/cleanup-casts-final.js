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

function katakanaToHiragana(src) {
    return src.replace(/[\u30A1-\u30F6]/g, match => String.fromCharCode(match.charCodeAt(0) - 0x60));
}

// 手動マッピング (特殊ケース)
const MANUAL_RENAMES = {
    '音': 'おと',
    'リム': 'りむ',
    'ムギ': 'むぎ',
    'グミ': 'ぐみ',
    'チャム': 'ちゃむ',
    'ゲスト（ぐみ）': 'ぐみ',       // ゲスト扱いは除去してひらがな統一
    '（内勤たんたんめん': 'たんたんめん', // 壊れた括弧修正→既存重複なら削除
    '犬山まゆたろう': 'いぬやままゆたろう',
};

// フロア割り当て（POSCONE実データ）
const FLOOR_MAP = {
    // 1F
    'くおん': '1F', 'くらげ': '1F', 'もゆ': '1F', 'ましろ': '1F', 'うゆ': '1F',
    'ねむ': '1F', 'れな': '1F', 'みい': '1F', 'なぎ': '1F', 'しるば': '1F',
    'ゆりか': '1F', 'るか': '1F', 'なな': '1F', 'ゆいたん': '1F', 'こあめ': '1F',
    'めん': '1F', 'しゅうほ': '1F', 'いちご': '1F', 'みあ': '1F', 'にこ': '1F',
    'かなの': '1F', 'いち': '1F', 'もこ': '1F', 'たんたんめん': '1F',
    'まや': '1F', 'べる': '1F', 'みこ': '1F', 'ぽめる': '1F',
    'いぬやままゆたろう': '1F', 'きらり': '1F', 'ひな': '1F',
    // 2F
    'きゃべつ': '2F', 'むぎ': '2F', 'ぐみ': '2F', 'みう': '2F',
    'ゆめ': '2F', 'ぎん': '2F', 'るい': '2F', 'あおい': '2F',
    'にゃんねこ': '2F', 'ふに': '2F', 'おと': '2F', 'るる': '2F',
    'りむ': '2F', 'ぽち': '2F', 'まりあ': '2F', 'きらら': '2F',
    'みるく': '2F', 'ちゃむ': '2F', 'たむたむ': '2F', 'りさ': '2F',
    'えんま': '2F', 'れい': '2F', 'すい': '2F',
};

// 削除すべきシステムアカウント
const TO_DELETE = ['しすてむ管理'];

// 不完全なレコードで、既存に同一名があれば削除すべきもの
const MERGE_RENAMES = {
    '（内勤たんたんめん': 'たんたんめん',
};

async function main() {
    console.log('--- DBキャスト最終クリーンアップ ---\n');

    const allCasts = await prisma.cast.findMany();

    // STEP 1: システム管理等を削除
    for (const name of TO_DELETE) {
        const found = allCasts.find(c => c.name === name);
        if (found) {
            await prisma.cast.delete({ where: { id: found.id } });
            console.log(`🗑️ 削除: ${name}`);
        }
    }

    // STEP 2: 壊れた名前を統合 (（内勤たんたんめん → たんたんめん)
    for (const [brokenName, correctName] of Object.entries(MERGE_RENAMES)) {
        const broken = allCasts.find(c => c.name === brokenName);
        const correct = allCasts.find(c => c.name === correctName);
        if (broken && correct) {
            // 重複なので壊れた方を削除
            await prisma.cast.delete({ where: { id: broken.id } });
            console.log(`🔀 統合削除: ${brokenName} (${correctName} が存在するため)`);
        } else if (broken && !correct) {
            // 正しい名前で更新
            await prisma.cast.update({ where: { id: broken.id }, data: { name: correctName }});
            console.log(`✏️ 名前修正: ${brokenName} → ${correctName}`);
        }
    }

    // STEP 3: 全キャスト名をひらがなに統一＋フロア更新
    const refreshed = await prisma.cast.findMany();
    for (const cast of refreshed) {
        let newName = MANUAL_RENAMES[cast.name] ?? katakanaToHiragana(cast.name);
        const newFloor = FLOOR_MAP[newName] ?? cast.floorPreference ?? 'ANY';

        const changed = cast.name !== newName || cast.floorPreference !== newFloor;
        if (changed) {
            console.log(`✏️ 更新: "${cast.name}" → "${newName}" (${newFloor})`);
            await prisma.cast.update({
                where: { id: cast.id },
                data: { name: newName, floorPreference: newFloor }
            });
        }
    }

    // STEP 4: 最終状態を表示
    const final = await prisma.cast.findMany({ orderBy: { floorPreference: 'asc' } });
    console.log('\n--- 最終キャストリスト ---');
    for (const c of final) {
        console.log(`[${c.isActive ? '在籍' : '退店'}] ${c.floorPreference ?? 'ANY'} | ${c.name}`);
    }
    console.log(`\n合計: ${final.length}名`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
