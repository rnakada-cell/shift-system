/**
 * scripts/trigger_sync.ts
 * 
 * POSCONEから本番データを取得し、DBを更新します。
 * 
 * 重要な仕様理解:
 * POSCONEのランキングAPIは「期間合計」のみ返す。
 * 1日ずつ叩いても毎回同じ合計値が返ってきてしまう。
 * 
 * 正しい処理:
 * 1. ランキングは「全30日間」を一括で取得 → 期間合計として保存
 * 2. AIスコア計算時に「期間合計 ÷ 出勤日数推定」で1日平均を使う
 * 3. Transactionsは1日ずつ取得できるのでそちらで実際の日次データを確認
 */

import 'dotenv/config';
import { prisma } from '../lib/db';
import { PosconeClient, ShopId } from '../lib/poscone';
import { updateAllCastScores } from '../lib/scoring';

const SHOPS: ShopId[] = ['love_point', 'room_of_love_point'];

async function main() {
  console.log('🚀 Starting REAL data sync from POSCONE (fixed version)...');

  // 1. 既存データをクリア
  console.log('🧹 Clearing old data...');
  await prisma.posTransaction.deleteMany();
  await prisma.castDailySales.deleteMany();
  await prisma.dailySummary.deleteMany();
  await prisma.castScore.deleteMany();
  // キャストは削除しない（既存設定を保持）

  // 2. 期間設定（過去30日）
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const dateStart = thirtyDaysAgo.toISOString().split('T')[0];
  const dateEnd = today.toISOString().split('T')[0];
  const DAYS = 30;
  
  console.log(`📅 Period: ${dateStart} to ${dateEnd} (${DAYS} days)`);

  const loginId = process.env.POSCONE_LOGIN_ID;
  const loginPw = process.env.POSCONE_LOGIN_PW;
  
  if (!loginId || !loginPw) {
    throw new Error('POSCONE credentials missing in .env');
  }

  const client = new PosconeClient(loginId, loginPw);
  const loggedIn = await client.login();
  
  if (!loggedIn) {
    throw new Error('Failed to login to POSCONE');
  }

  // 3. ランキング取得（期間合計として1回だけ取得）
  // POSCONEのランキングAPIは「期間合計」のみ返すため、全30日分を一括取得する
  for (const shopId of SHOPS) {
    console.log(`\n📊 [${shopId}] Fetching 30-day aggregate rankings...`);
    
    const rankings = await client.fetchRanking(shopId, dateStart, dateEnd);
    console.log(`  → ${rankings.length} casts found`);

    for (const row of rankings) {
      if (row.totalSales === 0) continue;
      
      // キャストを自動登録
      let cast = await prisma.cast.findFirst({ where: { name: row.castName } });
      if (!cast) {
        cast = await prisma.cast.create({
          data: {
            name: row.castName,
            hourlyWage: 2000,
            averageSales: Math.round(row.totalSales / DAYS), // 1日平均で保存
          }
        });
        console.log(`    ✨ Created: ${row.castName}`);
      }

      // 「期間合計として1レコード」保存 (dateにdateStartを使用)
      // totalSalesは期間合計（後でスコア計算時にDAYSで割る）
      await prisma.castDailySales.upsert({
        where: { date_shopId_castName: { date: dateStart, shopId, castName: row.castName } },
        update: {
          totalSales: row.totalSales,   // 30日分の合計
          drinkSales: row.drinkSales,
          shotCount: row.shotCount,
          chekiCount: row.chekiCount,
          orishanPt: row.orishanPt,
        },
        create: {
          date: dateStart,
          shopId,
          castName: row.castName,
          totalSales: row.totalSales,   // 30日分の合計
          drinkSales: row.drinkSales,
          shotCount: row.shotCount,
          chekiCount: row.chekiCount,
          orishanPt: row.orishanPt,
        }
      });
    }
    
    // 全体の集計を表示（デバッグ用）
    const totalSalesSum = rankings.reduce((sum, r) => sum + r.totalSales, 0);
    console.log(`  ✓ Total sales (30d sum all casts): ¥${totalSalesSum.toLocaleString()}`);
    console.log(`  ✓ Avg daily revenue (÷30): ¥${Math.round(totalSalesSum / DAYS).toLocaleString()}`);
  }

  // 4. Daily Summaries（店舗全体の日別売上・客数）
  // これは実際の日次データが取れる可能性がある
  console.log('\n📅 Fetching daily summaries...');
  for (const shopId of SHOPS) {
    const summaries = await client.fetchDailySummary(shopId, dateStart, dateEnd);
    for (const row of summaries) {
      await prisma.dailySummary.upsert({
        where: { date_shopId: { date: row.date, shopId } },
        update: { salesInclTax: row.salesInclTax, salesExclTax: row.salesExclTax, customerCount: row.customerCount, avgUnitPrice: row.avgUnitPrice },
        create: { date: row.date, shopId, salesInclTax: row.salesInclTax, salesExclTax: row.salesExclTax, customerCount: row.customerCount, avgUnitPrice: row.avgUnitPrice }
      });
    }
    console.log(`  [${shopId}] ${summaries.length} daily summaries saved`);
  }

  // 5. AIスコアの再計算
  // scoring.ts 側で「期間合計をDAYSで割る」処理をするように修正済み
  console.log('\n🔄 Recalculating AI scores...');
  await updateAllCastScores();
  
  console.log('\n✅ Sync complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
