import dayjs from 'dayjs';
import prisma from '../src/db/index';

interface GitHubWeibo {
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

async function fetchDataFromGitHub(date: string): Promise<GitHubWeibo[]> {
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/lxw15337674/weibo-trending-hot-history/master/api/${date}/summary.json`
    );
    
    if (!response.ok) {
      console.error(`Failed to fetch data for ${date}: ${response.status} ${response.statusText}`);
      return [];
    }
    
    return await response.json() as GitHubWeibo[];
  } catch (error) {
    console.error(`Error fetching data for ${date}:`, error);
    return [];
  }
}

async function syncDataForDate(date: string) {
  console.log(`Syncing data for ${date}...`);
  
  const data = await fetchDataFromGitHub(date);
  
  if (data.length === 0) {
    console.log(`No data found for ${date}, skipping.`);
    return 0;
  }
  
  // 转换数据格式
  const dbData = data.map(item => ({
    title: item.title,
    category: item.category || null,
    url: item.url,
    hot: item.hot,
    ads: item.ads,
    readCount: item.readCount || 0,
    discussCount: item.discussCount || 0,
    origin: item.origin || 0,
    createdAt: dayjs(date).toISOString() // 使用日期作为创建时间
  }));
  
  try {
    // 使用Prisma直接批量插入数据
    const result = await prisma.weiboHotHistory.createMany({
      data: dbData,
      skipDuplicates: true, // 跳过重复数据
    });
    
    console.log(`Synced ${result.count} records for ${date}.`);
    return result.count;
  } catch (error) {
    console.error(`Error syncing data for ${date}:`, error);
    return 0;
  }
}

async function main() {
  // 设置同步的日期范围
  const startDate = process.argv[2] || dayjs().subtract(1, 'day').format('YYYY-MM-DD'); // 默认同步前一天
  const endDate = process.argv[3] || startDate; // 如果没有指定结束日期，则只同步一天
  
  console.log(`🚀 Starting data sync from ${startDate} to ${endDate}...`);
  console.log(`📅 Current time: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`);
  
  let currentDate = dayjs(startDate);
  const lastDate = dayjs(endDate);
  let totalSynced = 0;
  let successCount = 0;
  let failureCount = 0;
  
  // 遍历日期范围
  while (currentDate.isBefore(lastDate) || currentDate.isSame(lastDate, 'day')) {
    const dateStr = currentDate.format('YYYY-MM-DD');
    
    try {
      const count = await syncDataForDate(dateStr);
      totalSynced += count;
      
      if (count > 0) {
        successCount++;
        console.log(`✅ ${dateStr}: Successfully synced ${count} records`);
      } else {
        console.log(`⚠️  ${dateStr}: No data found or already exists`);
      }
    } catch (error) {
      failureCount++;
      console.error(`❌ ${dateStr}: Sync failed -`, error);
    }
    
    // 移动到下一天
    currentDate = currentDate.add(1, 'day');
    
    // 简单的限速，避免请求过快
    if (!currentDate.isAfter(lastDate)) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n📊 Sync Summary:`);
  console.log(`   Total records synced: ${totalSynced}`);
  console.log(`   Successful days: ${successCount}`);
  console.log(`   Failed days: ${failureCount}`);
  console.log(`   Duration: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`);
  
  if (failureCount > 0) {
    console.log(`\n⚠️  Some syncs failed. Please check the logs above.`);
    await prisma.$disconnect();
    process.exit(1); // 退出码1表示有错误
  } else {
    console.log(`\n🎉 All syncs completed successfully!`);
    await prisma.$disconnect();
  }
}

main().catch(async (e) => {
  console.error('Sync failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});