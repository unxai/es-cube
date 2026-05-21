import { Plus, PanelLeft } from "lucide-react";
import { GlobalSelector } from "../instance/GlobalSelector";
import { AIProviderSelector } from "../settings/AIProviderSelector";
import { LanguageSelector } from "../settings/LanguageSelector";
import { ThemeSelector } from "../settings/ThemeSelector";
import { Button } from "../ui/button";
import { useAppStore } from "../../store/useAppStore";

interface HeaderProps {
  onShowInstanceManager: () => void;
}

export function Header({ 
  onShowInstanceManager
}: HeaderProps) {
  const { t, isSidebarCollapsed: isCollapsed, setSidebarCollapsed: setIsCollapsed } = useAppStore();
  const isMac = typeof window !== 'undefined' && navigator.userAgent.includes('Mac');

  return (
    <div 
      className="flex items-center justify-between px-6 z-30 h-[60px] glass-panel border-b border-border/40 sticky top-0 backdrop-blur-md bg-card/45 shadow-sm transition-all duration-300 select-none"
      style={{ WebkitAppRegion: isMac ? 'drag' : 'no-drag' } as any}
    >
      <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* 折叠时在 Header 渲染开关按钮，展开时由 Sidebar 渲染 */}
        {isCollapsed && (
          <div className="flex items-center shrink-0 animate-in fade-in duration-200">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(false)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-all active:scale-90"
              title={t('sidebar.expand') || "Expand sidebar"}
            >
              <PanelLeft className="h-4 w-4 rotate-180" />
            </Button>
            <div className="h-4 w-px bg-border/20 mx-2 shrink-0" />
          </div>
        )}

        {/* 全局实例选择器 */}
        <div className="hover:scale-[1.01] transition-transform duration-200">
          <GlobalSelector />
        </div>
        <div className="h-4 w-px bg-border/30 mx-1 shrink-0" />
        
        {/* 新增实例按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowInstanceManager}
          className="h-8 text-[11px] gap-1.5 text-muted-foreground hover:text-primary hover:bg-primary/5 active:scale-95 px-2.5 rounded-lg border border-transparent hover:border-primary/10 transition-all duration-200"
        >
          <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90 duration-300" />
          <span className="font-medium">{t("app.addInstance")}</span>
        </Button>
      </div>

      <div className="flex items-center gap-2 justify-end shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* AI 配置、语言与主题 */}
        <div className="hover:scale-[1.01] transition-transform duration-150">
          <AIProviderSelector />
        </div>
        <div className="h-4 w-px bg-border/20 mx-1 shrink-0" />
        <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-lg border border-border/20">
          <LanguageSelector />
          <ThemeSelector />
        </div>
      </div>
    </div>
  );
}
