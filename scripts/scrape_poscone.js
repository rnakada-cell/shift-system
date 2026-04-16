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
        path: '/index.php',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(loginData)
        }
    }, res => {
        const cookies = res.headers['set-cookie'];
        const sessionCookie = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

        fetchStaff(1, sessionCookie).then(staff1 => {
            console.log('1F:', JSON.stringify(staff1));
            fetchStaff(2, sessionCookie).then(staff2 => {
                console.log('2F:', JSON.stringify(staff2));
            });
        });
    });
    
    loginReq.write(loginData);
    loginReq.end();
}

function fetchStaff(shopId, cookie) {
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
            res.on('end', () => {
                const names = [];
                // More robust matching for POSCONE standard structure (td class="name" or simple a href)
                const matches = data.match(/<a href="staff_edit\.php\?id=\d+[^>]*>([^<]+)<\/a>/g) || data.match(/class="[^"]*name[^"]*"[^>]*>([^<]+)</g);
                if (matches) {
                    matches.forEach(m => {
                        let name = m.replace(/<[^>]+>/g, '').trim();
                        // Extract only text
                        if(name.includes('>')) name = name.split('>').pop();
                        if(name.includes('<')) name = name.split('<')[0];
                        name = name.trim();
                        if(name && !names.includes(name)) {
                            names.push(name.replace(/(&nbsp;|\s+)/g, ' '));
                        }
                    });
                } else {
                    // Fallback: extract all words inside <td> element? Or just search for names in general.
                    // Usually staff list is inside a table.
                    const tdMatches = data.match(/<td[^>]*>(.*?)<\/td>/gs);
                    if(tdMatches) {
                        tdMatches.forEach(td => {
                            if (td.includes('staff_edit.php')) {
                                let name = td.replace(/<[^>]+>/g, '').trim();
                                if (name && !names.includes(name)) names.push(name);
                            }
                        })
                    }
                }
                resolve(names);
            });
        });
        req.end();
    });
}
scrape();
