import 'dotenv/config';
import { prisma } from '../lib/db';

async function main() {
    console.log('🏆 Latest AI Scores (Hourly Revenue):');
    const scores = await prisma.castScore.findMany({
        take: 20,
        include: { cast: true },
        orderBy: { score: 'desc' }
    });
    
    scores.forEach((s, i) => {
        console.log(`${(i+1).toString().padStart(2, ' ')}. [${s.cast.name}] ¥${Math.round(s.score).toLocaleString()}/h`);
    });

    const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    console.log(`\n📊 Average Hourly Revenue: ¥${Math.round(avg).toLocaleString()}/h`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
