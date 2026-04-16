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

// カタカナをひらがなに変換する関数
function katakanaToHiragana(src) {
    return src.replace(/[\u30A1-\u30F6]/g, function(match) {
        var chr = match.charCodeAt(0) - 0x60;
        return String.fromCharCode(chr);
    });
}

// ユーザーが提供したPOSCONEのデータ（スタッフ名のみ抽出）
const raw1F = [
    "くおん", "くらげ", "もゆ", "ましろ", "うゆ", "ねむ", "れな", "みい", "なぎ", 
    "しるば", "ゆりか", "るか", "なな", "ゆいたん", "こあめ", "めん", "しゅうほ", 
    "いちご", "みあ", "にこ", "かなの", "いち", "もこ", "（内勤）たんたんめん", 
    "まや", "べる", "みこ", "ぽめる", "犬山まゆたろう", "（ゲスト）きらり", "（ゲスト）ひな"
];

const raw2F = [
    "きゃべつ", "むぎ", "システム管理", "ゲスト（ぐみ）", "みう", "ゆめ", "ぎん", "るい", 
    "あおい", "にゃんねこ", "ふに", "おと", "るる", "りむ", "ぽち", "まりあ", "きらら", 
    "みるく", "ちゃむ", "たむたむ", "りさ", "えんま", "れい", "すい"
];

// 名前をクリーンアップ＆ひらがな化する関数
function normalizeName(name) {
    let clean = name.replace(/（ゲスト）|ゲスト（|）|\(ゲスト\)/g, '').replace(/（内勤）|\(内勤\)/g, '');
    clean = katakanaToHiragana(clean);
    
    // 漢字など特定の変換
    if (clean === "犬山まゆたろう") clean = "いぬやままゆたろう";
    if (clean === "音") clean = "おと";
    
    return clean;
}

// マッピング作成
const mapping1F = raw1F.map(name => ({ original: name, normalized: normalizeName(name), floor: "1F" }));
const mapping2F = raw2F.map(name => ({ original: name, normalized: normalizeName(name), floor: "2F" }));
const allMappings = [...mapping1F, ...mapping2F];

async function main() {
    console.log('--- DBキャスト名 ひらがな統一 & フロア紐付け ---');
    
    const casts = await prisma.cast.findMany();
    
    for (const cast of casts) {
        let currentName = cast.name;
        let newName = normalizeName(currentName);
        
        // 既存DBにある「音」「リム」「チャム」などをひらがなに
        // またPOSCONEリストを元にフロア (1F / 2F) を決定
        
        const matchedMapping = allMappings.find(m => m.normalized === newName || normalizeName(m.original) === newName);
        let targetFloor = matchedMapping ? matchedMapping.floor : "ANY";
        
        // POSCONEにしかいないキャストがいれば追加すべきだが、今はDBにいる人をアップデートする
        
        if (currentName !== newName || cast.floorPreference !== targetFloor) {
            console.log(`更新: ${currentName} -> ${newName} (Floor: ${targetFloor})`);
            await prisma.cast.update({
                where: { id: cast.id },
                data: {
                    name: newName,
                    floorPreference: targetFloor
                }
            });
        }
    }
    
    // POSCONEリストにあって、DBにないキャストを追加するべきか？
    // ユーザーは「もう在籍してない人も含まれてるけど」と言っているので、
    // 今のDBに入っている人が「本当に働く人」ベースになっているはず。
    // DBにいない新しい名前（りさ、えんま、たむたむ、いち、るか等）を追加する
    for (const m of allMappings) {
        if (m.normalized === "しすてむかんり") continue; // システム管理は除外
        if (m.original === "客") continue;
        
        const exists = await prisma.cast.findFirst({ where: { name: m.normalized } });
        if (!exists) {
            console.log(`新規追加 (POSCONEから抽出): ${m.normalized} (${m.floor})`);
            await prisma.cast.create({
                data: {
                    name: m.normalized,
                    floorPreference: m.floor,
                    rank: 'C',
                    hourlyWage: 2000,
                    averageSales: 0,
                    isActive: true,
                    joinedDate: new Date()
                }
            });
        }
    }

    console.log('--- 完了しました ---');
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
