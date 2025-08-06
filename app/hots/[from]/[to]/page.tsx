import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import dayjs from 'dayjs';
import { SavedWeibo } from '../../../../type';
import { Metadata } from 'next';
import { SearchableWeiboPage } from '../../../../src/components/SearchableWeiboPage';
import { Menubar, MenubarMenu, MenubarTrigger } from '@radix-ui/react-menubar';

import Link from 'next/link';
import { DatePicker } from '../../../../src/components/DayPicker';

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
      <>
        <div className="container mx-auto px-4 py-2">
          <Menubar className="flex justify-between  bg-card border rounded-lg text-sm">
            <MenubarMenu>
              <Link
                href={`/hots/${dayjs(from)
                  .subtract(1, 'day')
                  .format('YYYY-MM-DD')}/${dayjs(from)
                    .subtract(1, 'day')
                    .format('YYYY-MM-DD')}${sort !== 'hot' ? `?sort=${sort}` : ''}`}
              >
                <MenubarTrigger
                  className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                >前一天</MenubarTrigger>
              </Link>
            </MenubarMenu>
            <MenubarMenu>
              <Link
                href={`/hots/${dayjs(from).add(1, 'day').format('YYYY-MM-DD')}/${dayjs(from).add(1, 'day').format('YYYY-MM-DD')}${sort !== 'hot' ? `?sort=${sort}` : ''}`}
              >
                <MenubarTrigger
                  className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  disabled={dayjs(from).isAfter(dayjs().subtract(1, 'day'))}
                >
                  后一天
                </MenubarTrigger>
              </Link>
            </MenubarMenu>
          </Menubar>
        </div>
      <SearchableWeiboPage
        initialData={results}
        from={from}
        to={to}
      />
      </>
    );
  } catch (error) {
    console.error('Failed to fetch data:', error);
    notFound();
  }
}