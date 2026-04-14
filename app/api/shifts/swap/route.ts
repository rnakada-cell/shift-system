import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * GET /api/api/shifts/swap - Get all active swap requests
 * POST /api/api/shifts/swap - Request a swap for a set of segments
 * PUT /api/api/shifts/swap - Apply to take a shift
 * PATCH /api/api/shifts/swap - Manager Approve/Reject a swap
 */

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const shopId = searchParams.get('shopId') || 'love_point';

        const swapRequests = await prisma.shift.findMany({
            where: {
                shopId,
                isSwapRequested: true,
                swapStatus: {
                    in: ['REQUESTED', 'APPLIED']
                }
            },
            orderBy: [
                { date: 'asc' },
                { segmentId: 'asc' }
            ]
        });

        return NextResponse.json({ success: true, data: swapRequests });
    } catch (error: any) {
        console.error('Fetch swap requests error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { date, castId, shopId, isSwapRequested, note } = body;

        if (!date || !castId) {
            return NextResponse.json({ error: 'Missing date or castId' }, { status: 400 });
        }

        // Update all segments for this cast on this date
        await prisma.shift.updateMany({
            where: {
                date,
                castId,
                shopId: shopId || 'love_point'
            },
            data: {
                isSwapRequested,
                swapNote: note || null,
                swapStatus: isSwapRequested ? 'REQUESTED' : 'NONE',
                swapApplicantId: null // Reset applicant if cancelling
            }
        });

        // Notify Manager if requested
        if (isSwapRequested) {
            notifySwapAction('MANAGER', { action: 'REQUESTED', date, castId });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Swap request error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { date, originalCastId, applicantId, shopId } = body;

        if (!date || !originalCastId || !applicantId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Apply for swap
        await prisma.shift.updateMany({
            where: {
                date,
                castId: originalCastId,
                shopId: shopId || 'love_point',
                isSwapRequested: true
            },
            data: {
                swapApplicantId: applicantId,
                swapStatus: 'APPLIED'
            }
        });

        // Notify Original Cast and Manager via LINE
        notifySwapAction('MANAGER', { action: 'APPLIED', date, castId: applicantId, originalCastId });
        notifySwapAction(originalCastId, { action: 'APPLIED_TO_YOU', date, castId: applicantId });

        // Notify Original Cast and Manager (DB notification)
        await prisma.notification.createMany({
            data: [
                {
                    userId: originalCastId,
                    type: 'SWAP_APPLIED',
                    title: '交代申請が届きました',
                    message: `${date}のシフトにヘルプの立候補がありました。承認をお待ちください。`,
                    link: '/cast'
                },
                {
                    userId: 'manager',
                    type: 'SWAP_APPLIED',
                    title: '交代の承認待ち',
                    message: `${date}のシフト交代申請（${originalCastId} → ${applicantId}）の承認待ちです。`,
                    link: '/manager'
                }
            ]
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Swap apply error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { date, originalCastId, applicantId, action, shopId } = body; // action: 'APPROVE' or 'REJECT'

        if (!date || !originalCastId || !applicantId || !action) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        if (action === 'APPROVE') {
            // Transaction to swap castId
            await prisma.$transaction(async (tx) => {
                await tx.shift.updateMany({
                    where: {
                        date,
                        castId: originalCastId,
                        shopId: shopId || 'love_point',
                        swapApplicantId: applicantId
                    },
                    data: {
                        castId: applicantId, // SWAP!
                        isSwapRequested: false,
                        swapApplicantId: null,
                        swapStatus: 'NONE',
                        swapNote: null
                    }
                });
            });

            // Notify both parties of approval
            await prisma.notification.createMany({
                data: [
                    {
                        userId: originalCastId,
                        type: 'SWAP_APPROVED',
                        title: '交代が承認されました',
                        message: `${date}のシフト交代が完了しました。`,
                        link: '/cast'
                    },
                    {
                        userId: applicantId,
                        type: 'SWAP_APPROVED',
                        title: '交代が承認されました',
                        message: `${date}のシフトをあなたが担当することになりました。`,
                        link: '/cast'
                    }
                ]
            });
        } else {
            // Reject - back to REQUESTED status
            await prisma.shift.updateMany({
                where: {
                    date,
                    castId: originalCastId,
                    shopId: shopId || 'love_point',
                    swapApplicantId: applicantId
                },
                data: {
                    swapApplicantId: null,
                    swapStatus: 'REQUESTED'
                }
            });

            // Notify Applicant of rejection
            await prisma.notification.create({
                data: {
                    userId: applicantId,
                    type: 'SWAP_REJECTED',
                    title: '交代申請が却下されました',
                    message: `${date}の交代申請は管理者により却下されました。`,
                    link: '/cast'
                }
            });
        }

        // Notify parties via LINE
        if (action === 'APPROVE') {
            notifySwapAction(originalCastId, { action: 'APPROVED', date });
            notifySwapAction(applicantId, { action: 'APPROVED', date });
        } else {
            notifySwapAction(applicantId, { action: 'REJECTED', date });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Swap approval error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * SIDE EFFECTS: LINE Notifications
 */
async function notifySwapAction(targetId: string, data: any) {
    try {
        const { sendLineNotification, LINE_TEMPLATES } = await import('@/lib/line');
        const { date, castId, applicantId, originalCastId, action } = data;

        // Fetch names for templates
        const getCastName = async (id: string) => {
            const c = await prisma.cast.findUnique({ where: { id } });
            return c?.name || id;
        };

        let message = '';
        if (action === 'REQUESTED') {
            const name = await getCastName(castId);
            message = LINE_TEMPLATES.SWAP_REQUESTED(name, date);
        } else if (action === 'APPLIED') {
            const name = await getCastName(castId); // applicant
            message = LINE_TEMPLATES.SWAP_APPLIED(name, date);
        } else if (action === 'APPLIED_TO_YOU') {
            message = `【ヘルプ立候補】${date}のあなたのシフトにヘルプの立候補がありました。`;
        } else if (action === 'APPROVED') {
            message = LINE_TEMPLATES.SWAP_APPROVED(date);
        } else if (action === 'REJECTED') {
            message = `【交代申請】${date}の交代申請が管理者により却下されました。`;
        }

        if (message) {
            await sendLineNotification(targetId === 'MANAGER' ? 'manager' : targetId, message);
        }
    } catch (e) {
        console.error('Swap notification error:', e);
    }
}
