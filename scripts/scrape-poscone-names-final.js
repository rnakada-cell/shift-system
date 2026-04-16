
const https = require('https');
const { URLSearchParams } = require('url');

function request(url, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ res, data }));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function run() {
    try {
        // 1. Get CSRF
        const { res: res1, data: html1 } = await request('https://lp.poscone.com/index.php');
        const cookie1 = res1.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');
        const csrfMatch = html1.match(/name="CSRF_TOKEN" value="([^"]+)"/);
        const csrf = csrfMatch ? csrfMatch[1] : '';
        console.log('CSRF:', csrf);

        // 2. Login
        const loginBody = new URLSearchParams({
            name: 'mashiro_otaro',
            password: '00000000',
            CSRF_TOKEN: csrf,
            login: 'login'
        }).toString();
        const { res: res2, data: html2 } = await request('https://lp.poscone.com/index.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie1,
                'Content-Length': Buffer.byteLength(loginBody)
            }
        }, loginBody);
        
        // Follow redirect or just use the cookie
        let cookie2 = res2.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || cookie1;
        if (res2.headers['location']) {
            console.log('Redirecting to:', res2.headers['location']);
        }

        // 3. Fetch Shop 1
        const { data: htmlStaff1 } = await request('https://lp.poscone.com/staff_itiran.php?shop=1&jokyo=%E5%9C%A8%E7%B1%8D&name=', {
            headers: { 'Cookie': cookie2 }
        });
        const names1 = [...htmlStaff1.matchAll(/staff_edit\.php\?id=\d+[^>]*>(.*?)<\/a>/g)].map(m => m[1].replace(/<[^>]+>/g, '').trim());

        // 4. Fetch Shop 2
        const { data: htmlStaff2 } = await request('https://lp.poscone.com/staff_itiran.php?shop=2&jokyo=%E5%9C%A8%E7%B1%8D&name=', {
            headers: { 'Cookie': cookie2 }
        });
        const names2 = [...htmlStaff2.matchAll(/staff_edit\.php\?id=\d+[^>]*>(.*?)<\/a>/g)].map(m => m[1].replace(/<[^>]+>/g, '').trim());

        console.log('SUCCESS_1F:' + JSON.stringify([...new Set(names1)]));
        console.log('SUCCESS_2F:' + JSON.stringify([...new Set(names2)]));
    } catch (e) {
        console.error('ERROR:', e);
    }
}

run();
