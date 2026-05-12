import { join } from 'path'
import { app } from 'electron'
import Store from 'electron-store'
import { CryptoService } from './CryptoService'

export interface ESInstance {
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
  }
  aiConfig: AIConfig
}

export interface LogConfig {
  enabled: boolean
  level: 'debug' | 'info' | 'warn' | 'error'
  directory: string
  maxFileSize: number
  maxFiles: number
}

export interface AppConfig {
  instances: ESInstance[]
  settings: Settings
  logging: LogConfig
}

const defaultSettings: Settings = {
  theme: 'dark',
  fontSize: 14,
  autoConnect: false,
  defaultLanguage: 'zh-CN',
  developerMode: false,
  autoUpdate: {
    enabled: true,
    autoDownload: false,
    autoInstall: true,
  },
  aiConfig: {
    provider: 'openai',
    model: 'gpt-4o',
    providers: {
      openai: { apiKey: '' },
      anthropic: { apiKey: '' },
      gemini: { apiKey: '' },
      deepseek: { apiKey: '' },
    }
  }
}

export class StorageService {
  private static instance: StorageService
  private store: Store<AppConfig>

  private constructor() {
    const userHome = app.getPath('home')
    const dataDir = join(userHome, '.es-cube')
    this.store = new Store<AppConfig>({
      name: 'config',
      cwd: dataDir,
      defaults: {
        instances: [],
        settings: defaultSettings,
        logging: {
          enabled: true,
          level: 'info',
          directory: './logs',
          maxFileSize: 10485760,
          maxFiles: 5,
        },
      },
      fileExtension: 'json',
    })

    // Migration: Ensure existing settings have all default keys and clean up old ones
    const currentSettings = this.store.get('settings')
    if (currentSettings) {
      let needsUpdate = false
      const newSettings = { ...currentSettings } as any
      
      if (!currentSettings.aiConfig) {
        newSettings.aiConfig = defaultSettings.aiConfig
        needsUpdate = true
      }
      
      if ('ai' in currentSettings) {
        delete newSettings.ai
        needsUpdate = true
      }
      
      if (needsUpdate) {
        this.store.set('settings', newSettings)
      }
    }
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService()
    }
    return StorageService.instance
  }

  public async init(): Promise<void> {
    // electron-store initializes synchronously
  }

  public async getInstances(): Promise<ESInstance[]> {
    const instances = this.store.get('instances')
    return instances.map((instance: ESInstance) => ({
      ...instance,
      password: instance.password ? '******' : undefined,
      apiKey: instance.apiKey ? '******' : undefined,
    }))
  }

  public async getInstanceById(id: string): Promise<ESInstance | undefined> {
    const instances = this.store.get('instances')
    const instance = instances.find((i: ESInstance) => i.id === id)
    if (instance) {
      return {
        ...instance,
        password: instance.password ? '******' : undefined,
        apiKey: instance.apiKey ? '******' : undefined,
      }
    }
    return undefined
  }

  public async getInstanceWithCredentials(id: string): Promise<ESInstance | undefined> {
    const instances = this.store.get('instances')
    const instance = instances.find((i: ESInstance) => i.id === id)
    if (instance) {
      return {
        ...instance,
        password: instance.password ? CryptoService.decryptString(instance.password) : undefined,
        apiKey: instance.apiKey ? CryptoService.decryptString(instance.apiKey) : undefined,
      }
    }
    return undefined
  }

  public async addInstance(instance: Omit<ESInstance, 'createdAt' | 'updatedAt'>): Promise<ESInstance> {
    const now = Date.now()
    const newInstance: ESInstance = {
      ...instance,
      password: instance.password ? CryptoService.encryptString(instance.password) : undefined,
      apiKey: instance.apiKey ? CryptoService.encryptString(instance.apiKey) : undefined,
      createdAt: now,
      updatedAt: now,
    }
    const instances = this.store.get('instances')
    instances.push(newInstance)
    this.store.set('instances', instances)
    return {
      ...newInstance,
      password: newInstance.password ? '******' : undefined,
      apiKey: newInstance.apiKey ? '******' : undefined,
    }
  }

  public async updateInstance(id: string, updates: Partial<Omit<ESInstance, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ESInstance | undefined> {
    const instances = this.store.get('instances')
    const index = instances.findIndex((i: ESInstance) => i.id === id)
    if (index === -1) return undefined

    const instance = instances[index]
    const updatedInstance: ESInstance = {
      ...instance,
      ...updates,
      password: updates.password 
        ? CryptoService.encryptString(updates.password) 
        : instance.password,
      apiKey: updates.apiKey 
        ? CryptoService.encryptString(updates.apiKey) 
        : instance.apiKey,
      updatedAt: Date.now(),
    }
    instances[index] = updatedInstance
    this.store.set('instances', instances)
    return {
      ...updatedInstance,
      password: updatedInstance.password ? '******' : undefined,
      apiKey: updatedInstance.apiKey ? '******' : undefined,
    }
  }

  public async deleteInstance(id: string): Promise<boolean> {
    const instances = this.store.get('instances')
    const initialLength = instances.length
    const filtered = instances.filter((i: ESInstance) => i.id !== id)
    this.store.set('instances', filtered)
    return filtered.length < initialLength
  }

  public async getSettings(): Promise<Settings> {
    const settings = this.store.get('settings')
    if (settings.aiConfig?.providers) {
      // Create a copy and decrypt keys for the renderer
      const decryptedSettings = JSON.parse(JSON.stringify(settings))
      Object.keys(decryptedSettings.aiConfig.providers).forEach(key => {
        const provider = decryptedSettings.aiConfig.providers[key]
        if (provider.apiKey && provider.apiKey.startsWith('ENCRYPTED:')) {
          provider.apiKey = CryptoService.decryptString(provider.apiKey)
        }
      })
      return decryptedSettings
    }
    return settings
  }

  public async getAIConfigWithCredentials(): Promise<AIConfig | undefined> {
    const settings = this.store.get('settings')
    if (!settings.aiConfig) return undefined
    
    const config = JSON.parse(JSON.stringify(settings.aiConfig))
    Object.keys(config.providers).forEach(key => {
      if (config.providers[key].apiKey) {
        config.providers[key].apiKey = CryptoService.decryptString(config.providers[key].apiKey)
      }
    })
    return config
  }

  public async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    const current = this.store.get('settings')
    
    // Deep merge for nested objects
    const updated: Settings = {
      ...current,
      ...settings,
      autoUpdate: settings.autoUpdate 
        ? { ...current.autoUpdate, ...settings.autoUpdate }
        : current.autoUpdate,
      aiConfig: settings.aiConfig
        ? { ...current.aiConfig, ...settings.aiConfig }
        : current.aiConfig,
    }

    // Encrypt AI API keys if they are present in the update
    if (settings.aiConfig?.providers) {
      Object.keys(settings.aiConfig.providers).forEach(key => {
        const provider = settings.aiConfig!.providers![key as AIProvider]
        if (provider?.apiKey && provider.apiKey !== '******' && !provider.apiKey.startsWith('ENCRYPTED:')) {
          updated.aiConfig.providers[key as AIProvider].apiKey = CryptoService.encryptString(provider.apiKey)
        }
      })
    }

    this.store.set('settings', updated)
    return updated
  }

  public async getLoggingConfig(): Promise<LogConfig> {
    const userHome = app.getPath('home')
    const dataDir = join(userHome, '.es-cube')
    const config = this.store.get('logging')
    return {
      ...config,
      directory: join(dataDir, 'logs'),
    }
  }

  public async updateLoggingConfig(config: Partial<LogConfig>): Promise<LogConfig> {
    const current = this.store.get('logging')
    const updated = { ...current, ...config }
    this.store.set('logging', updated)
    return updated
  }
}