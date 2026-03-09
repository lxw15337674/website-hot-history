export type PlatformKey = 'weibo' | 'zhihu' | 'douyin' | 'toutiao' | 'bilibili' | 'xhs' | 'baidu' | 'youtube';

export type BoardKey = 'realtime_hot' | 'tieba_hot' | 'trending_us' | 'trending_jp' | 'trending_gb' | 'trending_hk';

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
