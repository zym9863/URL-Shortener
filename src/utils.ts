// URL 缩短服务工具函数

// 定义 KV 命名空间类型
interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}

// Base62 字符集 (0-9, a-z, A-Z)
const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * 生成随机短码
 * @param length 短码长度，默认6位
 * @returns 随机短码
 */
export function generateShortCode(length: number = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += BASE62_CHARS.charAt(Math.floor(Math.random() * BASE62_CHARS.length));
  }
  return result;
}

/**
 * 验证短码格式
 * @param shortCode 短码
 * @returns 是否有效
 */
export function isValidShortCode(shortCode: string): boolean {
  if (!shortCode || shortCode.length < 3 || shortCode.length > 10) {
    return false;
  }
  // 只允许字母和数字，不允许特殊字符
  if (!/^[0-9a-zA-Z]+$/.test(shortCode)) {
    return false;
  }
  // 不允许纯数字（避免与统计等功能冲突）
  if (/^\d+$/.test(shortCode)) {
    return false;
  }
  // 不允许保留词
  const reservedWords = ['api', 'admin', 'www', 'app', 'stats', 'help', 'about'];
  if (reservedWords.includes(shortCode.toLowerCase())) {
    return false;
  }
  return true;
}

/**
 * 验证 URL 格式
 * @param url URL 字符串
 * @returns 是否有效
 */
export function isValidUrl(url: string): boolean {
  try {
    // 使用 globalThis.URL 来避免类型错误
    const urlObj = new (globalThis as any).URL(url);

    // 只允许 HTTP 和 HTTPS 协议
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }

    // 检查域名格式
    if (!urlObj.hostname || urlObj.hostname.length < 3) {
      return false;
    }

    // 不允许本地地址和私有 IP
    const hostname = urlObj.hostname.toLowerCase();
    const blockedHosts = [
      'localhost', '127.0.0.1', '0.0.0.0', '::1',
      '10.', '172.16.', '172.17.', '172.18.', '172.19.',
      '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
      '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
      '172.30.', '172.31.', '192.168.'
    ];

    for (const blocked of blockedHosts) {
      if (hostname === blocked || hostname.startsWith(blocked)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * 标准化 URL（确保有协议）
 * @param url 输入的 URL
 * @returns 标准化后的 URL
 */
export function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
}

/**
 * 生成唯一的短码（检查是否已存在）
 * @param kv KV 存储实例
 * @param customCode 自定义短码（可选）
 * @param maxRetries 最大重试次数
 * @returns 唯一的短码
 */
export async function generateUniqueShortCode(
  kv: KVNamespace,
  customCode?: string,
  maxRetries: number = 10
): Promise<string> {
  if (customCode) {
    if (!isValidShortCode(customCode)) {
      throw new Error('自定义短码格式无效');
    }
    
    const existing = await kv.get(customCode);
    if (existing) {
      throw new Error('自定义短码已存在');
    }
    
    return customCode;
  }

  // 生成随机短码
  for (let i = 0; i < maxRetries; i++) {
    const shortCode = generateShortCode();
    const existing = await kv.get(shortCode);
    if (!existing) {
      return shortCode;
    }
  }

  throw new Error('无法生成唯一短码，请稍后重试');
}

/**
 * URL 数据接口
 */
export interface UrlData {
  originalUrl: string;
  shortCode: string;
  createdAt: string;
  expiresAt?: string;
  clickCount: number;
  lastAccessed?: string;
}

/**
 * 创建 URL 数据对象
 * @param originalUrl 原始 URL
 * @param shortCode 短码
 * @param expiresInDays 过期天数（可选）
 * @returns URL 数据对象
 */
export function createUrlData(
  originalUrl: string,
  shortCode: string,
  expiresInDays?: number
): UrlData {
  const now = new Date().toISOString();
  const expiresAt = expiresInDays 
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  return {
    originalUrl,
    shortCode,
    createdAt: now,
    expiresAt,
    clickCount: 0
  };
}

/**
 * 检查 URL 是否过期
 * @param urlData URL 数据
 * @returns 是否过期
 */
export function isExpired(urlData: UrlData): boolean {
  if (!urlData.expiresAt) {
    return false;
  }
  return new Date() > new Date(urlData.expiresAt);
}
