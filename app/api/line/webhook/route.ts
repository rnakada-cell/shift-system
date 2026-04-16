import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';

const channelSecret = process.env.LINE_CHANNEL_SECRET || 'test_secret';

export async function POST(request: Request) {
    try {
        const signature = request.headers.get('x-line-signature');
        const bodyText = await request.text();

        // 署名検証
        if (process.env.NODE_ENV === 'production' && process.env.LINE_CHANNEL_SECRET) {
            const hash = crypto.createHmac('SHA256', channelSecret).update(bodyText).digest('base64');
            if (hash !== signature) {
                return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
            }
        }

        const body = JSON.parse(bodyText);
        
        for (const event of body.events) {
            if (event.type === 'message' && event.message.type === 'text') {
                const text = event.message.text as string;
                const userId = event.source.userId;
                
                // フォーマット例: "シフト 2026-04-20 18:00-00:00"
                if (text.startsWith('シフト')) {
                    const parts = text.split(/[ 　\n]+/); // スペースや改行区切り
                    if (parts.length >= 2) {
                        let dateStr = parts[1];
                        
                        // MM/DD 形式なら自動変換
                        if (dateStr.includes('/')) {
                            const today = new Date();
                            const [m, d] = dateStr.split('/');
                            dateStr = `${today.getFullYear()}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                        }

                        let startTime: string | null = null;
                        let endTime: string | null = null;
                        if (parts[2] && parts[2].includes('-')) {
                            const times = parts[2].split('-');
                            startTime = times[0];
                            endTime = times[1];
                        }

                        // LINE IDからキャストを特定
                        const cast = await prisma.cast.findFirst({ 
                            where: { lineId: userId, isActive: true } 
                        });
                        
                        await prisma.shiftRequest.create({
                            data: {
                                castName: cast?.name || null,
                                castId: cast?.id || null,
                                lineId: userId,
                                date: dateStr,
                                startTime: startTime || '18:00',
                                endTime: endTime || '00:00',
                                source: 'line',
                                status: 'pending',
                                rawText: text
                            }
                        });

                        // 応答メッセージの送信 (アクセストークンがある場合のみ)
                        if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
                            try {
                                await fetch('https://api.line.me/v2/bot/message/reply', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
                                    },
                                    body: JSON.stringify({
                                        replyToken: event.replyToken,
                                        messages: [{
                                            type: 'text',
                                            text: `シフト希望を受け付けました！\n日付: ${dateStr}\n時間: ${startTime || '18:00'}-${endTime || '00:00'}\n\nマネージャーが確認後、反映されます。`
                                        }]
                                    })
                                });
                            } catch (replyError) {
                                console.error('Failed to send LINE reply:', replyError);
                            }
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('LINE Webhook Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
