import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import { StorageService } from './StorageService'

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

export interface ESIndexMapping {
  [key: string]: {
    mappings?: {
      properties?: Record<string, unknown>
    }
  }
}

export class ESConnectionManager {
  private static instance: ESConnectionManager
  private axiosInstances: Map<string, AxiosInstance> = new Map()

  private constructor() {}

  public static getInstance(): ESConnectionManager {
    if (!ESConnectionManager.instance) {
      ESConnectionManager.instance = new ESConnectionManager()
    }
    return ESConnectionManager.instance
  }

  public async detectVersion(instanceId: string): Promise<ESVersionInfo | null> {
    const storageService = StorageService.getInstance()
    const instance = await storageService.getInstanceWithCredentials(instanceId)

    if (!instance) {
      return null
    }

    try {
      const auth = this.buildAuth(instance)
      const response = await axios.get(instance.url, {
        ...auth,
        headers: {
          ...(auth.headers || {}),
        },
        timeout: 10000,
      })

      const versionStr = response.data?.version?.number
      if (!versionStr) {
        return null
      }

      const version = this.parseVersion(versionStr)
      await storageService.updateInstance(instanceId, {
        version: versionStr,
        majorVersion: version.major,
      })

      return version
    } catch {
      return null
    }
  }

  public async checkHealth(instanceId: string): Promise<ESHealthResponse | null> {
    const storageService = StorageService.getInstance()
    const instance = await storageService.getInstanceWithCredentials(instanceId)

    if (!instance) {
      return null
    }

    try {
      const axiosInstance = this.getAxiosInstance(instance)
      const response = await axiosInstance.get('/_cluster/health')
      return response.data
    } catch {
      return null
    }
  }

  public async getIndices(instanceId: string): Promise<string[] | null> {
    const storageService = StorageService.getInstance()
    const instance = await storageService.getInstanceWithCredentials(instanceId)

    if (!instance) {
      return null
    }

    try {
      const axiosInstance = this.getAxiosInstance(instance)
      const response = await axiosInstance.get('/_cat/indices?v')
      const lines = response.data.split('\n').filter((line: string) => line.trim() && !line.startsWith('health'))
      return lines.map((line: string) => line.split(/\s+/)[2]).filter(Boolean)
    } catch {
      return null
    }
  }

  public async getMapping(instanceId: string, index: string): Promise<ESIndexMapping | null> {
    const storageService = StorageService.getInstance()
    const instance = await storageService.getInstanceWithCredentials(instanceId)

    if (!instance) {
      return null
    }

    try {
      const axiosInstance = this.getAxiosInstance(instance)
      const response = await axiosInstance.get(`/${index}/_mapping`)
      return response.data
    } catch {
      return null
    }
  }

  public async executeQuery(instanceId: string, method: string, path: string, body?: unknown): Promise<AxiosResponse> {
    const storageService = StorageService.getInstance()
    const instance = await storageService.getInstanceWithCredentials(instanceId)

    if (!instance) {
      throw new Error('Instance not found')
    }

    const axiosInstance = this.getAxiosInstance(instance)
    const adjustedPath = this.adjustPathForVersion(path, instance.majorVersion)

    switch (method.toLowerCase()) {
      case 'get':
        return axiosInstance.get(adjustedPath, { params: body as Record<string, string> })
      case 'post':
        return axiosInstance.post(adjustedPath, body)
      case 'put':
        return axiosInstance.put(adjustedPath, body)
      case 'delete':
        return axiosInstance.delete(adjustedPath)
      default:
        throw new Error(`Unsupported method: ${method}`)
    }
  }

  private getAxiosInstance(instance: ESInstance): AxiosInstance {
    const cacheKey = instance.id
    if (this.axiosInstances.has(cacheKey)) {
      return this.axiosInstances.get(cacheKey)!
    }

    const auth = this.buildAuth(instance)
    const axiosInstance = axios.create({
      baseURL: instance.url,
      ...auth,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(auth.headers || {}),
      },
    })

    axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.warn('Authentication failed for instance:', instance.url)
        }
        return Promise.reject(error)
      }
    )

    this.axiosInstances.set(cacheKey, axiosInstance)
    return axiosInstance
  }

  private buildAuth(instance: ESInstance) {
    const headers: Record<string, string> = {}

    if (instance.authType === 'apiKey' && instance.apiKey) {
      headers['Authorization'] = `ApiKey ${instance.apiKey}`
      return { headers }
    }

    if (instance.authType === 'bearer' && instance.apiKey) {
      headers['Authorization'] = `Bearer ${instance.apiKey}`
      return { headers }
    }

    if (instance.authType === 'basic' && instance.username && instance.password) {
      return {
        auth: {
          username: instance.username,
          password: instance.password,
        }
      }
    }

    // Fallback for backward compatibility
    if (instance.apiKey && !instance.authType) {
      return {
        auth: {
          username: instance.apiKey,
          password: '',
        }
      }
    }

    if (instance.username && instance.password && !instance.authType) {
      return {
        auth: {
          username: instance.username,
          password: instance.password,
        }
      }
    }

    return {}
  }

  private parseVersion(versionStr: string): ESVersionInfo {
    const parts = versionStr.split('.').map(Number)
    return {
      number: versionStr,
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0,
    }
  }

  private adjustPathForVersion(path: string, majorVersion?: number): string {
    if (!majorVersion || majorVersion >= 8) {
      return path
    }

    const docPattern = /^\/([^/]+)\/_doc\/([^/]+)$/
    const match = path.match(docPattern)
    if (match) {
      return `/${match[1]}/${match[2]}`
    }

    const indexPattern = /^\/([^/]+)\/_doc$/
    const indexMatch = path.match(indexPattern)
    if (indexMatch) {
      return `/${indexMatch[1]}`
    }

    return path
  }

  public clearCache(instanceId: string): void {
    const storageService = StorageService.getInstance()
    storageService.getInstanceWithCredentials(instanceId).then((instance) => {
      if (instance) {
        this.axiosInstances.delete(instance.id)
      }
    })
  }
}
