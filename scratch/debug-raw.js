
const https = require('https');
const { URLSearchParams } = require('url');

async function main() {
    const loginData = new URLSearchParams({
        'name': 'mashiro_otaro',
        'password': '00000000',
        'login': 'login'
    }).toString();

    const options = {
        hostname: 'lp.poscone.com',
        path: '/login.php',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(loginData)
        }
    };

    const cookie = await new Promise((resolve) => {
        const req = https.request(options, (res) => {
            const cookies = res.headers['set-cookie'];
            resolve(cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '');
        });
        req.write(loginData);
        req.end();
    });

    const html = await new Promise((resolve) => {
        https.get('https://lp.poscone.com/schedule_itiran.php?type=monthly&year=2026&month=5&shop=1', {
            headers: { 'Cookie': cookie }
        }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve(data));
        });
    });

    // Simple parser for the first 5 rows
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    if (!rows) { console.log('No rows found'); return; }

    console.log('--- Raw Rows (First 5) ---');
    rows.slice(0, 5).forEach((row, i) => {
        const cells = row.match(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi);
        if (cells) {
            console.log(`Row ${i}:`, JSON.stringify(cells.map(c => c.replace(/<[^>]+>/g, '').trim()).slice(0, 5)));
        }
    });
}

main().catch(console.error);
