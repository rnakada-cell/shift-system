/**
 * app/api/pos/sync/route.ts
 *
 * POSCONEデータ同期エンドポイント
 *
 * POST /api/pos/sync
 * Header: Authorization: Bearer <POSCONE_SYNC_SECRET>
 * Body: { "dateStart": "2025-09-01", "dateEnd": "2026-03-17" }
 *
 * GET /api/pos/sync?secret=<POSCONE_SYNC_SECRET>
 * → Vercel Cron向け（昨日分を自動取得）
 */

import { NextRequest, NextResponse } from 'next/server';
import { PosconeClient, ShopId } from '@/lib/poscone';
import prisma from '@/lib/db';

const SHOPS: ShopId[] = ['love_point', 'room_of_love_point'];

// ─── POSTハンドラ（メイン同期処理）──────────────────────────────
export async function POST(req: NextRequest) {
  // 認証チェック
  const secret = process.env.POSCONE_SYNC_SECRET;
  const authHeader = req.headers.get('authorization') ?? '';
  const referer = req.headers.get('referer') ?? '';

  // 認証チェック (Secretが設定されている場合のみ行う。マネージャー画面からのリクエストは簡易的に許可)
  if (secret && authHeader !== `Bearer ${secret}` && !referer.includes('/manager')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ボディ解析
  let body: { dateStart?: string; dateEnd?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { dateStart, dateEnd } = body;
  if (!dateStart || !dateEnd) {
    return NextResponse.json({ error: 'dateStart and dateEnd are required' }, { status: 400 });
  }

  // POSCONE ログイン
  const loginId = process.env.POSCONE_LOGIN_ID;
  const loginPw = process.env.POSCONE_LOGIN_PW;
  if (!loginId || !loginPw) {
    return NextResponse.json({ error: 'POSCONE credentials not configured' }, { status: 500 });
  }

  const client = new PosconeClient(loginId, loginPw);
  const loggedIn = await client.login();
  if (!loggedIn) {
    return NextResponse.json({ error: 'POSCONE login failed' }, { status: 502 });
  }

  // 集計オブジェクト
  const summary = {
    castsCreated: 0,
    castSalesUpserted: 0,
    transactionsUpserted: 0,
    dailySummaryUpserted: 0,
    errors: [] as string[],
  };

  // 両店舗ループ
  for (const shopId of SHOPS) {
    console.log(`[POS SYNC] Processing shop: ${shopId} | ${dateStart} ~ ${dateEnd}`);

    // 1. キャスト別売上ランキング
    try {
      const rankings = await client.fetchRanking(shopId, dateStart, dateEnd);
      for (const row of rankings) {
        // キャストマスタの自動登録
        const existingCast = await prisma.cast.findFirst({
          where: { name: row.castName }
        });
        if (!existingCast) {
          await prisma.cast.create({
            data: {
              name: row.castName,
              hourlyWage: 2000, // デフォルト時給
              averageSales: row.totalSales > 0 ? row.totalSales : 0,
            }
          });
          summary.castsCreated++;
          console.log(`[POS SYNC] Auto-registered new cast: ${row.castName}`);
        }

        await prisma.castDailySales.upsert({
          where: {
            date_shopId_castName: {
              date: dateStart,
              shopId,
              castName: row.castName,
            },
          },
          update: {
            totalSales: row.totalSales,
            drinkSales: row.drinkSales,
            shotCount: row.shotCount,
            chekiCount: row.chekiCount,
            orishanPt: row.orishanPt,
          },
          create: {
            date: dateStart,
            shopId,
            castName: row.castName,
            totalSales: row.totalSales,
            drinkSales: row.drinkSales,
            shotCount: row.shotCount,
            chekiCount: row.chekiCount,
            orishanPt: row.orishanPt,
          },
        });
        summary.castSalesUpserted++;
      }
    } catch (err: unknown) {
      const msg = `castSales(${shopId}): ${String(err)}`;
      console.error('[POS SYNC]', msg);
      summary.errors.push(msg);
    }

    // 2. 取引明細
    try {
      const transactions = await client.fetchTransactions(shopId, dateStart, dateEnd);
      for (const row of transactions) {
        await prisma.posTransaction.upsert({
          where: { id: row.id },
          update: {
            closedAt: row.closedAt,
            castName: row.castName,
            itemName: row.itemName,
            category: row.category,
            quantity: row.quantity,
            unitPrice: row.unitPrice,
            totalPrice: row.totalPrice,
          },
          create: {
            id: row.id,
            shopId,
            closedAt: row.closedAt,
            castName: row.castName,
            itemName: row.itemName,
            category: row.category,
            quantity: row.quantity,
            unitPrice: row.unitPrice,
            totalPrice: row.totalPrice,
          },
        });
        summary.transactionsUpserted++;
      }
    } catch (err: unknown) {
      const msg = `transactions(${shopId}): ${String(err)}`;
      console.error('[POS SYNC]', msg);
      summary.errors.push(msg);
    }

    // 3. 日別集計
    try {
      const dailySummaries = await client.fetchDailySummary(shopId, dateStart, dateEnd);
      for (const row of dailySummaries) {
        await prisma.dailySummary.upsert({
          where: { date_shopId: { date: row.date, shopId } },
          update: {
            salesInclTax: row.salesInclTax,
            salesExclTax: row.salesExclTax,
            customerCount: row.customerCount,
            avgUnitPrice: row.avgUnitPrice,
          },
          create: {
            date: row.date,
            shopId,
            salesInclTax: row.salesInclTax,
            salesExclTax: row.salesExclTax,
            customerCount: row.customerCount,
            avgUnitPrice: row.avgUnitPrice,
          },
        });
        summary.dailySummaryUpserted++;
      }
    } catch (err: unknown) {
      const msg = `dailySummary(${shopId}): ${String(err)}`;
      console.error('[POS SYNC]', msg);
      summary.errors.push(msg);
    }
  }

  const hasErrors = summary.errors.length > 0;
  return NextResponse.json(
    {
      success: !hasErrors,
      summary,
      message: hasErrors
        ? `Completed with ${summary.errors.length} error(s)`
        : 'All data synced successfully',
    },
    { status: hasErrors ? 207 : 200 }
  );
}

// ─── GETハンドラ（Vercel Cron 毎日深夜2時）────────────────────
export async function GET(req: NextRequest) {
  const secret = process.env.POSCONE_SYNC_SECRET;
  const cronSecret =
    req.headers.get('x-vercel-cron-secret') ??
    req.nextUrl.searchParams.get('secret');
  if (secret && cronSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 昨日の日付
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  const syntheticReq = new NextRequest(req.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ dateStart: dateStr, dateEnd: dateStr }),
  });

  return POST(syntheticReq);
}
