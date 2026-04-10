import 'dotenv/config';

const POSCONE_BASE = 'https://lp.poscone.com';

async function testLogin() {
    console.log('Testing POSCONE login...');
    console.log('ID:', process.env.POSCONE_LOGIN_ID);
    
    // 1. Get initial cookie
    const res1 = await fetch(`${POSCONE_BASE}/login.php`, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        redirect: 'manual'
    });
    
    console.log('--- GET /login.php ---');
    console.log('Status:', res1.status);
    const cookies1 = res1.headers.get('set-cookie') || '';
    console.log('Set-Cookie:', cookies1);
    
    const phpSessId = cookies1.match(/PHPSESSID=([^;]+)/)?.[0] || '';
    console.log('Extracted PHPSESSID:', phpSessId);
    
    // 2. Extract hidden fields
    const html = await res1.text();
    const formData = new URLSearchParams();
    
    // login.phpのhtmlからinputタグのnameとvalueを抽出
    const inputRegex = /<input[^>]*name=["']([^"']+)["'][^>]*value=["']([^"']+)["']/gi;
    let match;
    while ((match = inputRegex.exec(html)) !== null) {
        formData.append(match[1], match[2]);
    }
    
    // Type extraction fallback
    if (!formData.has('login')) {
      const typeRegex = /<input[^>]*type=["']hidden["'][^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["']/gi;
      while ((match = typeRegex.exec(html)) !== null) {
          if (!formData.has(match[1])) formData.append(match[1], match[2]);
      }
    }

    console.log('Hidden fields collected:', Array.from(formData.entries()));

    // 3. POST Login
    formData.set('id', process.env.POSCONE_LOGIN_ID || '');
    formData.set('pass', process.env.POSCONE_LOGIN_PW || '');
    
    const res2 = await fetch(`${POSCONE_BASE}/login.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0',
            'Cookie': phpSessId
        },
        body: formData.toString(),
        redirect: 'manual'
    });
    
    console.log('\n--- POST /login.php ---');
    console.log('Status:', res2.status);
    console.log('Location:', res2.headers.get('location'));
    const cookies2 = res2.headers.get('set-cookie') || '';
    console.log('Set-Cookie:', cookies2);
    const postBody = await res2.text();
    console.log('Post Body Snippet:', postBody.substring(0, 500));
    console.log('Has Error Message?:', postBody.includes('エラー') || postBody.includes('違'));
    
    // 4. Test authenticated request
    const finalCookie = cookies2.match(/PHPSESSID=([^;]+)/)?.[0] || phpSessId;
    console.log('\nFinal Cookie to use:', finalCookie);
    
    const res3 = await fetch(`${POSCONE_BASE}/ranking_itiran.php?shop=1&mode=custom&date_start=2026-03-01&date_end=2026-03-17`, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Cookie': finalCookie
        },
        redirect: 'manual'
    });
    
    console.log('\n--- GET /ranking_itiran.php ---');
    console.log('Status:', res3.status);
    console.log('Location:', res3.headers.get('location'));
    const body = await res3.text();
    console.log('Body length:', body.length);
    console.log('Includes login.php:', body.includes('login.php'));
}

testLogin().catch(console.error);
