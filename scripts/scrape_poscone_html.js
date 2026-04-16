const fs = require('fs');
const https = require('https');

async function scrape() {
    const loginData = new URLSearchParams({
        'login_id': 'mashiro_otaro',
        'login_pw': '00000000',
        'login': 'ログイン'
    }).toString();

    const loginReq = https.request({
        hostname: 'lp.poscone.com',
        port: 443,
        path: '/login.php',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(loginData)
        }
    }, res => {
        const cookies = res.headers['set-cookie'];
        const sessionCookie = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

        fetchHTML(1, sessionCookie).then(html => {
            fs.writeFileSync('/Users/rutsuki/Desktop/shift-system/scripts/poscone_1f.html', html);
            console.log('Saved 1F HTML');
        });
    });
    
    loginReq.write(loginData);
    loginReq.end();
}

function fetchHTML(shopId, cookie) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'lp.poscone.com',
            port: 443,
            path: '/staff_itiran.php?shop=' + shopId + '&jokyo=' + encodeURIComponent('在籍') + '&name=',
            method: 'GET',
            headers: { 'Cookie': cookie }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.end();
    });
}
scrape();
