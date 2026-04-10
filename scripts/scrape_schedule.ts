import { PosconeClient } from '../lib/poscone';
import * as dotenv from 'dotenv';
import * as cheerio from 'cheerio';

dotenv.config();

async function main() {
    const loginId = process.env.POSCONE_ID || process.env.POSCONE_LOGIN_ID;
    const loginPw = process.env.POSCONE_PW || process.env.POSCONE_LOGIN_PW;

    if (!loginId || !loginPw) {
        throw new Error('Missing POSCONE credentials');
    }

    console.log('Logging in to POSCONE...');
    const client = new PosconeClient(loginId, loginPw);
    const loggedIn = await client.login();
    if (!loggedIn) throw new Error('Failed to login');

    console.log('\nFetching schedule_itiran_day.php...');
    // Just pulling today's schedule
    const html1 = await client.fetchHtml('https://lp.poscone.com/schedule_itiran_day.php');
    const $1 = cheerio.load(html1);
    
    // Attempting to parse some tables to see who is scheduled
    console.log('\n--- schedule_itiran_day.php ---');
    console.log($1('title').text().trim());
    $1('table tr').slice(0, 15).each((i, el) => {
        const text = $1(el).text().replace(/\s+/g, ' ').trim();
        if (text) console.log(text);
    });

    console.log('\nFetching schedule_henkou.php...');
    const html2 = await client.fetchHtml('https://lp.poscone.com/schedule_henkou.php?date=2026-03-01&shop=1');
    const $2 = cheerio.load(html2);
    
    console.log('\n--- schedule_henkou.php (2026-03-01 Shop 1) ---');
    console.log($2('title').text().trim());
    $2('table tr').slice(0, 15).each((i, el) => {
        const text = $2(el).text().replace(/\s+/g, ' ').trim();
        if (text) console.log(text);
    });
}

main().catch(console.error);
