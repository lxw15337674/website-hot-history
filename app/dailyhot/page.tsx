import type { Metadata } from 'next';
import { DailyHotDashboard } from '@/components/dailyhot/DailyHotDashboard';
import { HotBoardHistoryDTO, HotBoardSnapshotDTO, getLatestBoardSnapshots, getRecentBoardHistory } from '@/lib/hot/query';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '每日热点看板',
  description: '多平台热点榜单聚合与小时级历史数据',
};

export default async function DailyHotPage() {
  let boards: HotBoardSnapshotDTO[] = [];
  let historyBoards: HotBoardHistoryDTO[] = [];

  try {
    [boards, historyBoards] = await Promise.all([getLatestBoardSnapshots(30), getRecentBoardHistory(24, 10)]);
  } catch (error) {
    console.error('[dailyhot] failed to load hot data:', error);
  }

  return <DailyHotDashboard boards={boards} historyBoards={historyBoards} generatedAt={new Date().toISOString()} />;
}
