import 'dotenv/config';
import { prisma } from '../lib/db';

async function main() {
    console.log('🗑 Clearing existing sales and transaction data for re-sync...');
    
    // 依存関係があるため順番に削除
    await prisma.posTransaction.deleteMany();
    await prisma.castDailySales.deleteMany();
    await prisma.dailySummary.deleteMany();
    
    // AIスコアも一旦リセット（同期後に再計算するため）
    await prisma.castScore.deleteMany();

    console.log('✅ Data cleared successfully.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
