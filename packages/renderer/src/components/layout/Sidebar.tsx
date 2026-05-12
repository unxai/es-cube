import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Database, BarChart3, Settings, Activity, Search, Server, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { useConnectionStore } from '../../store/useConnectionStore'
import { useAppStore } from '../../store/useAppStore'
import { Button } from '../ui/button'
import { SettingsDialog } from '../settings/SettingsDialog'
import logoSrc from '../../assets/logo.svg'

type AppView = 'search' | 'rest' | 'nodes' | 'shards' | 'indices' | 'dashboard'

interface SidebarProps {
  onToolChange?: (view: AppView) => void
  currentView?: AppView
}

export function Sidebar({ onToolChange, currentView = 'search' }: SidebarProps) {
  const { selectedInstanceId } = useConnectionStore()
  const { t } = useAppStore()
  const [isCollapsed, setIsCollapsed] = useState(false)
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

  return (
    <div className={`flex flex-col bg-card border-r transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} z-20 shadow-sm relative`}>
      <div className="p-3 border-b flex items-center justify-between h-[60px] bg-card/50 backdrop-blur-sm">
        {!isCollapsed && (
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm overflow-hidden">
              <img src={logoSrc} alt="Logo" className="w-5 h-5 object-contain" />
            </div>
            <h1 className="text-foreground font-semibold text-lg tracking-tight">EsCube</h1>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto border border-primary/20 shadow-sm overflow-hidden">
            <img src={logoSrc} alt="Logo" className="w-5 h-5 object-contain" />
          </div>
        )}
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg ml-auto"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </Button>
        )}
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-[14px] h-6 w-6 rounded-full border bg-background shadow-md text-muted-foreground hover:text-foreground hover:bg-muted/80 z-50 flex items-center justify-center"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6 scrollbar-thin">


        <div>
          <div className={`text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 ${isCollapsed ? 'text-center' : 'px-3'}`}>
            {isCollapsed ? 'TL' : t('sidebar.tools')}
          </div>
          <div className="space-y-0.5">
            {[
              { id: 'dashboard', icon: BarChart3, label: t('sidebar.dashboard') },
              { id: 'search', icon: Search, label: t('sidebar.search') },
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
                  className={`w-full justify-start transition-all duration-200 h-9 ${isCollapsed ? 'px-0 justify-center' : 'px-3'} ${
                    active
                      ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15'
                      : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  } rounded-lg`}
                  onClick={() => handleViewChange(tool.id as AppView)}
                  title={isCollapsed ? tool.label : undefined}
                >
                  <div className={`relative ${isCollapsed ? '' : 'mr-3'}`}>
                    <Icon className={`h-4.5 w-4.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  {!isCollapsed && (
                    <span className={`text-sm ${active ? 'text-primary' : 'text-foreground'}`}>
                      {tool.label}
                    </span>
                  )}
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-auto p-2 border-t bg-muted/20">
        <Button
          variant="ghost"
          onClick={() => setShowSettings(true)}
          className={`w-full justify-start transition-all duration-200 h-10 ${isCollapsed ? 'px-0 justify-center' : 'px-3'} text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg group`}
          title={isCollapsed ? t('sidebar.settings') : undefined}
        >
          <Settings className={`h-4.5 w-4.5 shrink-0 transition-transform duration-300 group-hover:rotate-90 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && <span className="text-sm font-medium">{t('sidebar.settings')}</span>}
        </Button>
      </div>
      
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  )
}