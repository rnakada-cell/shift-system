import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import prisma from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { dailyResults, summary } = body;

        if (!dailyResults) {
            return NextResponse.json({ success: false, error: 'No data provided' }, { status: 400 });
        }

        // キャストIDを名前に変換するためのマップを作成
        const allCasts = await prisma.cast.findMany();
        const castMap = new Map(allCasts.map(c => [c.id, c.name]));
        const getName = (id: string) => castMap.get(id) || id;

        // ワークブック作成
        const wb = XLSX.utils.book_new();

        // キャスト別シフト用の集計データ
        const castSchedule: Record<string, { totalSegments: number, shifts: string[] }> = {};

        // 1. 各日のシートを作成
        dailyResults.forEach((day: any) => {
            const sheetData = day.segments.map((seg: any) => {
                const timeLabel = (seg.segmentId || '').replace('SEG_', '').replace('_', ':00 - ') + ':00';
                
                // 配置されたキャストを1F/2Fで分離
                const floor1Casts = (seg.assignments || []).filter((a: any) => a.floor === '1F').map((a: any) => getName(a.castId));
                const floor2Casts = (seg.assignments || []).filter((a: any) => a.floor === '2F').map((a: any) => getName(a.castId));
                
                // 旧形式（floor情報なし）のフォールバック
                const unassignedCasts = (seg.assignedCastIds || []).map((id: string) => getName(id));

                // キャスト別スケジュールの記録
                (seg.assignments || []).forEach((a: any) => {
                    const name = getName(a.castId);
                    if (!castSchedule[name]) castSchedule[name] = { totalSegments: 0, shifts: [] };
                    castSchedule[name].totalSegments++;
                    castSchedule[name].shifts.push(`${day.date} ${timeLabel} (${a.floor})`);
                });

                // 未配置理由のフォーマット
                const unassignedStr = (seg.unassignedReasons || [])
                    .map((r: any) => `${getName(r.castId)}: ${r.reason}`)
                    .join(' | ');

                return {
                    '時間帯': timeLabel,
                    '1F フロア': floor1Casts.length > 0 ? floor1Casts.join(', ') : (unassignedCasts.length > 0 ? unassignedCasts.join(', ') : 'なし'),
                    '2F カウンター': floor2Casts.length > 0 ? floor2Casts.join(', ') : 'なし',
                    '想定売上 (円)': seg.expectedRevenue || 0,
                    '想定利益 (円)': seg.expectedProfit || 0,
                    '未配置のキャストと理由': unassignedStr || 'なし'
                };
            });
            const ws = XLSX.utils.json_to_sheet(sheetData);
            
            // カラム幅の調整（見やすくするため）
            const wscols = [
                { wch: 15 }, // 時間帯
                { wch: 30 }, // 1F
                { wch: 30 }, // 2F
                { wch: 15 }, // 売上
                { wch: 15 }, // 利益
                { wch: 100 } // 未配置理由
            ];
            ws['!cols'] = wscols;

            XLSX.utils.book_append_sheet(wb, ws, day.date);
        });

        // 2. キャスト別スケジュールシート作成 (だれがいつ出勤なのかが一目でわかるシート)
        const scheduleData = Object.keys(castSchedule)
            .sort((a, b) => castSchedule[b].totalSegments - castSchedule[a].totalSegments)
            .map(name => ({
                'キャスト名': name,
                '総シフト枠数 (枠)': castSchedule[name].totalSegments,
                '出勤スケジュール': castSchedule[name].shifts.join('\n')
            }));

        if (scheduleData.length > 0) {
            const wsSchedule = XLSX.utils.json_to_sheet(scheduleData);
            wsSchedule['!cols'] = [ { wch: 20 }, { wch: 15 }, { wch: 100 } ]; // スケジュール列を広く
            XLSX.utils.book_append_sheet(wb, wsSchedule, 'キャスト別シフト表');
        }

        // 3. サマリーシート作成
        if (summary) {
            const summaryData = [
                { '項目': '合計売上', '金額 (円)': summary.totalRevenue },
                { '項目': '合計人件費コスト', '金額 (円)': summary.totalCost },
                { '項目': '合計利益', '金額 (円)': summary.totalProfit }
            ];
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);
            wsSummary['!cols'] = [ { wch: 20 }, { wch: 15 } ];
            XLSX.utils.book_append_sheet(wb, wsSummary, '全体サマリー');
        }

        // バッファに書き出し
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        return new Response(buf, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename="shift_optimization.xlsx"'
            }
        });
    } catch (error: any) {
        console.error('Export error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
