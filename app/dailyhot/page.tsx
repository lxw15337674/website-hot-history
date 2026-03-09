import type { Metadata } from 'next';
import { DailyHotDashboard } from '@/components/dailyhot/DailyHotDashboard';
import { getLatestBoardSnapshots, getRecentBoardHistory } from '@/lib/hot/query';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '每日热点看板',
  description: '多平台热点榜单聚合与小时级历史数据',
};

export default async function DailyHotPage() {
  const [boards, historyBoards] = await Promise.all([getLatestBoardSnapshots(30), getRecentBoardHistory(24, 10)]);

  return <DailyHotDashboard boards={boards} historyBoards={historyBoards} generatedAt={new Date().toISOString()} />;
}
