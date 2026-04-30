
require('dotenv').config();
const cheerio = require('cheerio');

const POSCONE_BASE = 'https://lp.poscone.com';
const LOGIN_ID = process.env.POSCONE_LOGIN_ID;
const LOGIN_PW = process.env.POSCONE_LOGIN_PW;

async function main() {
  // ログイン
  const loginPageRes = await fetch(`${POSCONE_BASE}/login.php`);
  const initCookies = loginPageRes.headers.get('set-cookie') ?? '';
  const cookieHeader = initCookies.split(',').map(c => c.split(';')[0].trim()).join('; ');
  const loginPageHtml = await loginPageRes.text();
  const $login = cheerio.load(loginPageHtml);
  const formData = new URLSearchParams();
  $login('input').each((_, el) => {
    const name = $login(el).attr('name');
    const value = $login(el).attr('value') ?? '';
    if (name && name !== 'name' && name !== 'password') formData.append(name, value);
  });
  formData.append('login', 'login');
  formData.set('name', LOGIN_ID);
  formData.set('password', LOGIN_PW);

  const loginRes = await fetch(`${POSCONE_BASE}/login.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookieHeader },
    body: formData.toString(),
    redirect: 'manual'
  });
  const allCookies = [cookieHeader, ...((loginRes.headers.get('set-cookie') || '').split(',').map(c => c.split(';')[0].trim()))].join('; ');

  // デイリービュー (5/2)
  const url = `${POSCONE_BASE}/schedule_itiran_day.php?year=2026&month=5&day=2&shop=1`;
  console.log(`Fetching Daily View: ${url}`);
  const res = await fetch(url, { headers: { 'Cookie': allCookies } });
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log('Title:', $('title').text());
  
  // テーブル行の解析
  $('table tr').slice(0, 20).each((i, tr) => {
    const cells = $(tr).find('td, th').map((_, td) => {
        const txt = $(td).text().trim().substring(0, 20);
        const btn = $(td).find('[class*="btn"]').first();
        const btnTxt = btn.text().trim();
        return `[${txt}${btnTxt ? ' | btn:' + btnTxt : ''}]`;
    }).get();
    console.log(`Row ${i}: ${cells.join(', ')}`);
  });
}

main().catch(console.error);
