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
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}))

// 健康检查端点
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'URL Shortener'
  })
})

// 全局错误处理
app.onError((err, c) => {
  return c.json({
    error: '服务器内部错误',
    message: err.message,
    timestamp: new Date().toISOString()
  }, 500)
})

// 首页 - 返回现代化的 HTML 界面
app.get('/', (c) => {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>URL 缩短服务 - 简洁、安全、高效</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-color: #3b82f6;
            --primary-hover: #2563eb;
            --primary-light: #dbeafe;
            --secondary-color: #f8fafc;
            --text-primary: #0f172a;
            --text-secondary: #64748b;
            --border-color: #e2e8f0;
            --success-color: #10b981;
            --success-bg: #ecfdf5;
            --error-color: #ef4444;
            --error-bg: #fef2f2;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            --border-radius: 8px;
            --border-radius-lg: 12px;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            line-height: 1.6;
        }

        .container {
            max-width: 480px;
            margin: 0 auto;
            background: white;
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow-lg);
            overflow: hidden;
            animation: slideUp 0.6s ease-out;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .header {
            background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
            color: white;
            padding: 32px 24px;
            text-align: center;
        }

        .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.025em;
        }

        .header p {
            opacity: 0.9;
            font-size: 15px;
            font-weight: 400;
        }

        .content {
            padding: 32px 24px;
        }

        .form-section {
            margin-bottom: 32px;
        }

        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            color: var(--text-primary);
            font-size: 14px;
        }

        input[type="url"], 
        input[type="text"], 
        input[type="number"] {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid var(--border-color);
            border-radius: var(--border-radius);
            font-size: 16px;
            transition: all 0.2s ease;
            background: white;
        }

        input[type="url"]:focus, 
        input[type="text"]:focus, 
        input[type="number"]:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px var(--primary-light);
        }

        .btn {
            background: var(--primary-color);
            color: white;
            padding: 14px 24px;
            border: none;
            border-radius: var(--border-radius);
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            width: 100%;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
        }

        .btn:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
            box-shadow: var(--shadow);
        }

        .btn:active {
            transform: translateY(0);
        }

        .btn-secondary {
            background: var(--text-secondary);
            flex: 1;
        }

        .btn-secondary:hover {
            background: #475569;
        }

        .btn-danger {
            background: var(--error-color);
            flex: 1;
        }

        .btn-danger:hover {
            background: #dc2626;
        }

        .btn-group {
            display: flex;
            gap: 12px;
        }

        .result {
            margin-top: 24px;
            padding: 20px;
            border-radius: var(--border-radius);
            display: none;
            animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .result.success {
            background: var(--success-bg);
            border: 1px solid #a7f3d0;
            color: #065f46;
        }

        .result.error {
            background: var(--error-bg);
            border: 1px solid #fecaca;
            color: #991b1b;
        }

        .result h3 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 12px;
        }

        .result p {
            margin-bottom: 8px;
            font-size: 14px;
        }

        .short-url {
            font-weight: 600;
            word-break: break-all;
            background: rgba(59, 130, 246, 0.1);
            padding: 8px 12px;
            border-radius: 6px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 13px;
        }

        .copy-btn {
            background: var(--success-color);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            margin-top: 12px;
            transition: all 0.2s ease;
        }

        .copy-btn:hover {
            background: #059669;
        }

        .divider {
            height: 1px;
            background: var(--border-color);
            margin: 32px 0;
        }

        .feature-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-top: 24px;
            padding: 24px;
            background: var(--secondary-color);
            border-radius: var(--border-radius);
        }

        .feature {
            text-align: center;
            padding: 16px 8px;
        }

        .feature-icon {
            font-size: 24px;
            margin-bottom: 8px;
        }

        .feature-title {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 4px;
        }

        .feature-desc {
            font-size: 11px;
            color: var(--text-secondary);
        }

        @media (max-width: 640px) {
            .container {
                margin: 10px;
                border-radius: var(--border-radius);
            }

            .header {
                padding: 24px 20px;
            }

            .header h1 {
                font-size: 24px;
            }

            .content {
                padding: 24px 20px;
            }

            .feature-grid {
                grid-template-columns: 1fr;
                gap: 12px;
            }

            .btn-group {
                flex-direction: column;
            }
        }

        .loading {
            opacity: 0.7;
            pointer-events: none;
        }

        .loading::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            margin: -10px 0 0 -10px;
            border: 2px solid transparent;
            border-top: 2px solid currentColor;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔗 URL 缩短服务</h1>
            <p>简洁、安全、高效的链接管理工具</p>
        </div>
        
        <div class="content">
            <div class="form-section">
                <h2 class="section-title">
                    <span>📎</span> 创建短链
                </h2>
                <form id="shortenForm">
                    <div class="form-group">
                        <label for="originalUrl">原始 URL</label>
                        <input type="url" id="originalUrl" placeholder="https://example.com/very/long/url" required>
                    </div>
                    <div class="form-group">
                        <label for="customCode">自定义短码 (可选)</label>
                        <input type="text" id="customCode" placeholder="留空自动生成" maxlength="10">
                    </div>
                    <div class="form-group">
                        <label for="expiresInDays">过期天数 (可选)</label>
                        <input type="number" id="expiresInDays" placeholder="留空永不过期" min="1" max="365">
                    </div>
                    <button type="submit" class="btn" id="shortenBtn">生成短链</button>
                </form>
                <div id="result" class="result"></div>
            </div>

            <div class="divider"></div>

            <div class="form-section">
                <h2 class="section-title">
                    <span>📊</span> 管理短链
                </h2>
                <form id="manageForm">
                    <div class="form-group">
                        <label for="manageCode">短码</label>
                        <input type="text" id="manageCode" placeholder="输入要查询的短码" required>
                    </div>
                    <div class="btn-group">
                        <button type="button" class="btn btn-secondary" onclick="getStats()">查询统计</button>
                        <button type="button" class="btn btn-danger" onclick="deleteShortUrl()">删除短链</button>
                    </div>
                </form>
                <div id="manageResult" class="result"></div>
            </div>

            <div class="feature-grid">
                <div class="feature">
                    <div class="feature-icon">⚡</div>
                    <div class="feature-title">极速生成</div>
                    <div class="feature-desc">秒级生成短链</div>
                </div>
                <div class="feature">
                    <div class="feature-icon">📈</div>
                    <div class="feature-title">数据统计</div>
                    <div class="feature-desc">详细访问分析</div>
                </div>
                <div class="feature">
                    <div class="feature-icon">🛡️</div>
                    <div class="feature-title">安全可靠</div>
                    <div class="feature-desc">企业级安全</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // 添加加载状态管理
        function setLoading(element, isLoading) {
            if (!element) return;
            if (isLoading) {
                element.classList.add('loading');
                element.disabled = true;
            } else {
                element.classList.remove('loading');
                element.disabled = false;
            }
        }

        // 显示结果的通用函数
        function showResult(resultId, isSuccess, title, content) {
            const resultDiv = document.getElementById(resultId);
            resultDiv.className = \`result \${isSuccess ? 'success' : 'error'}\`;
            resultDiv.innerHTML = \`<h3>\${title}</h3>\${content}\`;
            resultDiv.style.display = 'block';
        }

        document.getElementById('shortenForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const originalUrl = document.getElementById('originalUrl').value;
            const customCode = document.getElementById('customCode').value;
            const expiresInDays = document.getElementById('expiresInDays').value;

            const shortenBtn = document.getElementById('shortenBtn');
            setLoading(shortenBtn, true);

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
                    const shortUrl = \`\${window.location.origin}/\${data.shortCode}\`;
                    let expiryInfo = data.expiresAt ?
                        \`<p><strong>过期时间:</strong> \${new Date(data.expiresAt).toLocaleString('zh-CN')}</p>\` :
                        '<p><strong>过期时间:</strong> 永不过期</p>';

                    const content = \`
                        <p><strong>短链:</strong></p>
                        <div class="short-url">\${shortUrl}</div>
                        <button class="copy-btn" onclick="copyToClipboard('\${shortUrl}')">📋 复制短链</button>
                        <p style="margin-top: 16px;"><strong>原始 URL:</strong> \${data.originalUrl}</p>
                        \${expiryInfo}
                    \`;

                    showResult('result', true, '🎉 短链生成成功！', content);
                    
                    // 清空表单
                    document.getElementById('shortenForm').reset();
                } else {
                    showResult('result', false, '❌ 生成失败', \`<p>\${data.error}</p>\`);
                }
            } catch (error) {
                showResult('result', false, '❌ 网络错误', '<p>请检查网络连接后重试</p>');
            } finally {
                setLoading(shortenBtn, false);
            }
        });

        async function getStats() {
            const shortCode = document.getElementById('manageCode').value.trim();

            if (!shortCode) {
                showResult('manageResult', false, '❌ 输入错误', '<p>请输入短码</p>');
                return;
            }

            // 验证短码格式
            if (shortCode.length < 3 || shortCode.length > 10) {
                showResult('manageResult', false, '❌ 格式错误', '<p>短码长度必须在3-10位之间</p>');
                return;
            }

            if (!/^[a-zA-Z0-9]+$/.test(shortCode)) {
                showResult('manageResult', false, '❌ 格式错误', '<p>短码只能包含字母和数字</p>');
                return;
            }

            // 设置按钮加载状态
            const statsBtn = document.querySelector('.btn-secondary');
            if (statsBtn) {
                setLoading(statsBtn, true);
                statsBtn.textContent = '查询中...';
            }

            let retryCount = 0;
            const maxRetries = 3;

            async function attemptRequest() {
                try {
                    const response = await fetch(\`/api/stats/\${encodeURIComponent(shortCode)}\`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache'
                        }
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ error: '服务器响应错误' }));
                        throw new Error(errorData.error || \`HTTP \${response.status}\`);
                    }

                    const data = await response.json();

                    if (data && typeof data === 'object') {
                        let expiryInfo = data.expiresAt ?
                            \`<p><strong>过期时间:</strong> \${new Date(data.expiresAt).toLocaleString('zh-CN')}</p>\` :
                            '<p><strong>过期时间:</strong> 永不过期</p>';
                        let lastAccessInfo = data.lastAccessed ?
                            \`<p><strong>最后访问:</strong> \${new Date(data.lastAccessed).toLocaleString('zh-CN')}</p>\` :
                            '<p><strong>最后访问:</strong> 从未访问</p>';

                        const content = \`
                            <p><strong>短码:</strong> \${data.shortCode || shortCode}</p>
                            <p><strong>原始 URL:</strong> \${data.originalUrl || '未知'}</p>
                            <p><strong>创建时间:</strong> \${data.createdAt ? new Date(data.createdAt).toLocaleString('zh-CN') : '未知'}</p>
                            \${expiryInfo}
                            <p><strong>访问次数:</strong> \${data.clickCount || 0} 次</p>
                            \${lastAccessInfo}
                        \`;

                        showResult('manageResult', true, '📊 统计信息', content);
                    } else {
                        throw new Error('服务器返回数据格式错误');
                    }

                } catch (error) {
                    retryCount++;
                    
                    if (retryCount < maxRetries && (error.message.includes('fetch') || error.message.includes('网络'))) {
                        // 网络错误，尝试重试
                        setTimeout(() => attemptRequest(), 1000 * retryCount);
                        return;
                    }
                    
                    let errorMessage = '请检查网络连接后重试';
                    if (error.message.includes('不存在')) {
                        errorMessage = '短链不存在，请检查短码是否正确';
                    } else if (error.message.includes('格式错误') || error.message.includes('长度')) {
                        errorMessage = error.message;
                    } else if (error.message.includes('HTTP 500')) {
                        errorMessage = '服务器内部错误，请稍后重试';
                    } else if (error.message.includes('HTTP 404')) {
                        errorMessage = '短链不存在';
                    }

                    showResult('manageResult', false, '❌ 查询失败', \`<p>\${errorMessage}</p>\`);
                }
            }

            try {
                await attemptRequest();
            } finally {
                // 恢复按钮状态
                if (statsBtn) {
                    setLoading(statsBtn, false);
                    statsBtn.textContent = '查询统计';
                }
            }
        }

        async function deleteShortUrl() {
            const shortCode = document.getElementById('manageCode').value.trim();

            if (!shortCode) {
                showResult('manageResult', false, '❌ 输入错误', '<p>请输入短码</p>');
                return;
            }

            // 验证短码格式
            if (shortCode.length < 3 || shortCode.length > 10) {
                showResult('manageResult', false, '❌ 格式错误', '<p>短码长度必须在3-10位之间</p>');
                return;
            }

            if (!/^[a-zA-Z0-9]+$/.test(shortCode)) {
                showResult('manageResult', false, '❌ 格式错误', '<p>短码只能包含字母和数字</p>');
                return;
            }

            if (!confirm('⚠️ 确定要删除这个短链吗？\\n\\n此操作不可撤销，删除后该短链将无法访问。')) {
                return;
            }

            // 设置按钮加载状态
            const deleteBtn = document.querySelector('.btn-danger');
            if (deleteBtn) {
                setLoading(deleteBtn, true);
                deleteBtn.textContent = '删除中...';
            }

            try {
                const response = await fetch(\`/api/\${encodeURIComponent(shortCode)}\`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: '服务器响应错误' }));
                    throw new Error(errorData.error || \`HTTP \${response.status}\`);
                }

                const data = await response.json();

                if (data && data.message) {
                    showResult('manageResult', true, '✅ 删除成功', \`<p>\${data.message}</p>\`);
                    document.getElementById('manageCode').value = '';
                } else {
                    throw new Error('删除操作未确认');
                }

            } catch (error) {
                let errorMessage = '请检查网络连接后重试';
                if (error.message.includes('不存在')) {
                    errorMessage = '短链不存在，可能已被删除';
                } else if (error.message.includes('HTTP 404')) {
                    errorMessage = '短链不存在';
                } else if (error.message.includes('HTTP 500')) {
                    errorMessage = '服务器内部错误，请稍后重试';
                }

                showResult('manageResult', false, '❌ 删除失败', \`<p>\${errorMessage}</p>\`);
            } finally {
                // 恢复按钮状态
                if (deleteBtn) {
                    setLoading(deleteBtn, false);
                    deleteBtn.textContent = '删除短链';
                }
            }
        }

        function copyToClipboard(text) {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    // 创建复制成功的视觉反馈
                    const event = document.querySelector('.copy-btn');
                    const originalText = event.textContent;
                    event.textContent = '✅ 已复制';
                    event.style.background = '#10b981';
                    
                    setTimeout(() => {
                        event.textContent = originalText;
                        event.style.background = '';
                    }, 2000);
                }).catch(() => {
                    fallbackCopyTextToClipboard(text);
                });
            } else {
                fallbackCopyTextToClipboard(text);
            }
        }

        function fallbackCopyTextToClipboard(text) {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                alert('📋 短链已复制到剪贴板！');
            } catch (err) {
                alert('❌ 复制失败，请手动复制');
            }
            
            document.body.removeChild(textArea);
        }

        // 添加键盘快捷键支持
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                if (document.activeElement.closest('#shortenForm')) {
                    document.getElementById('shortenForm').dispatchEvent(new Event('submit'));
                }
            }
        });

        // 添加表单验证增强
        document.getElementById('originalUrl').addEventListener('blur', function() {
            const url = this.value.trim();
            if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
                this.value = 'https://' + url;
            }
        });

        // 添加输入实时验证
        document.getElementById('customCode').addEventListener('input', function() {
            this.value = this.value.replace(/[^a-zA-Z0-9-_]/g, '');
        });
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

    // 验证短码
    if (!shortCode || typeof shortCode !== 'string' || shortCode.trim() === '') {
      return c.json({ error: '短码不能为空' }, 400)
    }

    const trimmedShortCode = shortCode.trim()
    
    // 验证短码格式
    if (trimmedShortCode.length < 3 || trimmedShortCode.length > 10) {
      return c.json({ error: '短码长度必须在3-10位之间' }, 400)
    }

    // 从 KV 存储中获取数据
    let data: string | null = null
    try {
      data = await c.env.URL_STORE.get(trimmedShortCode)
    } catch (kvError) {
      return c.json({ error: 'KV 存储访问失败' }, 500)
    }

    if (!data) {
      return c.json({ error: '短链不存在' }, 404)
    }

    let urlData: UrlData
    try {
      urlData = JSON.parse(data)
    } catch (parseError) {
      return c.json({ error: '数据格式错误' }, 500)
    }

    // 验证数据完整性
    if (!urlData.shortCode || !urlData.originalUrl) {
      return c.json({ error: '数据不完整' }, 500)
    }

    return c.json({
      shortCode: urlData.shortCode,
      originalUrl: urlData.originalUrl,
      createdAt: urlData.createdAt,
      expiresAt: urlData.expiresAt || null,
      clickCount: urlData.clickCount || 0,
      lastAccessed: urlData.lastAccessed || null
    })

  } catch (error) {
    return c.json({ 
      error: '获取统计信息失败', 
      details: error instanceof Error ? error.message : '未知错误' 
    }, 500)
  }
})

// API: 删除短链
app.delete('/api/:shortCode', async (c) => {
  try {
    const shortCode = c.req.param('shortCode')

    // 验证短码
    if (!shortCode || typeof shortCode !== 'string' || shortCode.trim() === '') {
      return c.json({ error: '短码不能为空' }, 400)
    }

    const trimmedShortCode = shortCode.trim()
    
    // 验证短码格式
    if (trimmedShortCode.length < 3 || trimmedShortCode.length > 10) {
      return c.json({ error: '短码长度必须在3-10位之间' }, 400)
    }

    // 从 KV 存储中检查是否存在
    let data: string | null = null
    try {
      data = await c.env.URL_STORE.get(trimmedShortCode)
    } catch (kvError) {
      return c.json({ error: 'KV 存储访问失败' }, 500)
    }

    if (!data) {
      return c.json({ error: '短链不存在' }, 404)
    }

    // 删除短链
    try {
      await c.env.URL_STORE.delete(trimmedShortCode)
    } catch (kvError) {
      return c.json({ error: 'KV 存储删除失败' }, 500)
    }

    return c.json({ message: '短链删除成功' })

  } catch (error) {
    return c.json({ 
      error: '删除短链失败', 
      details: error instanceof Error ? error.message : '未知错误' 
    }, 500)
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
