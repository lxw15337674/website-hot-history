import { sql } from 'drizzle-orm';
import { db } from '@/db/index';

export interface HotRankItemDTO {
  rank: number;
  title: string;
  scoreText: string | null;
  scoreValue: number | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
}

export interface HotBoardSnapshotDTO {
  platformKey: string;
  platformName: string;
  boardKey: string;
  boardName: string;
  snapshotHour: string;
  fetchedAt: string;
  status: string;
  itemCount: number;
  errorText: string | null;
  items: HotRankItemDTO[];
}

export interface HotBoardHistoryDTO {
  boardId: string;
  platformKey: string;
  platformName: string;
  boardKey: string;
  boardName: string;
  snapshots: HotBoardSnapshotDTO[];
}

interface LatestSnapshotRow {
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

type SnapshotRow = LatestSnapshotRow;

interface RankItemRow {
  snapshotId: number;
  rank: number;
  title: string;
  scoreText: string | null;
  scoreValue: number | null;
  url: string | null;
  metadataJson: string | null;
}

let hotSchemaInitialized = false;
let hotSchemaInitPromise: Promise<void> | null = null;
const TRANSIENT_DB_RETRY_MAX_ATTEMPTS = 3;
const TRANSIENT_DB_RETRY_BASE_DELAY_MS = 300;

function isMissingHotTableError(error: unknown) {
  const message = String((error as any)?.message ?? '');
  const causeMessage = String((error as any)?.cause?.message ?? (error as any)?.cause?.proto?.message ?? '');
  const fullMessage = `${message} ${causeMessage}`.toLowerCase();

  return (
    fullMessage.includes('no such table: hot_snapshots') ||
    fullMessage.includes('no such table: hot_rank_items') ||
    fullMessage.includes('no such table: hot_platforms') ||
    fullMessage.includes('no such table: hot_boards')
  );
}

function isTransientDbError(error: unknown) {
  const message = String((error as any)?.message ?? '');
  const causeMessage = String((error as any)?.cause?.message ?? (error as any)?.cause?.proto?.message ?? '');
  const fullMessage = `${message} ${causeMessage}`.toLowerCase();

  return (
    fullMessage.includes('econnreset') ||
    fullMessage.includes('fetch failed') ||
    fullMessage.includes('client network socket disconnected') ||
    fullMessage.includes('before secure tls connection was established') ||
    fullMessage.includes('etimedout') ||
    fullMessage.includes('timeout') ||
    fullMessage.includes('network')
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureHotSchemaOnDemand() {
  if (hotSchemaInitialized) return;
  if (!hotSchemaInitPromise) {
    hotSchemaInitPromise = (async () => {
      const { ensureHotSchema } = await import('@/lib/hot/db');
      await ensureHotSchema();
      hotSchemaInitialized = true;
    })().finally(() => {
      hotSchemaInitPromise = null;
    });
  }

  await hotSchemaInitPromise;
}

async function withHotSchemaRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= TRANSIENT_DB_RETRY_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (isMissingHotTableError(error)) {
        await ensureHotSchemaOnDemand();
      } else if (!isTransientDbError(error)) {
        throw error;
      }

      if (attempt >= TRANSIENT_DB_RETRY_MAX_ATTEMPTS) {
        throw error;
      }
      await sleep(TRANSIENT_DB_RETRY_BASE_DELAY_MS * attempt);
    }
  }

  throw new Error('Unexpected hot query retry state');
}

function safeParse(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function fetchRankItemsBySnapshotIds(snapshotIds: number[], limit: number) {
  if (!snapshotIds.length) {
    return new Map<number, HotRankItemDTO[]>();
  }

  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 10;
  const rawSnapshotIds = snapshotIds.map((snapshotId) => sql`${snapshotId}`);
  const items = await withHotSchemaRetry(() =>
    db.all<RankItemRow>(sql`
      SELECT
        snapshot_id as snapshotId,
        rank,
        title,
        score_text as scoreText,
        score_value as scoreValue,
        url,
        metadata_json as metadataJson
      FROM hot_rank_items
      WHERE snapshot_id IN (${sql.join(rawSnapshotIds, sql`,`)})
        AND rank <= ${safeLimit}
      ORDER BY snapshot_id ASC, rank ASC
    `),
  );

  const groupedItems = new Map<number, HotRankItemDTO[]>();
  for (const item of items) {
    if (!groupedItems.has(item.snapshotId)) {
      groupedItems.set(item.snapshotId, []);
    }

    groupedItems.get(item.snapshotId)!.push({
      rank: item.rank,
      title: item.title,
      scoreText: item.scoreText,
      scoreValue: item.scoreValue,
      url: item.url,
      metadata: safeParse(item.metadataJson),
    });
  }

  return groupedItems;
}

function mapSnapshots(rows: SnapshotRow[], groupedItems: Map<number, HotRankItemDTO[]>) {
  return rows.map((snapshot) => ({
    platformKey: snapshot.platformKey,
    platformName: snapshot.platformName ?? snapshot.platformKey,
    boardKey: snapshot.boardKey,
    boardName: snapshot.boardName ?? snapshot.boardKey,
    snapshotHour: snapshot.snapshotHour,
    fetchedAt: snapshot.fetchedAt,
    status: snapshot.status,
    itemCount: snapshot.itemCount,
    errorText: snapshot.errorText,
    items: groupedItems.get(snapshot.id) ?? [],
  }));
}

export async function getLatestBoardSnapshots(itemLimit = 10): Promise<HotBoardSnapshotDTO[]> {
  const limit = Number.isFinite(itemLimit) && itemLimit > 0 ? Math.min(itemLimit, 200) : 10;

  const snapshots = await withHotSchemaRetry(() =>
    db.all<LatestSnapshotRow>(sql`
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
      JOIN (
        SELECT platform_key, board_key, MAX(snapshot_hour) AS snapshot_hour
        FROM hot_snapshots
        WHERE status = 'success'
        GROUP BY platform_key, board_key
      ) latest
      ON latest.platform_key = s.platform_key
      AND latest.board_key = s.board_key
      AND latest.snapshot_hour = s.snapshot_hour
      LEFT JOIN hot_platforms p ON p.key = s.platform_key
      LEFT JOIN hot_boards b ON b.platform_key = s.platform_key AND b.board_key = s.board_key
      ORDER BY s.platform_key ASC, s.board_key ASC
    `),
  );

  if (!snapshots.length) {
    return [];
  }
  const groupedItems = await fetchRankItemsBySnapshotIds(
    snapshots.map((snapshot) => snapshot.id),
    limit,
  );

  return mapSnapshots(snapshots, groupedItems);
}

export async function getRecentBoardHistory(hours = 24, itemLimit = 10): Promise<HotBoardHistoryDTO[]> {
  const safeHours = Number.isFinite(hours) && hours > 0 ? Math.min(hours, 168) : 24;

  const snapshots = await withHotSchemaRetry(() =>
    db.all<SnapshotRow>(sql`
      WITH ranked AS (
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
          s.error_text as errorText,
          ROW_NUMBER() OVER (
            PARTITION BY s.platform_key, s.board_key
            ORDER BY s.snapshot_hour DESC
          ) AS rn
        FROM hot_snapshots s
        LEFT JOIN hot_platforms p ON p.key = s.platform_key
        LEFT JOIN hot_boards b ON b.platform_key = s.platform_key AND b.board_key = s.board_key
        WHERE s.status = 'success'
      )
      SELECT
        id,
        platformKey,
        boardKey,
        platformName,
        boardName,
        snapshotHour,
        fetchedAt,
        status,
        itemCount,
        errorText
      FROM ranked
      WHERE rn <= ${safeHours}
      ORDER BY platformKey ASC, boardKey ASC, snapshotHour DESC
    `),
  );

  if (!snapshots.length) {
    return [];
  }

  const groupedItems = await fetchRankItemsBySnapshotIds(
    snapshots.map((snapshot) => snapshot.id),
    itemLimit,
  );
  const snapshotDtos = mapSnapshots(snapshots, groupedItems);

  const boardMap = new Map<string, HotBoardHistoryDTO>();
  for (const snapshot of snapshotDtos) {
    const boardId = `${snapshot.platformKey}:${snapshot.boardKey}`;
    if (!boardMap.has(boardId)) {
      boardMap.set(boardId, {
        boardId,
        platformKey: snapshot.platformKey,
        platformName: snapshot.platformName,
        boardKey: snapshot.boardKey,
        boardName: snapshot.boardName,
        snapshots: [],
      });
    }

    boardMap.get(boardId)!.snapshots.push(snapshot);
  }

  return Array.from(boardMap.values());
}
