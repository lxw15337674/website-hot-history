import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const MAX_BATCH = 1000;
const API_KEY = process.env.API_KEY;

// 使用Prisma生成的类型，排除id和createdAt字段
type WeiboHotHistoryInput = Omit<Prisma.WeiboHotHistoryCreateInput, 'id' | 'createdAt'>;

// 验证函数
function validateWeiboHotHistoryData(data: any): { isValid: boolean; error?: string } {
  if (typeof data.title !== 'string' || !data.title.trim()) {
    return { isValid: false, error: 'title must be a non-empty string' };
  }
  if (data.category !== null && data.category !== undefined && typeof data.category !== 'string') {
    return { isValid: false, error: 'category must be a string or null' };
  }
  if (typeof data.url !== 'string' || !data.url.trim()) {
    return { isValid: false, error: 'url must be a non-empty string' };
  }
  if (typeof data.hot !== 'number' || !Number.isInteger(data.hot)) {
    return { isValid: false, error: 'hot must be an integer' };
  }
  if (typeof data.ads !== 'boolean') {
    return { isValid: false, error: 'ads must be a boolean' };
  }
  if (typeof data.readCount !== 'bigint' && typeof data.readCount !== 'number') {
    return { isValid: false, error: 'readCount must be a bigint or number' };
  }
  if (typeof data.discussCount !== 'number' || !Number.isInteger(data.discussCount)) {
    return { isValid: false, error: 'discussCount must be an integer' };
  }
  if (typeof data.origin !== 'number' || !Number.isInteger(data.origin)) {
    return { isValid: false, error: 'origin must be an integer' };
  }
  return { isValid: true };
}

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
  const validData: WeiboHotHistoryInput[] = [];
  const errors: { index: number; error: string }[] = [];
  data.forEach((item, idx) => {
    const validation = validateWeiboHotHistoryData(item);
    if (validation.isValid) {
      // 确保readCount是BigInt类型
      const processedItem: WeiboHotHistoryInput = {
        ...item,
        readCount: typeof item.readCount === 'bigint' ? item.readCount : BigInt(item.readCount)
      };
      validData.push(processedItem);
    } else {
      errors.push({ index: idx, error: validation.error! });
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
