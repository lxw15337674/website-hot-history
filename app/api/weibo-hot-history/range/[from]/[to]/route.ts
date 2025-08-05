import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { db } from '../../../../../../src/db/index';
import { weiboHotHistory } from '../../../../../../db/schema';
import { desc, gte, lte, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ from: string; to: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { from, to } = await params;
    
    // 验证日期格式
    if (!dayjs(from, 'YYYY-MM-DD', true).isValid()) {
      return NextResponse.json(
        { error: 'Invalid from date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }
    
    if (!dayjs(to, 'YYYY-MM-DD', true).isValid()) {
      return NextResponse.json(
        { error: 'Invalid to date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // 验证日期范围
    const fromDate = dayjs(from);
    const toDate = dayjs(to);
    
    if (fromDate.isAfter(toDate)) {
      return NextResponse.json(
        { error: 'From date cannot be after to date' },
        { status: 400 }
      );
    }

    // 限制查询范围（例如最多30天）
    const daysDiff = toDate.diff(fromDate, 'day');
    if (daysDiff > 30) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 30 days' },
        { status: 400 }
      );
    }

    // 计算日期范围
    const startOfRange = fromDate.startOf('day').toDate();
    const endOfRange = toDate.endOf('day').toDate();

    // 计算日期范围（ISO 格式）
    const startOfRangeStr = fromDate.startOf('day').toISOString();
    const endOfRangeStr = toDate.endOf('day').toISOString();

    // 从数据库查询数据
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
        date: weiboHotHistory.createdAt, // 添加日期字段
      })
      .from(weiboHotHistory)
      .where(
        and(
          gte(weiboHotHistory.createdAt, startOfRangeStr),
          lte(weiboHotHistory.createdAt, endOfRangeStr)
        )
      )
      .orderBy(desc(weiboHotHistory.createdAt), desc(weiboHotHistory.hot))
      .limit(500); // 限制返回数量

    // 设置缓存头
    const response = NextResponse.json(results);
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    return response;
  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}