import { join } from 'path'
import * as fs from 'fs'
import { StorageService, LogConfig } from './StorageService'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export class LogService {
  private static instance: LogService
  private config: LogConfig
  private currentFile: string
  private fileHandle: fs.promises.FileHandle | null = null
  private fileSize: number = 0

  private constructor() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '.'
    this.config = {
      enabled: true,
      level: 'info',
      directory: join(homeDir, '.es-cube', 'logs'),
      maxFileSize: 10485760,
      maxFiles: 5,
    }
    this.currentFile = this.generateFileName()
    this.ensureLogDirectory()
  }

  public static getInstance(): LogService {
    if (!LogService.instance) {
      LogService.instance = new LogService()
    }
    return LogService.instance
  }

  public async loadConfigFromStorage(): Promise<void> {
    const storageService = StorageService.getInstance()
    this.config = await storageService.getLoggingConfig()
    
    if (this.fileHandle) {
      await this.fileHandle.close()
      this.fileHandle = null
    }
    
    this.currentFile = this.generateFileName()
    this.ensureLogDirectory()
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.config.directory)) {
      fs.mkdirSync(this.config.directory, { recursive: true })
    }
  }

  private generateFileName(): string {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    return join(this.config.directory, `app-${dateStr}.log`)
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.config.level)
  }

  private async rotateFile(): Promise<void> {
    if (this.fileHandle) {
      await this.fileHandle.close()
      this.fileHandle = null
    }

    const files = fs.readdirSync(this.config.directory)
      .filter(f => f.startsWith('app-') && f.endsWith('.log'))
      .sort((a, b) => b.localeCompare(a))

    for (let i = this.config.maxFiles - 1; i < files.length; i++) {
      fs.unlinkSync(join(this.config.directory, files[i]))
    }

    this.currentFile = this.generateFileName()
    this.fileSize = 0
  }

  private openingPromise: Promise<fs.promises.FileHandle> | null = null

  private async getFileHandle(): Promise<fs.promises.FileHandle> {
    if (this.fileHandle) return this.fileHandle
    if (this.openingPromise) return this.openingPromise

    this.openingPromise = (async () => {
      try {
        const handle = await fs.promises.open(this.currentFile, 'a')
        this.fileHandle = handle
        return handle
      } finally {
        this.openingPromise = null
      }
    })()

    return this.openingPromise
  }

  private async writeLog(level: LogLevel, message: string, context?: Record<string, unknown>): Promise<void> {
    if (!this.shouldLog(level)) return

    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    const logLine = `${timestamp} [${level.toUpperCase()}] ${message}${contextStr}\n`

    const handle = await this.getFileHandle()
    await handle.write(logLine)
    this.fileSize += logLine.length

    console.log(logLine.trim())

    if (this.fileSize >= this.config.maxFileSize) {
      await this.rotateFile()
    }
  }

  public debug(message: string, context?: Record<string, unknown>): Promise<void> {
    return this.writeLog('debug', message, context)
  }

  public info(message: string, context?: Record<string, unknown>): Promise<void> {
    return this.writeLog('info', message, context)
  }

  public warn(message: string, context?: Record<string, unknown>): Promise<void> {
    return this.writeLog('warn', message, context)
  }

  public error(message: string, error?: Error, context?: Record<string, unknown>): Promise<void> {
    const fullContext = {
      ...context,
      stack: error?.stack,
      errorMessage: error?.message,
    }
    return this.writeLog('error', message, fullContext)
  }

  public setConfig(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config }
    this.ensureLogDirectory()
  }

  public getConfig(): LogConfig {
    return { ...this.config }
  }

  public async close(): Promise<void> {
    if (this.fileHandle) {
      await this.fileHandle.close()
      this.fileHandle = null
    }
  }
}