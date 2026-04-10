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
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Swap approval error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
