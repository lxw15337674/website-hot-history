CREATE TABLE `WeiboHotHistory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`category` text,
	`url` text NOT NULL,
	`hot` integer NOT NULL,
	`ads` integer DEFAULT false NOT NULL,
	`readCount` integer NOT NULL,
	`discussCount` integer NOT NULL,
	`origin` integer NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL
);
