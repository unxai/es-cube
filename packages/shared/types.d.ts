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

export interface Settings {
  theme: 'dark' | 'light' | 'system'
  fontSize: number
  autoConnect: boolean
  lastConnectedId?: string
  developerMode: boolean
  autoUpdate: {
    enabled: boolean
    autoDownload: boolean
    autoInstall: boolean
  }
}

export interface Database {
  instances: ESInstance[]
  settings: Settings
}
