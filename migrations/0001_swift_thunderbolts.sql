ALTER TABLE `WeiboHotHistory` ALTER COLUMN "readCount" TO "readCount" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `WeiboHotHistory` ALTER COLUMN "readCount" TO "readCount" integer;--> statement-breakpoint
ALTER TABLE `WeiboHotHistory` ALTER COLUMN "discussCount" TO "discussCount" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `WeiboHotHistory` ALTER COLUMN "discussCount" TO "discussCount" integer;--> statement-breakpoint
ALTER TABLE `WeiboHotHistory` ALTER COLUMN "origin" TO "origin" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `WeiboHotHistory` ALTER COLUMN "origin" TO "origin" integer;--> statement-breakpoint
ALTER TABLE `WeiboHotHistory` ADD `description` text;