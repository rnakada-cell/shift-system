/**
 * lib/poscone.ts
 * 
 * POSCONEスクレイパー
 * POSCONEはPHPサーバーサイドレンダリングのため、
 * セッションCookieを使いHTMLページをフェッチしてCheerioでパースする。
 */

import * as cheerio from 'cheerio';

const POSCONE_BASE = 'https://lp.poscone.com';

export type ShopId = 'love_point' | 'room_of_love_point';

const SHOP_PARAM: Record<ShopId, string> = {
  love_point: '1',
  room_of_love_point: '2',
};

export interface CastSalesRow {
  castName: string;
  totalSales: number;
  drinkSales: number;
  shotCount: number;
  chekiCount: number;
  orishanPt: number;
}

export interface TransactionRow {
  id: string;
  closedAt: Date;
  castName: string;
  itemName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface DailySummaryRow {
  date: string;       // YYYY-MM-DD
  salesInclTax: number;
  salesExclTax: number;
  customerCount: number;
  avgUnitPrice: number;
}

export interface StaffRow {
  name: string;
  hourlyWage?: number;       // 時給
  backGuarantee?: number;    // バック保障
  memo?: string;
}

export interface AttendanceRow {
  castName: string;
  date: string;              // YYYY-MM-DD
  status: 'attend' | 'late' | 'absence' | 'unknown';
  checkIn?: string;
  checkOut?: string;
}

export interface DemographicRow {
  date: string;
  customerType: string;      // "20代男性", "30代女性" 等
  count: number;
  totalSales: number;
}

export type ShiftType = 'confirmed' | 'requested' | 'exception';

export interface ShiftEntry {
  type: ShiftType;
  castName: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  date: string;      // "YYYY-MM-DD"
}

/** カタカナをひらがなに変換 */
function katakanaToHiragana(src: string): string {
  return src.replace(/[\u30A1-\u30F6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

/** 名前を正規化（空白・全角スペース・大文字小文字・カタカナを統一） */
export function normalizeName(name: string): string {
  if (!name) return '';
  let clean = name
    .replace(/[　\s]/g, '') // 全ての空白（全角・半角）を排除
    .replace(/[（\(\)）]/g, '') // カッコを削除
    .replace(/新人|ゲスト|内勤|1F|2F/g, '') // 共通のノイズワードを削除
    .toLowerCase();
  
  // カタカナをひらがなに統一
  clean = katakanaToHiragana(clean);
  
  return clean;
}

/** 商品名からカテゴリを推定 */
function guessCategory(itemName: string): string {
  const name = itemName.toLowerCase();
  if (name.includes('チェキ')) return 'cheki';
  if (name.includes('ショット') || name.includes('shot')) return 'shot';
  if (name.includes('チャージ') || name.includes('入場')) return 'charge';
  if (name.includes('フード') || name.includes('ポテ') || name.includes('食')) return 'food';
  if (name.includes('オリシャン') || name.includes('orisha')) return 'orisha';
  if (name.includes('ドリンク') || name.includes('ジュース') || name.includes('ビール') || name.includes('ウイスキー')) return 'drink';
  return 'other';
}

/** 金額文字列（¥1,234 や 1234円等）を数値に変換 */
function parsePrice(text: string): number {
  const cleaned = text.replace(/[¥,円\s]/g, '');
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? 0 : n;
}

/** 数値文字列をパース */
function parseNum(text: string): number {
  const cleaned = text.replace(/[,\s枚pt点]/g, '');
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? 0 : n;
}

export class PosconeClient {
  private cookies: string = '';
  private loginId: string;
  private loginPw: string;

  constructor(loginId: string, loginPw: string) {
    this.loginId = loginId;
    this.loginPw = loginPw;
  }

  /** POSCONEにログインしてセッションCookieを取得 */
  async login(): Promise<boolean> {
    try {
      // まずログインフォームのページを取得してCSRFやhiddenフィールドを確認
      const loginPageRes = await fetch(`${POSCONE_BASE}/login.php`, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        redirect: 'follow',
      });

      // Set-Cookieを保持
      const initCookies = loginPageRes.headers.get('set-cookie') ?? '';
      const cookieHeader = initCookies.split(',')
        .map(c => c.split(';')[0].trim())
        .filter(Boolean)
        .join('; ');

      const loginPageHtml = await loginPageRes.text();
      const $login = cheerio.load(loginPageHtml);

      // フォームの全パラメータ（hidden, submit等）を収集
      const formData = new URLSearchParams();
      $login('input').each((_, el) => {
        const name = $login(el).attr('name');
        const value = $login(el).attr('value');
        if (name && value && name !== 'name' && name !== 'password') {
          formData.append(name, value);
        }
      });
      
      // フォールバック（ボタン系の値が取れなかった場合）
      if (!formData.has('login')) formData.append('login', 'login');
      
      formData.set('name', this.loginId);
      formData.set('password', this.loginPw);


      // ログインリクエスト
      const loginRes = await fetch(`${POSCONE_BASE}/login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': cookieHeader,
        },
        body: formData.toString(),
        redirect: 'manual', // ログイン成功→リダイレクトを手動で扱う
      });

      // リダイレクト先がindex.phpならログイン成功
      const location = loginRes.headers.get('location') ?? '';
      const setCookie = loginRes.headers.get('set-cookie') ?? '';

      if (!location.includes('index') && loginRes.status !== 302 && loginRes.status !== 200) {
        console.error('[POSCONE] Login failed. Status:', loginRes.status, 'Location:', location);
        return false;
      }

      // セッションCookieを保存
      const newCookies = setCookie.split(',')
        .map(c => c.split(';')[0].trim())
        .filter(Boolean);
      const allCookies = [cookieHeader, ...newCookies].filter(Boolean).join('; ');
      this.cookies = allCookies;

      console.log('[POSCONE] Login successful');
      return true;
    } catch (err) {
      console.error('[POSCONE] Login error:', err);
      return false;
    }
  }

  /** Gets authenticated HTML from arbitrary URL */
  async fetchHtml(url: string, asShift: boolean = false): Promise<string> {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Cookie': this.cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Check charset
    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder(asShift ? 'shift-jis' : 'utf-8');
    return decoder.decode(buffer);
  }

  /** 認証済みGETリクエスト */
  private async fetchPage(path: string): Promise<string | null> {
    try {
      const res = await fetch(`${POSCONE_BASE}${path}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': this.cookies,
        },
        redirect: 'follow',
      });

      if (!res.ok) {
        console.error(`[POSCONE] HTTP ${res.status} for ${path}`);
        return null;
      }

      const html = await res.text();
      // セッション切れ検出（ログインページにリダイレクトされた場合）
      if (html.includes('login.php') && html.includes('ログイン')) {
        console.error('[POSCONE] Session expired');
        return null;
      }

      return html;
    } catch (err) {
      console.error(`[POSCONE] Fetch error for ${path}:`, err);
      return null;
    }
  }

  /**
   * キャスト別売上ランキングを取得
   * /ranking_itiran.php?shop=1&mode=custom&date_start=YYYY-MM-DD&date_end=YYYY-MM-DD
   */
  async fetchRanking(shopId: ShopId, dateStart: string, dateEnd: string): Promise<CastSalesRow[]> {
    const shop = SHOP_PARAM[shopId];
    const path = `/ranking_itiran.php?shop=${shop}&mode=custom&date_start=${dateStart}&date_end=${dateEnd}`;
    const html = await this.fetchPage(path);
    if (!html) return [];

    const $ = cheerio.load(html);
    const results: CastSalesRow[] = [];

    // ランキングテーブルからキャスト別データを抽出
    // POSCONEのランキング画面は複数のテーブル（ドリンク・ショット・チェキ・オリシャン・総売上）
    // まず総売上テーブルを探す
    const castMap = new Map<string, CastSalesRow>();

    $('table').each((_, table) => {
      const headers = $(table).find('th').map((_, th) => $(th).text().trim()).get();
      const hasRank = headers.some(h => h.includes('順位') || h.includes('スタッフ'));
      if (!hasRank) return;

      // ヘッダーからカラムタイプを判定
      const colTypes = headers.map(h => {
        if (h.includes('ドリンク')) return 'drink';
        if (h.includes('ショット')) return 'shot';
        if (h.includes('チェキ')) return 'cheki';
        if (h.includes('オリシャン')) return 'orisha';
        if (h.includes('売上') || h.includes('合計')) return 'total';
        if (h.includes('スタッフ') || h.includes('名前')) return 'name';
        return 'unknown';
      });

      $(table).find('tr').each((rowIdx, tr) => {
        if (rowIdx === 0) return; // ヘッダー行をスキップ
        const cells = $(tr).find('td').map((_, td) => $(td).text().trim()).get();
        if (cells.length < 2) return;

        // キャスト名を探す
        let castName = '';
        cells.forEach((cell, idx) => {
          if (colTypes[idx] === 'name') castName = cell;
        });
        // name列が見つからなければ2列目をキャスト名とする
        if (!castName) castName = cells[1] ?? '';
        if (!castName || castName === '−' || castName === '-') return;

        if (!castMap.has(castName)) {
          castMap.set(castName, {
            castName,
            totalSales: 0,
            drinkSales: 0,
            shotCount: 0,
            chekiCount: 0,
            orishanPt: 0,
          });
        }

        const row = castMap.get(castName)!;
        cells.forEach((cell, idx) => {
          const type = colTypes[idx];
          if (type === 'drink') row.drinkSales = parsePrice(cell) || parseNum(cell);
          if (type === 'shot') row.shotCount = parseNum(cell);
          if (type === 'cheki') row.chekiCount = parseNum(cell);
          if (type === 'orisha') row.orishanPt = parseNum(cell);
          if (type === 'total') row.totalSales = parsePrice(cell);
        });
      });
    });

    results.push(...castMap.values());
    console.log(`[POSCONE] fetchRanking: ${results.length} casts for ${shopId} ${dateStart}~${dateEnd}`);
    return results;
  }

  /**
   * 取引明細を取得
   * /torihiki_itiran.php?shop=1&date_start=YYYY-MM-DD&date_end=YYYY-MM-DD
   */
  async fetchTransactions(shopId: ShopId, dateStart: string, dateEnd: string): Promise<TransactionRow[]> {
    const shop = SHOP_PARAM[shopId];
    const path = `/torihiki_itiran.php?shop=${shop}&date_start=${dateStart}&date_end=${dateEnd}`;
    const html = await this.fetchPage(path);
    if (!html) return [];

    const $ = cheerio.load(html);
    const results: TransactionRow[] = [];

    // 取引一覧テーブル: 取引ID | 締め日時 | 担当 | 取引詳細
    $('table tr').each((rowIdx, tr) => {
      if (rowIdx === 0) return;
      const cells = $(tr).find('td');
      if (cells.length < 3) return;

      const txIdEl = cells.eq(0).find('a');
      const txId = txIdEl.text().trim() || cells.eq(0).text().trim();
      const closedAtStr = cells.eq(1).text().trim();
      const castName = cells.eq(2).text().trim();
      const detailText = cells.eq(3).text().trim();

      if (!txId || !castName) return;

      // 締め日時をパース (YYYY-MM-DD HH:mm:ss or YYYY-MM-DD)
      const closedAt = new Date(closedAtStr.replace(/\//g, '-'));
      if (isNaN(closedAt.getTime())) return;

      // 取引詳細から商品行を抽出
      // 例: "フライドポテト×1=¥800(値引き前計)\nアップルジュース×1=¥900"
      const itemLines = detailText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.includes('×'));

      if (itemLines.length === 0) {
        // 商品行が取れない場合は合計行として1件追加
        results.push({
          id: txId,
          closedAt,
          castName,
          itemName: '不明',
          category: 'other',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
        });
        return;
      }

      itemLines.forEach((line, lineIdx) => {
        // 例: "アップルジュース×1=¥900(値引き前計)"
        const match = line.match(/^(.+?)×(\d+)=¥([\d,]+)/);
        if (!match) return;

        const itemName = match[1].replace(/→トッピング：.+/, '').trim();
        const quantity = parseInt(match[2], 10);
        const totalPrice = parsePrice(match[3]);
        const unitPrice = quantity > 0 ? Math.round(totalPrice / quantity) : totalPrice;

        results.push({
          id: `${txId}-${lineIdx}`,  // 行ごとにユニークIDを生成
          closedAt,
          castName,
          itemName,
          category: guessCategory(itemName),
          quantity,
          unitPrice,
          totalPrice,
        });
      });
    });

    console.log(`[POSCONE] fetchTransactions: ${results.length} rows for ${shopId} ${dateStart}~${dateEnd}`);
    return results;
  }

  /**
   * 日別実績を取得
   * /jisseki_itiran.php?shop=1&date_start=YYYY-MM-DD&date_end=YYYY-MM-DD
   */
  async fetchDailySummary(shopId: ShopId, dateStart: string, dateEnd: string): Promise<DailySummaryRow[]> {
    const shop = SHOP_PARAM[shopId];
    const path = `/jisseki_itiran.php?shop=${shop}&date_start=${dateStart}&date_end=${dateEnd}`;
    const html = await this.fetchPage(path);
    if (!html) return [];

    const $ = cheerio.load(html);
    const results: DailySummaryRow[] = [];

    // 日別テーブル: 日付 | 売上（税込） | 消費税 | 売上（税抜） | 客数 | 客単価
    $('table tr').each((rowIdx, tr) => {
      if (rowIdx === 0) return;
      const cells = $(tr).find('td').map((_, td) => $(td).text().trim()).get();
      if (cells.length < 4) return;

      // 日付は YYYY/MM/DD or YYYY-MM-DD 形式を想定
      const dateRaw = cells[0];
      const dateMatch = dateRaw.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
      if (!dateMatch) return;
      const date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;

      const salesInclTax = parsePrice(cells[1]);
      // cells[2]は消費税の場合がある
      const salesExclTax = parsePrice(cells[3]) || parsePrice(cells[2]);
      const customerCount = parseNum(cells[4] ?? '0');
      const avgUnitPrice = parsePrice(cells[5] ?? '0');

      if (!date || salesInclTax === 0) return;

    results.push({ date, salesInclTax, salesExclTax, customerCount, avgUnitPrice });
    });

    console.log(`[POSCONE] fetchDailySummary: ${results.length} days for ${shopId} ${dateStart}~${dateEnd}`);
    return results;
  }

  /**
   * スタッフ一覧（時給等）を取得
   * /staff_itiran.php?shop=1
   */
  async fetchStaff(shopId: ShopId): Promise<StaffRow[]> {
    const shop = SHOP_PARAM[shopId];
    const path = `/staff_itiran.php?shop=${shop}`;
    const html = await this.fetchPage(path);
    if (!html) return [];

    const $ = cheerio.load(html);
    const results: StaffRow[] = [];

    // スタッフテーブルを探す
    $('table tr').each((rowIdx, tr) => {
      if (rowIdx === 0) return;
      const cells = $(tr).find('td').map((_, td) => $(td).text().trim()).get();
      if (cells.length < 2) return;

      // セル位置はPOSCONEのHTML構造に依存するが、一般的には名前、時給、保障額の順
      // 仮のパースロジック（実際のHTMLに応じて調整が必要）
      const name = cells[0];
      const hourlyWage = parsePrice(cells[1]) || undefined;
      const backGuarantee = cells[2] ? parsePrice(cells[2]) : undefined;
      const memo = cells[3] || '';

      if (!name || name === '−') return;

      results.push({ name, hourlyWage, backGuarantee, memo });
    });

    console.log(`[POSCONE] fetchStaff: ${results.length} staff found for ${shopId}`);
    return results;
  }

  /**
   * 勤怠実績を取得
   * /schedule_kintai.php?shop=1&date_start=YYYY-MM-DD&date_end=YYYY-MM-DD
   */
  async fetchAttendance(shopId: ShopId, dateStart: string, dateEnd: string): Promise<AttendanceRow[]> {
    const shop = SHOP_PARAM[shopId];
    const path = `/schedule_kintai.php?shop=${shop}&date_start=${dateStart}&date_end=${dateEnd}`;
    const html = await this.fetchPage(path);
    if (!html) return [];

    const $ = cheerio.load(html);
    const results: AttendanceRow[] = [];

    // 勤怠テーブル: キャスト名 | 日付 | 出勤時間 | 退勤時間 | 状態
    $('table tr').each((rowIdx, tr) => {
      if (rowIdx === 0) return;
      const cells = $(tr).find('td').map((_, td) => $(td).text().trim()).get();
      if (cells.length < 3) return;

      const castName = cells[0];
      const dateRaw = cells[1];
      const checkIn = cells[2];
      const checkOut = cells[3];
      const statusText = cells[4] || '';

      if (!castName || !dateRaw) return;

      const dateMatch = dateRaw.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
      const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : dateRaw;

      let status: AttendanceRow['status'] = 'attend';
      if (statusText.includes('遅刻')) status = 'late';
      if (statusText.includes('欠勤') || statusText.includes('休み')) status = 'absence';

      results.push({ castName, date, status, checkIn, checkOut });
    });

    console.log(`[POSCONE] fetchAttendance: ${results.length} records for ${shopId} ${dateStart}~${dateEnd}`);
    return results;
  }

  /**
   * 客層データを取得
   * /kyakusou.php?shop=1&date_start=YYYY-MM-DD&date_end=YYYY-MM-DD
   */
  async fetchDemographics(shopId: ShopId, dateStart: string, dateEnd: string): Promise<DemographicRow[]> {
    const shop = SHOP_PARAM[shopId];
    const path = `/kyakusou.php?shop=${shop}&date_start=${dateStart}&date_end=${dateEnd}`;
    const html = await this.fetchPage(path);
    if (!html) return [];

    const $ = cheerio.load(html);
    const results: DemographicRow[] = [];

    // 客層テーブル: 日付 | 客層タイプ | 人数 | 売上
    $('table tr').each((rowIdx, tr) => {
      if (rowIdx === 0) return;
      const cells = $(tr).find('td').map((_, td) => $(td).text().trim()).get();
      if (cells.length < 3) return;

      const dateRaw = cells[0];
      const customerType = cells[1];
      const count = parseNum(cells[2]);
      const totalSales = parsePrice(cells[3]);

      if (!customerType || count === 0) return;

      const dateMatch = dateRaw.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
      const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : dateRaw;

      results.push({ date, customerType, count, totalSales });
    });

    console.log(`[POSCONE] fetchDemographics: ${results.length} rows for ${shopId}`);
    return results;
  }

  /**
   * シフト一覧（月次）を取得してCSSクラスで確定/希望を区別する
   * URL: /schedule_itiran.php?type=monthly&year=YYYY&month=M&shop=N
   *
   * btn-gradient-dark  = 確定シフト（青）
   * btn-gradient-success = 希望シフト（緑・LINE申請が自動反映）
   * btn-light          = なし
   *
   * @param shopId  'love_point' | 'room_of_love_point'
   * @param year    例: 2026
   * @param month   例: 5
   * @param filterDay 指定した場合はその日のみ返す（未指定なら全日）
   */
  async fetchShiftList(
    shopId: ShopId,
    year: number,
    month: number,
    filterDay?: number
  ): Promise<ShiftEntry[]> {
    const shop = SHOP_PARAM[shopId];
    const url = `${POSCONE_BASE}/schedule_itiran.php?type=monthly&year=${year}&month=${month}&shop=${shop}`;
    const html = await this.fetchHtml(url);

    if (!html || (html.includes('login.php') && html.includes('ログイン'))) {
      console.error('[POSCONE] fetchShiftList: session expired or login failed');
      return [];
    }

    const $ = cheerio.load(html);
    const results: ShiftEntry[] = [];

    // ── ヘッダー行を特定 ──
    const colDateMap: Map<number, string> = new Map();
    let headerRowFound = false;

    $('table tr').each((_, tr) => {
      if (headerRowFound) return;
      const cells = $(tr).find('td, th');
      cells.each((colIdx, cell) => {
        const text = $(cell).text().trim();
        // 数字で始まるパターンを広く許容（"1", "1(Wed)", "1 Wed" など）
        const dayMatch = text.match(/^(\d{1,2})/);
        if (dayMatch) {
          headerRowFound = true;
          const day = parseInt(dayMatch[1], 10);
          if (!filterDay || day === filterDay) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            colDateMap.set(colIdx, dateStr);
            console.log(`[POSCONE] Found date column: col=${colIdx}, date=${dateStr}, header="${text}"`);
          }
        }
      });
    });

    if (colDateMap.size === 0) {
      console.warn('[POSCONE] fetchShiftList: no matching date columns found');
      return [];
    }

    // ── データ行をスキャン ──
    const rows = $('table tr');
    console.log(`[POSCONE] Scoping ${rows.length} table rows for shifts...`);
    
    rows.each((rowIdx, tr) => {
      const cells = $(tr).find('td, th');
      if (cells.length < 2) return; // 少なくとも名前と1日分は必要

      // リンク(<a>)の中身もチェックする
      const getVal = (el: any) => {
        const link = $(el).find('a').first();
        return (link.length ? link.text() : $(el).text()).trim();
      };

      const val0 = getVal(cells.eq(0));
      const val1 = getVal(cells.eq(1));
      
      let staffName = '';
      const isTime = (s: string) => /\d{1,2}:\d{2}/.test(s);
      
      // cell1が名前であることが多いため優先的にチェック
      if (val1 && !isTime(val1) && !/^[0-9\/]+$/.test(val1) && !val1.includes('合計') && val1 !== 'スタッフ名') {
        staffName = val1;
      } else if (val0 && !isTime(val0) && !/^[0-9\/]+$/.test(val0) && val0 !== 'スタッフ名' && !val0.includes('合計')) {
        staffName = val0;
      }

      // スタッフ名が取れない or Summary行的なものはスキップ
      if (!staffName || staffName === 'スタッフ名' || staffName.includes('計')) return;
      
      console.log(`[POSCONE] Found row for staff: "${staffName}" (cells: ${cells.length})`);

      colDateMap.forEach((dateStr, colIdx) => {
        const cell = cells.eq(colIdx);
        if (cell.length === 0) return;

        const buttons = cell.find('[class*="btn"]');
        if (buttons.length === 0) return;

        buttons.each((_, btnEl) => {
          const btn = $(btnEl);
          const btnClass = btn.attr('class') || '';
          const btnText = btn.text().trim();

          // 時間パターン: "15:00~23:00" or "15:00～23:00"
          const timeMatch = btnText.match(/(\d{1,2}:\d{2})[~～\-〜](\d{1,2}:\d{2})/);
          if (!timeMatch) return;

          let type: ShiftType;
          if (btnClass.includes('btn-gradient-success')) {
            type = 'requested';
          } else if (btnClass.includes('btn-gradient-dark') || btnClass.includes('btn-gradient-indigo') || btnClass.includes('bg-dark') || btnClass.includes('btn-gradient-info')) {
            type = 'confirmed';
          } else {
            type = 'exception';
          }

          console.log(`[POSCONE] Found ${type} shift for ${staffName} on ${dateStr}: ${timeMatch[1]} - ${timeMatch[2]}`);

          results.push({
            type,
            castName: staffName,
            startTime: timeMatch[1],
            endTime: timeMatch[2],
            date: dateStr,
          });
        });
      });
    });

    console.log(`[POSCONE] fetchShiftList: ${results.length} entries for ${shopId} ${year}/${month}${filterDay ? '/' + filterDay : ''}`);
    return results;
  }
}
