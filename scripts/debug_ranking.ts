import 'dotenv/config';
import { PosconeClient } from '../lib/poscone';
import * as fs from 'fs';

async function main() {
    const loginId = process.env.POSCONE_LOGIN_ID!;
    const loginPw = process.env.POSCONE_LOGIN_PW!;
    
    const client = new PosconeClient(loginId, loginPw);
    await client.login();
    
    // ランキングを直接取得してHTMLをダンプ
    console.log('Fetching ranking for love_point (2026-02-15 to 2026-03-17)...');
    const rankings = await client.fetchRanking('love_point', '2026-02-15', '2026-03-17');
    
    console.log('\n=== Parsed Rankings (top 10) ===');
    rankings.slice(0, 10).forEach(r => {
        console.log(`${r.castName}: totalSales=¥${r.totalSales.toLocaleString()}, drink=¥${r.drinkSales.toLocaleString()}, shot=${r.shotCount}, cheki=${r.chekiCount}`);
    });
    
    console.log(`\nTotal casts: ${rankings.length}`);
    const totalSum = rankings.reduce((s, r) => s + r.totalSales, 0);
    console.log(`Sum of all totalSales: ¥${totalSum.toLocaleString()}`);
    console.log(`Average per cast: ¥${Math.round(totalSum / rankings.length).toLocaleString()}`);
}

main().catch(console.error);
