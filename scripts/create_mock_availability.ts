/**
 * scripts/create_mock_availability.ts
 * 
 * 本番データでAIシフト生成をテストするため、
 * 明日から1週間分の出勤希望（Availability）を全キャストに対して作成します。
 */

import 'dotenv/config';
import { prisma } from '../lib/db';

async function main() {
    console.log('🚀 Creating mock availability for testing...');

    await prisma.availability.deleteMany();

    const casts = await prisma.cast.findMany();
    if (casts.length === 0) {
        console.error('No casts found.');
        return;
    }

    const today = new Date();
    
    // 明日から7日間
    for (const cast of casts) {
        for (let i = 1; i <= 7; i++) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + i);
            const dateStr = targetDate.toISOString().split('T')[0];

            // ランダムに80%の確率で出勤希望を出す
            if (Math.random() > 0.2) {
                // 時間帯は 18:00 - 24:00 (フルセット) を基本とする
                // 1F/2Fの希望は、Castマスタの設定を優先しつつ、ANYの場合はたまに固定する
                let floor = cast.floorPreference || 'ANY';
                if (floor === 'ANY' && Math.random() > 0.7) {
                    floor = Math.random() > 0.5 ? '1F' : '2F';
                }

                await prisma.availability.create({
                    data: {
                        castId: cast.id,
                        date: dateStr,
                        targetFloor: floor,
                        startTime: '18:00',
                        endTime: '24:00',
                        // segmentsは一旦空（自由時間枠でパースされる想定）
                        segments: []
                    }
                });
            }
        }
    }

    console.log('✅ Mock availability created.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
