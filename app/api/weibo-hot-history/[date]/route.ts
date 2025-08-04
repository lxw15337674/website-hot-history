import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { db } from '../../../../src/db/index';
import { weiboHotHistory } from '../../../../db/schema';
import { desc, gte, lte, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ date: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { date } = await params;
    
    // 验证日期格式
    if (!dayjs(date, 'YYYY-MM-DD', true).isValid()) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // 计算日期范围（当天的开始和结束）
    const startOfDay = dayjs(date).startOf('day').toDate();
    const endOfDay = dayjs(date).endOf('day').toDate();

    // 从数据库查询数据
    const data = await db
      .select({
        title: weiboHotHistory.title,
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
           gte(weiboHotHistory.createdAt, startOfDay.toISOString()),
           lte(weiboHotHistory.createdAt, endOfDay.toISOString())
         )
       )
      .orderBy(desc(weiboHotHistory.hot));

    // 转换数据格式以匹配前端期望的格式
    const formattedData = data.map((item: {
      title: string;
      category: string | null;
      url: string;
      hot: number;
      ads: boolean;
      readCount: number;
      discussCount: number;
      origin: number;
    }) => ({
      title: item.title,
      category: item.category || '',
      description: '', // 数据库中没有description字段，保持空字符串
      url: item.url,
      hot: item.hot,
      ads: item.ads,
      readCount: Number(item.readCount), // 将BigInt转换为number
      discussCount: item.discussCount,
      origin: item.origin,
    }));

    return NextResponse.json(formattedData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}