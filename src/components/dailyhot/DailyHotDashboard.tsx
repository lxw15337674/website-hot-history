'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpToLine, Github, LayoutGrid, Search, X } from 'lucide-react';
import { ModeToggle } from '@/components/ModeToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HotBoardHistoryDTO, HotBoardSnapshotDTO } from '@/lib/hot/query';
import { cn } from '@/lib/utils';

interface DailyHotDashboardProps {
  boards: HotBoardSnapshotDTO[];
  historyBoards: HotBoardHistoryDTO[];
  generatedAt: string;
}

type ViewMode = 'boards' | 'timeline';

const platformColors: Record<string, string> = {
  weibo: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  zhihu: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  douyin: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40',
  toutiao: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
  bilibili: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
  xhs: 'bg-red-500/15 text-red-300 border-red-500/40',
  baidu: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
  youtube: 'bg-rose-600/15 text-rose-300 border-rose-600/40',
};

const platformLogos: Record<string, { src: string; alt: string }> = {
  weibo: { src: '/platform-icons/weibo.ico', alt: '微博' },
  zhihu: { src: '/platform-icons/zhihu.ico', alt: '知乎' },
  douyin: { src: '/platform-icons/douyin.ico', alt: '抖音' },
  toutiao: { src: '/platform-icons/toutiao.ico', alt: '今日头条' },
  bilibili: { src: '/platform-icons/bilibili.ico', alt: 'B站' },
  xhs: { src: '/platform-icons/xhs.ico', alt: '小红书' },
  baidu: { src: '/platform-icons/baidu.ico', alt: '百度' },
  youtube: { src: '/platform-icons/youtube.ico', alt: 'YouTube' },
};

function PlatformLogo({ platformKey, className }: { platformKey: string; className?: string }) {
  const logo = platformLogos[platformKey];
  if (!logo) {
    return (
      <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-sm border border-zinc-700 bg-zinc-800', className)}>
        <LayoutGrid className="h-4 w-4 text-zinc-400" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-zinc-700 bg-white',
        className,
      )}
    >
      <Image src={logo.src} alt={logo.alt} width={24} height={24} className="h-full w-full object-contain" />
    </span>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function boardOptionLabel(board: { platformName: string; boardName: string }) {
  return `${board.platformName} · ${board.boardName}`;
}

export function DailyHotDashboard({ boards, historyBoards, generatedAt }: DailyHotDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('boards');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [timelineBoardId, setTimelineBoardId] = useState<string>('');

  const platformOptions = useMemo(
    () =>
      Array.from(new Map(boards.map((board) => [board.platformKey, board.platformName])).entries()).map(
        ([key, name]) => ({ key, name }),
      ),
    [boards],
  );

  const filteredBoards = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return boards
      .filter((board) => platformFilter === 'all' || board.platformKey === platformFilter)
      .map((board) => {
        if (!normalizedKeyword) return board;
        const items = board.items.filter((item) => item.title.toLowerCase().includes(normalizedKeyword));
        return { ...board, items };
      })
      .filter((board) => board.items.length > 0);
  }, [boards, keyword, platformFilter]);

  const filteredHistoryBoards = useMemo(() => {
    return historyBoards.filter((board) => platformFilter === 'all' || board.platformKey === platformFilter);
  }, [historyBoards, platformFilter]);

  useEffect(() => {
    if (!filteredHistoryBoards.length) {
      setTimelineBoardId('');
      return;
    }

    const exists = filteredHistoryBoards.some((board) => board.boardId === timelineBoardId);
    if (!exists) {
      setTimelineBoardId(filteredHistoryBoards[0].boardId);
    }
  }, [filteredHistoryBoards, timelineBoardId]);

  const activeTimelineBoard = useMemo(() => {
    if (!timelineBoardId) return null;
    return filteredHistoryBoards.find((board) => board.boardId === timelineBoardId) ?? null;
  }, [filteredHistoryBoards, timelineBoardId]);

  const timelineSnapshots = useMemo(() => {
    if (!activeTimelineBoard) return [];
    const normalizedKeyword = keyword.trim().toLowerCase();

    return activeTimelineBoard.snapshots
      .map((snapshot) => {
        if (!normalizedKeyword) return snapshot;
        const items = snapshot.items.filter((item) => item.title.toLowerCase().includes(normalizedKeyword));
        return { ...snapshot, items };
      })
      .filter((snapshot) => snapshot.items.length > 0 || !normalizedKeyword);
  }, [activeTimelineBoard, keyword]);

  const totalItemCount = useMemo(
    () => filteredBoards.reduce((acc, board) => acc + board.items.length, 0),
    [filteredBoards],
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <div className="mr-auto flex items-center gap-2">
            <div className="rounded-md border border-zinc-700 bg-zinc-800/60 p-2">
              <LayoutGrid className="h-4 w-4 text-zinc-300" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-wide md:text-xl">每日热点</h1>
              <p className="text-xs text-zinc-400">多平台小时级历史看板</p>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 md:w-auto">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[140px] border-zinc-700 bg-zinc-900 text-zinc-100">
                <SelectValue placeholder="选择平台" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    <PlatformLogo platformKey="all" />
                    <span>全部平台</span>
                  </span>
                </SelectItem>
                {platformOptions.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    <span className="flex items-center gap-2">
                      <PlatformLogo platformKey={option.key} />
                      <span>{option.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {viewMode === 'timeline' ? (
              <Select value={timelineBoardId} onValueChange={setTimelineBoardId}>
                <SelectTrigger className="w-[220px] border-zinc-700 bg-zinc-900 text-zinc-100">
                  <SelectValue placeholder="选择榜单" />
                </SelectTrigger>
                <SelectContent>
                  {filteredHistoryBoards.map((board) => (
                    <SelectItem key={board.boardId} value={board.boardId}>
                      <span className="flex items-center gap-2">
                        <PlatformLogo platformKey={board.platformKey} />
                        <span>{boardOptionLabel(board)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            <div className="relative min-w-[220px] flex-1 md:w-[260px] md:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                className="border-zinc-700 bg-zinc-900 pl-9 pr-9 text-zinc-100 placeholder:text-zinc-500"
                placeholder={viewMode === 'timeline' ? '筛选时间轴热词...' : '搜索热词...'}
              />
              {keyword ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-0 top-0 h-10 w-10 text-zinc-400 hover:text-zinc-100"
                  onClick={() => setKeyword('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'boards' ? 'secondary' : 'outline'}
              className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
              onClick={() => setViewMode('boards')}
            >
              看板
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'secondary' : 'outline'}
              className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
              onClick={() => setViewMode('timeline')}
            >
              时间轴
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <ArrowUpToLine />
            </Button>
            <ModeToggle />
            <Button variant="outline" size="icon" className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800" asChild>
              <Link href="https://github.com/lxw15337674/weibo-trending-hot-history" target="_blank">
                <Github />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1440px] px-4 pb-8 pt-5 md:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          {viewMode === 'boards' ? (
            <>
              <Badge variant="outline" className="border-zinc-700 bg-zinc-900/80 text-zinc-300">
                榜单 {filteredBoards.length}
              </Badge>
              <Badge variant="outline" className="border-zinc-700 bg-zinc-900/80 text-zinc-300">
                词条 {totalItemCount}
              </Badge>
            </>
          ) : (
            <>
              <Badge variant="outline" className="border-zinc-700 bg-zinc-900/80 text-zinc-300">
                小时快照 {timelineSnapshots.length}
              </Badge>
              <Badge variant="outline" className="border-zinc-700 bg-zinc-900/80 text-zinc-300">
                看板 {activeTimelineBoard ? boardOptionLabel(activeTimelineBoard) : '未选择'}
              </Badge>
            </>
          )}
          <span className="ml-auto text-zinc-500">页面生成于 {formatTime(generatedAt)}</span>
        </div>

        {viewMode === 'boards' ? (
          filteredBoards.length === 0 ? (
            <Card className="border-zinc-800 bg-zinc-900/80">
              <CardContent className="p-10 text-center text-zinc-400">没有匹配的数据，换个筛选条件试试。</CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filteredBoards.map((board, index) => (
                <Card
                  key={`${board.platformKey}-${board.boardKey}-${board.snapshotHour}`}
                  className={cn(
                    'border-zinc-800 bg-zinc-900/85 shadow-lg shadow-zinc-950/30',
                    'animate-in fade-in-0 slide-in-from-bottom-1 duration-500',
                  )}
                  style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
                >
                  <CardHeader className="space-y-3 border-b border-zinc-800 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <PlatformLogo platformKey={board.platformKey} />
                        <Badge className={cn('border', platformColors[board.platformKey] ?? 'border-zinc-600 bg-zinc-800')}>
                          {board.platformName}
                        </Badge>
                      <span className="truncate text-base font-semibold text-zinc-100">{board.boardName}</span>
                      </div>
                      <Badge variant="outline" className="border-zinc-700 bg-zinc-800/60 text-zinc-300">
                        {board.itemCount} 条
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{formatTime(board.snapshotHour)}</span>
                      <span>{board.status === 'success' ? '已同步' : '同步失败'}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <ScrollArea className="h-[460px]">
                      <div className="space-y-1 p-2">
                        {board.items.map((item) => (
                          <article
                            key={`${board.platformKey}-${board.boardKey}-${item.rank}-${item.title}`}
                            className="rounded-md border border-transparent bg-zinc-900/70 p-2 transition-colors hover:border-zinc-700 hover:bg-zinc-800/60"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-300">
                                {item.rank}
                              </div>
                              <div className="min-w-0 flex-1">
                                {item.url ? (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-lg font-medium leading-snug text-zinc-100 transition-colors hover:text-cyan-300"
                                  >
                                    {item.title}
                                  </a>
                                ) : (
                                  <h3 className="text-lg font-medium leading-snug text-zinc-100">{item.title}</h3>
                                )}
                              </div>
                              <p className="shrink-0 text-right text-xs font-medium tabular-nums text-zinc-500">
                                {item.scoreText ?? '--'}
                              </p>
                            </div>
                          </article>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : !activeTimelineBoard ? (
          <Card className="border-zinc-800 bg-zinc-900/80">
            <CardContent className="p-10 text-center text-zinc-400">当前筛选下没有可用时间轴数据。</CardContent>
          </Card>
        ) : (
          <Card className="border-zinc-800 bg-zinc-900/85 shadow-lg shadow-zinc-950/30">
            <CardHeader className="border-b border-zinc-800 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <PlatformLogo platformKey={activeTimelineBoard.platformKey} />
                <Badge className={cn('border', platformColors[activeTimelineBoard.platformKey] ?? 'border-zinc-600 bg-zinc-800')}>
                  {activeTimelineBoard.platformName}
                </Badge>
                <span className="font-semibold text-zinc-100">{activeTimelineBoard.boardName}</span>
                <Badge variant="outline" className="border-zinc-700 bg-zinc-800/60 text-zinc-300">
                  最近 {timelineSnapshots.length} 小时
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[620px]">
                <div className="p-4">
                  <ol className="relative border-l border-zinc-800 pl-5">
                    {timelineSnapshots.map((snapshot) => (
                      <li key={`${snapshot.platformKey}-${snapshot.boardKey}-${snapshot.snapshotHour}`} className="mb-6 last:mb-0">
                        <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border border-zinc-700 bg-zinc-900" />
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                            <Badge variant="outline" className="border-zinc-700 bg-zinc-800/70 text-zinc-300">
                              {formatTime(snapshot.snapshotHour)}
                            </Badge>
                            <Badge variant="outline" className="border-zinc-700 bg-zinc-800/70 text-zinc-300">
                              {snapshot.items.length} 条
                            </Badge>
                          </div>
                          <div className="space-y-1.5">
                            {snapshot.items.slice(0, 8).map((item) => (
                              <div
                                key={`${snapshot.snapshotHour}-${item.rank}-${item.title}`}
                                className="flex items-center gap-2 rounded-md border border-transparent p-1.5 transition-colors hover:border-zinc-700 hover:bg-zinc-800/40"
                              >
                                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-zinc-800 px-1 text-xs text-zinc-300">
                                  {item.rank}
                                </span>
                                <div className="min-w-0 flex-1">
                                  {item.url ? (
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-lg leading-snug text-zinc-100 transition-colors hover:text-cyan-300"
                                    >
                                      {item.title}
                                    </a>
                                  ) : (
                                    <p className="text-lg leading-snug text-zinc-100">{item.title}</p>
                                  )}
                                </div>
                                <p className="shrink-0 text-right text-xs font-medium tabular-nums text-zinc-500">
                                  {item.scoreText ?? '--'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
