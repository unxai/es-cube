import { useEffect, useState } from 'react'
import { Database, BarChart3, Settings, Activity, Search, Server, Layers, PanelLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useConnectionStore } from '../../store/useConnectionStore'
import { useAppStore } from '../../store/useAppStore'
import { Button } from '../ui/button'
import { SettingsDialog } from '../settings/SettingsDialog'
import logoSrc from '../../assets/logo.svg'

type AppView = 'search' | 'rest' | 'nodes' | 'shards' | 'indices' | 'dashboard'

interface SidebarProps {
  onToolChange?: (view: AppView) => void;
  currentView?: AppView;
}

export function Sidebar({ 
  onToolChange, 
  currentView = 'search'
}: SidebarProps) {
  const { selectedInstanceId } = useConnectionStore()
  const { t, isSidebarCollapsed: isCollapsed, setSidebarCollapsed: setIsCollapsed } = useAppStore()
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const loadInstances = async () => {
      const loadedInstances = await window.api.storage.getInstances()
      useConnectionStore.setState({ instances: loadedInstances })
    }
    loadInstances()
  }, [])

  const handleViewChange = (view: AppView) => {
    if (!selectedInstanceId && view !== 'search') {
      toast.warning(t('app.selectInstance'))
      return
    }
    onToolChange?.(view)
  }

  const isViewActive = (view: AppView) => currentView === view

  const isMac = typeof window !== 'undefined' && navigator.userAgent.includes('Mac')
  const sidebarWidthClass = isCollapsed 
    ? (isMac ? 'w-20' : 'w-16') 
    : 'w-60';

  return (
    <div className={`flex flex-col bg-card border-r border-border/60 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarWidthClass} z-20 shadow-sm relative shrink-0`}>
      {/* 头部 Logo 区域 */}
      <div 
        className="border-b border-border/40 flex items-center h-[60px] bg-card/45 backdrop-blur-sm select-none px-3"
        style={{ WebkitAppRegion: isMac ? 'drag' : 'no-drag' } as any}
      >
        {!isCollapsed ? (
          <div className="flex items-center w-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
            {/* macOS 交通灯避让 */}
            <div className={isMac ? 'w-[72px] shrink-0' : 'w-0'} />
            
            {/* 顶栏控制按钮 (开关) */}
            <div className="flex items-center shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(true)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-all active:scale-90 animate-in fade-in duration-200"
                title={t('sidebar.collapse') || "Collapse sidebar"}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </div>

            {/* 精美竖线分隔 */}
            <div className="h-4 w-px bg-border/20 mx-2 shrink-0" />

            {/* Logo 和 AppName */}
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner overflow-hidden relative group shrink-0">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent" />
                <img src={logoSrc} alt="Logo" className="w-3.5 h-3.5 object-contain relative z-10 transition-transform group-hover:scale-105 duration-200" />
              </div>
              <span className="text-foreground font-black text-xs tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent truncate select-none">
                EsCube
              </span>
            </div>
          </div>
        ) : (
          /* 折叠状态 */
          <div className="w-full h-full flex items-center justify-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
            {isMac ? (
              /* macOS 折叠时只留交通灯的纯净空间 */
              <div className="w-full h-full" />
            ) : (
              /* 非 macOS 折叠时显示精美小 Logo */
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner overflow-hidden relative group animate-in fade-in duration-200">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent" />
                <img src={logoSrc} alt="Logo" className="w-4 h-4 object-contain relative z-10" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 导航菜单 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
        <div>
          {isCollapsed ? (
            <div className="h-4" />
          ) : (
            <div className="text-[9px] font-bold text-muted-foreground/75 uppercase tracking-widest mb-3 px-3">
              {t('sidebar.tools')}
            </div>
          )}
          <div className="space-y-1">
            {[
              { id: 'search', icon: Search, label: t('sidebar.search') },
              { id: 'dashboard', icon: BarChart3, label: t('sidebar.dashboard') },
              { id: 'rest', icon: Activity, label: t('sidebar.rest') },
              { id: 'nodes', icon: Server, label: t('sidebar.nodes') },
              { id: 'shards', icon: Layers, label: t('sidebar.shards') },
              { id: 'indices', icon: Database, label: t('sidebar.indices') },
            ].map((tool) => {
              const Icon = tool.icon
              const active = isViewActive(tool.id as AppView)
              return (
                <Button
                  key={tool.id}
                  variant="ghost"
                  className={`w-full justify-start transition-all duration-200 h-9 relative ${isCollapsed ? 'px-0 justify-center' : 'px-3'} ${
                    active
                      ? 'bg-primary/10 text-primary font-bold hover:bg-primary/15'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  } rounded-lg group`}
                  onClick={() => handleViewChange(tool.id as AppView)}
                  title={isCollapsed ? tool.label : undefined}
                >
                  <div className={`relative flex items-center ${isCollapsed ? '' : 'mr-3'}`}>
                    <Icon className={`h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  {!isCollapsed && (
                    <span className="text-xs tracking-tight">
                      {tool.label}
                    </span>
                  )}
                  
                  {/* 精美侧边高亮指示呼吸灯柱 */}
                  {active && !isCollapsed && (
                    <div className="absolute right-0 top-2 bottom-2 w-[3px] rounded-l-full bg-gradient-to-b from-purple-500 to-indigo-500 shadow-sm shadow-primary/30" />
                  )}
                  {active && isCollapsed && (
                    <div className="absolute right-0 top-1 bottom-1 w-[2px] rounded-l-full bg-primary" />
                  )}
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 底部设置菜单 */}
      <div className="mt-auto p-2 border-t border-border/40 bg-muted/10 shrink-0">
        <Button
          variant="ghost"
          onClick={() => setShowSettings(true)}
          className={`w-full justify-start transition-all duration-250 h-9.5 ${isCollapsed ? 'px-0 justify-center' : 'px-3'} text-muted-foreground hover:bg-primary/5 hover:text-primary rounded-lg group`}
          title={isCollapsed ? t('sidebar.settings') : undefined}
        >
          <Settings className={`h-4.5 w-4.5 shrink-0 transition-transform duration-500 ease-out group-hover:rotate-90 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && <span className="text-xs font-semibold tracking-tight">{t('sidebar.settings')}</span>}
        </Button>
      </div>
      
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  )
}