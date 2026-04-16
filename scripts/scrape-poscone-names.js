
const https = require('https');
const { URLSearchParams } = require('url');

async function getStaffNames(shopId) {
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
                    // Simple regex to extract names from table
                    // Looking for pattern like <a href="staff_edit.php?id=...">NAME</a>
                    const names = [];
                    const regex = /<a href="staff_edit\.php\?id=\d+[^>]*>(.*?)<\/a>/g;
                    let match;
                    while ((match = regex.exec(data)) !== null) {
                        const name = match[1].trim();
                        if (name && !names.includes(name)) {
                            names.push(name);
                        }
                    }
                    resolve(names);
                });
            }).on('error', reject);
        });

        req.on('error', reject);
        req.write(loginData);
        req.end();
    });
}

async function main() {
    try {
        console.log('--- Fetching 1F Staff ---');
        const shop1 = await getStaffNames(1);
        console.log('1F Names:', JSON.stringify(shop1));

        console.log('--- Fetching 2F Staff ---');
        const shop2 = await getStaffNames(2);
        console.log('2F Names:', JSON.stringify(shop2));
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();
