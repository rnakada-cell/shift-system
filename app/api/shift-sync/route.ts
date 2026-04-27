import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { PosconeClient, ShopId } from '@/lib/poscone';

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

    // シフト一覧をスクレイプ（月全体のデータを取得してからフィルタする）
    // fetchShiftListの第4引数(filterDay)は渡さない
    const allShifts = await client.fetchShiftList(shopId, year, month);

    // Filter
    const shifts = allShifts.filter(s => {
      const d = parseInt(s.date.split('-')[2], 10);
      return filterFunc(d);
    });

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
    const castByName = new Map(allCasts.map(c => [c.name, c]));

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
      const cast = castByName.get(shift.castName);

      if (shift.type === 'requested') {
        // 緑バー(希望) → Availability に upsert
        if (!cast) {
          console.warn(`[shift-sync] Cast not found for name: ${shift.castName}`);
          skippedCount++;
          continue;
        }

        await prisma.availability.upsert({
          where: { castId_date: { castId: cast.id, date: shift.date } },
          update: { startTime: shift.startTime, endTime: shift.endTime },
          create: {
            castId: cast.id,
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            segments: [],
          },
        });
        requestedCount++;

      } else if (shift.type === 'confirmed') {
        // 青バー(確定) → ConfirmedShift に upsert
        const castId = cast?.id ?? undefined;
        await (prisma as any).confirmedShift.upsert({
          where: {
            castName_date_shopId: {
              castName: shift.castName,
              date: shift.date,
              shopId,
            },
          },
          update: {
            startTime: shift.startTime,
            endTime: shift.endTime,
            castId: castId ?? null,
          },
          create: {
            castName: shift.castName,
            castId: castId ?? null,
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            shopId,
            source: 'POSCONE',
          },
        });
        confirmedCount++;
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
