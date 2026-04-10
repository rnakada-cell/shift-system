import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // JSONとして取得 (header: 1 は 2次元配列)
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        if (data.length < 2) {
            return NextResponse.json({ error: 'Empty or invalid CSV' }, { status: 400 });
        }

        const headers = data[0].map(h => String(h).trim());
        let processedCount = 0;

        // 1. キャストランキング形式の判定
        if (headers.includes('スタッフ名') || headers.includes('名前')) {
            const nameIdx = headers.findIndex(h => h.includes('スタッフ') || h.includes('名前'));
            const totalIdx = headers.findIndex(h => h.includes('合計') || h.includes('売上'));
            
            // 日付の推定（ファイル名またはヘッダー付近にある可能性。なければ今日）
            const today = new Date().toISOString().split('T')[0];

            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                const castName = String(row[nameIdx] || '').trim();
                const totalSales = parseInt(String(row[totalIdx] || '0').replace(/,/g, '')) || 0;
                
                if (!castName || castName === '合計' || castName === '-') continue;

                await prisma.castDailySales.upsert({
                    where: {
                        date_shopId_castName: {
                            date: today,
                            shopId: 'love_point', // デフォルト
                            castName: castName,
                        }
                    },
                    update: { totalSales },
                    create: {
                        date: today,
                        shopId: 'love_point',
                        castName: castName,
                        totalSales
                    }
                });
                processedCount++;
            }
        } 
        // 2. 日別実績形式の判定 
        else if (headers.includes('日付')) {
            const dateIdx = headers.indexOf('日付');
            const salesIdx = headers.findIndex(h => h.includes('売上'));
            const customerIdx = headers.findIndex(h => h.includes('客数'));

            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                let val = row[dateIdx];
                if (!val) continue;

                let date: string;
                if (typeof val === 'number') {
                    // Excelシリアル値を変換
                    const d = XLSX.SSF.parse_date_code(val);
                    date = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
                } else {
                    date = String(val).trim().replace(/\//g, '-');
                }

                const sales = parseInt(String(row[salesIdx] || '0').replace(/,/g, '')) || 0;
                const customers = parseInt(String(row[customerIdx] || '0').replace(/,/g, '')) || 0;

                if (sales === 0 && customers === 0) continue;

                await prisma.dailySummary.upsert({
                    where: { date_shopId: { date, shopId: 'love_point' } },
                    update: { salesInclTax: sales, customerCount: customers },
                    create: { date, shopId: 'love_point', salesInclTax: sales, customerCount: customers }
                });
                processedCount++;
            }
        }
        // 3. 勤怠管理形式の判定 (メンバー名, 日付, 開始, 終了 等が含まれる)
        else if (headers.includes('メンバー名') || (data.length > 0 && String(data[0][0]).includes('ヌメバー'))) {
            const nameIdx = headers.findIndex(h => h.includes('メンバー') || h.includes('ヌメバー') || h.includes('スタッフ'));
            const dateIdx = headers.findIndex(h => h.includes('日付'));
            const inIdx = headers.findIndex(h => h.includes('開始'));
            const outIdx = headers.findIndex(h => h.includes('終了'));

            // 全キャストを取得してマッピング用マップを作成
            const allCasts = await prisma.cast.findMany();
            const castNameMap = new Map(allCasts.map(c => [c.name, c.id]));

            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (!row || row.length < 2) continue;

                const rawName = String(row[nameIdx >= 0 ? nameIdx : 0] || '').trim();
                const rawDate = String(row[dateIdx >= 0 ? dateIdx : 3] || '').trim();
                const checkIn = String(row[inIdx >= 0 ? inIdx : 4] || '').trim();
                const checkOut = String(row[outIdx >= 0 ? outIdx : 5] || '').trim();

                if (!rawName || !rawDate) continue;
                
                // キャストIDの取得（名前が一致するもの）
                const castId = castNameMap.get(rawName);
                if (!castId) continue;

                // 日付のクリーンアップ (2026-02-01 等)
                const date = rawDate.replace(/\//g, '-');

                await prisma.castAttendance.upsert({
                    where: { castId_date: { castId, date } },
                    update: { checkIn, checkOut, status: 'attend' },
                    create: { castId, date, checkIn, checkOut, status: 'attend', shopId: 'love_point' }
                });
                processedCount++;
            }
        }

        return NextResponse.json({ success: true, processedCount });
    } catch (error: any) {
        console.error('CSV import error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
