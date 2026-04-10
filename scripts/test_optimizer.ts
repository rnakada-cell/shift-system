/**
 * scripts/test_optimizer.ts
 * 
 * ローカル稼働中のサーバーの /api/optimize エンドポイントを叩き、
 * 明日のシフト生成結果を取得してターミナルに出力します。
 */

async function main() {
    console.log('🚀 Triggering Shift Optimizer for tomorrow...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const body = {
        mode: 'REVENUE_MAX',
        scope: 'daily',
        targetDate: dateStr
    };

    try {
        const res = await fetch('http://localhost:3000/api/optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            console.error(`Error ${res.status}:`, await res.text());
            return;
        }

        const data = await res.json();
        
        console.log(`\n✅ Optimization Complete for ${dateStr}`);
        console.log(`Expected Revenue: ¥${(data.totalRevenue || 0).toLocaleString()}`);
        console.log(`Expected Profit: ¥${(data.totalProfit || 0).toLocaleString()}`);
        console.log('\n--- Daily Results ---');
        
        for (const day of data.dailyResults || []) {
            console.log(`\n📅 Date: ${day.date}`);
            for (const seg of day.segments) {
                console.log(`\n  ⏰ Segment: ${seg.segmentId}`);
                console.log(`     Revenue: ¥${seg.expectedRevenue.toLocaleString()} | Cost: ¥${seg.expectedCost.toLocaleString()}`);
                console.log(`     Assigned Casts (${seg.assignments?.length || 0}):`);
                
                // 割り当てられたキャストをフロア別に表示
                const floor1: string[] = [];
                const floor2: string[] = [];
                
                for (const a of (seg.assignments || [])) {
                    // キャスト名を取得 (フロントエンド側ではキャスト情報は別で持っているがテスト用なのでID表示)
                    const label = `${a.castId.substring(0, 8)}... (${a.floor})`;
                    if (a.floor === '1F') floor1.push(label);
                    else floor2.push(label);
                }

                console.log(`       [1F]: ${floor1.length > 0 ? floor1.join(', ') : 'None'}`);
                console.log(`       [2F]: ${floor2.length > 0 ? floor2.join(', ') : 'None'}`);
                
                if (seg.unassignedReasons && seg.unassignedReasons.length > 0) {
                    console.log(`     Unassigned Reasons (sample):`);
                    for (const r of seg.unassignedReasons.slice(0, 3)) {
                        console.log(`       - Cast ${r.castId.substring(0, 8)}: ${r.reason}`);
                    }
                    if (seg.unassignedReasons.length > 3) console.log('       ...');
                }
            }
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

main();
