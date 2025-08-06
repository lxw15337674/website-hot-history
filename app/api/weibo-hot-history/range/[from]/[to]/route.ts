import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { db } from '../../../../../../src/db/index';
import { weiboHotHistory } from '../../../../../../db/schema';
import { desc, gte, lte, and, or, like, sql } from 'drizzle-orm';

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
    
    // 添加查询性能日志
    console.log(`Querying range: ${from} to ${to}, keyword: "${keyword}", sort: ${sort}`);

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

    // 优化后的数据库查询
    const startTime = Date.now();
    
    // 根据排序字段优化SELECT字段顺序，匹配覆盖索引
    let selectFields;
    switch (sort) {
      case 'readCount':
        selectFields = {
          createdAt: weiboHotHistory.createdAt,
          readCount: weiboHotHistory.readCount,
          title: weiboHotHistory.title,
          description: weiboHotHistory.description,
          category: weiboHotHistory.category,
          url: weiboHotHistory.url,
          ads: weiboHotHistory.ads,
          hot: weiboHotHistory.hot,
          discussCount: weiboHotHistory.discussCount,
          origin: weiboHotHistory.origin,
        };
        break;
      case 'discussCount':
        selectFields = {
          createdAt: weiboHotHistory.createdAt,
          discussCount: weiboHotHistory.discussCount,
          title: weiboHotHistory.title,
          description: weiboHotHistory.description,
          category: weiboHotHistory.category,
          url: weiboHotHistory.url,
          ads: weiboHotHistory.ads,
          hot: weiboHotHistory.hot,
          readCount: weiboHotHistory.readCount,
          origin: weiboHotHistory.origin,
        };
        break;
      case 'origin':
        selectFields = {
          createdAt: weiboHotHistory.createdAt,
          origin: weiboHotHistory.origin,
          title: weiboHotHistory.title,
          description: weiboHotHistory.description,
          category: weiboHotHistory.category,
          url: weiboHotHistory.url,
          ads: weiboHotHistory.ads,
          hot: weiboHotHistory.hot,
          readCount: weiboHotHistory.readCount,
          discussCount: weiboHotHistory.discussCount,
        };
        break;
      default: // hot
        selectFields = {
          createdAt: weiboHotHistory.createdAt,
          hot: weiboHotHistory.hot,
          title: weiboHotHistory.title,
          description: weiboHotHistory.description,
          category: weiboHotHistory.category,
          url: weiboHotHistory.url,
          ads: weiboHotHistory.ads,
          readCount: weiboHotHistory.readCount,
          discussCount: weiboHotHistory.discussCount,
          origin: weiboHotHistory.origin,
        };
    }
    
    let queryBuilder = db
      .select(selectFields)
      .from(weiboHotHistory);
    
    // 构建WHERE条件 - 关键字搜索与日期范围互斥
    const whereConditions = [];
    
    if (keyword) {
      // 有关键字时，只搜索关键字，忽略日期范围
      whereConditions.push(
        or(
          like(weiboHotHistory.title, `%${keyword}%`),
          like(weiboHotHistory.description, `%${keyword}%`)
        )
      );
    } else {
      // 无关键字时，使用日期范围查询
      whereConditions.push(
        gte(weiboHotHistory.createdAt, startOfRangeStr),
        lte(weiboHotHistory.createdAt, endOfRangeStr)
      );
    }
    
    // 使用原生SQL查询以强制使用最优索引
    let results;
    
    if (keyword) {
      // 关键词搜索使用专用索引
      const searchSql = sql`
        SELECT title, description, category, url, hot, ads, readCount, discussCount, origin, createdAt
        FROM WeiboHotHistory 
        WHERE (title LIKE ${'%' + keyword + '%'} OR description LIKE ${'%' + keyword + '%'})
        ORDER BY hot DESC
        LIMIT 200
      `;
      results = await db.all(searchSql);
    } else {
      // 日期范围查询使用现有的最优索引
       let indexHint = '';
       let orderField = '';
       
       switch (sort) {
          case 'readCount':
            indexHint = 'INDEXED BY idx_weibo_main_read';
            orderField = 'readCount DESC';
            break;
          case 'discussCount':
            indexHint = 'INDEXED BY idx_weibo_main_discuss';
            orderField = 'discussCount DESC';
            break;
          case 'origin':
            indexHint = 'INDEXED BY idx_weibo_main_origin';
            orderField = 'origin DESC';
            break;
          default:
            indexHint = 'INDEXED BY idx_weibo_main_hot';
            orderField = 'hot DESC';
        }
      
      const rangeSql = sql`
        SELECT title, description, category, url, hot, ads, readCount, discussCount, origin, createdAt
        FROM WeiboHotHistory ${sql.raw(indexHint)}
        WHERE createdAt >= ${startOfRangeStr} AND createdAt <= ${endOfRangeStr}
        ORDER BY ${sql.raw(orderField)}
        LIMIT 500
      `;
      results = await db.all(rangeSql);
    }
    
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