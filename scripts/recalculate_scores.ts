import 'dotenv/config';
import { prisma } from '../lib/db';
import { updateAllCastScores } from '../lib/scoring';

async function main() {
    console.log('🗑 Clearing old scores...');
    await prisma.castScore.deleteMany();
    console.log('🔄 Recalculating with corrected logic...');
    await updateAllCastScores();
    
    // 結果確認
    console.log('\n🏆 Updated AI Scores (should match reality: ¥500~¥5000/h for typical con-cafe):');
    const scores = await prisma.castScore.findMany({
        include: { cast: true },
        orderBy: { score: 'desc' },
        take: 15
    });
    scores.forEach((s, i) => {
        console.log(`${(i+1).toString().padStart(2)} [${s.cast.name}] ¥${Math.round(s.score).toLocaleString()}/h`);
    });

    const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    console.log(`\n📊 Average: ¥${Math.round(avg).toLocaleString()}/h`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
