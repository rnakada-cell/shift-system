
require('dotenv').config();
const { PosconeClient } = require('./lib/poscone');
const cheerio = require('cheerio');

async function main() {
    const loginId = process.env.POSCONE_LOGIN_ID;
    const loginPw = process.env.POSCONE_LOGIN_PW;
    const client = new PosconeClient(loginId, loginPw);
    await client.login();

    // Get shift list HTML
    const year = 2026;
    const month = 5;
    const shop = 1; // love_point
    const url = `https://lp.poscone.com/schedule_itiran.php?type=monthly&year=${year}&month=${month}&shop=${shop}`;
    const html = await client.fetchHtml(url);

    const $ = cheerio.load(html);
    const rows = [];
    $('table tr').slice(0, 5).each((i, tr) => {
        const cells = [];
        $(tr).find('td, th').each((j, td) => {
            cells.push($(td).text().trim());
        });
        rows.push(cells);
    });

    console.log('--- Table Rows (First 5) ---');
    console.log(JSON.stringify(rows, null, 2));
}

main().catch(console.error);
