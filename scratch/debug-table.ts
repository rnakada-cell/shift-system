
import 'dotenv/config';
import { PosconeClient } from './lib/poscone';
import * as cheerio from 'cheerio';

async function main() {
    const loginId = process.env.POSCONE_LOGIN_ID;
    const loginPw = process.env.POSCONE_LOGIN_PW;
    if (!loginId || !loginPw) throw new Error('Missing credentials');

    const client = new PosconeClient(loginId, loginPw);
    await client.login();

    // Get shift list HTML
    const year = 2026;
    const month = 5;
    const shop = 'love_point' as const;
    const url = `https://lp.poscone.com/schedule_itiran.php?type=monthly&year=${year}&month=${month}&shop=1`;
    const html = await client.fetchHtml(url);

    const $ = cheerio.load(html);
    const rows: string[][] = [];
    $('table tr').slice(0, 10).each((i, tr) => {
        const cells: string[] = [];
        $(tr).find('td, th').each((j, td) => {
            cells.push($(td).text().trim());
        });
        rows.push(cells);
    });

    console.log('--- Table Rows (First 10) ---');
    console.log(JSON.stringify(rows, null, 2));
}

main().catch(console.error);
