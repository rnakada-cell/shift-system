
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const requests = await prisma.shiftRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: requests });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { id, action } = await request.json();

    if (!id || !action) {
      return NextResponse.json({ success: false, error: 'Missing id or action' }, { status: 0 });
    }

    if (action === 'ignore') {
      await prisma.shiftRequest.update({
        where: { id },
        data: { status: 'ignored' },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'approve') {
      const shiftReq = await prisma.shiftRequest.findUnique({ where: { id } });
      if (!shiftReq) {
        return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
      }

      // Identify Cast
      // Priority 1: lineId, Priority 2: castName
      let cast = null;
      if (shiftReq.lineId) {
        cast = await prisma.cast.findFirst({
          where: { lineId: shiftReq.lineId, isActive: true },
        });
      }
      
      if (!cast && shiftReq.castName) {
        cast = await prisma.cast.findFirst({
          where: { name: shiftReq.castName, isActive: true },
        });
      }

      if (!cast) {
        return NextResponse.json({ success: false, error: 'Cast not identified. Please link LINE ID first.' }, { status: 400 });
      }

      // Convert to Availability
      const date = shiftReq.date;
      
      // Upsert availability
      const existing = await prisma.availability.findFirst({
          where: { castId: cast.id, date }
      });

      if (existing) {
          await prisma.availability.update({
              where: { id: existing.id },
              data: {
                  startTime: shiftReq.startTime,
                  endTime: shiftReq.endTime,
              }
          });
      } else {
          await prisma.availability.create({
              data: {
                  castId: cast.id,
                  date,
                  startTime: shiftReq.startTime,
                  endTime: shiftReq.endTime,
                  segments: [], // Default empty segments
              }
          });
      }

      // Update request status
      await prisma.shiftRequest.update({
        where: { id },
        data: { 
          status: 'approved',
          castId: cast.id // Link it for history
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
