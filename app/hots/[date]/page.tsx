import Link from 'next/link';
import dayjs from 'dayjs';
import { Badge } from '@/components/ui/badge';
import { Menubar, MenubarMenu, MenubarTrigger } from '@/components/ui/menubar';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DatePicker } from '@/components/DayPicker';
import { numberWithUnit } from '@/public/src/lib/utils';

interface HotsProps {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ sort: string }>;
}

interface SavedWeibo {
  title: string;
  category: string;
  description: string;
  url: string;
  hot: number;
  ads: boolean;
  readCount?: number;
  discussCount?: number;
  origin?: number;
}

async function getData(date: string): Promise<SavedWeibo[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(
      `${baseUrl}/api/weibo-hot-history/${date}`,
      {
        next: { revalidate: 60 }
      }
    );
    if (!res.ok) {
      console.error(`Failed to fetch data for ${date}:`, res.status, res.statusText);
      return [];
    }
    return res.json();
  } catch (error) {
    console.error(`Error fetching data for ${date}:`, error);
    return [];
  }
}



export default async function Hots({ params, searchParams }: HotsProps) {
  const { date } = await params;
  const { sort = 'hot' } = await searchParams;
  const data = await getData(date || dayjs().format('YYYY-MM-DD'));
  const formattedDate = dayjs(date).format('YYYY年MM月DD日');

  return (
    <main className="p-5 lg:p-0 lg:pt-5">
        <div className="mx-auto max-w-[980px]">
          <h1 className="sr-only">{formattedDate}微博热搜榜单</h1>
          <Menubar className="flex justify-between">
            <MenubarMenu>
              <Link
                href={`/hots/${dayjs(date)
                  .subtract(1, 'day')
                  .format('YYYY-MM-DD')}?sort=${sort}`}
              >
                <MenubarTrigger
                  className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >前一天</MenubarTrigger>
              </Link>
            </MenubarMenu>
            <MenubarMenu>
              <DatePicker value={date} sort={sort} />
            </MenubarMenu>
            <MenubarMenu >
              <Link
                href={`/hots/${dayjs(date).add(1, 'day').format('YYYY-MM-DD')}?sort=${sort}`}
              >
                <MenubarTrigger
                  className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={dayjs(date).isAfter(dayjs().subtract(1, 'day'))}
                >
                  后一天
                </MenubarTrigger>
              </Link>
            </MenubarMenu>
          </Menubar>
        </div>

        <div className="mx-auto flex max-w-[980px] flex-col gap-2 py-4">
          {data.sort((a, b) => (Number(b[sort as keyof SavedWeibo]) ?? 0) - (Number(a[sort as keyof SavedWeibo]) ?? 0)).map((item: SavedWeibo, index) => {
            const url = `https://s.weibo.com/weibo?q=%23${item.title}%23`;
            return (
              <a
                href={url}
                key={item.title}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`查看微博话题：${item.title}`}
              >
                <Card className="cursor-pointer hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle>
                      <div className="flex gap-2">
                        <h2 className="text-xl">
                          <span className="sr-only">第{index + 1}名：</span>
                          {item.title}
                        </h2>
                        <div className="flex gap-2 items-center flex-shrink-0 flex-wrap max-w-[60%]">
                          {item.category && <Badge>{item.category.trim()}</Badge>}
                          {item.ads && <Badge variant="destructive">推广</Badge>}
                          <Badge variant="outline">🔥 {numberWithUnit(item?.hot ?? 0)}</Badge>
                          {item.readCount && <Badge variant="outline">阅读 {numberWithUnit(item.readCount)}</Badge>}
                          {item.discussCount && <Badge variant="outline">讨论 {numberWithUnit(item.discussCount)}</Badge>}
                          {item.origin && <Badge variant="outline">原创 {numberWithUnit(item.origin)}</Badge>}
                        </div>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {item.description || "没有描述"}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </a>
            );
          })}
        </div>
      </main>
  );
}
