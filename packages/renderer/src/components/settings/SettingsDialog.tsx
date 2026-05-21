import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Settings, BrainCircuit, Globe, Palette, FileText, ArrowDown, Check, Loader2 } from 'lucide-react'
import { useAppStore, type AIProvider } from '../../store/useAppStore'
import { toast } from 'sonner'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme, locale, setLocale, availableLocales, aiConfig, setAIConfig, logConfig, setLogConfig, t } = useAppStore()
  
  // Local state for which provider we are configuring
  const [configProvider, setConfigProvider] = useState<AIProvider>(aiConfig.provider)
  
  // Local state for API key so we don't update store on every keystroke
  const [apiKey, setApiKey] = useState(aiConfig.providers[configProvider]?.apiKey || '')
  const [baseUrl, setBaseUrl] = useState(aiConfig.providers[configProvider]?.baseUrl || '')

  // Local state for log config
  const [logEnabled, setLogEnabled] = useState(logConfig.enabled)
  const [logLevel, setLogLevel] = useState(logConfig.level)
  const [logMaxFileSize, setLogMaxFileSize] = useState(logConfig.maxFileSize.toString())
  const [logMaxFiles, setLogMaxFiles] = useState(logConfig.maxFiles.toString())

  // Sync local state when dialog opens or config provider changes
  useEffect(() => {
    if (open) {
      setApiKey(aiConfig.providers[configProvider]?.apiKey || '')
      setBaseUrl(aiConfig.providers[configProvider]?.baseUrl || '')
      setLogEnabled(logConfig.enabled)
      setLogLevel(logConfig.level)
      setLogMaxFileSize(logConfig.maxFileSize.toString())
      setLogMaxFiles(logConfig.maxFiles.toString())
    }
  }, [open, configProvider, aiConfig.providers, logConfig])

  const handleSaveAIConfig = () => {
    setAIConfig({
      providers: {
        ...aiConfig.providers,
        [configProvider]: { apiKey, baseUrl }
      }
    })
    onOpenChange(false)
  }

  const handleConfigProviderChange = (provider: AIProvider) => {
    // Save current before switching implicitly? No, just let them switch and they have to hit Save. 
    // Actually, safer to update the temp state or just save immediately. 
    // Let's just switch and lose unsaved changes, or save to global immediately?
    // It's a standard practice to update temporary state when switching tabs if we want to preserve.
    // Let's keep it simple: change configProvider, load its keys.
    setConfigProvider(provider)
  }

  const [activeTab, setActiveTab] = useState<'ai' | 'general' | 'logging'>('ai')

  // Update checker state
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'>('idle')
  const [updateInfo, setUpdateInfo] = useState<{ version: string; releaseNotes?: string } | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [appVersion, setAppVersion] = useState('')
  const [autoUpdateConfig, setAutoUpdateConfig] = useState({
    enabled: true,
    autoDownload: false,
    autoInstall: true,
  })

  const getDefaultBaseUrl = (provider: AIProvider) => {
    switch (provider) {
      case 'anthropic': return 'https://api.anthropic.com/v1'
      case 'gemini': return 'https://generativelanguage.googleapis.com/v1beta'
      case 'deepseek': return 'https://api.deepseek.com/v1'
      case 'openai':
      default:
        return 'https://api.openai.com/v1'
    }
  }

  const checkForUpdates = async () => {
    setUpdateStatus('checking')
    try {
      const result = await window.api.updater.check()
      if (result) {
        setUpdateInfo({ version: result.version, releaseNotes: result.releaseNotes })
        setUpdateStatus('available')
        toast.success(`${t('settings.updateAvailable')}: v${result.version}`)
      } else {
        setUpdateStatus('idle')
        toast.info(t('settings.noUpdateAvailable') || '当前已是最新版本')
      }
    } catch (error: any) {
      setUpdateStatus('error')
      toast.error(`${t('settings.updateError')}: ${error?.message || '未知错误'}`)
    }
  }

  const downloadUpdate = async () => {
    setUpdateStatus('downloading')
    setDownloadProgress(0)
    try {
      await window.api.updater.download()
    } catch (error) {
      setUpdateStatus('error')
    }
  }

  const installUpdate = () => {
    window.api.updater.install()
  }

  const handleAutoUpdateSetting = async (key: 'enabled' | 'autoDownload' | 'autoInstall', value: boolean) => {
    const newConfig = { ...autoUpdateConfig, [key]: value }
    setAutoUpdateConfig(newConfig)
    await window.api.storage.updateSettings({ autoUpdate: newConfig })
  }

  useEffect(() => {
    const loadAppVersion = async () => {
      const version = await window.api.getAppVersion()
      setAppVersion(version)
    }
    
    const loadAutoUpdateConfig = async () => {
      const settings = await window.api.storage.getSettings()
      if (settings.autoUpdate) {
        setAutoUpdateConfig(settings.autoUpdate)
      }
    }
    
    loadAppVersion()
    loadAutoUpdateConfig()

    const handleUpdateDownloadProgress = (event: Event, progress: { percent: number }) => {
      setDownloadProgress(Math.round(progress.percent))
    }

    const handleUpdateDownloaded = () => {
      setUpdateStatus('downloaded')
    }

    const handleUpdateNotAvailable = () => {
      setUpdateStatus('idle')
    }

    window.addEventListener('update-download-progress', handleUpdateDownloadProgress)
    window.addEventListener('update-downloaded', handleUpdateDownloaded)
    window.addEventListener('update-not-available', handleUpdateNotAvailable)

    return () => {
      window.removeEventListener('update-download-progress', handleUpdateDownloadProgress)
      window.removeEventListener('update-downloaded', handleUpdateDownloaded)
      window.removeEventListener('update-not-available', handleUpdateNotAvailable)
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-border shadow-2xl" aria-describedby={undefined}>
        <div className="flex h-[520px]">
          {/* Sidebar Navigation */}
          <div className="w-[180px] bg-muted/30 border-r flex flex-col p-3 pt-6 gap-1">
            <div className="flex items-center gap-2 px-3 mb-8">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Settings className="w-4.5 h-4.5 text-primary" />
              </div>
              <DialogTitle className="font-bold text-base tracking-tight">{t('app.settings')}</DialogTitle>
            </div>

            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                activeTab === 'ai' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              <BrainCircuit className={`w-4 h-4 ${activeTab === 'ai' ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'}`} />
              {t('settings.aiConfig')}
            </button>

            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                activeTab === 'general' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              <Palette className={`w-4 h-4 ${activeTab === 'general' ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'}`} />
              {t('settings.general')}
            </button>

            <button
              onClick={() => setActiveTab('logging')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                activeTab === 'logging' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              <FileText className={`w-4 h-4 ${activeTab === 'logging' ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'}`} />
              {t('settings.logging')}
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-background/50">
            <div className="px-8 py-6 border-b bg-card/30 flex items-center justify-between">
              <h3 className="font-semibold text-lg text-foreground">
                {activeTab === 'ai' ? t('settings.aiConfig') : t('settings.general')}
              </h3>
              <button 
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {/* Standard close button is already provided by DialogContent, but we can add more header actions if needed */}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-6">
              {activeTab === 'ai' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('settings.selectProvider')}</Label>
                      <div className="flex flex-wrap gap-2.5">
                        {(['openai', 'anthropic', 'gemini', 'deepseek'] as AIProvider[]).map((p) => (
                          <Button
                            key={p}
                            variant={configProvider === p ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleConfigProviderChange(p)}
                            className={`capitalize h-9 px-4 ${configProvider === p ? 'shadow-sm' : 'bg-background hover:bg-muted/50'}`}
                          >
                            {p}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="apiKey" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        {configProvider.charAt(0).toUpperCase() + configProvider.slice(1)} {t('settings.apiKey')}
                      </Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder={`${configProvider} ${t('settings.apiKey')}`}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="bg-background/50 focus-visible:ring-primary/20 h-11 text-muted-foreground/70 placeholder:text-muted-foreground/50 focus:text-foreground"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="baseUrl" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('settings.customUrl')}</Label>
                      <Input
                        id="baseUrl"
                        type="url"
                        placeholder={getDefaultBaseUrl(configProvider)}
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        className="bg-background/50 focus-visible:ring-primary/20 h-11 text-muted-foreground/70 placeholder:text-muted-foreground/50 focus:text-foreground"
                      />
                      <p className="text-[11px] text-muted-foreground/80 pl-1">{t('settings.urlHint')}</p>
                    </div>
                  </div>

                  <div className="pt-6 border-t flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-10 px-6">{t('common.cancel')}</Button>
                    <Button onClick={handleSaveAIConfig} className="h-10 px-8 shadow-lg shadow-primary/20">{t('common.saveChanges')}</Button>
                  </div>
                </div>
              )}

              {activeTab === 'logging' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('settings.loggingEnabled')}</Label>
                        <p className="text-xs text-muted-foreground/70">{t('settings.loggingEnabledDesc')}</p>
                      </div>
                      <Button
                        variant={logEnabled ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLogEnabled(!logEnabled)}
                        className={`h-9 px-4 ${logEnabled ? 'shadow-sm' : 'bg-background hover:bg-muted/50'}`}
                      >
                        {logEnabled ? t('common.yes') : t('common.no')}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('settings.logLevel')}</Label>
                      <div className="grid grid-cols-4 gap-2.5">
                        {(['debug', 'info', 'warn', 'error'] as const).map((level) => (
                          <Button
                            key={level}
                            variant={logLevel === level ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setLogLevel(level)}
                            disabled={!logEnabled}
                            className={`capitalize h-9 px-4 ${logLevel === level ? 'shadow-sm' : 'bg-background hover:bg-muted/50'} ${!logEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {level}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('settings.maxFileSize')}</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={logMaxFileSize}
                          onChange={(e) => setLogMaxFileSize(e.target.value)}
                          disabled={!logEnabled}
                          className="bg-background/50 focus-visible:ring-primary/20 h-11 text-muted-foreground/70 placeholder:text-muted-foreground/50 focus:text-foreground w-32"
                        />
                        <p className="text-[11px] text-muted-foreground/80 pl-1">{t('settings.maxFileSizeDesc')}</p>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('settings.maxFiles')}</Label>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          value={logMaxFiles}
                          onChange={(e) => setLogMaxFiles(e.target.value)}
                          disabled={!logEnabled}
                          className="bg-background/50 focus-visible:ring-primary/20 h-11 text-muted-foreground/70 placeholder:text-muted-foreground/50 focus:text-foreground w-32"
                        />
                        <p className="text-[11px] text-muted-foreground/80 pl-1">{t('settings.maxFilesDesc')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-10 px-6">{t('common.cancel')}</Button>
                    <Button 
                      onClick={() => {
                        setLogConfig({
                          enabled: logEnabled,
                          level: logLevel,
                          maxFileSize: parseInt(logMaxFileSize) || 10,
                          maxFiles: parseInt(logMaxFiles) || 5,
                        })
                        onOpenChange(false)
                      }} 
                      className="h-10 px-8 shadow-lg shadow-primary/20"
                    >
                      {t('common.saveChanges')}
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'general' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('settings.theme')}</Label>
                      <div className="grid grid-cols-3 gap-2.5">
                        <Button
                          variant={theme === 'light' ? 'secondary' : 'outline'}
                          onClick={() => setTheme('light')}
                          className={`h-20 flex-col gap-2 ${theme === 'light' ? 'ring-2 ring-primary border-primary/20 bg-primary/5' : 'bg-background hover:bg-muted/50'}`}
                        >
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-orange-500" />
                          </div>
                          <span className="text-xs font-semibold">{t('settings.light')}</span>
                        </Button>
                        <Button
                          variant={theme === 'dark' ? 'secondary' : 'outline'}
                          onClick={() => setTheme('dark')}
                          className={`h-20 flex-col gap-2 ${theme === 'dark' ? 'ring-2 ring-primary border-primary/20 bg-primary/5' : 'bg-background hover:bg-muted/50'}`}
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-slate-400" />
                          </div>
                          <span className="text-xs font-semibold">{t('settings.dark')}</span>
                        </Button>
                        <Button
                          variant={theme === 'system' ? 'secondary' : 'outline'}
                          onClick={() => setTheme('system')}
                          className={`h-20 flex-col gap-2 ${theme === 'system' ? 'ring-2 ring-primary border-primary/20 bg-primary/5' : 'bg-background hover:bg-muted/50'}`}
                        >
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <Globe className="w-4 h-4 text-indigo-500" />
                          </div>
                          <span className="text-xs font-semibold">{t('settings.system')}</span>
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('settings.language')}</Label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {availableLocales.map((loc) => (
                          <Button
                            key={loc.code}
                            variant={locale === loc.code ? 'secondary' : 'outline'}
                            onClick={() => setLocale(loc.code)}
                            className={`h-11 justify-start gap-3 px-4 ${locale === loc.code ? 'ring-2 ring-primary border-primary/20 bg-primary/5' : 'bg-background hover:bg-muted/50'}`}
                          >
                            <span className="text-lg">{loc.flag}</span>
                            <span className="text-sm font-medium">{loc.name}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('settings.update')}</Label>
                      <div className="bg-muted/30 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ArrowDown className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{t('settings.updateCheck')}</p>
                              <p className="text-xs text-muted-foreground/70">{t('settings.currentVersion')}: {appVersion}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {updateStatus === 'checking' && (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-xs text-muted-foreground">{t('settings.checking')}</span>
                              </div>
                            )}
                            {updateStatus === 'available' && updateInfo && (
                              <div className="text-right">
                                <p className="text-sm font-medium text-primary">{t('settings.updateAvailable')}: {updateInfo.version}</p>
                                <Button size="sm" onClick={downloadUpdate} className="mt-1 h-7 px-3">
                                  <ArrowDown className="w-3 h-3 mr-1" />
                                  {t('common.download')}
                                </Button>
                              </div>
                            )}
                            {updateStatus === 'downloading' && (
                              <div className="flex flex-col items-end gap-1">
                                <div className="w-32 h-1.5 bg-background rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary transition-all duration-300" 
                                    style={{ width: `${downloadProgress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">{downloadProgress}%</span>
                              </div>
                            )}
                            {updateStatus === 'downloaded' && (
                              <Button size="sm" onClick={installUpdate} className="h-9 px-4">
                                <Check className="w-3 h-3 mr-1" />
                                {t('settings.installNow')}
                              </Button>
                            )}
                            {updateStatus === 'error' && (
                              <span className="text-xs text-red-500">{t('settings.updateError')}</span>
                            )}
                            {(updateStatus === 'idle') && (
                              <Button size="sm" variant="outline" onClick={checkForUpdates} className="h-9 px-4">
                                {t('settings.checkForUpdates')}
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-border/10 flex items-center justify-between text-[11px] text-muted-foreground/70">
                          <span>{t('settings.updateProblem') || '遇到更新问题？'}</span>
                          <button
                            onClick={async () => {
                              await window.api.openExternal('https://github.com/unxai/es-cube/releases')
                            }}
                            className="text-primary hover:underline flex items-center gap-1 font-medium transition-colors cursor-pointer"
                          >
                            {t('settings.manuallyDownload') || '手动前往 GitHub 下载'} →
                          </button>
                        </div>

                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{t('settings.autoUpdateEnabled')}</p>
                              <p className="text-xs text-muted-foreground/70">{t('settings.autoUpdateEnabledDesc')}</p>
                            </div>
                            <button
                              onClick={() => handleAutoUpdateSetting('enabled', !autoUpdateConfig.enabled)}
                              className={`w-11 h-6 rounded-full transition-colors ${autoUpdateConfig.enabled ? 'bg-primary' : 'bg-muted'}`}
                            >
                              <div
                                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${autoUpdateConfig.enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                              />
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{t('settings.autoDownload')}</p>
                              <p className="text-xs text-muted-foreground/70">{t('settings.autoDownloadDesc')}</p>
                            </div>
                            <button
                              onClick={() => handleAutoUpdateSetting('autoDownload', !autoUpdateConfig.autoDownload)}
                              disabled={!autoUpdateConfig.enabled}
                              className={`w-11 h-6 rounded-full transition-colors ${autoUpdateConfig.autoDownload && autoUpdateConfig.enabled ? 'bg-primary' : 'bg-muted'} ${!autoUpdateConfig.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <div
                                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${autoUpdateConfig.autoDownload && autoUpdateConfig.enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                              />
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{t('settings.autoInstall')}</p>
                              <p className="text-xs text-muted-foreground/70">{t('settings.autoInstallDesc')}</p>
                            </div>
                            <button
                              onClick={() => handleAutoUpdateSetting('autoInstall', !autoUpdateConfig.autoInstall)}
                              disabled={!autoUpdateConfig.enabled}
                              className={`w-11 h-6 rounded-full transition-colors ${autoUpdateConfig.autoInstall && autoUpdateConfig.enabled ? 'bg-primary' : 'bg-muted'} ${!autoUpdateConfig.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <div
                                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${autoUpdateConfig.autoInstall && autoUpdateConfig.enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
