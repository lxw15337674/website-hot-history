import { sql } from "drizzle-orm";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

export const weiboHotHistory = sqliteTable("WeiboHotHistory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  category: text("category"),
  url: text("url").notNull(),
  hot: integer("hot").notNull(),
  ads: integer("ads", { mode: "boolean" }).notNull().default(false),
  readCount: integer("readCount").notNull(),
  discussCount: integer("discussCount").notNull(),
  origin: integer("origin").notNull(),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
});

export type WeiboHotHistory = typeof weiboHotHistory.$inferSelect;
export type NewWeiboHotHistory = typeof weiboHotHistory.$inferInsert;