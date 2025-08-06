import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { db } from '../../../../../../src/db/index';
import { weiboHotHistory } from '../../../../../../db/schema';
import { desc, gte, lte, and, or, like } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ from: string; to: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { from, to } = await params;
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'hot';
    const keyword = searchParams.get('keyword') || '';
    
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

    // 计算日期范围（ISO 格式）
    const startOfRangeStr = fromDate.startOf('day').toISOString();
    const endOfRangeStr = toDate.endOf('day').toISOString();

    // 根据排序参数确定排序字段
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

    // 直接执行数据库查询
    const startTime = Date.now();
    
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
        createdAt: weiboHotHistory.createdAt,
      })
      .from(weiboHotHistory)
      .where(
        and(
          gte(weiboHotHistory.createdAt, startOfRangeStr),
          lte(weiboHotHistory.createdAt, endOfRangeStr),
          ...(keyword ? [or(
            like(weiboHotHistory.title, `%${keyword}%`),
            like(weiboHotHistory.description, `%${keyword}%`)
          )] : [])
        )
      )
      .orderBy(orderByClause)
      .limit(500); // 限制返回数量
    
    const queryTime = Date.now() - startTime;
    console.log(`Database query executed in ${queryTime}ms for range ${from} to ${to}`);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}