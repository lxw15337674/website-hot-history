// 手动创建数据库索引的脚本
import 'dotenv/config';
import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function createIndexes() {
  console.log('🚀 开始创建数据库索引...');
  
  try {
    // 为 createdAt 字段创建索引（最重要的索引）
    console.log('创建 createdAt 索引...');
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibo_created_at ON WeiboHotHistory(createdAt)`);
    
    // 为排序字段创建索引
    console.log('创建排序字段索引...');
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibo_hot ON WeiboHotHistory(hot)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibo_read_count ON WeiboHotHistory(readCount)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibo_discuss_count ON WeiboHotHistory(discussCount)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibo_origin ON WeiboHotHistory(origin)`);
    
    // 复合索引：日期 + 排序字段（推荐用于范围查询 + 排序）
    console.log('创建复合索引...');
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibo_created_hot ON WeiboHotHistory(createdAt, hot)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibo_created_read ON WeiboHotHistory(readCount, createdAt)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibo_created_discuss ON WeiboHotHistory(discussCount, createdAt)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibo_created_origin ON WeiboHotHistory(origin, createdAt)`);
    
    // 为 ads 字段创建索引（用于过滤广告）
    console.log('创建 ads 字段索引...');
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibo_ads ON WeiboHotHistory(ads)`);
    
    // 复合索引：日期范围 + 非广告过滤
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibo_created_ads ON WeiboHotHistory(createdAt, ads)`);
    
    console.log('✅ 所有索引创建完成！');
    
    // 查看创建的索引
    console.log('\n📊 当前数据库索引：');
    const indexes = await db.all(sql`SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='WeiboHotHistory'`);
    indexes.forEach((index: any) => {
      if (index.name.startsWith('idx_')) {
        console.log(`  - ${index.name}`);
      }
    });
    
  } catch (error) {
    console.error('❌ 创建索引时出错:', error);
    process.exit(1);
  }
}

// 执行脚本
createIndexes()
  .then(() => {
    console.log('\n🎉 索引优化完成！查询性能将显著提升。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });