// 应用文本搜索复合索引的脚本
import 'dotenv/config';
import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function applyTextSearchIndexes() {
  console.log('🚀 开始应用文本搜索复合索引...');
  
  try {
    // 为 title 字段创建复合索引（title + createdAt）
    console.log('创建 title + createdAt 复合索引...');
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibo_title_created ON WeiboHotHistory(title, createdAt)`);
    
    // 为 description 字段创建复合索引（description + createdAt）
    console.log('创建 description + createdAt 复合索引...');
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibo_desc_created ON WeiboHotHistory(description, createdAt)`);
    
    // 为关键词搜索优化的复合索引（createdAt + title）
    console.log('创建 createdAt + title 复合索引...');
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibo_created_title ON WeiboHotHistory(createdAt, title)`);
    
    // 为关键词搜索优化的复合索引（createdAt + description）
    console.log('创建 createdAt + description 复合索引...');
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibo_created_desc ON WeiboHotHistory(createdAt, description)`);
    
    // 为排序 + 文本搜索的复合索引（hot + title + createdAt）
    console.log('创建 hot + title + createdAt 复合索引...');
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibo_hot_title_created ON WeiboHotHistory(hot, title, createdAt)`);
    
    // 为排序 + 文本搜索的复合索引（hot + description + createdAt）
    console.log('创建 hot + description + createdAt 复合索引...');
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibo_hot_desc_created ON WeiboHotHistory(hot, description, createdAt)`);
    
    console.log('✅ 所有文本搜索索引创建完成！');
    
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
applyTextSearchIndexes()
  .then(() => {
    console.log('\n🎉 文本搜索索引优化完成！查询性能将显著提升。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });