import { useCallback, useEffect, useState } from 'react'
import { Config, DEFAULT_CONFIG } from '@/types/config'
import { getStoredConfig, setStoredConfig } from '@/lib/storage'

export const useConfig = () => {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    getStoredConfig()
      .then((data) => {
        if (mounted) setConfig(data)
      })
      .catch((err) => {
        console.error(err)
        if (mounted) setError('读取配置失败，请检查扩展权限')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const persist = useCallback(
    async (next: Config) => {
      setSaving(true)
      setError(null)
      try {
        await setStoredConfig(next)
        setConfig(next)
      } catch (err) {
        console.error(err)
        setError('保存配置失败，请重试')
      } finally {
        setSaving(false)
      }
    },
    [setConfig],
  )

  return { config, setConfig, persist, loading, saving, error }
}
