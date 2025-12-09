import { Config, DEFAULT_CONFIG, DEFAULT_ROUTES, RouteConfig } from '@/types/config'

const isExtensionContext =
  typeof chrome !== 'undefined' && typeof chrome.storage?.local !== 'undefined'

const normalizeRoutes = (routes?: RouteConfig[]): RouteConfig[] => {
  if (!routes || routes.length === 0) return DEFAULT_ROUTES
  return routes.map((route, index) => ({
    id: route.id || `route-${index}`,
    name: route.name || `线路 ${index + 1}`,
    url: route.url || '',
    description: route.description || '',
    enabled: route.enabled ?? true,
    authHeader: route.authHeader || '',
  }))
}

const normalizeConfig = (raw?: Partial<Config>): Config => {
  const merged: Config = {
    ...DEFAULT_CONFIG,
    ...raw,
    routes: normalizeRoutes(raw?.routes),
  }
  return merged
}

export const getStoredConfig = async (): Promise<Config> => {
  if (isExtensionContext) {
    const data = await new Promise<Config | undefined>((resolve, reject) => {
      chrome.storage.local.get('config', (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
          return
        }
        resolve(result.config as Config | undefined)
      })
    })
    return normalizeConfig(data)
  }

  const localConfig = localStorage.getItem('config')
  if (!localConfig) return DEFAULT_CONFIG
  return normalizeConfig(JSON.parse(localConfig) as Partial<Config>)
}

export const setStoredConfig = async (config: Config) => {
  if (isExtensionContext) {
    await new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ config }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
          return
        }
        resolve()
      })
    })
    return
  }
  localStorage.setItem('config', JSON.stringify(config))
}

export { isExtensionContext }
