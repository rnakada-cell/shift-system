import { NextResponse } from 'next/server';
import { PosconeClient } from '@/lib/poscone';
import prisma from '@/lib/db';

const RANK_DEFAULT_WAGE: Record<string, number> = {
    'S': 3500,
    'A': 3000,
    'B': 2500,
    'C': 2000,
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const shopId = body.shopId || 'love_point';
        const startDateReq = body.startDate;
        const endDateReq = body.endDate;
        
        // 0. 店舗設定からフォールバック時給等を取得
        const settings = await prisma.storeSetting.findUnique({ where: { id: 'main-store' } }) as any;
        const rankWages: Record<string, number> = settings?.rankDefaultWages || RANK_DEFAULT_WAGE;

        const loginId = process.env.POSCONE_ID || process.env.POSCONE_LOGIN_ID;
        const loginPw = process.env.POSCONE_PW || process.env.POSCONE_LOGIN_PW;

        if (!loginId || !loginPw) {
            throw new Error('POSCONE credentials not found in environment variables (POSCONE_ID/PW or POSCONE_LOGIN_ID/PW)');
        }

        const client = new PosconeClient(loginId, loginPw);
        const loggedIn = await client.login();
        if (!loggedIn) throw new Error('Failed to login to POSCONE');

        // 1. スタッフ情報同期
        const staffDocs = await client.fetchStaff(shopId);
        console.log(`Syncing ${staffDocs.length} staff records...`);

        for (const s of staffDocs) {
            if (s.name.includes('店舗')) continue; // 1F店舗などのダミーアカウントはスキップ

            const cast = await prisma.cast.findFirst({
                where: { name: s.name }
            });

            if (cast) {
                // 既存キャストの更新
                const updateData: any = {};
                if (!(cast as any).isManualWage && s.hourlyWage) {
                    updateData.hourlyWage = s.hourlyWage;
                } else if (!(cast as any).isManualWage && !s.hourlyWage) {
                    // フォールバック: ランク別デフォルト
                    updateData.hourlyWage = rankWages[cast.rank] || 2000;
                }
                
                // 他の属性も必要に応じて更新
                await prisma.cast.update({
                    where: { id: cast.id },
                    data: updateData
                });
            } else {
                // 新規キャストの作成（オプション: 自動作成するかどうかは運用によるが、ここでは作成する）
                await prisma.cast.create({
                    data: {
                        name: s.name,
                        rank: 'C',
                        hourlyWage: s.hourlyWage || 2000,
                        averageSales: 0,
                    }
                });
            }
        }

        // 2. 勤怠同期
        const end = endDateReq ? new Date(endDateReq) : new Date();
        const start = startDateReq ? new Date(startDateReq) : new Date();
        if (!startDateReq) start.setDate(end.getDate() - 30);
        
        const dateStart = start.toISOString().split('T')[0];
        const dateEnd = end.toISOString().split('T')[0];

        const attendanceDocs = await client.fetchAttendance(shopId, dateStart, dateEnd);
        console.log(`Syncing ${attendanceDocs.length} attendance records...`);

        // 3. 客層データ同期
        const demographicDocs = await client.fetchDemographics(shopId, dateStart, dateEnd);
        console.log(`Syncing ${demographicDocs.length} demographic records...`);

        // 並列でDB更新（簡易実装）
        for (const a of attendanceDocs) {
            const cast = await prisma.cast.findFirst({ where: { name: a.castName } });
            if (!cast) continue;

            await (prisma as any).castAttendance.upsert({
                where: {
                    castId_date: {
                        castId: cast.id,
                        date: a.date
                    }
                },
                update: {
                    status: a.status,
                    checkIn: a.checkIn,
                    checkOut: a.checkOut,
                },
                create: {
                    castId: cast.id,
                    date: a.date,
                    status: a.status,
                    checkIn: a.checkIn,
                    checkOut: a.checkOut,
                    shopId,
                }
            });
        }

        // 4. 取引明細同期
        console.log(`Syncing transactions from ${dateStart} to ${dateEnd}...`);
        const transactionDocs = await client.fetchTransactions(shopId, dateStart, dateEnd);
        for (const t of transactionDocs) {
            await prisma.posTransaction.upsert({
                where: { id: t.id },
                update: {
                    closedAt: t.closedAt,
                    castName: t.castName,
                    itemName: t.itemName,
                    category: t.category,
                    quantity: t.quantity,
                    unitPrice: t.unitPrice,
                    totalPrice: t.totalPrice,
                },
                create: {
                    id: t.id,
                    closedAt: t.closedAt,
                    shopId,
                    castName: t.castName,
                    itemName: t.itemName,
                    category: t.category,
                    quantity: t.quantity,
                    unitPrice: t.unitPrice,
                    totalPrice: t.totalPrice,
                }
            });
        }

        // 5. 日別実績同期
        console.log(`Syncing daily summaries...`);
        const summaryDocs = await client.fetchDailySummary(shopId, dateStart, dateEnd);
        for (const s of summaryDocs) {
            await prisma.dailySummary.upsert({
                where: { date_shopId: { date: s.date, shopId } },
                update: {
                    salesInclTax: s.salesInclTax,
                    salesExclTax: s.salesExclTax,
                    customerCount: s.customerCount,
                    avgUnitPrice: s.avgUnitPrice,
                },
                create: {
                    date: s.date,
                    shopId,
                    salesInclTax: s.salesInclTax,
                    salesExclTax: s.salesExclTax,
                    customerCount: s.customerCount,
                    avgUnitPrice: s.avgUnitPrice,
                }
            });
        }

        // 6. 客層データの保存
        for (const d of demographicDocs) {
            await (prisma as any).dailyDemographics.upsert({
                where: {
                    date_shopId_customerType: {
                        date: d.date,
                        shopId,
                        customerType: d.customerType
                    }
                },
                update: {
                    count: d.count,
                    totalSales: d.totalSales,
                },
                create: {
                    date: d.date,
                    shopId,
                    customerType: d.customerType,
                    count: d.count,
                    totalSales: d.totalSales,
                }
            });
        }

        // 4. 欠勤率の再計算
        const allCasts = await prisma.cast.findMany({ include: { attendances: true } as any }) as any;
        for (const c of allCasts) {
            const total = c.attendances.length;
            if (total === 0) continue;
            
            const absences = c.attendances.filter((at: any) => at.status === 'absence').length;
            const absenceRate = absences / total;

            await prisma.cast.update({
                where: { id: c.id },
                data: { absenceRate }
            });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Master data sync completed',
            staffCount: staffDocs.length,
            attendanceCount: attendanceDocs.length,
            transactionCount: transactionDocs.length,
            summaryCount: summaryDocs.length,
            demographicCount: demographicDocs.length
        });

    } catch (error: any) {
        console.error('Master Sync Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
