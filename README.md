[English Version (README_EN.md)](./README_EN.md)

# URL 缩短服务

基于 Hono 和 Cloudflare Workers 的高性能 URL 缩短服务。

## 功能特性

- ✅ **URL 缩短**: 将长 URL 转换为短链
- ✅ **自定义短码**: 支持用户自定义短码
- ✅ **过期时间**: 可设置短链过期时间
- ✅ **访问统计**: 记录点击次数和最后访问时间
- ✅ **重定向**: 快速重定向到原始 URL
- ✅ **管理功能**: 查询统计信息和删除短链
- ✅ **Web 界面**: 简洁的前端界面
- ✅ **安全验证**: URL 格式验证和安全检查

## 技术栈

- **框架**: [Hono](https://hono.dev/) - 轻量级 Web 框架
- **运行时**: [Cloudflare Workers](https://workers.cloudflare.com/) - 边缘计算平台
- **存储**: [Cloudflare KV](https://developers.cloudflare.com/kv/) - 键值存储
- **语言**: TypeScript

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Cloudflare KV

在 Cloudflare Dashboard 中创建 KV 命名空间：

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择你的账户
3. 进入 "Workers & Pages" > "KV"
4. 创建两个命名空间：
   - `url-shortener-production` (生产环境)
   - `url-shortener-preview` (预览环境)

### 3. 更新配置

编辑 `wrangler.jsonc`，将 KV 命名空间 ID 替换为你创建的实际 ID：

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "URL_STORE",
      "preview_id": "你的预览环境KV命名空间ID",
      "id": "你的生产环境KV命名空间ID"
    }
  ]
}
```

### 4. 本地开发

```bash
npm run dev
```

访问 `http://localhost:8787` 查看应用。

### 5. 部署到 Cloudflare Workers

```bash
npm run deploy
```

## API 文档

### 创建短链

**POST** `/api/shorten`

请求体：
```json
{
  "url": "https://example.com/very/long/url",
  "customCode": "mycode",  // 可选，自定义短码
  "expiresInDays": 30      // 可选，过期天数 (1-365)
}
```

响应：
```json
{
  "shortCode": "abc123",
  "originalUrl": "https://example.com/very/long/url",
  "shortUrl": "https://your-domain.com/abc123",
  "createdAt": "2025-06-26T10:00:00.000Z",
  "expiresAt": "2025-07-26T10:00:00.000Z"
}
```

### 重定向

**GET** `/:shortCode`

直接访问短链会重定向到原始 URL。

### 查询统计

**GET** `/api/stats/:shortCode`

响应：
```json
{
  "shortCode": "abc123",
  "originalUrl": "https://example.com/very/long/url",
  "createdAt": "2025-06-26T10:00:00.000Z",
  "expiresAt": "2025-07-26T10:00:00.000Z",
  "clickCount": 42,
  "lastAccessed": "2025-06-26T15:30:00.000Z"
}
```

### 删除短链

**DELETE** `/api/:shortCode`

响应：
```json
{
  "message": "短链删除成功"
}
```

## 安全特性

- **URL 验证**: 只允许 HTTP/HTTPS 协议
- **域名检查**: 阻止本地地址和私有 IP
- **短码验证**: 防止使用保留词和纯数字
- **长度限制**: URL 最大长度 2048 字符
- **输入清理**: 自动清理和标准化输入

## 限制说明

- 短码长度：3-10 个字符
- URL 最大长度：2048 字符
- 过期时间：最长 365 天
- 保留词：api, admin, www, app, stats, help, about

## 项目结构

```
src/
├── index.ts    # 主应用文件
├── utils.ts    # 工具函数
wrangler.jsonc  # Cloudflare Workers 配置
package.json    # 项目依赖
```

## 开发说明

### 添加新功能

1. 在 `src/utils.ts` 中添加工具函数
2. 在 `src/index.ts` 中添加 API 端点
3. 更新前端界面（如需要）

### 自定义配置

可以通过修改以下文件来自定义配置：

- `src/utils.ts`: 修改短码生成规则、验证逻辑
- `src/index.ts`: 修改 API 行为、前端界面
- `wrangler.jsonc`: 修改 Cloudflare Workers 配置

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
