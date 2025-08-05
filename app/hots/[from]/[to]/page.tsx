import { notFound } from 'next/navigation';
import dayjs from 'dayjs';
import { db } from '../../../../src/db/index';
import { weiboHotHistory } from '../../../../db/schema';
import { desc, gte, lte, and } from 'drizzle-orm';
import { SavedWeibo } from '../../../../type';
import { Metadata } from 'next';
import { WeiboList } from '../../../../src/components/WeiboList';

interface PageProps {
  params: Promise<{ from: string; to: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { from, to } = await params;
  
  // 验证日期格式
  if (!dayjs(from, 'YYYY-MM-DD', true).isValid() || !dayjs(to, 'YYYY-MM-DD', true).isValid()) {
    return {
      title: '无效日期范围',
      description: '请提供有效的日期格式 (YYYY-MM-DD)'
    };
  }

  const fromDate = dayjs(from).format('YYYY年MM月DD日');
  const toDate = dayjs(to).format('YYYY年MM月DD日');
  
  return {
    title: `${fromDate} 至 ${toDate} 微博热搜`,
    description: `查看${fromDate}至${toDate}期间的微博热搜榜单和热点事件`,
    openGraph: {
      title: `${fromDate} 至 ${toDate} 微博热搜`,
      description: `查看${fromDate}至${toDate}期间的微博热搜榜单和热点事件`,
      type: 'website',
    },
  };
}

export default async function HotSearchRangePage({ params, searchParams }: PageProps) {
  const { from, to } = await params;
  const { sort = 'hot' } = await searchParams;
  
  // 验证日期格式
  if (!dayjs(from, 'YYYY-MM-DD', true).isValid() || !dayjs(to, 'YYYY-MM-DD', true).isValid()) {
    notFound();
  }

  // 验证日期范围
  const fromDate = dayjs(from);
  const toDate = dayjs(to);
  
  if (fromDate.isAfter(toDate)) {
    notFound();
  }

  // 限制查询范围（例如最多30天）
  const daysDiff = toDate.diff(fromDate, 'day');
  if (daysDiff > 30) {
    notFound();
  }

  // 检查日期是否在有效范围内
  const minDate = dayjs('2024-05-20');
  const maxDate = dayjs();
  
  if (fromDate.isBefore(minDate) || toDate.isAfter(maxDate)) {
    notFound();
  }

  // 计算日期范围
  const startOfRange = fromDate.startOf('day').toISOString();
  const endOfRange = toDate.endOf('day').toISOString();

  // 从数据库查询数据
  let orderByClause;
  switch (sort) {
    case 'readCount':
      orderByClause = desc(weiboHotHistory.readCount);
      break;
    case 'discussCount':
      orderByClause = desc(weiboHotHistory.discussCount);
      break;
    case 'origin':
      orderByClause = desc(weiboHotHistory.origin);
      break;
    default:
      orderByClause = desc(weiboHotHistory.hot);
  }

  const results = await db
    .select({
      title: weiboHotHistory.title,
      description: weiboHotHistory.description,
      category: weiboHotHistory.category,
      url: weiboHotHistory.url,
      hot: weiboHotHistory.hot,
      ads: weiboHotHistory.ads,
      readCount: weiboHotHistory.readCount,
      discussCount: weiboHotHistory.discussCount,
      origin: weiboHotHistory.origin,
    })
    .from(weiboHotHistory)
    .where(
      and(
        gte(weiboHotHistory.createdAt, startOfRange),
        lte(weiboHotHistory.createdAt, endOfRange)
      )
    )
    .orderBy(orderByClause)
    .limit(500);

  if (results.length === 0) {
    notFound();
  }

  const fromFormatted = fromDate.format('YYYY年MM月DD日');
  const toFormatted = toDate.format('YYYY年MM月DD日');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">
        {fromFormatted} 至 {toFormatted} 微博热搜
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        共找到 {results.length} 条记录
      </p>
      <WeiboList data={results as SavedWeibo[]} />
    </div>
  );
}