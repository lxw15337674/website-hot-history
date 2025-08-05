-- 添加性能优化索引
-- 为 createdAt 字段创建索引（最重要的索引）
CREATE INDEX IF NOT EXISTS idx_weibo_created_at ON WeiboHotHistory(createdAt);

-- 为排序字段创建索引
CREATE INDEX IF NOT EXISTS idx_weibo_hot ON WeiboHotHistory(hot);
CREATE INDEX IF NOT EXISTS idx_weibo_read_count ON WeiboHotHistory(readCount);
CREATE INDEX IF NOT EXISTS idx_weibo_discuss_count ON WeiboHotHistory(discussCount);
CREATE INDEX IF NOT EXISTS idx_weibo_origin ON WeiboHotHistory(origin);

-- 复合索引：日期 + 排序字段（推荐用于范围查询 + 排序）
CREATE INDEX IF NOT EXISTS idx_weibo_created_hot ON WeiboHotHistory(createdAt, hot);
CREATE INDEX IF NOT EXISTS idx_weibo_created_read ON WeiboHotHistory(readCount, createdAt);
CREATE INDEX IF NOT EXISTS idx_weibo_created_discuss ON WeiboHotHistory(discussCount, createdAt);
CREATE INDEX IF NOT EXISTS idx_weibo_created_origin ON WeiboHotHistory(origin, createdAt);

-- 为 ads 字段创建索引（用于过滤广告）
CREATE INDEX IF NOT EXISTS idx_weibo_ads ON WeiboHotHistory(ads);

-- 复合索引：日期范围 + 非广告过滤
CREATE INDEX IF NOT EXISTS idx_weibo_created_ads ON WeiboHotHistory(createdAt, ads);