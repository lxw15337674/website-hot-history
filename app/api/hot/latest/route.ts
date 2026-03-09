import { NextRequest, NextResponse } from 'next/server';
import { getLatestBoardSnapshots } from '@/lib/hot/query';

export async function GET(request: NextRequest) {
  try {
    const limitParam = Number(new URL(request.url).searchParams.get('limit') ?? '10');
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 10;
    const snapshots = await getLatestBoardSnapshots(limit);

    return NextResponse.json({
      data: snapshots,
    });
  } catch (error) {
    console.error('hot latest api error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
