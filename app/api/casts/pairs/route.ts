/**
 * app/api/casts/pairs/route.ts
 * 
 * キャストペア設定（NGペア・相乗効果ペア）の管理API
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/** 一覧取得 */
export async function GET() {
  try {
    const pairs = await prisma.castPairRule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: pairs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/** 新規作成・更新 */
export async function POST(req: NextRequest) {
  try {
    const { castNameA, castNameB, ruleType, penalty, note } = await req.json();

    if (!castNameA || !castNameB || !ruleType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // A-Bの順序を一定にして重複を防ぐ（A < B）
    const [name1, name2] = [castNameA, castNameB].sort();

    const pair = await prisma.castPairRule.upsert({
      where: {
        castNameA_castNameB_ruleType: {
          castNameA: name1,
          castNameB: name2,
          ruleType,
        },
      },
      update: {
        penalty: penalty ?? (ruleType === 'ng' ? -1.0 : 0.2),
        note,
        isActive: true,
      },
      create: {
        castNameA: name1,
        castNameB: name2,
        ruleType,
        penalty: penalty ?? (ruleType === 'ng' ? -1.0 : 0.2),
        note,
      },
    });

    return NextResponse.json({ success: true, data: pair });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/** 削除（非アクティブ化） */
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await prisma.castPairRule.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true, message: 'Pair deactivated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/** 更新 */
export async function PATCH(req: NextRequest) {
  try {
    const { id, ruleType, penalty, note, castNameA, castNameB } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    const data: any = {};
    if (ruleType) data.ruleType = ruleType;
    if (penalty !== undefined) data.penalty = penalty;
    if (note !== undefined) data.note = note;
    if (castNameA) data.castNameA = castNameA;
    if (castNameB) data.castNameB = castNameB;

    const pair = await prisma.castPairRule.update({
      where: { id },
      data
    });

    return NextResponse.json({ success: true, data: pair });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
