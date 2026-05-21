import { contextBridge, ipcRenderer } from 'electron'

// Types copied from StorageService to avoid importing from main in preload
export interface ESInstance {
  id: string
  name: string
  url: string
  authType?: 'none' | 'basic' | 'bearer' | 'apiKey'
  username?: string
  password?: string
  apiKey?: string
  caCert?: string
  version?: string
  majorVersion?: number
  createdAt: number
  updatedAt: number
}

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'deepseek'

export interface AIProviderConfig {
  apiKey: string
  baseUrl?: string
}

export interface AIConfig {
  provider: AIProvider
  model: string
  providers: Record<AIProvider, AIProviderConfig>
}

export interface Settings {
  theme: 'dark' | 'light' | 'system'
  fontSize: number
  autoConnect: boolean
  defaultLanguage: string
  lastConnectedId?: string
  developerMode: boolean
  autoUpdate: {
    enabled: boolean
    autoDownload: boolean
    autoInstall: boolean
    verifyRelease: boolean
    publicKey?: string
  }
  aiConfig: AIConfig
}

export interface ESVersionInfo {
  number: string
  major: number
  minor: number
  patch: number
}

export interface ESHealthResponse {
  cluster_name: string
  status: 'green' | 'yellow' | 'red'
  timed_out: boolean
  number_of_nodes: number
  number_of_data_nodes: number
  active_primary_shards: number
  active_shards: number
  relocating_shards: number
  initializing_shards: number
  unassigned_shards: number
}

export interface AIResponse {
  success: boolean
  dsl?: string
  error?: string
}

export interface AIRequest {
  naturalLanguageQuery: string
  indexMapping: any | null
  indexName?: string
}

export interface ESQueryResult {
  success: boolean
  data?: unknown
  status?: number
  headers?: unknown
  error?: string
}

interface StorageAPI {
  getInstances: () => Promise<ESInstance[]>
  getInstanceById: (id: string) => Promise<ESInstance | undefined>
  addInstance: (instance: Omit<ESInstance, 'createdAt' | 'updatedAt'>) => Promise<ESInstance>
  updateInstance: (id: string, updates: Partial<Omit<ESInstance, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<ESInstance | undefined>
  deleteInstance: (id: string) => Promise<boolean>
  getSettings: () => Promise<Settings>
  updateSettings: (settings: Partial<Settings>) => Promise<Settings>
}

interface ESAPI {
  detectVersion: (instanceId: string) => Promise<ESVersionInfo | null>
  checkHealth: (instanceId: string) => Promise<ESHealthResponse | null>
  getIndices: (instanceId: string) => Promise<string[] | null>
  getMapping: (instanceId: string, index: string) => Promise<unknown | null>
  executeQuery: (instanceId: string, method: string, path: string, body?: unknown) => Promise<ESQueryResult>
}

interface UpdaterAPI {
  check: () => Promise<any>
  download: () => Promise<boolean>
  install: () => void
  validate: (filePath: string, signature: string) => Promise<boolean>
}

interface AIAPI {
  generateDSL: (request: AIRequest) => Promise<AIResponse>
}

contextBridge.exposeInMainWorld('api', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    validate: (filePath: string, signature: string) => ipcRenderer.invoke('updater:validate', filePath, signature),
  },

  ai: {
    generateDSL: (request: AIRequest) => ipcRenderer.invoke('ai:generate-dsl', request),
  },
  
  storage: {
    getInstances: () => ipcRenderer.invoke('storage:get-instances'),
    getInstanceById: (id: string) => ipcRenderer.invoke('storage:get-instance', id),
    addInstance: (instance: Omit<ESInstance, 'createdAt' | 'updatedAt'>) => 
      ipcRenderer.invoke('storage:add-instance', instance),
    updateInstance: (id: string, updates: Partial<Omit<ESInstance, 'id' | 'createdAt' | 'updatedAt'>>) =>
      ipcRenderer.invoke('storage:update-instance', id, updates),
    deleteInstance: (id: string) => ipcRenderer.invoke('storage:delete-instance', id),
    getSettings: () => ipcRenderer.invoke('storage:get-settings'),
    updateSettings: (settings: Partial<Settings>) => ipcRenderer.invoke('storage:update-settings', settings),
  } as StorageAPI,

  es: {
    detectVersion: (instanceId: string) => ipcRenderer.invoke('es:detect-version', instanceId),
    checkHealth: (instanceId: string) => ipcRenderer.invoke('es:check-health', instanceId),
    getIndices: (instanceId: string) => ipcRenderer.invoke('es:get-indices', instanceId),
    getMapping: (instanceId: string, index: string) => ipcRenderer.invoke('es:get-mapping', instanceId, index),
    executeQuery: (instanceId: string, method: string, path: string, body?: unknown) =>
      ipcRenderer.invoke('es:execute-query', instanceId, method, path, body),
  } as ESAPI,
})

declare global {
  interface Window {
    api: {
      getAppVersion: () => Promise<string>
      openExternal: (url: string) => Promise<void>
      updater: UpdaterAPI
      ai: AIAPI
      storage: StorageAPI
      es: ESAPI
    }
  }
}
