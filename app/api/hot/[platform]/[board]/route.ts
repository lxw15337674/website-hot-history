import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db/index';
import { parseDateRangeBoundary, parseToSnapshotHour } from '@/lib/hot/time';

interface RouteParams {
  params: Promise<{ platform: string; board: string }>;
}

interface SnapshotRow {
  id: number;
  platformKey: string;
  boardKey: string;
  platformName: string | null;
  boardName: string | null;
  snapshotHour: string;
  fetchedAt: string;
  status: string;
  itemCount: number;
  errorText: string | null;
}

interface RankItemRow {
  snapshotId: number;
  rank: number;
  title: string;
  scoreText: string | null;
  scoreValue: number | null;
  url: string | null;
  metadataJson: string | null;
}

function parseLimit(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { platform, board } = await params;
    const { searchParams } = new URL(request.url);

    const includeFailed = searchParams.get('includeFailed') === '1';
    const itemLimit = parseLimit(searchParams.get('limit'), 50, 200);
    const snapshotLimit = parseLimit(searchParams.get('snapshots'), 24, 240);

    const hourParam = searchParams.get('hour');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const whereParts: ReturnType<typeof sql>[] = [
      sql`platform_key = ${platform}`,
      sql`board_key = ${board}`,
    ];

    if (!includeFailed) {
      whereParts.push(sql`status = 'success'`);
    }

    let normalizedHour: string | null = null;
    let normalizedFrom: string | null = null;
    let normalizedTo: string | null = null;

    if (hourParam) {
      normalizedHour = parseToSnapshotHour(hourParam);
      if (!normalizedHour) {
        return NextResponse.json({ error: 'Invalid hour format' }, { status: 400 });
      }
      whereParts.push(sql`snapshot_hour = ${normalizedHour}`);
    } else if (fromParam || toParam) {
      if (!fromParam || !toParam) {
        return NextResponse.json({ error: 'Both from and to are required' }, { status: 400 });
      }
      normalizedFrom = parseDateRangeBoundary(fromParam, 'start');
      normalizedTo = parseDateRangeBoundary(toParam, 'end');
      if (!normalizedFrom || !normalizedTo) {
        return NextResponse.json({ error: 'Invalid from/to format' }, { status: 400 });
      }
      if (normalizedFrom > normalizedTo) {
        return NextResponse.json({ error: 'from cannot be greater than to' }, { status: 400 });
      }
      whereParts.push(sql`snapshot_hour >= ${normalizedFrom}`);
      whereParts.push(sql`snapshot_hour <= ${normalizedTo}`);
    }

    const snapshots = await db.all<SnapshotRow>(sql`
      SELECT
        s.id as id,
        s.platform_key as platformKey,
        s.board_key as boardKey,
        p.name as platformName,
        b.name as boardName,
        s.snapshot_hour as snapshotHour,
        s.fetched_at as fetchedAt,
        s.status as status,
        s.item_count as itemCount,
        s.error_text as errorText
      FROM hot_snapshots s
      LEFT JOIN hot_platforms p ON p.key = s.platform_key
      LEFT JOIN hot_boards b ON b.platform_key = s.platform_key AND b.board_key = s.board_key
      WHERE ${sql.join(whereParts, sql` AND `)}
      ORDER BY s.snapshot_hour DESC
      LIMIT ${snapshotLimit}
    `);

    if (!snapshots.length) {
      return NextResponse.json({
        query: {
          platform,
          board,
          hour: normalizedHour,
          from: normalizedFrom,
          to: normalizedTo,
          includeFailed,
        },
        data: [],
      });
    }

    const snapshotIds = snapshots.map((snapshot) => sql`${snapshot.id}`);
    const items = await db.all<RankItemRow>(sql`
      SELECT
        snapshot_id as snapshotId,
        rank,
        title,
        score_text as scoreText,
        score_value as scoreValue,
        url,
        metadata_json as metadataJson
      FROM hot_rank_items
      WHERE snapshot_id IN (${sql.join(snapshotIds, sql`,`)})
      AND rank <= ${itemLimit}
      ORDER BY snapshot_id ASC, rank ASC
    `);

    const groupedItems = new Map<number, RankItemRow[]>();
    for (const item of items) {
      if (!groupedItems.has(item.snapshotId)) {
        groupedItems.set(item.snapshotId, []);
      }
      groupedItems.get(item.snapshotId)!.push(item);
    }

    return NextResponse.json({
      query: {
        platform,
        board,
        hour: normalizedHour,
        from: normalizedFrom,
        to: normalizedTo,
        includeFailed,
      },
      data: snapshots.map((snapshot) => ({
        platformKey: snapshot.platformKey,
        platformName: snapshot.platformName ?? snapshot.platformKey,
        boardKey: snapshot.boardKey,
        boardName: snapshot.boardName ?? snapshot.boardKey,
        snapshotHour: snapshot.snapshotHour,
        fetchedAt: snapshot.fetchedAt,
        status: snapshot.status,
        itemCount: snapshot.itemCount,
        errorText: snapshot.errorText,
        items: (groupedItems.get(snapshot.id) ?? []).map((item) => ({
          rank: item.rank,
          title: item.title,
          scoreText: item.scoreText,
          scoreValue: item.scoreValue,
          url: item.url,
          metadata: item.metadataJson ? safeParse(item.metadataJson) : null,
        })),
      })),
    });
  } catch (error) {
    console.error('hot board api error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function safeParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
