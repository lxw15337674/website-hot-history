import { NextResponse } from 'next/server';
import prisma from '../../../../src/db/index';
import dayjs from 'dayjs';

export async function GET() {
  try {
    // 获取最近的数据，先尝试今天，如果没有则尝试昨天
    const today = dayjs();
    const yesterday = today.subtract(1, 'day');
    
    let data = await getDataForDate(today);
    
    // 如果今天没有数据，尝试昨天
    if (data.length === 0) {
      data = await getDataForDate(yesterday);
    }

    // 转换数据格式以匹配前端期望的格式
    const formattedData = data.map((item: {
      title: string;
      category: string | null;
      url: string;
      hot: number;
      ads: boolean;
      readCount: bigint;
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

async function getDataForDate(date: dayjs.Dayjs) {
  const startOfDay = date.startOf('day').toDate();
  const endOfDay = date.endOf('day').toDate();

  return await prisma.weiboHotHistory.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      title: true,
      category: true,
      url: true,
      hot: true,
      ads: true,
      readCount: true,
      discussCount: true,
      origin: true,
    },
    orderBy: {
      hot: 'desc',
    },
  });
}