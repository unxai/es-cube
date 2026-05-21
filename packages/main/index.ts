import { app, BrowserWindow, ipcMain, Menu, MenuItem, nativeImage, type MenuItemConstructorOptions } from 'electron'
app.name = 'EsCube'
import path from 'path'
import fs from 'fs'
import { StorageService } from './services/StorageService'
import { ESConnectionManager } from './services/ESConnectionManager'
import { LogService } from './services/LogService'
import { autoUpdater } from 'electron-updater'
import { getMenuTranslations } from '@shared/menu'
import { AIService } from './services/AIService'
import crypto from 'crypto'

let mainWindow: BrowserWindow | null = null
let storageService: StorageService
let esConnectionManager: ESConnectionManager
let logService: LogService
let aiService: AIService
let developerMode = false
let autoUpdateSettings = {
  enabled: true,
  autoDownload: false,
  autoInstall: true,
}
let currentLocale = 'zh-CN'

function isVersionNewer(latest: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const [lMajor = 0, lMinor = 0, lPatch = 0] = parse(latest);
  const [cMajor = 0, cMinor = 0, cPatch = 0] = parse(current);
  if (lMajor !== cMajor) return lMajor > cMajor;
  if (lMinor !== cMinor) return lMinor > cMinor;
  return lPatch > cPatch;
}

const setupAutoUpdater = () => {
  autoUpdater.autoDownload = autoUpdateSettings.autoDownload
  autoUpdater.autoInstallOnAppQuit = autoUpdateSettings.autoInstall

  autoUpdater.on('checking-for-update', () => {
    logService.info('Checking for update...')
  })

  autoUpdater.on('update-available', (info) => {
    logService.info(`Update available: ${info.version}`)
    mainWindow?.webContents.send('update-available', info)

    if (autoUpdateSettings.autoDownload) {
      autoUpdater.downloadUpdate()
    }
  })

  autoUpdater.on('update-not-available', () => {
    logService.info('Update not available')
  })

  autoUpdater.on('error', (err) => {
    logService.error('Error in auto-updater', err)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow?.webContents.send('update-download-progress', progressObj)
  })

  autoUpdater.on('update-downloaded', (info) => {
    logService.info(`Update downloaded: ${info.version}`)
    mainWindow?.webContents.send('update-downloaded', info)
  })
}

const setupMenu = () => {
  const t = getMenuTranslations(currentLocale)

  const template: MenuItemConstructorOptions[] = [
    {
      label: t.appName,
      submenu: [
        {
          label: t.about,
          click: () => {
            app.setAboutPanelOptions({
              applicationName: t.appName,
              applicationVersion: app.getVersion(),
              copyright: 'Copyright © 2026 UNXAI Team',
            })
            app.showAboutPanel()
          },
        },
        { type: 'separator' },
        {
          label: t.checkForUpdates,
          click: async () => {
            try {
              const result = await autoUpdater.checkForUpdates()
              if (result && result.updateInfo) {
                const latestVersion = result.updateInfo.version
                const currentVersion = app.getVersion()
                if (isVersionNewer(latestVersion, currentVersion)) {
                  mainWindow?.webContents.send('update-available', result.updateInfo)
                  return
                }
              }
              mainWindow?.webContents.send('update-not-available')
            } catch (error) {
              mainWindow?.webContents.send('update-error', error)
            }
          },
        },
        { type: 'separator' },
        { label: t.services, role: 'services' },
        { type: 'separator' },
        { label: t.hideApp, role: 'hide' },
        { label: t.hideOthers, role: 'hideOthers' },
        { label: t.unhide, role: 'unhide' },
        { type: 'separator' },
        { label: t.quit, role: 'quit' },
      ],
    },
    {
      label: t.edit,
      submenu: [
        { label: t.undo, role: 'undo' },
        { label: t.redo, role: 'redo' },
        { type: 'separator' },
        { label: t.cut, role: 'cut' },
        { label: t.copy, role: 'copy' },
        { label: t.paste, role: 'paste' },
        { label: t.pasteAndMatchStyle, role: 'pasteAndMatchStyle' },
        { label: t.delete, role: 'delete' },
        { label: t.selectAll, role: 'selectAll' },
      ],
    },
    {
      label: t.view,
      submenu: [
        { label: t.reload, role: 'reload' },
        { label: t.forceReload, role: 'forceReload' },
        { type: 'separator' },
        { label: t.resetZoom, role: 'resetZoom' },
        { label: t.zoomIn, role: 'zoomIn' },
        { label: t.zoomOut, role: 'zoomOut' },
        { type: 'separator' },
        { label: t.toggleFullscreen, role: 'togglefullscreen' },
      ],
    },
    {
      label: t.window,
      submenu: [
        { label: t.minimize, role: 'minimize' },
        { label: t.zoom, role: 'zoom' },
        { type: 'separator' },
        { label: t.front, role: 'front' },
      ],
    },
    {
      label: t.help,
      submenu: [
        {
          label: t.learnMore,
          click: async () => {
            const { shell } = await import('electron')
            await shell.openExternal('https://github.com/unxai/es-cube')
          },
        },
        { type: 'separator' },
        {
          label: t.developerMode,
          type: 'checkbox',
          checked: developerMode,
          click: async (menuItem: MenuItem) => {
            developerMode = menuItem.checked
            await storageService.updateSettings({ developerMode })
            mainWindow?.webContents.send('developer-mode-changed', developerMode)

            if (developerMode) {
              mainWindow?.webContents.openDevTools()
            } else {
              mainWindow?.webContents.closeDevTools()
            }
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

const setupIpcHandlers = () => {
  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('storage:get-instances', async () => {
    return storageService.getInstances()
  })

  ipcMain.handle('storage:get-instance', async (_, id: string) => {
    return storageService.getInstanceById(id)
  })

  ipcMain.handle('storage:add-instance', async (_, instance) => {
    const newInstance = await storageService.addInstance(instance)
    await esConnectionManager.detectVersion(newInstance.id)
    return storageService.getInstanceById(newInstance.id)
  })

  ipcMain.handle('storage:update-instance', async (_, id: string, updates) => {
    const updated = await storageService.updateInstance(id, updates)
    esConnectionManager.clearCache(id)
    if (updated && (updates.url || updates.username || updates.password || updates.apiKey)) {
      await esConnectionManager.detectVersion(id)
      return storageService.getInstanceById(id)
    }
    return updated
  })

  ipcMain.handle('storage:delete-instance', async (_, id: string) => {
    esConnectionManager.clearCache(id)
    return storageService.deleteInstance(id)
  })

  ipcMain.handle('storage:get-settings', async () => {
    return storageService.getSettings()
  })

  ipcMain.handle('storage:update-settings', async (_, settings) => {
    const updated = await storageService.updateSettings(settings)
    if ('developerMode' in settings) {
      developerMode = settings.developerMode
      mainWindow?.webContents.send('developer-mode-changed', developerMode)
    }
    if ('autoUpdate' in settings) {
      autoUpdateSettings = { ...autoUpdateSettings, ...settings.autoUpdate }
      autoUpdater.autoDownload = autoUpdateSettings.autoDownload
      autoUpdater.autoInstallOnAppQuit = autoUpdateSettings.autoInstall
    }
    if ('defaultLanguage' in settings && settings.defaultLanguage !== currentLocale) {
      currentLocale = settings.defaultLanguage
      setupMenu()
    }
    return updated
  })

  ipcMain.handle('get-developer-mode', () => {
    return developerMode
  })

  ipcMain.handle('ai:generate-dsl', async (_, request) => {
    return aiService.generateDSL(request)
  })



  ipcMain.handle('es:detect-version', async (_, instanceId: string) => {
    return esConnectionManager.detectVersion(instanceId)
  })

  ipcMain.handle('es:check-health', async (_, instanceId: string) => {
    return esConnectionManager.checkHealth(instanceId)
  })

  ipcMain.handle('es:get-indices', async (_, instanceId: string) => {
    return esConnectionManager.getIndices(instanceId)
  })

  ipcMain.handle('es:get-mapping', async (_, instanceId: string, index: string) => {
    return esConnectionManager.getMapping(instanceId, index)
  })

  ipcMain.handle('es:execute-query', async (_, instanceId: string, method: string, path: string, body?: unknown) => {
    try {
      logService.info(`Executing query: ${method} ${path}`, { instanceId })
      const response = await esConnectionManager.executeQuery(instanceId, method, path, body)
      logService.debug(`Query successful: ${method} ${path}`, { status: response.status })
      return {
        success: true,
        data: response.data,
        status: response.status,
        headers: response.headers,
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      logService.error(`Query failed: ${method} ${path}`, error as Error, { instanceId })
      return {
        success: false,
        error: errorMsg,
      }
    }
  })

  ipcMain.handle('updater:check', async () => {
    try {
      logService.info('Checking for updates via updater:check IPC...')
      const result = await autoUpdater.checkForUpdates()
      logService.info('Update check result obtained', { 
        hasResult: !!result,
        hasUpdateInfo: !!result?.updateInfo,
        version: result?.updateInfo?.version 
      })
      if (!result || !result.updateInfo) {
        return null
      }
      const latestVersion = result.updateInfo.version
      const currentVersion = app.getVersion()
      logService.info('Comparing versions', { latestVersion, currentVersion })
      if (isVersionNewer(latestVersion, currentVersion)) {
        logService.info('New version is available', { latestVersion })
        return result.updateInfo
      }
      logService.info('No newer version than current')
      return null
    } catch (error) {
      logService.error('Error checking for updates', error as Error)
      throw error
    }
  })

  ipcMain.handle('open-external', async (_, url: string) => {
    const { shell } = await import('electron')
    await shell.openExternal(url)
  })

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return true
    } catch (error) {
      console.error('Failed to download update:', error)
      return false
    }
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall()
  })

  ipcMain.handle('updater:validate', async (_, filePath: string, signature: string) => {
    try {
      const settings = await storageService.getSettings()
      if (!settings.autoUpdate?.verifyRelease || !settings.autoUpdate?.publicKey) {
        return true // Skip validation if disabled or no key
      }

      const fileBuffer = fs.readFileSync(filePath)
      const verifier = crypto.createVerify('SHA256')
      verifier.update(fileBuffer)
      return verifier.verify(settings.autoUpdate.publicKey, signature, 'base64')
    } catch (error) {
      logService.error('Update validation failed', error as Error)
      return false
    }
  })
}

const createWindow = () => {
  const isMac = process.platform === 'darwin'
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#18181a',
    ...(isMac ? {
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 18, y: 20 },
    } : {}),
    icon: process.env.NODE_ENV === 'development'
      ? path.join(process.cwd(), 'resources/icon.png')
      : path.join(process.resourcesPath, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  app.setName('EsCube')

  logService = LogService.getInstance()

  storageService = StorageService.getInstance()
  esConnectionManager = ESConnectionManager.getInstance()
  aiService = AIService.getInstance()
  await storageService.init()

  await logService.loadConfigFromStorage()
  logService.info('EsCube application starting')
  logService.info('Storage service initialized')

  const settings = await storageService.getSettings()
  // In development, we always default to true unless explicitly handled
  developerMode = process.env.NODE_ENV === 'development' ? true : (settings.developerMode ?? false)
  currentLocale = settings.defaultLanguage || 'en-US'
  
  logService.info(`Environment: ${process.env.NODE_ENV}, Developer Mode: ${developerMode}`)

  setupIpcHandlers()
  setupAutoUpdater()
  setupMenu()
  
  // Set Dock icon for macOS
  if (process.platform === 'darwin') {
    const iconPath = process.env.NODE_ENV === 'development'
      ? path.join(process.cwd(), 'resources/icon.png')
      : path.join(process.resourcesPath, 'icon.png')
    if (fs.existsSync(iconPath)) {
      app.dock.setIcon(nativeImage.createFromPath(iconPath))
    }
  }

  createWindow()

  logService.info('Application window created')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('will-quit', async () => {
  if (logService) {
    await logService.close()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
