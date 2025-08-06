-- 终极优化方案：删除冗余索引，创建最优索引
-- 首先删除所有可能冲突的索引
DROP INDEX IF EXISTS idx_weibo_created_read;
DROP INDEX IF EXISTS idx_weibo_created_discuss_correct;
DROP INDEX IF EXISTS idx_weibo_created_origin_correct;
DROP INDEX IF EXISTS idx_weibo_created_read_desc;
DROP INDEX IF EXISTS idx_weibo_created_discuss_desc;
DROP INDEX IF EXISTS idx_weibo_created_origin_desc;
DROP INDEX IF EXISTS idx_weibo_perfect_hot;
DROP INDEX IF EXISTS idx_weibo_perfect_read;
DROP INDEX IF EXISTS idx_weibo_perfect_discuss;
DROP INDEX IF EXISTS idx_weibo_perfect_origin;
DROP INDEX IF EXISTS idx_weibo_title_search;
DROP INDEX IF EXISTS idx_weibo_desc_search;

-- 创建最优的单一复合索引（按使用频率）
-- 主要查询索引：日期范围 + hot排序（最常用）
CREATE INDEX IF NOT EXISTS idx_weibo_main_hot ON WeiboHotHistory(
    createdAt, hot DESC
);

-- 其他排序字段的索引
CREATE INDEX IF NOT EXISTS idx_weibo_main_read ON WeiboHotHistory(
    createdAt, readCount DESC
);

CREATE INDEX IF NOT EXISTS idx_weibo_main_discuss ON WeiboHotHistory(
    createdAt, discussCount DESC
);

CREATE INDEX IF NOT EXISTS idx_weibo_main_origin ON WeiboHotHistory(
    createdAt, origin DESC
);

-- 关键词搜索专用索引
CREATE INDEX IF NOT EXISTS idx_weibo_title_hot ON WeiboHotHistory(
    title, hot DESC
);

CREATE INDEX IF NOT EXISTS idx_weibo_desc_hot ON WeiboHotHistory(
    description, hot DESC
);

-- 更新表统计信息
ANALYZE WeiboHotHistory;

-- 强制SQLite重新计算查询计划
PRAGMA optimize;