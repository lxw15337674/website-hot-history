import 'dotenv/config';
import dayjs from 'dayjs';
import { db } from '../src/db/index';
import { weiboHotHistory } from '../db/schema';

interface WeiboHotItem {
  title: string;
  category?: string;
  url: string;
  hot: number;
  ads: boolean;
  readCount: string;
  discussCount: number;
  origin: number;
  rank: number;
}

interface WeiboHotData {
  date: string;
  data: WeiboHotItem[];
}

// 获取指定日期的数据
async function fetchDataForDate(date: string): Promise<WeiboHotData | null> {
  const url = `https://raw.githubusercontent.com/lxw15337674/weibo-trending-hot-history/master/api/${date}/summary.json`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`⚠️  ${date}: Data not found (404)`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return { date, data };
  } catch (error) {
    console.error(`❌ ${date}: Failed to fetch data -`, error);
    return null;
  }
}

// 同步指定日期的数据
async function syncDataForDate(date: string): Promise<number> {
  console.log(`Syncing data for ${date}...`);
  
  const weiboData = await fetchDataForDate(date);
  if (!weiboData) {
    return 0;
  }

  try {
    // 使用 Drizzle 直接插入数据
    const result = await db.insert(weiboHotHistory).values(
      weiboData.data.map(item => ({
        title: item.title,
        category: item.category || null,
        url: item.url,
        hot: item.hot,
        ads: item.ads || false,
        readCount: Math.floor(Number(item.readCount) || 0),
        discussCount: item.discussCount || 0,
        origin: item.origin || 0,
        createdAt: dayjs(date).toISOString() // 使用日期作为创建时间
      }))
    );

    console.log(`Synced ${weiboData.data.length} records for ${date}.`);
     return weiboData.data.length;
  } catch (error) {
    console.error(`❌ ${date}: Failed to sync data -`, error);
    return 0;
  }
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 获取日期范围
function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(formatDate(d));
  }
  
  return dates;
}

// 主函数
async function main() {
  const startDate = '2024-05-20';
  const endDate = formatDate(new Date()); // 今天的日期
  
  console.log(`🚀 Starting data sync from ${startDate} to ${endDate}...`);
  console.log(`📅 Current time: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  
  // 清空数据库表
  console.log('🗑️ Clearing existing data...');
  try {
    await db.delete(weiboHotHistory);
    console.log('✅ Database cleared successfully');
  } catch (error) {
    console.error('❌ Failed to clear database:', error);
    return;
  }
  const dates = getDateRange(startDate, endDate);
  let totalRecords = 0;
  let successfulDays = 0;
  let failedDays = 0;
  
  try {
    for (const date of dates) {
      const recordCount = await syncDataForDate(date);
      
      if (recordCount > 0) {
        console.log(`✅ ${date}: Successfully synced ${recordCount} records`);
        totalRecords += recordCount;
        successfulDays++;
      } else {
        console.log(`❌ ${date}: Failed to sync data`);
        failedDays++;
      }
      
      // 添加延迟以避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n📊 Sync Summary:');
    console.log(`   Total records synced: ${totalRecords}`);
    console.log(`   Successful days: ${successfulDays}`);
    console.log(`   Failed days: ${failedDays}`);
    console.log(`   Duration: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
    
    if (failedDays === 0) {
      console.log('\n🎉 All syncs completed successfully!');
    } else {
      console.log(`\n⚠️  Completed with ${failedDays} failed days.`);
    }
    
    // Drizzle 不需要手动断开连接
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync process failed:', error);
    // Drizzle 不需要手动断开连接
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

export { main };