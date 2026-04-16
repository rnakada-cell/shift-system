
const https = require('https');
const fs = require('fs');
const { URLSearchParams } = require('url');

async function debugScrape(shopId) {
    const loginData = new URLSearchParams({
        'login_id': 'mashiro_otaro',
        'login_pw': '00000000',
        'login': 'ログイン'
    }).toString();

    const options = {
        hostname: 'lp.poscone.com',
        path: '/index.php',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(loginData)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let cookies = res.headers['set-cookie'];
            const cookieHeader = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
            console.log('Login Status:', res.statusCode);
            console.log('Cookie:', cookieHeader);

            const getStaffOptions = {
                hostname: 'lp.poscone.com',
                path: `/staff_itiran.php?shop=${shopId}&jokyo=${encodeURIComponent('在籍')}&name=`,
                method: 'GET',
                headers: {
                    'Cookie': cookieHeader
                }
            };

            https.get(getStaffOptions, (res2) => {
                let data = '';
                res2.on('data', (chunk) => data += chunk);
                res2.on('end', () => {
                    fs.writeFileSync(`scripts/staff_debug_${shopId}.html`, data);
                    console.log(`Saved staff_debug_${shopId}.html`);
                    resolve(data);
                });
            }).on('error', reject);
        });

        req.on('error', reject);
        req.write(loginData);
        req.end();
    });
}

debugScrape(1);
