import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { AlertTriangle, Loader2, Play, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { useConfig } from '@/hooks/useConfig'
import { sendTestRequest } from '@/lib/extension'
import { cn, ensureAuthHeader, formatMs, sleep } from '@/lib/utils'
import type { Config, RouteConfig, TestRun } from '@/types/config'

type RouteResult = {
  route: RouteConfig
  runs: TestRun[]
}

const buildPayload = (config: Config) => ({
  model: config.model,
  max_tokens: config.maxTokens || 1024,
  stream: true,
  messages: [
    {
      role: 'user',
      content: config.content || 'Hello',
    },
  ],
})

const getStats = (runs: TestRun[]) => {
  const successRuns = runs.filter((r) => r.success)
  const failures = runs.length - successRuns.length
  const successRate = runs.length === 0 ? 0 : (successRuns.length / runs.length) * 100
  const avgFirst =
    successRuns.length === 0
      ? 0
      : successRuns.reduce((sum, run) => sum + run.firstByteTime, 0) /
        successRuns.length
  const bestFirst =
    successRuns.length === 0
      ? 0
      : Math.min(...successRuns.map((r) => r.firstByteTime))
  const worstFirst =
    successRuns.length === 0
      ? 0
      : Math.max(...successRuns.map((r) => r.firstByteTime))
  const avgTotal =
    successRuns.length === 0
      ? 0
      : successRuns.reduce((sum, run) => sum + run.totalTime, 0) /
        successRuns.length

  let lastError: string | undefined
  for (let i = runs.length - 1; i >= 0; i -= 1) {
    if (!runs[i].success) {
      lastError = runs[i].error
      break
    }
  }

  let lastMessage: string | undefined
  for (let i = runs.length - 1; i >= 0; i -= 1) {
    if (runs[i].success) {
      lastMessage = runs[i].firstMessage ?? ''
      break
    }
  }

  return { avgFirst, bestFirst, worstFirst, avgTotal, failures, lastError, successRate, lastMessage }
}

const App = () => {
  const { config, setConfig, persist, loading, error } = useConfig()
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<Record<string, RouteResult>>({})
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [lang, setLang] = useState<'zh' | 'en'>('zh')
  const runIdRef = useRef(0)

  const MODEL_OPTIONS = [
    'claude-3-5-haiku-20241022',
    'claude-3-5-sonnet-20241022',
    'claude-haiku-4-5-20251001',
    'claude-opus-4-20250514',
    'claude-sonnet-4-20250514',
    'claude-sonnet-4-5',
    'claude-3-7-sonnet-20250219',
    'claude-opus-4-1-20250805',
    'claude-opus-4-5-20251101',
    'claude-sonnet-4-5-20250929',
  ]

  const t = (key: string) => {
    const dict: Record<'zh' | 'en', Record<string, string>> = {
      zh: {
        title: '测速',
        bannerNoRoute: '请至少开启一条线路',
        bannerNoToken: '请填写全局 API Key 或为线路单独设置认证头',
        bannerDone: '测速完成',
        bannerError: '测速出现异常',
        loading: '正在载入配置...',
        sample: '示例',
        first: '首字',
        total: '总时',
        fail: '失败',
        progress: '进度',
        noText: '未返回文本',
        startAria: '开始测速',
        toggleLang: '中/EN',
      },
      en: {
        title: 'Speed Test',
        bannerNoRoute: 'Enable at least one route',
        bannerNoToken: 'Set global API key or per-route auth',
        bannerDone: 'Tests finished',
        bannerError: 'Test error',
        loading: 'Loading config...',
        sample: 'Sample',
        first: 'First byte',
        total: 'Total',
        fail: 'Fails',
        progress: 'Progress',
        noText: 'No text returned',
        startAria: 'Start test',
        toggleLang: '中/EN',
      },
    }
    return dict[lang][key] || key
  }

  useEffect(() => {
    if (error) setBanner(error)
  }, [error])

  const handleRun = async (overrideConfig?: Config) => {
    const currentRun = ++runIdRef.current
    const currentConfig = overrideConfig || config
    const enabledRoutes = currentConfig.routes.filter((route) => route.enabled)

    if (enabledRoutes.length === 0) {
      if (currentRun === runIdRef.current) setBanner(null)
      return
    }

    const hasToken = enabledRoutes.some((route) => (route.authHeader || currentConfig.apiKey).trim())
    if (!hasToken) {
      setBanner(null)
      return
    }

    setTesting(true)
    setBanner(null)
    setResults({})
    setProgress({})

    const payload = buildPayload(currentConfig)
    const limit = Math.max(
      1,
      Math.min(currentConfig.maxConcurrentRoutes || 1, enabledRoutes.length),
    )
    let cursor = 0

    const runRoute = async (route: RouteConfig) => {
      const runs: TestRun[] = []
      const token = ensureAuthHeader(route.authHeader || currentConfig.apiKey || '')
      const perRouteConcurrency = Math.max(
        1,
        Math.min(currentConfig.maxConcurrentPerRoute || 1, currentConfig.testCount),
      )
      let nextIndex = 0
      let completed = 0

      const worker = async () => {
        while (true) {
          if (currentRun !== runIdRef.current) break
          const currentIndex = nextIndex
          nextIndex += 1
          if (currentIndex >= currentConfig.testCount) break

          try {
            const response = await sendTestRequest({
              url: route.url,
              payload,
              token,
              timeout: currentConfig.timeout,
            })
            const message = (response.fullText || response.firstChunkText || '').trim()
            if (!message) {
              runs.push({
                success: false,
                error: '未返回文本',
                totalTime: response.totalTime,
                firstByteTime: response.firstByteTime,
                timestamp: Date.now(),
                firstMessage: '',
              })
            } else {
              runs.push({
                success: true,
                totalTime: response.totalTime,
                firstByteTime: response.firstByteTime,
                timestamp: Date.now(),
                firstMessage: message,
              })
            }
            if (currentRun === runIdRef.current) {
              setResults((prev) => ({
                ...prev,
                [route.id]: { route, runs: [...runs] },
              }))
            }
          } catch (err) {
            runs.push({
              success: false,
              error: (err as Error).message,
              totalTime: 0,
              firstByteTime: 0,
              timestamp: Date.now(),
              firstMessage: '',
            })
            if (currentRun === runIdRef.current) {
              setResults((prev) => ({
                ...prev,
                [route.id]: { route, runs: [...runs] },
              }))
            }
          }

          completed += 1
          if (currentRun === runIdRef.current) {
            setProgress((prev) => ({ ...prev, [route.id]: completed }))
          }

          if (currentConfig.delayBetweenTests > 0 && completed < currentConfig.testCount) {
            await sleep(currentConfig.delayBetweenTests * 1000)
          }
        }
      }

      await Promise.all(Array.from({ length: perRouteConcurrency }, () => worker()))

      setResults((prev) => ({ ...prev, [route.id]: { route, runs } }))
      return currentRun === runIdRef.current
    }

    const worker = async () => {
      while (cursor < enabledRoutes.length) {
        if (currentRun !== runIdRef.current) break
        const currentIndex = cursor
        cursor += 1
        const current = enabledRoutes[currentIndex]
        // eslint-disable-next-line no-await-in-loop
        await runRoute(current)
      }
    }

    try {
      const workers = Array.from({ length: limit }, () => worker())
      await Promise.all(workers)
      if (currentRun === runIdRef.current) setBanner(null)
    } catch (err) {
      if (currentRun === runIdRef.current) setBanner((err as Error).message || null)
    } finally {
      if (currentRun === runIdRef.current) setTesting(false)
    }
  }

  const handleModelChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value
    const nextConfig = { ...config, model }
    setConfig(nextConfig)
    await persist(nextConfig)
    await handleRun(nextConfig)
  }

  const openOptions = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage()
    } else {
      window.open('/options.html', '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t('loading')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6">
        <Card className="glass-panel relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 border border-border/70 bg-white/90 text-muted-foreground shadow-sm hover:text-foreground"
            onClick={openOptions}
            aria-label="打开选项页"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-3 pr-12">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                >
                  {t('toggleLang')}
                </Button>
                <CardTitle>{t('title')}</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={config.model}
                  onChange={handleModelChange}
                  className="h-10 min-w-[200px] text-xs"
                >
                  {MODEL_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
                <Button
                  onClick={() => handleRun()}
                  disabled={testing}
                  size="icon"
                  aria-label={t('startAria')}
                  className="h-10 w-10 rounded-full"
                >
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {banner && <div className="text-xs text-muted-foreground">{banner}</div>}
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(results).length > 0 && (
              <div className="rounded-xl border border-border bg-white/90 shadow-sm">
                {Object.values(results).map(({ route, runs }, idx, arr) => {
                  const stats = getStats(runs)
                  const toneClass =
                    stats.failures === 0
                      ? 'text-success'
                      : stats.failures === runs.length
                        ? 'text-destructive'
                        : 'text-warning-foreground'
                  return (
                    <div
                      key={route.id}
                      className={cn(
                        'flex flex-col gap-2 px-3 py-2 text-sm',
                        idx !== arr.length - 1 && 'border-b border-border/70',
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={cn('h-2.5 w-2.5 rounded-full', toneClass.replace('text', 'bg'))} />
                          <span
                            className={cn('max-w-[260px] truncate text-[12px] font-semibold', toneClass)}
                            title={`${route.url}`}
                          >
                            {route.url}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>{t('first')} {formatMs(stats.avgFirst || 0)}</span>
                          <span>{t('total')} {formatMs(stats.avgTotal || 0)}</span>
                          <span>{t('fail')} {stats.failures}</span>
                          <span>
                            {t('progress')} {progress[route.id] || 0}/{config.testCount}
                          </span>
                        </div>
                      </div>
                      {stats.lastMessage !== undefined && (
                        <div className="text-[12px] text-foreground">
                          <span className="font-semibold text-muted-foreground mr-1">{t('sample')}:</span>
                          <span className="break-words">
                            {stats.lastMessage.trim() ? stats.lastMessage : t('noText')}
                          </span>
                        </div>
                      )}
                      {stats.lastError && (
                        <div className="flex items-center gap-2 text-[12px] text-warning-foreground">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {stats.lastError}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
