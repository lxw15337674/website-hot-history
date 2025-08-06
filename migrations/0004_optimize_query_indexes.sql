-- 优化查询性能的索引
-- 删除错误的复合索引
DROP INDEX IF EXISTS idx_weibo_created_read;
DROP INDEX IF EXISTS idx_weibo_created_discuss;
DROP INDEX IF EXISTS idx_weibo_created_origin;

-- 创建正确的复合索引：日期范围 + 排序字段
CREATE INDEX IF NOT EXISTS idx_weibo_created_read_correct ON WeiboHotHistory(createdAt, readCount);
CREATE INDEX IF NOT EXISTS idx_weibo_created_discuss_correct ON WeiboHotHistory(createdAt, discussCount);
CREATE INDEX IF NOT EXISTS idx_weibo_created_origin_correct ON WeiboHotHistory(createdAt, origin);

-- 创建覆盖索引，避免回表查询（包含所有需要的字段）
-- 按hot排序的覆盖索引
CREATE INDEX IF NOT EXISTS idx_weibo_cover_hot ON WeiboHotHistory(
    createdAt, hot, 
    title, description, category, url, ads, readCount, discussCount, origin
);

-- 按readCount排序的覆盖索引
CREATE INDEX IF NOT EXISTS idx_weibo_cover_read ON WeiboHotHistory(
    createdAt, readCount,
    title, description, category, url, ads, hot, discussCount, origin
);

-- 按discussCount排序的覆盖索引
CREATE INDEX IF NOT EXISTS idx_weibo_cover_discuss ON WeiboHotHistory(
    createdAt, discussCount,
    title, description, category, url, ads, hot, readCount, origin
);

-- 按origin排序的覆盖索引
CREATE INDEX IF NOT EXISTS idx_weibo_cover_origin ON WeiboHotHistory(
    createdAt, origin,
    title, description, category, url, ads, hot, readCount, discussCount
);

-- 为日期范围查询优化的部分索引（只索引最近的数据）
-- 注意：SQLite不支持部分索引的WHERE子句，所以这里只能创建完整索引
-- 但可以通过应用层逻辑来优化

-- 创建降序索引以优化ORDER BY DESC查询
CREATE INDEX IF NOT EXISTS idx_weibo_created_hot_desc ON WeiboHotHistory(createdAt DESC, hot DESC);
CREATE INDEX IF NOT EXISTS idx_weibo_created_read_desc ON WeiboHotHistory(createdAt DESC, readCount DESC);
CREATE INDEX IF NOT EXISTS idx_weibo_created_discuss_desc ON WeiboHotHistory(createdAt DESC, discussCount DESC);
CREATE INDEX IF NOT EXISTS idx_weibo_created_origin_desc ON WeiboHotHistory(createdAt DESC, origin DESC);