/**
 * scripts/inspect-poscone-shift.ts
 * POSCONEのシフト一覧HTMLを確認するスクリプト
 * 実行: npx ts-node scripts/inspect-poscone-shift.ts
 */

import * as cheerio from 'cheerio';

const POSCONE_BASE = 'https://lp.poscone.com';
const LOGIN_ID = process.env.POSCONE_LOGIN_ID || 'mashiro_otaro';
const LOGIN_PW = process.env.POSCONE_LOGIN_PW || '00000000';

async function main() {
  // 1. ログイン
  console.log('[1] ログインページ取得...');
  const loginPageRes = await fetch(`${POSCONE_BASE}/login.php`, {
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0' },
    redirect: 'follow',
  });

  const initCookies = loginPageRes.headers.get('set-cookie') ?? '';
  const cookieHeader = initCookies.split(',')
    .map(c => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');

  const loginPageHtml = await loginPageRes.text();
  const $login = cheerio.load(loginPageHtml);
  const formData = new URLSearchParams();
  $login('input').each((_, el) => {
    const name = $login(el).attr('name');
    const value = $login(el).attr('value') ?? '';
    if (name && name !== 'name' && name !== 'password') {
      formData.append(name, value);
    }
  });
  if (!formData.has('login')) formData.append('login', 'login');
  formData.set('name', LOGIN_ID);
  formData.set('password', LOGIN_PW);

  console.log('[2] ログイン実行...');
  const loginRes = await fetch(`${POSCONE_BASE}/login.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
      'Cookie': cookieHeader,
    },
    body: formData.toString(),
    redirect: 'manual',
  });

  const location = loginRes.headers.get('location') ?? '';
  const setCookie = loginRes.headers.get('set-cookie') ?? '';
  console.log(`   Status: ${loginRes.status}, Location: ${location}`);

  const newCookies = setCookie.split(',')
    .map(c => c.split(';')[0].trim())
    .filter(Boolean);
  const allCookies = [cookieHeader, ...newCookies].filter(Boolean).join('; ');

  if (!location && loginRes.status !== 200 && loginRes.status !== 302) {
    console.error('ログイン失敗！');
    process.exit(1);
  }
  console.log('[3] ログイン成功');

  // 3. シフト一覧ページを取得（月次ビュー、2026/05、店舗1）
  const today = new Date();
  const year = 2026;
  const month = 5;
  const targetUrl = `${POSCONE_BASE}/schedule_itiran.php?type=monthly&year=${year}&month=${month}&shop=1`;
  console.log(`\n[4] シフト一覧取得: ${targetUrl}`);

  const shiftRes = await fetch(targetUrl, {
    headers: {
      'Cookie': allCookies,
      'User-Agent': 'Mozilla/5.0',
    },
    redirect: 'follow',
  });

  const html = await shiftRes.text();
  const $ = cheerio.load(html);

  // セッション切れ確認
  if (html.includes('login.php') && html.includes('ログイン')) {
    console.error('セッション切れ。ログイン失敗の可能性。');
    process.exit(1);
  }

  console.log(`\n--- ページタイトル: ${$('title').text()} ---`);
  console.log(`--- HTML長さ: ${html.length}文字 ---\n`);

  // 全ボタンのクラスを収集
  const buttonClasses = new Set<string>();
  $('button, .btn, [class*="btn"]').each((_, el) => {
    const cls = $(el).attr('class') ?? '';
    buttonClasses.add(cls.trim());
  });
  
  console.log('=== 検出されたボタンのクラス一覧 ===');
  buttonClasses.forEach(cls => console.log(`  "${cls}"`));

  // テーブル構造を確認
  console.log('\n=== テーブル行の構造（最初の5行）===');
  $('table tr').slice(0, 6).each((i, tr) => {
    const cells = $(tr).find('td, th').map((_, td) => {
      const txt = $(td).text().trim().substring(0, 30);
      const cls = $(td).attr('class') ?? '';
      const btn = $(td).find('button, .btn').first();
      const btnCls = btn.attr('class') ?? '';
      const btnTxt = btn.text().trim().substring(0, 20);
      return `[${txt}|btn:${btnCls}|${btnTxt}]`;
    }).get();
    console.log(`Row ${i}: ${cells.slice(0, 5).join(', ')}`);
  });

  // スタッフ名の取り方
  console.log('\n=== スタッフ名候補 ===');
  $('table tr').each((i, tr) => {
    if (i === 0) return;
    const firstCell = $(tr).find('td').first().text().trim();
    if (firstCell && firstCell.length > 0 && firstCell.length < 20) {
      console.log(`  Row ${i}: "${firstCell}"`);
    }
  });

  // 時間が含まれているボタンを探す
  console.log('\n=== 時間テキストを含むボタン（最初の10件）===');
  let count = 0;
  $('button, .btn').each((_, el) => {
    if (count >= 10) return;
    const txt = $(el).text().trim();
    const cls = $(el).attr('class') ?? '';
    if (txt.match(/\d{1,2}:\d{2}/)) {
      console.log(`  クラス: "${cls}" | テキスト: "${txt}"`);
      count++;
    }
  });

  // POSTパラメータ（フォーム）確認
  console.log('\n=== フォームのselect要素 ===');
  $('select').each((_, sel) => {
    const name = $(sel).attr('name') ?? '';
    const options = $(sel).find('option').map((_, opt) => `${$(opt).attr('value')}:${$(opt).text()}`).get().slice(0, 5);
    console.log(`  name="${name}": ${options.join(', ')}`);
  });
}

main().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
