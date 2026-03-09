import { BoardKey, CrawlResult, HotBoardPayload, HotItem, PlatformKey } from './types';

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const REQUEST_TIMEOUT_MS = 15000;
const MAX_ITEMS = 50;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3/videos';

const DEFAULT_XHS_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.7(0x18000733) NetType/WIFI Language/zh_CN',
  referer: 'https://app.xhs.cn/',
  'xy-direction': '22',
  shield:
    'XYAAAAAQAAAAEAAABTAAAAUzUWEe4xG1IYD9/c+qCLOlKGmTtFa+lG434Oe+FTRagxxoaz6rUWSZ3+juJYz8RZqct+oNMyZQxLEBaBEL+H3i0RhOBVGrauzVSARchIWFYwbwkV',
  'xy-platform-info':
    'platform=iOS&version=8.7&build=8070515&deviceId=C323D3A5-6A27-4CE6-AA0E-51C9D4C26A24&bundle=com.xingin.discover',
  'xy-common-params':
    'app_id=ECFAAF02&build=8070515&channel=AppStore&deviceId=C323D3A5-6A27-4CE6-AA0E-51C9D4C26A24&device_fingerprint=20230920120211bd7b71a80778509cf4211099ea911000010d2f20f6050264&device_fingerprint1=20230920120211bd7b71a80778509cf4211099ea911000010d2f20f6050264&device_model=phone&fid=1695182528-0-0-63b29d709954a1bb8c8733eb2fb58f29&gid=7dc4f3d168c355f1a886c54a898c6ef21fe7b9a847359afc77fc24ad&identifier_flag=0&lang=zh-Hans&launch_id=716882697&platform=iOS&project_id=ECFAAF&sid=session.1695189743787849952190&t=1695190591&teenager=0&tz=Asia/Shanghai&uis=light&version=8.7',
};

interface SourceDefinition {
  platformKey: PlatformKey;
  platformName: string;
  boardKey: BoardKey;
  boardName: string;
  sourceUrl: string;
  fetcher: () => Promise<{ items: HotItem[]; rawPayload: unknown }>;
}

function scoreToNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== 'string') return null;

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  const wan = trimmed.match(/^(\d+(?:\.\d+)?)\s*(w|万)$/i);
  if (wan) {
    return Math.round(Number(wan[1]) * 10000);
  }

  const yi = trimmed.match(/^(\d+(?:\.\d+)?)\s*亿$/i);
  if (yi) {
    return Math.round(Number(yi[1]) * 100000000);
  }

  const plain = trimmed.replace(/[^\d.-]/g, '');
  if (!plain) return null;
  const num = Number(plain);
  return Number.isFinite(num) ? Math.round(num) : null;
}

function normalizeUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  return trimmed ? trimmed : null;
}

async function fetchText(url: string, headers: Record<string, string> = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': DEFAULT_UA,
        ...headers,
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    const text = await response.text();
    return { response, text };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url: string, headers: Record<string, string> = {}) {
  const { response, text } = await fetchText(url, headers);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch (error) {
    throw new Error(`Invalid JSON: ${(error as Error).message}`);
  }
}

function getXhsHeaders(): Record<string, string> {
  const raw = process.env.XHS_HEADERS_JSON;
  if (!raw) return DEFAULT_XHS_HEADERS;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return {
      ...DEFAULT_XHS_HEADERS,
      ...parsed,
    };
  } catch {
    return DEFAULT_XHS_HEADERS;
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function buildYouTubeTrendingSource(params: {
  regionCode: 'US' | 'JP' | 'GB' | 'HK';
  boardKey: BoardKey;
  boardName: string;
}): SourceDefinition {
  const sourceUrl = `${YOUTUBE_API_BASE_URL}?part=snippet,statistics&chart=mostPopular&regionCode=${params.regionCode}&maxResults=${MAX_ITEMS}`;

  return {
    platformKey: 'youtube',
    platformName: 'YouTube',
    boardKey: params.boardKey,
    boardName: params.boardName,
    sourceUrl,
    fetcher: async () => {
      const apiKey = process.env.YOUTUBE_API_KEY?.trim();
      if (!apiKey) {
        throw new Error('YOUTUBE_API_KEY is missing');
      }

      const url = new URL(YOUTUBE_API_BASE_URL);
      url.searchParams.set('part', 'snippet,statistics');
      url.searchParams.set('chart', 'mostPopular');
      url.searchParams.set('regionCode', params.regionCode);
      url.searchParams.set('maxResults', String(MAX_ITEMS));
      url.searchParams.set('key', apiKey);

      const payload = await fetchJson(url.toString());
      const list = Array.isArray(payload?.items) ? payload.items : [];
      const items: HotItem[] = list.map((entry: any, idx: number) => {
        const videoId = entry?.id ? String(entry.id) : null;
        const rawViewCount = entry?.statistics?.viewCount;
        const scoreValue = scoreToNumber(rawViewCount);
        return {
          rank: idx + 1,
          title: String(entry?.snippet?.title ?? '').trim(),
          scoreText: scoreValue != null ? formatNumber(scoreValue) : rawViewCount != null ? String(rawViewCount) : null,
          scoreValue,
          url: normalizeUrl(videoId ? `https://www.youtube.com/watch?v=${videoId}` : null),
          metadata: {
            videoId,
            channelTitle: entry?.snippet?.channelTitle ?? null,
            publishedAt: entry?.snippet?.publishedAt ?? null,
          },
        };
      });

      const filtered = items.filter((item) => item.title);
      if (!filtered.length) {
        throw new Error(`No YouTube trending items parsed for region ${params.regionCode}`);
      }

      return { items: filtered, rawPayload: payload };
    },
  };
}

function buildSuccess(def: SourceDefinition, payload: { items: HotItem[]; rawPayload: unknown }): CrawlResult {
  const data: HotBoardPayload = {
    platformKey: def.platformKey,
    platformName: def.platformName,
    boardKey: def.boardKey,
    boardName: def.boardName,
    sourceUrl: def.sourceUrl,
    items: payload.items.slice(0, MAX_ITEMS),
    rawPayload: payload.rawPayload,
  };
  return { status: 'success', payload: data };
}

function buildFailure(def: SourceDefinition, error: unknown): CrawlResult {
  return {
    status: 'failed',
    platformKey: def.platformKey,
    platformName: def.platformName,
    boardKey: def.boardKey,
    boardName: def.boardName,
    sourceUrl: def.sourceUrl,
    error: error instanceof Error ? error.message : String(error),
  };
}

const sourceDefinitions: SourceDefinition[] = [
  buildYouTubeTrendingSource({
    regionCode: 'US',
    boardKey: 'trending_us',
    boardName: '热榜 US',
  }),
  buildYouTubeTrendingSource({
    regionCode: 'JP',
    boardKey: 'trending_jp',
    boardName: '热榜 JP',
  }),
  buildYouTubeTrendingSource({
    regionCode: 'GB',
    boardKey: 'trending_gb',
    boardName: '热榜 GB',
  }),
  buildYouTubeTrendingSource({
    regionCode: 'HK',
    boardKey: 'trending_hk',
    boardName: '热榜 HK',
  }),
  {
    platformKey: 'weibo',
    platformName: '微博',
    boardKey: 'realtime_hot',
    boardName: '实时热搜',
    sourceUrl:
      'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot',
    fetcher: async () => {
      const cookie = process.env.WEIBO_COOKIE?.trim();
      if (!cookie) {
        throw new Error('WEIBO_COOKIE is missing');
      }
      const payload = await fetchJson(
        'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot',
        { Cookie: cookie },
      );
      const list = payload?.data?.cards?.[0]?.card_group ?? [];
      const items: HotItem[] = list
        .filter((entry: any) => /img_search_\d+/.test(entry?.pic ?? '') && entry?.desc)
        .map((entry: any, idx: number) => ({
          rank: idx + 1,
          title: String(entry.desc).trim(),
          scoreText: entry.desc_extr ? String(entry.desc_extr) : null,
          scoreValue: scoreToNumber(entry.desc_extr),
          url: normalizeUrl(
            entry.scheme?.startsWith('http')
              ? entry.scheme
              : `https://s.weibo.com/weibo?q=${encodeURIComponent(String(entry.desc))}`,
          ),
          metadata: {
            itemid: entry.itemid ?? null,
          },
        }));

      if (!items.length) throw new Error('No weibo items parsed');
      return { items, rawPayload: payload };
    },
  },
  {
    platformKey: 'zhihu',
    platformName: '知乎',
    boardKey: 'realtime_hot',
    boardName: '热榜',
    sourceUrl: 'https://api.zhihu.com/topstory/hot-lists/total?limit=50',
    fetcher: async () => {
      const payload = await fetchJson('https://api.zhihu.com/topstory/hot-lists/total?limit=50');
      const list = payload?.data ?? [];
      const items: HotItem[] = list.map((entry: any, idx: number) => ({
        rank: idx + 1,
        title: String(entry?.target?.title ?? '').trim(),
        scoreText: entry?.detail_text ? String(entry.detail_text) : null,
        scoreValue: scoreToNumber(entry?.detail_text),
        url: normalizeUrl(
          String(entry?.target?.url ?? '')
            .replace('api.zhihu.com/questions', 'www.zhihu.com/question')
            .replace('api.', 'www.'),
        ),
        metadata: {
          answerCount: entry?.target?.answer_count ?? null,
          followerCount: entry?.target?.follower_count ?? null,
        },
      }));

      return { items: items.filter((item) => item.title), rawPayload: payload };
    },
  },
  {
    platformKey: 'douyin',
    platformName: '抖音',
    boardKey: 'realtime_hot',
    boardName: '热点榜',
    sourceUrl: 'https://aweme-lq.snssdk.com/aweme/v1/hot/search/list/?aid=1128&version_code=880',
    fetcher: async () => {
      const payload = await fetchJson(
        'https://aweme-lq.snssdk.com/aweme/v1/hot/search/list/?aid=1128&version_code=880',
      );
      const list = payload?.data?.word_list ?? [];
      const items: HotItem[] = list.map((entry: any, idx: number) => ({
        rank: idx + 1,
        title: String(entry?.word ?? '').trim(),
        scoreText: entry?.hot_value != null ? String(entry.hot_value) : null,
        scoreValue: scoreToNumber(entry?.hot_value),
        url: normalizeUrl(entry?.word ? `https://www.douyin.com/search/${encodeURIComponent(entry.word)}` : null),
        metadata: {
          eventTime: entry?.event_time ?? null,
        },
      }));

      return { items: items.filter((item) => item.title), rawPayload: payload };
    },
  },
  {
    platformKey: 'toutiao',
    platformName: '今日头条',
    boardKey: 'realtime_hot',
    boardName: '热榜',
    sourceUrl: 'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc',
    fetcher: async () => {
      const payload = await fetchJson('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc');
      const list = payload?.data ?? [];
      const items: HotItem[] = list.map((entry: any, idx: number) => ({
        rank: idx + 1,
        title: String(entry?.Title ?? '').trim(),
        scoreText: entry?.HotValue ? String(entry.HotValue) : null,
        scoreValue: scoreToNumber(entry?.HotValue),
        url: normalizeUrl(String(entry?.Url ?? '').split('?')[0].replace(/\/$/, '')),
        metadata: {
          clusterId: entry?.ClusterIdStr ?? String(entry?.ClusterId ?? ''),
          label: entry?.Label ?? null,
        },
      }));

      return { items: items.filter((item) => item.title), rawPayload: payload };
    },
  },
  {
    platformKey: 'bilibili',
    platformName: 'B站',
    boardKey: 'realtime_hot',
    boardName: '热搜',
    sourceUrl: 'https://api.bilibili.com/x/web-interface/wbi/search/square?limit=50',
    fetcher: async () => {
      try {
        const payload = await fetchJson('https://api.bilibili.com/x/web-interface/wbi/search/square?limit=50');
        const list = payload?.data?.trending?.list ?? [];
        const items: HotItem[] = list.map((entry: any, idx: number) => ({
          rank: idx + 1,
          title: String(entry?.keyword || entry?.show_name || '').trim(),
          scoreText: entry?.heat_score ? String(entry.heat_score) : null,
          scoreValue: scoreToNumber(entry?.heat_score),
          url: normalizeUrl(
            entry?.keyword ? `https://search.bilibili.com/all?keyword=${encodeURIComponent(entry.keyword)}` : null,
          ),
          metadata: {
            icon: entry?.icon ?? null,
          },
        }));

        const filtered = items.filter((item) => item.title);
        if (!filtered.length) throw new Error('No bilibili items from wbi endpoint');
        return { items: filtered, rawPayload: payload };
      } catch {
        const payload = await fetchJson('https://app.bilibili.com/x/v2/search/trending/ranking?limit=50');
        const list = payload?.data?.list ?? [];
        const items: HotItem[] = list
          .filter((entry: any) => Number(entry?.is_commercial ?? 0) === 0)
          .map((entry: any, idx: number) => ({
            rank: idx + 1,
            title: String(entry?.keyword || entry?.show_name || '').trim(),
            scoreText: entry?.heat_score ? String(entry.heat_score) : null,
            scoreValue: scoreToNumber(entry?.heat_score),
            url: normalizeUrl(
              entry?.keyword ? `https://search.bilibili.com/all?keyword=${encodeURIComponent(entry.keyword)}` : null,
            ),
            metadata: {
              source: 'app_fallback',
            },
          }));

        if (!items.length) throw new Error('No bilibili items from fallback endpoint');
        return { items, rawPayload: payload };
      }
    },
  },
  {
    platformKey: 'xhs',
    platformName: '小红书',
    boardKey: 'realtime_hot',
    boardName: '热点榜',
    sourceUrl: 'https://edith.xiaohongshu.com/api/sns/v1/search/hot_list',
    fetcher: async () => {
      const payload = await fetchJson('https://edith.xiaohongshu.com/api/sns/v1/search/hot_list', getXhsHeaders());
      const list = payload?.data?.items ?? [];
      const items: HotItem[] = list.map((entry: any, idx: number) => ({
        rank: idx + 1,
        title: String(entry?.title ?? '').trim(),
        scoreText: entry?.score ? String(entry.score) : null,
        scoreValue: scoreToNumber(entry?.score),
        url: normalizeUrl(
          entry?.title
            ? `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(entry.title)}&type=51`
            : null,
        ),
        metadata: {
          wordType: entry?.word_type ?? null,
          rankChange: entry?.rank_change ?? null,
        },
      }));

      if (!items.length) throw new Error('No xhs items parsed');
      return { items, rawPayload: payload };
    },
  },
  {
    platformKey: 'baidu',
    platformName: '百度',
    boardKey: 'realtime_hot',
    boardName: '实时热搜',
    sourceUrl: 'https://top.baidu.com/board?tab=realtime',
    fetcher: async () => {
      const { response, text } = await fetchText('https://top.baidu.com/board?tab=realtime');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const match = text.match(/<!--s-data:(.*?)-->/s);
      if (!match) throw new Error('Baidu s-data payload missing');

      let payload: any;
      try {
        payload = JSON.parse((match[1] ?? '').replace(/\\-/g, '-'));
      } catch (error) {
        throw new Error(`Invalid Baidu s-data JSON: ${(error as Error).message}`);
      }

      const list = payload?.data?.cards?.[0]?.content ?? [];
      const items: HotItem[] = list
        .filter((entry: any) => !entry?.isTop)
        .map((entry: any, idx: number) => ({
          rank: Number(entry?.index ?? idx) + 1,
          title: String(entry?.word || entry?.query || '').trim(),
          scoreText: entry?.hotScore ? String(entry.hotScore) : null,
          scoreValue: scoreToNumber(entry?.hotScore),
          url: normalizeUrl(entry?.url?.startsWith('http') ? entry.url : `https://www.baidu.com${entry?.url ?? ''}`),
          metadata: {
            desc: entry?.desc ?? null,
            hotTag: entry?.hotTag ?? null,
          },
        }));

      if (!items.length) throw new Error('No Baidu realtime items parsed');
      return { items, rawPayload: payload };
    },
  },
  {
    platformKey: 'baidu',
    platformName: '百度',
    boardKey: 'tieba_hot',
    boardName: '贴吧热议',
    sourceUrl: 'https://tieba.baidu.com/hottopic/browse/topicList',
    fetcher: async () => {
      const payload = await fetchJson('https://tieba.baidu.com/hottopic/browse/topicList');
      const list = payload?.data?.bang_topic?.topic_list ?? [];
      const items: HotItem[] = list.map((entry: any, idx: number) => ({
        rank: idx + 1,
        title: String(entry?.topic_name ?? '').trim(),
        scoreText: entry?.discuss_num != null ? String(entry.discuss_num) : null,
        scoreValue: scoreToNumber(entry?.discuss_num),
        url: normalizeUrl(entry?.topic_url ?? null),
        metadata: {
          desc: entry?.topic_desc ?? null,
          abstract: entry?.abstract ?? null,
        },
      }));

      if (!items.length) throw new Error('No Tieba items parsed');
      return { items, rawPayload: payload };
    },
  },
];

export async function crawlAllSources(): Promise<CrawlResult[]> {
  const tasks = sourceDefinitions.map(async (def) => {
    try {
      const payload = await def.fetcher();
      return buildSuccess(def, payload);
    } catch (error) {
      return buildFailure(def, error);
    }
  });

  return Promise.all(tasks);
}

export function listCrawlSources() {
  return sourceDefinitions.map((source) => ({
    platformKey: source.platformKey,
    platformName: source.platformName,
    boardKey: source.boardKey,
    boardName: source.boardName,
    sourceUrl: source.sourceUrl,
  }));
}
