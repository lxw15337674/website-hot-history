export type PlatformKey = 'weibo' | 'zhihu' | 'douyin' | 'toutiao' | 'bilibili' | 'xhs' | 'baidu';

export type BoardKey = 'realtime_hot' | 'tieba_hot';

export interface HotItem {
  rank: number;
  title: string;
  scoreText: string | null;
  scoreValue: number | null;
  url: string | null;
  metadata?: Record<string, unknown>;
}

export interface HotBoardPayload {
  platformKey: PlatformKey;
  platformName: string;
  boardKey: BoardKey;
  boardName: string;
  sourceUrl: string;
  items: HotItem[];
  rawPayload: unknown;
}

export interface CrawlResultSuccess {
  status: 'success';
  payload: HotBoardPayload;
}

export interface CrawlResultFailure {
  status: 'failed';
  platformKey: PlatformKey;
  platformName: string;
  boardKey: BoardKey;
  boardName: string;
  sourceUrl: string;
  error: string;
  rawPayload?: unknown;
}

export type CrawlResult = CrawlResultSuccess | CrawlResultFailure;
