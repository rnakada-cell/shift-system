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

    console.log('Fetching index page...');
    const html = await client.fetchHtml('https://lp.poscone.com/index.php');
    const $ = cheerio.load(html);

    // Extracting all visible text to analyze the structure and find sales figures
    console.log('\n--- Index Page Overview ---');
    
    // We try to find elements that look like sales numbers
    $('table tr').each((i, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (text.includes('売上') || text.includes('円') || text.match(/[0-9,]+/)) {
            console.log(text);
        }
    });
    
    // If it's a dashboard with cards
    $('.card, .box, .panel, td, th').each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('売上') && text.includes('円')) {
            console.log('Card:', text.replace(/\s+/g, ' '));
        }
    });

}

main().catch(console.error);
