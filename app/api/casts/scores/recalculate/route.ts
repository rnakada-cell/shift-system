/**
 * app/api/casts/scores/recalculate/route.ts
 * 
 * 全キャストのスコアを再計算する
 */

import { NextResponse } from 'next/server';
import { updateAllCastScores } from '@/lib/scoring';

export async function POST() {
  try {
    await updateAllCastScores();
    return NextResponse.json({ success: true, message: 'Scores recalculated' });
  } catch (error: any) {
    console.error('Recalculate error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
