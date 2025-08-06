-- 创建完美的覆盖索引，完全避免排序和回表查询
-- 删除之前的覆盖索引（如果存在）
DROP INDEX IF EXISTS idx_weibo_cover_hot;
DROP INDEX IF EXISTS idx_weibo_cover_read;
DROP INDEX IF EXISTS idx_weibo_cover_discuss;
DROP INDEX IF EXISTS idx_weibo_cover_origin;

-- 为hot排序创建完美的覆盖索引（降序）
CREATE INDEX IF NOT EXISTS idx_weibo_perfect_hot ON WeiboHotHistory(
    createdAt, hot DESC,
    id, title, description, category, url, ads, readCount, discussCount, origin
);

-- 为readCount排序创建完美的覆盖索引（降序）
CREATE INDEX IF NOT EXISTS idx_weibo_perfect_read ON WeiboHotHistory(
    createdAt, readCount DESC,
    id, title, description, category, url, ads, hot, discussCount, origin
);

-- 为discussCount排序创建完美的覆盖索引（降序）
CREATE INDEX IF NOT EXISTS idx_weibo_perfect_discuss ON WeiboHotHistory(
    createdAt, discussCount DESC,
    id, title, description, category, url, ads, hot, readCount, origin
);

-- 为origin排序创建完美的覆盖索引（降序）
CREATE INDEX IF NOT EXISTS idx_weibo_perfect_origin ON WeiboHotHistory(
    createdAt, origin DESC,
    id, title, description, category, url, ads, hot, readCount, discussCount
);

-- 为关键词搜索优化的索引
-- title搜索的覆盖索引
CREATE INDEX IF NOT EXISTS idx_weibo_title_search ON WeiboHotHistory(
    title,
    hot DESC, id, description, category, url, ads, readCount, discussCount, origin, createdAt
);

-- description搜索的覆盖索引
CREATE INDEX IF NOT EXISTS idx_weibo_desc_search ON WeiboHotHistory(
    description,
    hot DESC, id, title, category, url, ads, readCount, discussCount, origin, createdAt
);

-- 分析表统计信息
ANALYZE WeiboHotHistory;