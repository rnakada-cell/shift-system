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

    console.log('Fetching members_itiran page...');
    const html = await client.fetchHtml('https://lp.poscone.com/members_itiran.php');
    const $ = cheerio.load(html);

    console.log('\n--- Members Page Overview ---');
    
    // We try to find elements that look like member data (table rows)
    const headers: string[] = [];
    $('table th').each((i, el) => {
        headers.push($(el).text().trim());
    });
    console.log('Headers:', headers.join(' | '));

    console.log('\nSample Rows:');
    $('table tr').slice(1, 10).each((i, el) => {
        const rowData: string[] = [];
        $(el).find('td').each((j, td) => {
            rowData.push($(td).text().replace(/\s+/g, ' ').trim());
        });
        if (rowData.length > 0) {
            console.log(rowData.join(' | '));
        }
    });

}

main().catch(console.error);
