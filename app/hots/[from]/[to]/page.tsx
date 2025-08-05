import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import dayjs from 'dayjs';
import { SavedWeibo } from '../../../../type';
import { Metadata } from 'next';
import { SearchableWeiboPage } from '../../../../src/components/SearchableWeiboPage';

interface PageProps {
  params: Promise<{ from: string; to: string }>;
  searchParams: Promise<{ sort?: string; keyword?: string }>;
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
  const { sort = 'hot', keyword = '' } = await searchParams;
  
  // 验证日期格式
  if (!dayjs(from, 'YYYY-MM-DD', true).isValid() || !dayjs(to, 'YYYY-MM-DD', true).isValid()) {
    notFound();
  }


  // 如果有搜索关键词，扩展时间范围到全部数据
  let actualFrom = from;
  let actualTo = to;

  if (keyword) {
    actualFrom = '2024-05-20'; // 数据开始日期
    actualTo = dayjs().format('YYYY-MM-DD'); // 今天
  }

  // 调用内部 API 获取数据
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const baseUrl = `${protocol}://${host}`;
  
  const apiUrl = `${baseUrl}/api/weibo-hot-history/range/${actualFrom}/${actualTo}?sort=${sort}${keyword ? `&keyword=${keyword}` : ''}`;
  
  try {
    const response = await fetch(apiUrl, {
      cache: 'force-cache',
      next: { revalidate: 300 } // 5分钟缓存
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        notFound();
      }
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const results: SavedWeibo[] = await response.json();

    return (
      <SearchableWeiboPage
        initialData={results}
        from={from}
        to={to}
      />
    );
  } catch (error) {
    console.error('Failed to fetch data:', error);
    notFound();
  }
}