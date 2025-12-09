export interface RouteConfig {
  id: string
  name: string
  url: string
  description?: string
  enabled: boolean
  /**
   * 完整的认证头，例如 "Bearer sk-xxxx"。留空则不带 Authorization。
   */
  authHeader?: string
}

export interface Config {
  apiKey: string
  timeout: number
  testCount: number
  delayBetweenTests: number
  model: string
  maxTokens: number
  content: string
  maxConcurrentRoutes: number
  maxConcurrentPerRoute: number
  routes: RouteConfig[]
}

export interface TestRun {
  success: boolean
  totalTime: number
  firstByteTime: number
  error?: string
  timestamp: number
  firstMessage?: string
}

export const DEFAULT_ROUTES: RouteConfig[] = [
  {
    id: 'main',
    name: '主线路',
    url: 'https://anyrouter.top/v1/messages',
    description: '官方代理主线路',
    enabled: true,
    authHeader: '',
  },
  {
    id: 'cdn-1',
    name: 'CDN线路1',
    url: 'https://pmpjfbhq.cn-nb1.rainapp.top/v1/messages',
    description: 'CDN 入口 1',
    enabled: true,
    authHeader: '',
  },
  {
    id: 'cdn-2',
    name: 'CDN线路2',
    url: 'https://a-ocnfniawgw.cn-shanghai.fcapp.run/v1/message',
    description: 'CDN 入口 2',
    enabled: true,
    authHeader: '',
  },
  {
    id: 'cdn-3',
    name: 'CDN线路3',
    url: 'https://c.cspok.cn/v1/message',
    description: 'CDN 入口 3',
    enabled: true,
    authHeader: '',
  },
]

export const DEFAULT_CONFIG: Config = {
  apiKey: '',
  timeout: 30,
  testCount: 10,
  delayBetweenTests: 0.2,
  model: 'claude-3-5-haiku-20241022',
  maxTokens: 1024,
  content: 'Hello',
  maxConcurrentRoutes: 5,
  maxConcurrentPerRoute: 10,
  routes: DEFAULT_ROUTES,
}
