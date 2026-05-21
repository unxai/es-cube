/// <reference types="vite/client" />

interface ESInstance {
  id: string
  name: string
  url: string
  username?: string
  password?: string
  apiKey?: string
  version?: string
  majorVersion?: number
  createdAt: number
  updatedAt: number
}

interface Settings {
  theme: 'dark' | 'light' | 'system'
  fontSize: number
  autoConnect: boolean
  lastConnectedId?: string
}

interface ESQueryResponse {
  success: boolean
  data?: Record<string, unknown> | unknown[]
  error?: string
  status?: number
  headers?: Record<string, string>
}

interface ElectronAPI {
  getAppVersion: () => Promise<string>
  openExternal: (url: string) => Promise<void>
  storage: {
    getInstances: () => Promise<ESInstance[]>
    getInstance: (id: string) => Promise<ESInstance | null>
    addInstance: (instance: Omit<ESInstance, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ESInstance>
    updateInstance: (id: string, updates: Partial<ESInstance>) => Promise<ESInstance | null>
    deleteInstance: (id: string) => Promise<boolean>
    getSettings: () => Promise<Settings>
    updateSettings: (settings: Partial<Settings>) => Promise<void>
  }
  es: {
    detectVersion: (instanceId: string) => Promise<string | null>
    checkHealth: (instanceId: string) => Promise<Record<string, unknown> | null>
    getIndices: (instanceId: string) => Promise<string[] | null>
    getMapping: (instanceId: string, index: string) => Promise<Record<string, unknown> | null>
    executeQuery: (instanceId: string, method: string, path: string, body?: unknown) => Promise<ESQueryResponse>
  }
  updater: {
    check: () => Promise<Record<string, unknown> | null>
    download: () => Promise<boolean>
    install: () => void
  }
}

interface Window {
  api: ElectronAPI
}