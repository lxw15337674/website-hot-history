import { sql } from 'drizzle-orm';
import { db } from '@/db/index';
import { CrawlResult, HotItem } from './types';

async function ensurePlatformAndBoard(
  platformKey: string,
  platformName: string,
  boardKey: string,
  boardName: string,
) {
  await db.run(sql`
    INSERT INTO hot_platforms (key, name, enabled)
    VALUES (${platformKey}, ${platformName}, 1)
    ON CONFLICT(key) DO UPDATE SET
      name = excluded.name,
      enabled = 1
  `);

  await db.run(sql`
    INSERT INTO hot_boards (platform_key, board_key, name, enabled)
    VALUES (${platformKey}, ${boardKey}, ${boardName}, 1)
    ON CONFLICT(platform_key, board_key) DO UPDATE SET
      name = excluded.name,
      enabled = 1
  `);
}

async function upsertSnapshot(params: {
  platformKey: string;
  boardKey: string;
  snapshotHour: string;
  sourceUrl: string;
  status: 'success' | 'failed';
  itemCount: number;
  errorText: string | null;
  rawPayload: string | null;
}) {
  const rows = await db.all<{ id: number }>(sql`
    INSERT INTO hot_snapshots (
      platform_key,
      board_key,
      snapshot_hour,
      fetched_at,
      status,
      source_url,
      item_count,
      error_text,
      raw_payload
    )
    VALUES (
      ${params.platformKey},
      ${params.boardKey},
      ${params.snapshotHour},
      ${new Date().toISOString()},
      ${params.status},
      ${params.sourceUrl},
      ${params.itemCount},
      ${params.errorText},
      ${params.rawPayload}
    )
    ON CONFLICT(platform_key, board_key, snapshot_hour)
    DO UPDATE SET
      fetched_at = excluded.fetched_at,
      status = excluded.status,
      source_url = excluded.source_url,
      item_count = excluded.item_count,
      error_text = excluded.error_text,
      raw_payload = excluded.raw_payload
    RETURNING id
  `);

  if (!rows[0]?.id) {
    throw new Error(`Failed to upsert snapshot ${params.platformKey}/${params.boardKey}/${params.snapshotHour}`);
  }
  return rows[0].id;
}

async function insertRankItems(snapshotId: number, items: HotItem[]) {
  await db.run(sql`DELETE FROM hot_rank_items WHERE snapshot_id = ${snapshotId}`);

  for (const item of items) {
    await db.run(sql`
      INSERT INTO hot_rank_items (
        snapshot_id,
        rank,
        title,
        score_text,
        score_value,
        url,
        metadata_json,
        created_at
      )
      VALUES (
        ${snapshotId},
        ${item.rank},
        ${item.title},
        ${item.scoreText},
        ${item.scoreValue},
        ${item.url},
        ${item.metadata ? JSON.stringify(item.metadata) : null},
        ${new Date().toISOString()}
      )
    `);
  }
}

export async function ensureHotSchema() {
  await db.run(sql`PRAGMA foreign_keys = ON`);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS hot_platforms (
      key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS hot_boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform_key TEXT NOT NULL,
      board_key TEXT NOT NULL,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(platform_key, board_key),
      FOREIGN KEY(platform_key) REFERENCES hot_platforms(key)
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS hot_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform_key TEXT NOT NULL,
      board_key TEXT NOT NULL,
      snapshot_hour TEXT NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL,
      source_url TEXT NOT NULL,
      item_count INTEGER NOT NULL DEFAULT 0,
      error_text TEXT,
      raw_payload TEXT,
      UNIQUE(platform_key, board_key, snapshot_hour),
      FOREIGN KEY(platform_key) REFERENCES hot_platforms(key)
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS hot_rank_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      rank INTEGER NOT NULL,
      title TEXT NOT NULL,
      score_text TEXT,
      score_value INTEGER,
      url TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(snapshot_id, rank),
      FOREIGN KEY(snapshot_id) REFERENCES hot_snapshots(id) ON DELETE CASCADE
    )
  `);

  await db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_hot_snapshots_hour ON hot_snapshots(snapshot_hour)
  `);
  await db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_hot_snapshots_platform_board_hour ON hot_snapshots(platform_key, board_key, snapshot_hour)
  `);
  await db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_hot_rank_items_snapshot ON hot_rank_items(snapshot_id)
  `);
}

export async function saveCrawlResults(snapshotHour: string, results: CrawlResult[]) {
  const summary = {
    success: 0,
    failed: 0,
  };

  for (const result of results) {
    if (result.status === 'success') {
      const { payload } = result;
      await ensurePlatformAndBoard(payload.platformKey, payload.platformName, payload.boardKey, payload.boardName);
      const snapshotId = await upsertSnapshot({
        platformKey: payload.platformKey,
        boardKey: payload.boardKey,
        snapshotHour,
        sourceUrl: payload.sourceUrl,
        status: 'success',
        itemCount: payload.items.length,
        errorText: null,
        rawPayload: JSON.stringify(payload.rawPayload),
      });
      await insertRankItems(snapshotId, payload.items);
      summary.success += 1;
      continue;
    }

    await ensurePlatformAndBoard(result.platformKey, result.platformName, result.boardKey, result.boardName);
    await upsertSnapshot({
      platformKey: result.platformKey,
      boardKey: result.boardKey,
      snapshotHour,
      sourceUrl: result.sourceUrl,
      status: 'failed',
      itemCount: 0,
      errorText: result.error.slice(0, 500),
      rawPayload: result.rawPayload ? JSON.stringify(result.rawPayload) : null,
    });
    summary.failed += 1;
  }

  return summary;
}
