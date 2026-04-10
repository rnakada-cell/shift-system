import 'dotenv/config';
import { PosconeClient } from './lib/poscone.js';

async function debugSync() {
    const loginId = process.env.POSCONE_LOGIN_ID || '';
    const loginPw = process.env.POSCONE_LOGIN_PW || '';
    const client = new PosconeClient(loginId, loginPw);

    console.log('Logging in...');
    await client.login();

    const date = '2026-02-16'; // 既存データがある日付
    console.log(`Fetching transactions for ${date}...`);
    
    // fetchPageはprivateなので、直接URLを叩いてみるか、一時的にpublicにする
    // ここではPosconeClientのfetchTransactionsを呼んで、その中のログを確認する形にする
    // そのために、poscone.ts に console.log を挟む必要があるかもしれないが、
    // まずは fetchTransactions を呼んで結果を見る
    
    const txs = await client.fetchTransactions('love_point', date, date);
    console.log('Results length:', txs.length);
    if (txs.length > 0) {
        console.log('First 3 items:', JSON.stringify(txs.slice(0, 3), null, 2));
    } else {
        console.log('No transactions found. Possible issues: empty page, wrong URL, or parsing logic mismatch.');
    }
}

debugSync();
