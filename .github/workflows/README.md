# GitHub Actions 工作流说明

## 数据同步工作流 (sync-data.yml)

这个工作流用于自动同步微博热搜历史数据到数据库。

### 触发方式

1. **定时触发**: 每天凌晨1点（UTC时间）自动执行，同步前一天的数据
2. **手动触发**: 在GitHub Actions页面手动运行，可指定同步日期

### 配置要求

在使用此工作流之前，需要在GitHub仓库中配置以下Secrets：

#### 必需的GitHub Secrets

工作流需要以下环境变量配置为GitHub Secrets：

1. **DATABASE_URL**
   - 数据库连接字符串
   - 格式: `postgresql://username:password@host:port/database`
   - 示例: `postgresql://user:pass@localhost:5432/hothistory`

#### 配置Secrets步骤

1. 进入GitHub仓库页面
2. 点击 `Settings` 选项卡
3. 在左侧菜单中选择 `Secrets and variables` > `Actions`
4. 点击 `New repository secret`
5. 添加 `DATABASE_URL`

### 工作流功能

- ✅ 自动计算同步日期（默认前一天）
- ✅ 支持手动指定同步日期
- ✅ 完整的错误处理和日志记录
- ✅ 数据验证和结果通知
- ✅ 失败时的错误报告

### 手动运行

1. 进入GitHub仓库的 `Actions` 页面
2. 选择 `Daily Data Sync` 工作流
3. 点击 `Run workflow`
4. 可选择指定同步日期（格式：YYYY-MM-DD）
5. 点击 `Run workflow` 确认执行

### 监控和故障排除

#### 查看执行日志

1. 进入 `Actions` 页面
2. 点击对应的工作流运行记录
3. 查看各个步骤的详细日志

#### 常见问题

1. **数据库连接失败**
   - 检查 `DATABASE_URL` 是否正确配置
   - 确认数据库服务是否可访问

2. **API认证失败**
   - 检查 `API_KEY` 是否正确配置
   - 确认与后端API的密钥一致

3. **数据源不可用**
   - GitHub原始文件可能暂时不可访问
   - 工作流会自动重试，通常会自行恢复

4. **重复数据**
   - 脚本会自动跳过已存在的数据
   - 不会产生重复记录

### 时区说明

- 工作流使用UTC时间
- 凌晨1点UTC = 北京时间上午9点
- 同步前一天的数据，确保数据完整性

### 扩展功能

未来可以考虑添加：

- 📧 邮件/Slack通知
- 📊 数据质量检查
- 🔄 失败重试机制
- 📈 同步统计报告