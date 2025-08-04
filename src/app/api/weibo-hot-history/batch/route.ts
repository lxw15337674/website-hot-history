import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const MAX_BATCH = 1000;
const API_KEY = process.env.API_KEY;

const WeiboHotHistorySchema = z.object({
  title: z.string(),
  category: z.string().nullable().optional(),
  url: z.string(),
  hot: z.number(),
  ads: z.boolean(),
  readCount: z.bigint(),
  discussCount: z.number(),
  origin: z.number()
});

export async function POST(req: NextRequest) {
  // 权限校验
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '').trim();
  if (token !== API_KEY) {
    return NextResponse.json({ error: 'Invalid API Key' }, { status: 403 });
  }

  // 解析请求体
  let data;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!Array.isArray(data)) {
    return NextResponse.json({ error: 'Request body must be an array' }, { status: 400 });
  }
  if (data.length > MAX_BATCH) {
    return NextResponse.json({ error: `Batch size exceeds ${MAX_BATCH}` }, { status: 400 });
  }

  // 校验数据
  const validData = [];
  const errors = [];
  data.forEach((item, idx) => {
    const result = WeiboHotHistorySchema.safeParse(item);
    if (result.success) {
      validData.push(result.data);
    } else {
      errors.push({ index: idx, error: result.error.errors });
    }
  });
  if (validData.length === 0) {
    return NextResponse.json({ error: 'No valid data', details: errors }, { status: 400 });
  }

  // 批量插入
  try {
    const res = await prisma.weiboHotHistory.createMany({
      data: validData,
      skipDuplicates: true
    });
    return NextResponse.json({ inserted: res.count, errors });
  } catch (e) {
    return NextResponse.json({ error: 'Database error', details: String(e) }, { status: 500 });
  }
}
