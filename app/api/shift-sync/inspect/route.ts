import { NextResponse } from 'next/server';
import { PosconeClient, ShopId } from '@/lib/poscone';

/**
 * GET /api/shift-sync/inspect?year=2026&month=5&shop=love_point
 * POSCONEシフト一覧のHTMLを取得してクラス名を分析するデバッグ用エンドポイント
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || '2026';
    const month = searchParams.get('month') || '5';
    const shop = (searchParams.get('shop') || 'love_point') as ShopId;
    
    const shopParam = shop === 'love_point' ? '1' : '2';
    
    const loginId = process.env.POSCONE_LOGIN_ID;
    const loginPw = process.env.POSCONE_LOGIN_PW;
    
    if (!loginId || !loginPw) {
      return NextResponse.json({ error: 'POSCONE credentials not set' }, { status: 500 });
    }

    const client = new PosconeClient(loginId, loginPw);
    const loggedIn = await client.login();
    
    if (!loggedIn) {
      return NextResponse.json({ error: 'POSCONE login failed' }, { status: 401 });
    }

    // シフト一覧ページを取得
    const url = `https://lp.poscone.com/schedule_itiran.php?type=monthly&year=${year}&month=${month}&shop=${shopParam}`;
    const html = await client.fetchHtml(url);

    // cheerioでパース
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);

    // 1. ボタンクラスの収集
    const buttonClassSet = new Set<string>();
    $('[class*="btn"]').each((_, el) => {
      const cls = $(el).attr('class') || '';
      if (cls) buttonClassSet.add(cls.trim());
    });

    // 2. 時間テキストを含む要素を収集
    const timeElements: { class: string; text: string; tag: string; style?: string }[] = [];
    $('[class*="btn"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text.match(/\d{1,2}:\d{2}/)) {
        timeElements.push({
          class: $(el).attr('class') || '',
          text: text.substring(0, 50),
          tag: (el as any).tagName || '',
          style: $(el).attr('style') || undefined,
        });
      }
    });

    // 3. テーブル行の構造を確認（最初の10行）
    const rows: { index: number; cells: { text: string; class: string; childBtnClass: string; childBtnText: string }[] }[] = [];
    $('table tr').slice(0, 15).each((i, tr) => {
      const cells: typeof rows[0]['cells'] = [];
      $(tr).find('td, th').slice(0, 10).each((_, td) => {
        const btn = $(td).find('[class*="btn"]').first();
        cells.push({
          text: $(td).text().trim().substring(0, 40),
          class: $(td).attr('class') || '',
          childBtnClass: btn.attr('class') || '',
          childBtnText: btn.text().trim().substring(0, 30),
        });
      });
      rows.push({ index: i, cells });
    });

    // 4. スタッフ名（最初の列のテキスト）
    const staffNames: string[] = [];
    $('table tr').each((i, tr) => {
      if (i === 0) return;
      const firstCell = $(tr).find('td').first().text().trim();
      if (firstCell && firstCell.length > 0 && firstCell.length < 30) {
        staffNames.push(firstCell);
      }
    });

    // 5. select要素
    const selects: { name: string; options: { value: string; text: string }[] }[] = [];
    $('select').each((_, sel) => {
      const options: { value: string; text: string }[] = [];
      $(sel).find('option').each((_, opt) => {
        options.push({
          value: $(opt).attr('value') || '',
          text: $(opt).text().trim(),
        });
      });
      selects.push({ name: $(sel).attr('name') || '', options: options.slice(0, 10) });
    });

    // 6. 特定の日付のセルから色分けパターンを詳細分析
    const colorAnalysis: { staffName: string; shifts: { class: string; text: string }[] }[] = [];
    $('table tr').slice(1, 20).each((_, tr) => {
      const cells = $(tr).find('td');
      if (cells.length < 2) return;
      const staffName = cells.eq(0).text().trim();
      const shifts: { class: string; text: string }[] = [];
      cells.slice(1, 8).each((_, td) => {
        const btn = $(td).find('[class*="btn"]').first();
        if (btn.length) {
          shifts.push({
            class: btn.attr('class') || '',
            text: btn.text().trim().substring(0, 30),
          });
        } else {
          shifts.push({
            class: $(td).attr('class') || 'no-btn',
            text: $(td).text().trim().substring(0, 30),
          });
        }
      });
      if (staffName) colorAnalysis.push({ staffName, shifts });
    });

    return NextResponse.json({
      success: true,
      url,
      pageTitle: $('title').text(),
      htmlLength: html.length,
      uniqueButtonClasses: [...buttonClassSet],
      timeElements: timeElements.slice(0, 20),
      tableRows: rows,
      staffNames: staffNames.slice(0, 20),
      selects,
      colorAnalysis,
    });
  } catch (error: any) {
    console.error('[shift-sync/inspect] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
