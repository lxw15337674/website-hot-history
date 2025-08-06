// 
import 'dotenv/config';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { db } from '../src/db/index';
import { weiboHotHistory } from '../db/schema';
import { eq, and, gte, lt } from 'drizzle-orm';

// 启用UTC插件以确保时区一致性
dayjs.extend(utc);

interface GitHubWeibo {
  title: string;
  category: string;
  description?: string;
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
  
  try {
   
    // 先删除指定日期的现有数据（使用UTC确保时区一致性）
    const startOfDay = dayjs.utc(date).startOf('day').toISOString();
    const endOfDay = dayjs.utc(date).endOf('day').toISOString();
    
    const deleteResult = await db.delete(weiboHotHistory)
      .where(
        and(
          gte(weiboHotHistory.createdAt, startOfDay),
          lt(weiboHotHistory.createdAt, endOfDay)
        )
      );
    
    console.log(`Deleted existing records for ${date}`);
    
    // 转换数据格式
    const dbData = data.map(item => ({
      title: item.title,
      description: item.description || null,
      category: item.category || null,
      url: item.url,
      hot: item.hot,
      ads: item.ads,
      readCount: item.readCount || 0,
      discussCount: item.discussCount || 0,
      origin: item.origin || 0,
      createdAt: dayjs.utc(date).toISOString() // 使用UTC日期作为创建时间
    }));
    
    // 使用Drizzle批量插入数据
    const result = await db.insert(weiboHotHistory).values(dbData);
    
    console.log(`Synced ${dbData.length} records for ${date}.`);
    return dbData.length;
  } catch (error) {
    console.error(`Error syncing data for ${date}:`, error);
    return 0;
  }
}

async function main() {
  // 设置同步的日期范围
  const startDate = process.argv[2] || dayjs().subtract(1, 'day').format('YYYY-MM-DD'); // 默认从前一天开始
  const endDate = process.argv[3] || dayjs().format('YYYY-MM-DD'); // 默认到当天结束，同步前一天和当天
  
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
    // Drizzle doesn't need explicit disconnect
    process.exit(1); // 退出码1表示有错误
  } else {
    console.log(`\n🎉 All syncs completed successfully!`);
    // Drizzle doesn't need explicit disconnect
  }
}

main().catch(async (e) => {
  console.error('Sync failed:', e);
  // Drizzle doesn't need explicit disconnect
  process.exit(1);
});