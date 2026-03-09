import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const weiboHotHistory = sqliteTable('WeiboHotHistory', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category'),
  url: text('url').notNull(),
  hot: integer('hot').notNull(),
  ads: integer('ads', { mode: 'boolean' }).notNull().default(false),
  readCount: integer('readCount').default(0),
  discussCount: integer('discussCount').default(0),
  origin: integer('origin').default(0),
  createdAt: text('createdAt').notNull().default(sql`(datetime('now'))`),
});

export const hotPlatforms = sqliteTable('hot_platforms', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const hotBoards = sqliteTable(
  'hot_boards',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    platformKey: text('platform_key').notNull(),
    boardKey: text('board_key').notNull(),
    name: text('name').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => ({
    platformBoardUnique: uniqueIndex('idx_hot_boards_platform_board').on(table.platformKey, table.boardKey),
  }),
);

export const hotSnapshots = sqliteTable(
  'hot_snapshots',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    platformKey: text('platform_key').notNull(),
    boardKey: text('board_key').notNull(),
    snapshotHour: text('snapshot_hour').notNull(), // YYYY-MM-DD HH:00:00, Asia/Shanghai
    fetchedAt: text('fetched_at').notNull().default(sql`(datetime('now'))`),
    status: text('status').notNull(), // success | failed
    sourceUrl: text('source_url').notNull(),
    itemCount: integer('item_count').notNull().default(0),
    errorText: text('error_text'),
    rawPayload: text('raw_payload'),
  },
  (table) => ({
    snapshotUnique: uniqueIndex('idx_hot_snapshots_unique').on(
      table.platformKey,
      table.boardKey,
      table.snapshotHour,
    ),
    snapshotHourIdx: index('idx_hot_snapshots_hour').on(table.snapshotHour),
    platformBoardHourIdx: index('idx_hot_snapshots_platform_board_hour').on(
      table.platformKey,
      table.boardKey,
      table.snapshotHour,
    ),
  }),
);

export const hotRankItems = sqliteTable(
  'hot_rank_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    snapshotId: integer('snapshot_id').notNull(),
    rank: integer('rank').notNull(),
    title: text('title').notNull(),
    scoreText: text('score_text'),
    scoreValue: integer('score_value'),
    url: text('url'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => ({
    snapshotRankUnique: uniqueIndex('idx_hot_rank_items_snapshot_rank').on(table.snapshotId, table.rank),
    snapshotIdx: index('idx_hot_rank_items_snapshot').on(table.snapshotId),
  }),
);

export type WeiboHotHistory = typeof weiboHotHistory.$inferSelect;
export type NewWeiboHotHistory = typeof weiboHotHistory.$inferInsert;

export type HotPlatform = typeof hotPlatforms.$inferSelect;
export type NewHotPlatform = typeof hotPlatforms.$inferInsert;
export type HotBoard = typeof hotBoards.$inferSelect;
export type NewHotBoard = typeof hotBoards.$inferInsert;
export type HotSnapshot = typeof hotSnapshots.$inferSelect;
export type NewHotSnapshot = typeof hotSnapshots.$inferInsert;
export type HotRankItem = typeof hotRankItems.$inferSelect;
export type NewHotRankItem = typeof hotRankItems.$inferInsert;
