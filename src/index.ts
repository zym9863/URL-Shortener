import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  generateUniqueShortCode,
  isValidUrl,
  normalizeUrl,
  createUrlData,
  type UrlData
} from './utils'

// 定义 KV 命名空间类型
interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}

// 定义环境变量类型
type Bindings = {
  URL_STORE: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

// 启用 CORS
app.use('*', cors())

// 首页 - 返回简单的 HTML 界面
app.get('/', (c) => {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>URL 缩短服务</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; text-align: center; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input[type="url"], input[type="text"] {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        button {
            background: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
        }
        button:hover { background: #0056b3; }
        .result {
            margin-top: 20px;
            padding: 15px;
            background: #e8f5e8;
            border-radius: 5px;
            display: none;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
        }
        .success {
            background: #d4edda;
            color: #155724;
        }
        .short-url {
            font-weight: bold;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔗 URL 缩短服务</h1>
        <form id="shortenForm">
            <div class="form-group">
                <label for="originalUrl">原始 URL:</label>
                <input type="url" id="originalUrl" placeholder="https://example.com/very/long/url" required>
            </div>
            <div class="form-group">
                <label for="customCode">自定义短码 (可选):</label>
                <input type="text" id="customCode" placeholder="留空自动生成" maxlength="10">
            </div>
            <div class="form-group">
                <label for="expiresInDays">过期天数 (可选):</label>
                <input type="number" id="expiresInDays" placeholder="留空永不过期" min="1" max="365">
            </div>
            <button type="submit">生成短链</button>
        </form>
        <div id="result" class="result"></div>

        <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;">

        <h2>管理短链</h2>
        <form id="manageForm">
            <div class="form-group">
                <label for="manageCode">短码:</label>
                <input type="text" id="manageCode" placeholder="输入要查询的短码" required>
            </div>
            <div style="display: flex; gap: 10px;">
                <button type="button" onclick="getStats()">查询统计</button>
                <button type="button" onclick="deleteShortUrl()" style="background: #dc3545;">删除短链</button>
            </div>
        </form>
        <div id="manageResult" class="result"></div>
    </div>

    <script>
        document.getElementById('shortenForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const originalUrl = document.getElementById('originalUrl').value;
            const customCode = document.getElementById('customCode').value;
            const expiresInDays = document.getElementById('expiresInDays').value;
            const resultDiv = document.getElementById('result');

            try {
                const requestBody = {
                    url: originalUrl,
                    customCode: customCode || undefined,
                    expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined
                };

                const response = await fetch('/api/shorten', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });

                const data = await response.json();

                if (response.ok) {
                    resultDiv.className = 'result success';
                    let expiryInfo = data.expiresAt ?
                        \`<p>过期时间: \${new Date(data.expiresAt).toLocaleString('zh-CN')}</p>\` :
                        '<p>永不过期</p>';

                    resultDiv.innerHTML = \`
                        <h3>短链生成成功！</h3>
                        <p>短链: <span class="short-url">\${window.location.origin}/\${data.shortCode}</span></p>
                        <p>原始 URL: \${data.originalUrl}</p>
                        \${expiryInfo}
                        <button onclick="copyToClipboard('\${window.location.origin}/\${data.shortCode}')">复制短链</button>
                    \`;
                } else {
                    resultDiv.className = 'result error';
                    resultDiv.innerHTML = \`<h3>错误</h3><p>\${data.error}</p>\`;
                }

                resultDiv.style.display = 'block';
            } catch (error) {
                resultDiv.className = 'result error';
                resultDiv.innerHTML = \`<h3>错误</h3><p>网络请求失败</p>\`;
                resultDiv.style.display = 'block';
            }
        });

        async function getStats() {
            const shortCode = document.getElementById('manageCode').value;
            const resultDiv = document.getElementById('manageResult');

            if (!shortCode) {
                resultDiv.className = 'result error';
                resultDiv.innerHTML = '<h3>错误</h3><p>请输入短码</p>';
                resultDiv.style.display = 'block';
                return;
            }

            try {
                const response = await fetch(\`/api/stats/\${shortCode}\`);
                const data = await response.json();

                if (response.ok) {
                    resultDiv.className = 'result success';
                    let expiryInfo = data.expiresAt ?
                        \`<p>过期时间: \${new Date(data.expiresAt).toLocaleString('zh-CN')}</p>\` :
                        '<p>永不过期</p>';
                    let lastAccessInfo = data.lastAccessed ?
                        \`<p>最后访问: \${new Date(data.lastAccessed).toLocaleString('zh-CN')}</p>\` :
                        '<p>从未访问</p>';

                    resultDiv.innerHTML = \`
                        <h3>短链统计信息</h3>
                        <p>短码: \${data.shortCode}</p>
                        <p>原始 URL: \${data.originalUrl}</p>
                        <p>创建时间: \${new Date(data.createdAt).toLocaleString('zh-CN')}</p>
                        \${expiryInfo}
                        <p>访问次数: \${data.clickCount}</p>
                        \${lastAccessInfo}
                    \`;
                } else {
                    resultDiv.className = 'result error';
                    resultDiv.innerHTML = \`<h3>错误</h3><p>\${data.error}</p>\`;
                }

                resultDiv.style.display = 'block';
            } catch (error) {
                resultDiv.className = 'result error';
                resultDiv.innerHTML = '<h3>错误</h3><p>网络请求失败</p>';
                resultDiv.style.display = 'block';
            }
        }

        async function deleteShortUrl() {
            const shortCode = document.getElementById('manageCode').value;
            const resultDiv = document.getElementById('manageResult');

            if (!shortCode) {
                resultDiv.className = 'result error';
                resultDiv.innerHTML = '<h3>错误</h3><p>请输入短码</p>';
                resultDiv.style.display = 'block';
                return;
            }

            if (!confirm('确定要删除这个短链吗？此操作不可撤销。')) {
                return;
            }

            try {
                const response = await fetch(\`/api/\${shortCode}\`, {
                    method: 'DELETE'
                });
                const data = await response.json();

                if (response.ok) {
                    resultDiv.className = 'result success';
                    resultDiv.innerHTML = \`<h3>成功</h3><p>\${data.message}</p>\`;
                } else {
                    resultDiv.className = 'result error';
                    resultDiv.innerHTML = \`<h3>错误</h3><p>\${data.error}</p>\`;
                }

                resultDiv.style.display = 'block';
            } catch (error) {
                resultDiv.className = 'result error';
                resultDiv.innerHTML = '<h3>错误</h3><p>网络请求失败</p>';
                resultDiv.style.display = 'block';
            }
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('短链已复制到剪贴板！');
            });
        }
    </script>
</body>
</html>
  `
  return c.html(html)
})

// API: 创建短链
app.post('/api/shorten', async (c) => {
  try {
    const body = await c.req.json().catch(() => null)

    if (!body) {
      return c.json({ error: '请求体格式错误' }, 400)
    }

    const { url, customCode, expiresInDays } = body

    if (!url || typeof url !== 'string') {
      return c.json({ error: 'URL 不能为空且必须是字符串' }, 400)
    }

    if (url.length > 2048) {
      return c.json({ error: 'URL 长度不能超过 2048 个字符' }, 400)
    }

    // 验证自定义短码
    if (customCode && typeof customCode !== 'string') {
      return c.json({ error: '自定义短码必须是字符串' }, 400)
    }

    // 验证过期天数
    if (expiresInDays !== undefined) {
      if (typeof expiresInDays !== 'number' || expiresInDays < 1 || expiresInDays > 365) {
        return c.json({ error: '过期天数必须是 1-365 之间的数字' }, 400)
      }
    }

    // 验证和标准化 URL
    const normalizedUrl = normalizeUrl(url.trim())
    if (!isValidUrl(normalizedUrl)) {
      return c.json({ error: '无效的 URL 格式，请确保包含有效的域名' }, 400)
    }

    // 生成唯一短码
    const shortCode = await generateUniqueShortCode(c.env.URL_STORE, customCode)

    // 创建 URL 数据
    const urlData = createUrlData(normalizedUrl, shortCode, expiresInDays)

    // 存储到 KV
    await c.env.URL_STORE.put(shortCode, JSON.stringify(urlData))

    // 构建短链 URL
    const requestUrl = c.req.url
    const origin = requestUrl.substring(0, requestUrl.indexOf('/', 8)) // 获取协议+域名部分
    const shortUrl = `${origin}/${shortCode}`

    return c.json({
      shortCode,
      originalUrl: normalizedUrl,
      shortUrl,
      createdAt: urlData.createdAt,
      expiresAt: urlData.expiresAt
    })

  } catch (error) {
    // 记录错误（在 Cloudflare Workers 中可用）
    return c.json({
      error: error instanceof Error ? error.message : '创建短链失败'
    }, 500)
  }
})

// API: 获取短链统计信息
app.get('/api/stats/:shortCode', async (c) => {
  try {
    const shortCode = c.req.param('shortCode')

    if (!shortCode) {
      return c.json({ error: '短码不能为空' }, 400)
    }

    const data = await c.env.URL_STORE.get(shortCode)
    if (!data) {
      return c.json({ error: '短链不存在' }, 404)
    }

    const urlData: UrlData = JSON.parse(data)

    return c.json({
      shortCode: urlData.shortCode,
      originalUrl: urlData.originalUrl,
      createdAt: urlData.createdAt,
      expiresAt: urlData.expiresAt,
      clickCount: urlData.clickCount,
      lastAccessed: urlData.lastAccessed
    })

  } catch (error) {
    return c.json({ error: '获取统计信息失败' }, 500)
  }
})

// API: 删除短链
app.delete('/api/:shortCode', async (c) => {
  try {
    const shortCode = c.req.param('shortCode')

    if (!shortCode) {
      return c.json({ error: '短码不能为空' }, 400)
    }

    const data = await c.env.URL_STORE.get(shortCode)
    if (!data) {
      return c.json({ error: '短链不存在' }, 404)
    }

    await c.env.URL_STORE.delete(shortCode)

    return c.json({ message: '短链删除成功' })

  } catch (error) {
    return c.json({ error: '删除短链失败' }, 500)
  }
})

// 重定向功能 - 必须放在最后，避免与 API 路由冲突
app.get('/:shortCode', async (c) => {
  try {
    const shortCode = c.req.param('shortCode')

    if (!shortCode) {
      return c.text('短码不能为空', 400)
    }

    // 跳过 API 路径
    if (shortCode.startsWith('api')) {
      return c.text('Not Found', 404)
    }

    const data = await c.env.URL_STORE.get(shortCode)
    if (!data) {
      return c.text('短链不存在', 404)
    }

    const urlData: UrlData = JSON.parse(data)

    // 检查是否过期
    if (urlData.expiresAt && new Date() > new Date(urlData.expiresAt)) {
      return c.text('短链已过期', 410)
    }

    // 更新访问统计
    urlData.clickCount += 1
    urlData.lastAccessed = new Date().toISOString()

    // 异步更新统计信息（不等待完成）
    c.env.URL_STORE.put(shortCode, JSON.stringify(urlData))

    // 重定向到原始 URL
    return c.redirect(urlData.originalUrl, 302)

  } catch (error) {
    return c.text('重定向失败', 500)
  }
})

export default app
