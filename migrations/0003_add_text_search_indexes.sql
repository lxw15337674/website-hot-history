-- 添加文本搜索复合索引优化
-- 为 title 字段创建复合索引（title + createdAt）
CREATE INDEX IF NOT EXISTS idx_weibo_title_created ON WeiboHotHistory(title, createdAt);

-- 为 description 字段创建复合索引（description + createdAt）
CREATE INDEX IF NOT EXISTS idx_weibo_desc_created ON WeiboHotHistory(description, createdAt);

-- 为关键词搜索优化的复合索引（createdAt + title）
CREATE INDEX IF NOT EXISTS idx_weibo_created_title ON WeiboHotHistory(createdAt, title);

-- 为关键词搜索优化的复合索引（createdAt + description）
CREATE INDEX IF NOT EXISTS idx_weibo_created_desc ON WeiboHotHistory(createdAt, description);

-- 为排序 + 文本搜索的复合索引（hot + title + createdAt）
CREATE INDEX IF NOT EXISTS idx_weibo_hot_title_created ON WeiboHotHistory(hot, title, createdAt);

-- 为排序 + 文本搜索的复合索引（hot + description + createdAt）
CREATE INDEX IF NOT EXISTS idx_weibo_hot_desc_created ON WeiboHotHistory(hot, description, createdAt);