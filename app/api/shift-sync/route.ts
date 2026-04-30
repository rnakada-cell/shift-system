import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { PosconeClient, ShopId, normalizeName } from '@/lib/poscone';

/**
 * POST /api/shift-sync
 * POSCONEのシフト一覧をスクレイプして
 *   - 緑バー(希望) → Availability に upsert
 *   - 青バー(確定) → ConfirmedShift に upsert
 *
 * Body: { date: "YYYY-MM-DD", shopId: "love_point" | "room_of_love_point" }
 * Response: { success, requested, confirmed, skipped, date, shopId }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    // モード: 'period' | 'single'
    const mode = body.mode || 'single';
    const shopId: ShopId = body.shopId || 'love_point';

    let year = 0;
    let month = 0;
    let filterFunc: (day: number) => boolean = () => true;
    let targetDateStr = '';

    if (mode === 'single') {
      targetDateStr = body.date || new Date().toISOString().split('T')[0];
      const [yearStr, monthStr, dayStr] = targetDateStr.split('-');
      year = parseInt(yearStr, 10);
      month = parseInt(monthStr, 10);
      const targetDay = parseInt(dayStr, 10);
      filterFunc = (day) => day === targetDay;
    } else {
      // period
      const yyyymm = body.month || new Date().toISOString().slice(0, 7); // YYYY-MM
      const period = body.period || 'first_half'; // 'first_half' | 'second_half' | 'all'
      const [yearStr, monthStr] = yyyymm.split('-');
      year = parseInt(yearStr, 10);
      month = parseInt(monthStr, 10);
      
      if (period === 'first_half') {
         filterFunc = (day) => day >= 1 && day <= 15;
      } else if (period === 'second_half') {
         filterFunc = (day) => day >= 16;
      } else {
         filterFunc = () => true;
      }
      targetDateStr = `${yyyymm} (${period})`;
    }

    if (isNaN(year) || isNaN(month)) {
      return NextResponse.json({ success: false, error: 'Invalid date/month format.' }, { status: 400 });
    }

    const loginId = process.env.POSCONE_LOGIN_ID;
    const loginPw = process.env.POSCONE_LOGIN_PW;

    if (!loginId || !loginPw) {
      return NextResponse.json({ success: false, error: 'POSCONE credentials not configured.' }, { status: 500 });
    }

    // POSCONE にログイン
    const client = new PosconeClient(loginId, loginPw);
    const loggedIn = await client.login();
    if (!loggedIn) {
      return NextResponse.json({ success: false, error: 'POSCONE login failed. Check credentials.' }, { status: 401 });
    }

    let shifts: any[] = [];
    if (filterDay) {
      shifts = await client.fetchDailyShiftList(shopId, year, month, filterDay);
    } else {
      shifts = await client.fetchShiftList(shopId, year, month);
      shifts = shifts.filter(s => {
        const d = parseInt(s.date.split('-')[2], 10);
        return filterFunc(d);
      });
    }

    if (shifts.length === 0) {
      return NextResponse.json({
        success: true,
        requested: 0,
        confirmed: 0,
        skipped: 0,
        date: targetDateStr,
        shopId,
        message: '指定期間のシフトデータが見つかりませんでした。',
      });
    }

    let requestedCount = 0;
    let confirmedCount = 0;
    let skippedCount = 0;

    // キャストマスタをキャッシュ
    const allCasts = await prisma.cast.findMany({ where: { isActive: true } });
    
    // マッチング関数: 名前とエイリアスの両方でマッチング
    const findCast = (scrapedName: string) => {
      const normalizedScraped = normalizeName(scrapedName);
      return allCasts.find(c => {
        const normalizedBase = normalizeName(c.name);
        const normalizedAliases = (c.aliases as string[] || []).map((a: string) => normalizeName(a));
        return normalizedBase === normalizedScraped || normalizedAliases.includes(normalizedScraped);
      });
    };

    // ── データのクリーニング ──
    // 同期対象日の既存データを一旦おそうじする（リセット後のクリーンな状態にするため）
    // NOTE: singleモードならその日、periodならその月の指定範囲全て
    const targetDates = shifts.map(s => s.date).filter((v, i, a) => a.indexOf(v) === i);
    if (targetDates.length > 0) {
        console.log(`[shift-sync] Cleaning up existing data for ${targetDates.length} dates...`);
        await prisma.availability.deleteMany({
            where: { date: { in: targetDates } }
        });
        await (prisma as any).confirmedShift.deleteMany({
            where: {
                date: { in: targetDates },
                shopId: shopId // 自分の店舗分だけおそうじ
            }
        });
    }

    for (const shift of shifts) {
      const rawName = shift.castName;
      const normalized = normalizeName(rawName);
      const cast = findCast(rawName);
      const matched = cast ? cast.name : 'NOT_FOUND';

      console.log(`[shift-sync] Scraped: "${rawName}" / Norm: "${normalized}" / Type: ${shift.type} / Match: ${matched}`);

      if (!cast) {
        console.warn(`[shift-sync] Cast not found for: ${rawName}`);
        skippedCount++;
        continue;
      }

      if (shift.type === 'confirmed') {
        // 確定シフト（青バー）は ConfirmedShift テーブルに保存
        await (prisma as any).confirmedShift.upsert({
          where: { 
            castName_date_shopId: { 
              castName: cast.name, 
              date: shift.date, 
              shopId: shopId 
            } 
          },
          update: { 
            startTime: shift.startTime, 
            endTime: shift.endTime,
            castId: cast.id,
            source: 'POSCONE'
          },
          create: {
            castName: cast.name,
            castId: cast.id,
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            shopId: shopId,
            source: 'POSCONE'
          }
        });
        confirmedCount++;
      } else if (shift.type === 'requested') {
        // 希望シフト（緑バー）は ShiftRequest と Availability に保存
        await prisma.shiftRequest.create({
          data: {
            castName: rawName,
            castId: cast.id,
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            source: 'EXTERNAL_FORM_REQUEST',
            status: 'approved',
          }
        });

        await prisma.availability.upsert({
          where: { castId_date: { castId: cast.id, date: shift.date } },
          update: { startTime: shift.startTime, endTime: shift.endTime },
          create: {
            castId: cast.id,
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            segments: [],
          }
        });
        requestedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      requested: requestedCount,
      confirmed: confirmedCount,
      skipped: skippedCount,
      date: targetDateStr,
      shopId,
    });
  } catch (error: any) {
    console.error('[shift-sync] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
