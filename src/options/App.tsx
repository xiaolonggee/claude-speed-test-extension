import { useMemo, useState, type ChangeEvent } from 'react'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useConfig } from '@/hooks/useConfig'
import { DEFAULT_CONFIG, type RouteConfig } from '@/types/config'

const App = () => {
  const { config, setConfig, persist, loading, saving, error } = useConfig()
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const modelOptions = [
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

  const enabledCount = useMemo(
    () => config.routes.filter((r) => r.enabled).length,
    [config.routes],
  )

  const numericKeys: Array<keyof typeof config> = [
    'timeout',
    'testCount',
    'delayBetweenTests',
    'maxConcurrentRoutes',
    'maxConcurrentPerRoute',
    'maxTokens',
  ]

  const handleChange =
    (key: keyof typeof config) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const isNumber = numericKeys.includes(key)
      const raw = e.target.value
      const value = isNumber ? Number(raw) : raw
      setConfig({ ...config, [key]: value as never })
    }

  const updateRoute = <K extends keyof RouteConfig>(id: string, key: K, value: RouteConfig[K]) => {
    setConfig({
      ...config,
      routes: config.routes.map((route) =>
        route.id === id ? { ...route, [key]: value } : route,
      ),
    })
  }

  const addRoute = () => {
    const route: RouteConfig = {
      id: `route-${Date.now()}`,
      name: '新线路',
      url: '',
      description: '',
      enabled: true,
      authHeader: '',
    }
    setConfig({ ...config, routes: [...config.routes, route] })
  }

  const removeRoute = (id: string) => {
    if (config.routes.length === 1) return
    setConfig({ ...config, routes: config.routes.filter((route) => route.id !== id) })
  }

  const handleSave = async () => {
    await persist(config)
    setSavedAt(Date.now())
  }

  const resetDefaults = () => {
    setConfig({
      ...DEFAULT_CONFIG,
      routes: DEFAULT_CONFIG.routes.map((r) => ({ ...r })),
    })
    setSavedAt(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-5 py-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Claude API 测速 · 设置
          </div>
          <h1 className="text-2xl font-semibold">配置请求参数与线路</h1>
          <p className="text-sm text-muted-foreground">
            全局 Key、模型、并发、提示词，以及自定义第三方接口地址。保存后在弹窗直接测速。
          </p>
          {error && <p className="text-xs text-warning-foreground">{error}</p>}
        </header>

        <div className="grid gap-5 lg:grid-cols-[0.65fr_0.35fr]">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>请求与并发</CardTitle>
              <CardDescription>这些配置直接决定测速的请求负载。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">全局 API Key</Label>
                  <Input
                    id="apiKey"
                    placeholder="Bearer sk-..."
                    value={config.apiKey}
                    onChange={handleChange('apiKey')}
                  />
                  <p className="text-xs text-muted-foreground">
                    建议包含 Bearer 前缀；单条线路也可以覆盖。
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">模型 ID</Label>
                  <Select
                    id="model"
                    value={config.model}
                    onChange={handleChange('model')}
                  >
                    {modelOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    仅列出 Anthropic 10 个模型，可在此选择。
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">max_tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    min={1}
                    value={config.maxTokens}
                    onChange={handleChange('maxTokens')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">提示词</Label>
                <Textarea
                  id="content"
                  rows={3}
                  value={config.content}
                  onChange={handleChange('content')}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="timeout">超时 (秒)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min={1}
                    value={config.timeout}
                    onChange={handleChange('timeout')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testCount">单线路次数</Label>
                  <Input
                    id="testCount"
                    type="number"
                    min={1}
                    value={config.testCount}
                    onChange={handleChange('testCount')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delayBetweenTests">两次间隔 (秒)</Label>
                  <Input
                    id="delayBetweenTests"
                    type="number"
                    min={0}
                    step="0.1"
                    value={config.delayBetweenTests}
                    onChange={handleChange('delayBetweenTests')}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxConcurrentRoutes">同时跑的线路</Label>
                  <Input
                    id="maxConcurrentRoutes"
                    type="number"
                    min={1}
                    value={config.maxConcurrentRoutes}
                    onChange={handleChange('maxConcurrentRoutes')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxConcurrentPerRoute">单线路并发</Label>
                  <Select
                    id="maxConcurrentPerRoute"
                    value={String(config.maxConcurrentPerRoute)}
                    onChange={handleChange('maxConcurrentPerRoute')}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    目前测速按顺序发起，预留并发参数方便后续扩展。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>操作</CardTitle>
              <CardDescription>保存或恢复默认配置。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存配置
              </Button>
              <Button variant="secondary" className="w-full" onClick={resetDefaults}>
                载入默认
              </Button>
              {savedAt && (
                <p className="text-xs text-muted-foreground">
                  已保存：{new Date(savedAt).toLocaleTimeString()}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>线路列表</CardTitle>
            <CardDescription>
              为不同第三方接口配置独立地址、描述和认证头。成功启用 {enabledCount}/{config.routes.length} 条。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge variant="muted">已启用 {enabledCount} 条</Badge>
              <Button variant="secondary" size="sm" onClick={addRoute}>
                <Plus className="h-4 w-4" />
                新增线路
              </Button>
            </div>
            <div className="space-y-3">
              {config.routes.map((route) => (
                <div
                  key={route.id}
                  className="rounded-xl border border-border bg-white/90 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={route.enabled}
                        onCheckedChange={(checked) => updateRoute(route.id, 'enabled', checked)}
                      />
                      <div className="text-sm font-semibold">{route.name}</div>
                      <Badge variant={route.enabled ? 'success' : 'muted'}>
                        {route.enabled ? '启用' : '停用'}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeRoute(route.id)}
                      disabled={config.routes.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </Button>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">名称</Label>
                      <Input
                        value={route.name}
                        onChange={(e) => updateRoute(route.id, 'name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">描述</Label>
                      <Input
                        value={route.description || ''}
                        onChange={(e) => updateRoute(route.id, 'description', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">接口地址</Label>
                      <Input
                        value={route.url}
                        onChange={(e) => updateRoute(route.id, 'url', e.target.value)}
                        placeholder="https://.../v1/messages"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">认证头 (可覆盖全局)</Label>
                      <Input
                        value={route.authHeader || ''}
                        onChange={(e) => updateRoute(route.id, 'authHeader', e.target.value)}
                        placeholder="Bearer sk-xxx，留空则使用全局 Key"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
