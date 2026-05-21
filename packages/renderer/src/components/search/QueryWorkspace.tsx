import React from "react";
import {
  Database,
  Sparkles,
  Loader2,
  Play,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { SearchPanel } from "./SearchPanel";
import { MonacoEditor } from "../editor/MonacoEditor";
import { useAppStore } from "../../store/useAppStore";

interface QueryWorkspaceProps {
  query: string;
  setQuery: (q: string) => void;
  showAIInput: boolean;
  setShowAIInput: (show: boolean) => void;
  aiQuery: string;
  setAIQuery: (q: string) => void;
  isGenerating: boolean;
  handleAIGenerate: () => Promise<void>;
  isExecuting: boolean;
  handleExecuteQuery: () => void;
  dslCheck: { isSafe: boolean; dangerousOperations: string[] } | null;
  selectedIndex: string | null;
  effectiveTheme: string;
  editorHeight: number;
  isQueryEditorCollapsed: boolean;
  setIsQueryEditorCollapsed: (collapsed: boolean) => void;
  startResizingEditor: (e: React.MouseEvent) => void;
  handleSearch: (searchQuery: string, index?: string) => Promise<void>;
  setPendingSearchQuery: (q: string | null) => void;
  setPendingSearchIndex: (idx: string | null) => void;
}

export function QueryWorkspace({
  query,
  setQuery,
  showAIInput,
  setShowAIInput,
  aiQuery,
  setAIQuery,
  isGenerating,
  handleAIGenerate,
  isExecuting,
  handleExecuteQuery,
  dslCheck,
  selectedIndex,
  effectiveTheme,
  editorHeight,
  isQueryEditorCollapsed,
  setIsQueryEditorCollapsed,
  startResizingEditor,
  handleSearch,
  setPendingSearchQuery,
  setPendingSearchIndex,
}: QueryWorkspaceProps) {
  const { t } = useAppStore();
  const debounceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 搜索顶栏 & 编辑器控制卡 */}
      <div className="relative z-20 bg-card/50 dark:bg-slate-900/40 backdrop-blur-md border border-border/60 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
                {t("app.queryEditor")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("app.welcomeDesc")}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIInput(!showAIInput)}
              className={`gap-1.5 h-8 text-xs font-semibold rounded-lg transition-all duration-300 relative overflow-hidden ${
                showAIInput 
                  ? "bg-primary/10 text-primary border-primary/30 shadow-sm" 
                  : "hover:bg-muted/80"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>{t("ai.assistant")}</span>
              {showAIInput && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 to-pink-500" />
              )}
            </Button>
          </div>
        </div>

        {/* 搜索控制条 */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SearchPanel
              onSearch={handleSearch}
              onQueryChange={(q, idx) => {
                setPendingSearchQuery(q || "");
                setPendingSearchIndex(idx);
                
                if (debounceTimeoutRef.current) {
                  clearTimeout(debounceTimeoutRef.current);
                }
                
                debounceTimeoutRef.current = setTimeout(() => {
                  const dslObj = {
                    query: {
                      query_string: {
                        query: q ? `*${q}*` : "*",
                      },
                    },
                    size: 50,
                  };
                  setQuery(JSON.stringify(dslObj, null, 2));
                }, 250);
              }}
            />
          </div>
          <Button
            onClick={handleExecuteQuery}
            variant={dslCheck && !dslCheck.isSafe ? "destructive" : "default"}
            className={`h-11 px-6 rounded-xl font-semibold text-sm gap-2 shrink-0 transition-all duration-300 shadow-md ${
              dslCheck && !dslCheck.isSafe 
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
                : "bg-primary hover:bg-primary/95 text-primary-foreground hover:shadow-primary/10 hover:shadow-lg active:scale-95"
            }`}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{t("app.executeQuery")}</span>
          </Button>
        </div>

        {selectedIndex && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground font-medium">
              {t("app.currentIndex")}
            </span>
            <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 rounded-full">
              {selectedIndex}
            </span>
          </div>
        )}

        {/* AI 助手极光渐变生成卡 */}
        {showAIInput && (
          <div className="mt-3 p-5 rounded-xl border relative overflow-hidden bg-gradient-to-br from-slate-900/10 via-background to-purple-500/5 dark:from-slate-950 dark:via-background dark:to-purple-950/15 ai-shimmer-border">
            {/* 通信点状动效背景层 */}
            <div className="absolute inset-0 communication-dot-flow opacity-[0.25] pointer-events-none" />
            
            <div className="flex items-center gap-3 border-b border-border/40 pb-4 relative z-10">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shadow-inner">
                <Sparkles className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-card-foreground">
                  {t("ai.assistant")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("ai.assistantDesc")}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 mt-4 relative z-10">
              <Label htmlFor="aiQuery" className="text-xs font-semibold text-foreground/80">
                {t("app.naturalLanguageQuery")}
              </Label>
              <div className="relative">
                <Input
                  id="aiQuery"
                  placeholder={t("ai.placeholder")}
                  value={aiQuery}
                  onChange={(e) => setAIQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAIGenerate()}
                  className="bg-background/80 focus-visible:ring-primary/40 focus-visible:border-primary/50 text-sm h-10 px-3.5 pr-10 rounded-lg transition-all duration-200"
                />
                <div className="absolute right-3 top-3 pointer-events-none">
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-primary/70" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-muted-foreground/50" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 mt-4 border-t border-border/40 relative z-10">
              <div className="text-[10px] text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/20 max-w-[70%]">
                <span className="font-semibold text-foreground mr-1">
                  {t("app.promptConstraint")}
                </span>
                {t("app.promptConstraintDesc")}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAIInput(false)}
                  className="h-8 text-xs font-medium rounded-lg"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleAIGenerate}
                  disabled={isGenerating}
                  size="sm"
                  className="h-8 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 text-white active:scale-95 transition-all shadow-md"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      {t("ai.generating")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-white" />
                      {t("ai.generate")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Monaco DSL 编辑面板 */}
      <div
        className={`bg-background rounded-xl border border-border/80 shadow-sm flex flex-col overflow-hidden transition-all duration-300 ${
          isQueryEditorCollapsed ? "h-[42px] flex-none" : "flex-none min-h-[120px]"
        }`}
      >
        <div
          onClick={() => setIsQueryEditorCollapsed(!isQueryEditorCollapsed)}
          className="flex items-center justify-between px-4 py-2 bg-muted/30 hover:bg-muted/60 border-b cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
            >
              {isQueryEditorCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/20" />
            <span className="text-xs font-semibold text-foreground tracking-tight font-mono">
              query.json
            </span>
          </div>
          {!isQueryEditorCollapsed && (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuery('{\n  "query": {\n    "match_all": {}\n  }\n}')}
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground font-semibold rounded-md"
              >
                {t("common.clear")}
              </Button>
            </div>
          )}
        </div>

        {!isQueryEditorCollapsed && (
          <>
            <div className="relative min-h-0" style={{ height: `${editorHeight}px` }}>
              <div className="absolute inset-0">
                <MonacoEditor
                  value={query}
                  onChange={(newVal) => {
                    setQuery(newVal);
                    if (newVal !== query) {
                      setPendingSearchQuery(null);
                    }
                  }}
                  language="json"
                  height="100%"
                  theme={effectiveTheme}
                />
              </div>
            </div>
            
            {/* 调整高度阻尼条 */}
            <div
              className="h-1.5 w-full bg-border/40 hover:bg-primary/20 cursor-row-resize transition-colors flex items-center justify-center relative z-10"
              onMouseDown={startResizingEditor}
            >
              <div className="w-10 h-[3px] bg-muted-foreground/30 rounded-full" />
            </div>
          </>
        )}
      </div>

      {/* 潜在危险警示组件 */}
      {dslCheck && !dslCheck.isSafe && (
        <div className="p-4 bg-destructive/5 dark:bg-destructive/10 border border-destructive/20 dark:border-destructive/30 rounded-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0 border border-destructive/25">
              <AlertTriangle className="w-4.5 h-4.5 text-destructive" />
            </div>
            <div>
              <h4 className="font-semibold text-xs text-destructive tracking-tight">
                {t("app.dangerousOpWarning")}
              </h4>
              <ul className="mt-2 space-y-1">
                {dslCheck.dangerousOperations.map((op, i) => (
                  <li
                    key={i}
                    className="text-xs text-destructive/80 flex items-center gap-2"
                  >
                    <span className="w-1 h-1 rounded-full bg-destructive/50" />
                    <span className="font-mono text-[11px]">{op}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
