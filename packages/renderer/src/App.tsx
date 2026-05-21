import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  AlertTriangle,
  Database,
  Sparkles,
  Loader2,
  CheckSquare,
  Edit2,
  Layers,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { Header } from "./components/layout/Header";
import { MonacoEditor } from "./components/editor/MonacoEditor";
import { InstanceManager } from "./components/instance/InstanceManager";
import { RestTool } from "./components/tools/RestTool";
import { Dashboard } from "./components/tools/Dashboard";
import { Nodes } from "./components/tools/Nodes";
import { Shards } from "./components/tools/Shards";
import { Indices } from "./components/tools/Indices";
import { useConnectionStore } from "./store/useConnectionStore";
import { useAppStore } from "./store/useAppStore";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { detectDangerousOperations } from "./lib/dslDetector";
import { QueryWorkspace } from "./components/search/QueryWorkspace";
import { QueryResultPanel } from "./components/search/QueryResultPanel";
import type { ESHit, ESQueryResult } from "./components/search/QueryResultPanel";
import logoSrc from "./assets/logo.svg";

type AppView =
  | "search"
  | "rest"
  | "health"
  | "nodes"
  | "shards"
  | "indices"
  | "dashboard";

function App() {
  const { selectedInstanceId, selectedIndex, setSelectedIndex } =
    useConnectionStore();
  const { t, theme, aiConfig, addSearchHistory } = useAppStore();
  
  // App layouts controls
  const [showInstanceManager, setShowInstanceManager] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>("search");



  // Query and AI states
  const [query, setQuery] = useState("");
  const [showAIInput, setShowAIInput] = useState(false);
  const [aiQuery, setAIQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [dslCheck, setDslCheck] = useState<ReturnType<
    typeof detectDangerousOperations
  > | null>(null);
  const [showDangerConfirm, setShowDangerConfirm] = useState(false);

  // Results & Table View states
  const [queryResult, setQueryResult] = useState<ESQueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [resultViewMode, setResultViewMode] = useState<"json" | "table">(
    "json",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  
  // Edit document modal states
  const [docToEdit, setDocToEdit] = useState<ESHit | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [docEditValue, setDocEditValue] = useState("");

  // Search sync and Monaco Resizing state
  const [isQueryEditorCollapsed, setIsQueryEditorCollapsed] = useState(false);
  const [pendingSearchIndex, setPendingSearchIndex] = useState<string | null>(
    null,
  );
  const [pendingSearchQuery, setPendingSearchQuery] = useState<string | null>(
    null,
  );
  const [editorHeight, setEditorHeight] = useState(240);
  const [resultHeight, setResultHeight] = useState(380);
  const [isResizingEditor, setIsResizingEditor] = useState(false);
  const [isResizingResult, setIsResizingResult] = useState(false);

  const startResizingEditor = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingEditor(true);
  }, []);

  const startResizingResult = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingResult(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizingEditor(false);
    setIsResizingResult(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizingEditor) {
        const container = document.querySelector('.query-editor-container');
        if (container) {
          const rect = container.getBoundingClientRect();
          const newHeight = e.clientY - rect.top - 40;
          setEditorHeight(Math.max(100, newHeight));
        }
      } else if (isResizingResult) {
        const container = document.querySelector('.result-editor-container');
        if (container) {
          const rect = container.getBoundingClientRect();
          const newHeight = e.clientY - rect.top - 40;
          setResultHeight(Math.max(100, newHeight));
        }
      }
    },
    [isResizingEditor, isResizingResult],
  );

  useEffect(() => {
    if (isResizingEditor || isResizingResult) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizingEditor, isResizingResult, resize, stopResizing]);

  useEffect(() => {
    if (isResizingEditor || isResizingResult) {
      document.body.classList.add('is-resizing');
    } else {
      document.body.classList.remove('is-resizing');
    }
  }, [isResizingEditor, isResizingResult]);

  const effectiveTheme = useMemo(() => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "vs-dark"
        : "light";
    }
    return theme === "dark" ? "vs-dark" : "light";
  }, [theme]);

  useEffect(() => {
    useAppStore.getState().init();
  }, []);

  const formattedJsonResult = useMemo(() => {
    return queryResult
      ? JSON.stringify(queryResult, null, 2)
      : t("app.noResultsYet") || "No results yet";
  }, [queryResult, t]);

  const tableColumns = useMemo(() => {
    if (!queryResult?.hits?.hits?.length) return [];
    const keys = new Set<string>();
    const limit = Math.min(queryResult.hits.hits.length, 50);
    for (let i = 0; i < limit; i++) {
      const hit = queryResult.hits.hits[i];
      if (hit._source) {
        Object.keys(hit._source).forEach((k) => keys.add(k));
      }
    }
    return Array.from(keys);
  }, [queryResult]);

  const getTruncatedString = (val: unknown, limit = 200) => {
    if (val === null || val === undefined) return "";
    const str = typeof val === "object" ? JSON.stringify(val) : String(val);
    return str.length > limit ? str.slice(0, limit) + "..." : str;
  };

  useEffect(() => {
    if (query) {
      setDslCheck(detectDangerousOperations(query));
    } else {
      setDslCheck(null);
    }
  }, [query]);

  useEffect(() => {
    if (!selectedInstanceId) {
      setSelectedIndex(null);
    }
  }, [selectedInstanceId]);

  useEffect(() => {
    if (selectedInstanceId && !isExecuting) {
      handleExecuteQuery();
    }
  }, [selectedIndex]);

  const handleExecuteQuery = useCallback(async () => {
    if (!selectedInstanceId) {
      toast.warning(t("app.selectInstance"));
      return;
    }

    const searchToExecute = pendingSearchQuery !== null ? pendingSearchQuery : null;
    
    if (searchToExecute !== null) {
      handleSearch(searchToExecute, pendingSearchIndex || undefined);
      return;
    }

    if (dslCheck && !dslCheck.isSafe) {
      setShowDangerConfirm(true);
      return;
    }

    await executeQuery(1, pageSize, sortField, sortOrder);
  }, [selectedInstanceId, dslCheck, t, pageSize, sortField, sortOrder, pendingSearchQuery, pendingSearchIndex]);

  const executeQuery = async (
    page = 1,
    size = pageSize,
    field = sortField,
    order = sortOrder,
  ) => {
    setIsExecuting(true);
    try {
      const queryToExecute = query || '{\n  "query": {\n    "match_all": {}\n  }\n}';
      const parsedQuery = JSON.parse(queryToExecute);

      parsedQuery.from = parsedQuery.from ?? (page - 1) * size;
      parsedQuery.size = parsedQuery.size ?? size;

      if (field) {
        parsedQuery.sort = [{ [field]: { order: order } }];
      }

      const path = selectedIndex ? `/${selectedIndex}/_search` : "/_search";

      const result = await window.api.es.executeQuery(
        selectedInstanceId,
        "POST",
        path,
        parsedQuery,
      );

      if (result.success) {
        setQueryResult(result.data);
        setCurrentPage(page);
        setSortField(field);
        setSortOrder(order);
        setSelectedDocs(new Set());
      } else {
        setQueryResult({ error: result.error });
        toast.error(result.error);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      setQueryResult({ error: errMsg });
      toast.error(errMsg);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDangerousConfirm = async () => {
    setShowDangerConfirm(false);
    await executeQuery(1, pageSize, sortField, sortOrder);
  };

  const handleAIGenerate = async () => {
    const currentProviderConfig = aiConfig.providers[aiConfig.provider];
    if (
      !currentProviderConfig?.apiKey &&
      (aiConfig.provider === "openai" ||
        aiConfig.provider === "anthropic" ||
        aiConfig.provider === "gemini" ||
        aiConfig.provider === "deepseek")
    ) {
      toast.warning(t("ai.configRequired"));
      return;
    }

    if (!aiQuery.trim()) {
      toast.warning(t("ai.enterQuestion"));
      return;
    }

    setIsGenerating(true);

    try {
      let indexMapping = null

      if (selectedIndex) {
        try {
          const mappingResult = await window.api.es.getMapping(
            selectedInstanceId,
            selectedIndex,
          )
          if (mappingResult) {
            indexMapping = mappingResult
          }
        } catch (error) {
          console.warn('Failed to fetch index mapping:', error)
        }
      }

      const result = await window.api.ai.generateDSL({
        naturalLanguageQuery: aiQuery,
        indexMapping,
        indexName: selectedIndex || undefined,
      })

      if (result.success && result.dsl) {
        setQuery(result.dsl)
        setShowAIInput(false)
        setAIQuery('')
        toast.success(t('ai.success') || 'DSL generated successfully!')
      } else {
        toast.error(`AI Error: ${result.error}`)
      }
    } catch (error) {
      toast.error(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    } finally {
      setIsExecuting(false)
      setIsGenerating(false)
    }
  };

  const handleToolChange = useCallback((view: AppView) => {
    setCurrentView(view);
  }, []);

  const handleSearch = async (searchQuery: string, index?: string) => {
    if (searchQuery && searchQuery.trim()) {
      addSearchHistory(searchQuery.trim());
    }

    const dslObj = {
      query: {
        query_string: {
          query: searchQuery ? `*${searchQuery}*` : "*",
        },
      },
      size: 50,
    };
    setQuery(JSON.stringify(dslObj, null, 2));
    setPendingSearchQuery(null);
    setPendingSearchIndex(null);

    setIsExecuting(true);
    try {
      const searchIndex = index || selectedIndex;
      const path = searchIndex ? `/${searchIndex}/_search` : "/_search";
      const result = await window.api.es.executeQuery(
        selectedInstanceId!,
        "POST",
        path,
        dslObj,
      );

      if (result.success) {
        setQueryResult(result.data);
        setCurrentPage(1);
        setSortField(null);
        setSortOrder("desc");
        setSelectedDocs(new Set());
      } else {
        setQueryResult({ error: result.error });
        toast.error(result.error);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      setQueryResult({ error: errMsg });
      toast.error(errMsg);
    } finally {
      setIsExecuting(false);
    }
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && queryResult?.hits?.hits) {
      setSelectedDocs(
        new Set(queryResult.hits.hits.map((h: ESHit) => `${h._index}|${h._id}`)),
      );
    } else {
      setSelectedDocs(new Set());
    }
  };

  const toggleSelectDoc = (hit: ESHit, checked: boolean) => {
    const newSet = new Set(selectedDocs);
    const key = `${hit._index}|${hit._id}`;
    if (checked) newSet.add(key);
    else newSet.delete(key);
    setSelectedDocs(newSet);
  };

  const handleBatchDelete = async () => {
    if (
      !confirm(
        t("search.confirmBatchDelete") ||
          "Are you sure you want to delete the selected documents?",
      )
    )
      return;
    setIsExecuting(true);
    try {
      const promises = Array.from(selectedDocs).map((docStr) => {
        const [index, id] = docStr.split("|");
        return window.api.es.executeQuery(
          selectedInstanceId,
          "DELETE",
          `/${index}/_doc/${id}`,
        );
      });
      await Promise.all(promises);
      toast.success(`Successfully deleted ${selectedDocs.size} documents`);
      setSelectedDocs(new Set());
      executeQuery(currentPage, pageSize, sortField, sortOrder);
    } catch (e: unknown) {
      toast.error("Error: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleEditDoc = (hit: ESHit) => {
    setDocToEdit(hit);
    setDocEditValue(JSON.stringify(hit._source, null, 2));
    setIsEditModalOpen(true);
  };

  const handleSaveDoc = async () => {
    setIsExecuting(true);
    try {
      const parsedBody = JSON.parse(docEditValue);
      const result = await window.api.es.executeQuery(
        selectedInstanceId,
        "PUT",
        `/${docToEdit?._index}/_doc/${docToEdit?._id}`,
        parsedBody,
      );
      if (result.success) {
        toast.success("Document updated successfully");
        setIsEditModalOpen(false);
        setDocToEdit(null);
        executeQuery(currentPage, pageSize, sortField, sortOrder);
      } else {
        toast.error("Failed to save: " + result.error);
      }
    } catch (e: unknown) {
      toast.error("Error parsing JSON or saving: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setIsExecuting(false);
    }
  };

  const renderBatchActionBar = () => {
    if (selectedDocs.size === 0) return null;
    const singleHit =
      selectedDocs.size === 1
        ? queryResult?.hits?.hits?.find((h: ESHit) => {
            const [idx, id] = Array.from(selectedDocs)[0].split("|");
            return h._index === idx && h._id === id;
          })
        : null;
    return (
      <div className="flex items-center gap-2 mb-3.5 px-1 animate-in fade-in zoom-in duration-200">
        <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-md font-semibold border border-primary/20">
          {(t("search.selectedCount") || "{count} selected").replace(
            "{count}",
            selectedDocs.size.toString(),
          )}
        </span>
        {singleHit && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-3 gap-1.5 font-medium rounded-lg"
            onClick={() => handleEditDoc(singleHit)}
          >
            <Edit2 className="w-3.5 h-3.5" />
            {t("common.edit")}
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          className="h-7 text-xs px-3 shadow-sm gap-1.5 font-semibold rounded-lg"
          onClick={handleBatchDelete}
        >
          <Plus className="w-3.5 h-3.5 rotate-45 text-white" />
          {selectedDocs.size === 1 ? t("common.delete") : t("search.batchDelete")}
        </Button>
      </div>
    );
  };

  const renderWorkspace = () => {
    const instanceId = selectedInstanceId || "";

    switch (currentView) {
      case "rest":
        return <RestTool />;
      case "nodes":
        return <Nodes instanceId={instanceId} />;
      case "shards":
        return <Shards instanceId={instanceId} />;
      case "indices":
        return <Indices instanceId={instanceId} onViewChange={(view) => handleToolChange(view as AppView)} />;
      case "dashboard":
        return <Dashboard instanceId={instanceId} />;
      case "search":
      default:
        return (
          <div className="h-full flex flex-col gap-6">
            <QueryWorkspace
              query={query}
              setQuery={setQuery}
              showAIInput={showAIInput}
              setShowAIInput={setShowAIInput}
              aiQuery={aiQuery}
              setAIQuery={setAIQuery}
              isGenerating={isGenerating}
              handleAIGenerate={handleAIGenerate}
              isExecuting={isExecuting}
              handleExecuteQuery={handleExecuteQuery}
              dslCheck={dslCheck}
              selectedIndex={selectedIndex}
              effectiveTheme={effectiveTheme}
              editorHeight={editorHeight}
              isQueryEditorCollapsed={isQueryEditorCollapsed}
              setIsQueryEditorCollapsed={setIsQueryEditorCollapsed}
              startResizingEditor={startResizingEditor}
              handleSearch={handleSearch}
              setPendingSearchQuery={setPendingSearchQuery}
              setPendingSearchIndex={setPendingSearchIndex}
            />

            <QueryResultPanel
              queryResult={queryResult}
              isExecuting={isExecuting}
              resultViewMode={resultViewMode}
              setResultViewMode={setResultViewMode}
              setQueryResult={setQueryResult}
              formattedJsonResult={formattedJsonResult}
              isQueryEditorCollapsed={isQueryEditorCollapsed}
              resultHeight={resultHeight}
              startResizingResult={startResizingResult}
              selectedDocs={selectedDocs}
              toggleSelectAll={toggleSelectAll}
              toggleSelectDoc={toggleSelectDoc}
              renderBatchActionBar={renderBatchActionBar}
              tableColumns={tableColumns}
              getTruncatedString={getTruncatedString}
              currentPage={currentPage}
              pageSize={pageSize}
              sortField={sortField}
              sortOrder={sortOrder}
              executeQuery={executeQuery}
              handleEditDoc={handleEditDoc}
              effectiveTheme={effectiveTheme}
              setShowAIInput={setShowAIInput}
              setAIQuery={setAIQuery}
            />
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground antialiased overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* 精美折叠侧边栏 */}
        <Sidebar 
          onToolChange={handleToolChange} 
          currentView={currentView} 
        />

        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/20 dark:bg-slate-950/20">
          {/* 顶栏解耦组件 */}
          <Header 
            onShowInstanceManager={() => setShowInstanceManager(true)} 
          />

          <div className="flex-1 overflow-auto p-6">
            {selectedInstanceId ? (
              renderWorkspace()
            ) : (
              /* 空白实例欢迎页 */
              <div className="flex flex-col items-center justify-center h-full relative overflow-hidden px-4">
                {/* 漂浮彩色极光背景团 (Ambient Aurora Blobs) */}
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                  <div className="aurora-blob animate-aurora-1 bg-primary/15 dark:bg-primary/20 w-[300px] h-[300px] -top-20 -left-10" />
                  <div className="aurora-blob animate-aurora-2 bg-blue-500/15 dark:bg-blue-500/20 w-[350px] h-[350px] -bottom-20 -right-10" />
                  <div className="aurora-blob animate-aurora-3 bg-emerald-500/10 dark:bg-emerald-500/15 w-[250px] h-[250px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>

                {/* 欢迎页主内容体 */}
                <div className="text-center max-w-lg relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                  <div className="mb-8">
                    {/* Logo 外框脉冲发光 */}
                    <div className="w-24 h-24 mx-auto rounded-3xl bg-card/45 border border-primary/20 flex items-center justify-center shadow-xl shadow-primary/5 mb-6 overflow-hidden relative group backdrop-blur-md transition-all duration-500 hover:scale-105 hover:border-primary/45 hover:shadow-primary/10">
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute inset-0 communication-dot-flow opacity-20 pointer-events-none" />
                      <img
                        src={logoSrc}
                        alt="Logo"
                        className="w-12 h-12 object-contain relative z-10 transition-transform duration-500 group-hover:rotate-[360deg] group-hover:scale-110"
                      />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent mb-3.5">
                      {t("app.welcome") || "Welcome to EsCube"}
                    </h2>
                    <p className="text-muted-foreground text-xs leading-relaxed max-w-sm mx-auto px-4 opacity-80">
                      {t("app.welcomeDesc") || "A professional, beautiful and high-performance Elasticsearch desktop client."}
                    </p>
                  </div>

                  {/* 2x2 极光微卡片矩阵 */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {/* Card 1: AI 智控生成 */}
                    <div className="glass-panel p-4.5 rounded-2xl shadow-sm border border-border/40 text-left relative overflow-hidden hover-neon-purple group transition-all duration-300">
                      <div className="absolute inset-0 communication-dot-flow opacity-10 pointer-events-none" />
                      <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-primary/5 group-hover:bg-primary/10 blur-xl transition-all duration-300" />
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3 border border-primary/20 shrink-0">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <h4 className="text-xs font-bold text-foreground mb-1">
                        {t("app.aiAssist") || "AI Assistant"}
                      </h4>
                      <p className="text-[10px] text-muted-foreground leading-normal opacity-85">
                        {t("app.feature.aiDesc") || "Generate precise DSL from natural language queries."}
                      </p>
                    </div>

                    {/* Card 2: 极速 DSL 调试 */}
                    <div className="glass-panel p-4.5 rounded-2xl shadow-sm border border-border/40 text-left relative overflow-hidden hover-neon-blue group transition-all duration-300">
                      <div className="absolute inset-0 communication-dot-flow opacity-10 pointer-events-none" />
                      <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-blue-500/5 group-hover:bg-blue-500/10 blur-xl transition-all duration-300" />
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3 border border-blue-500/20 shrink-0">
                        <Database className="w-4 h-4 text-blue-400" />
                      </div>
                      <h4 className="text-xs font-bold text-foreground mb-1">
                        {t("app.esQuery") || "DSL Query Editor"}
                      </h4>
                      <p className="text-[10px] text-muted-foreground leading-normal opacity-85">
                        {t("app.feature.dslDesc") || "Autocompleted Monaco editor with query execution."}
                      </p>
                    </div>

                    {/* Card 3: 拓扑分片监控 */}
                    <div className="glass-panel p-4.5 rounded-2xl shadow-sm border border-border/40 text-left relative overflow-hidden hover-neon-green group transition-all duration-300">
                      <div className="absolute inset-0 communication-dot-flow opacity-10 pointer-events-none" />
                      <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-emerald-500/5 group-hover:bg-emerald-500/10 blur-xl transition-all duration-300" />
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3 border border-emerald-500/20 shrink-0">
                        <Layers className="w-4 h-4 text-emerald-400" />
                      </div>
                      <h4 className="text-xs font-bold text-foreground mb-1">
                        {t("app.feature.topology") || "Topology Matrix"}
                      </h4>
                      <p className="text-[10px] text-muted-foreground leading-normal opacity-85">
                        {t("app.feature.topologyDesc") || "Visual matrix representation of index shard assignments."}
                      </p>
                    </div>

                    {/* Card 4: 节点资源看板 */}
                    <div className="glass-panel p-4.5 rounded-2xl shadow-sm border border-border/40 text-left relative overflow-hidden hover-neon-orange group transition-all duration-300">
                      <div className="absolute inset-0 communication-dot-flow opacity-10 pointer-events-none" />
                      <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-amber-500/5 group-hover:bg-amber-500/10 blur-xl transition-all duration-300" />
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3 border border-amber-500/20 shrink-0">
                        <Gauge className="w-4 h-4 text-amber-400" />
                      </div>
                      <h4 className="text-xs font-bold text-foreground mb-1">
                        {t("app.feature.nodes") || "Metrics Dashboard"}
                      </h4>
                      <p className="text-[10px] text-muted-foreground leading-normal opacity-85">
                        {t("app.feature.nodesDesc") || "SVG circular dashboard tracking cluster resources."}
                      </p>
                    </div>
                  </div>

                  {/* 霓虹发光主按钮 */}
                  <Button
                    onClick={() => setShowInstanceManager(true)}
                    size="lg"
                    className="btn-neon-glow px-10 h-11 text-sm font-bold gap-2 text-white rounded-xl select-none"
                  >
                    <Plus className="h-4.5 w-4.5 text-white" />
                    <span>{t("app.addInstance") || "Connect New Instance"}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <StatusBar />

      {showInstanceManager && (
        <InstanceManager onClose={() => setShowInstanceManager(false)} />
      )}

      {/* 极简安全危险警告 Modal */}
      {showDangerConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center gap-4.5 mb-5">
              <div className="w-11 h-11 rounded-xl bg-destructive/15 flex items-center justify-center border border-destructive/25 shrink-0">
                <AlertTriangle className="w-5.5 h-5.5 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {t("app.dangerousOpWarning")}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t("app.proceedWithCaution")}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-350 leading-relaxed mb-6">
              {t("app.dangerousOpDesc")}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDangerConfirm(false)}
                className="flex-1 h-9 rounded-lg border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-colors"
              >
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDangerousConfirm}
                className="flex-1 h-9 rounded-lg font-semibold text-xs transition-colors text-white"
              >
                {t("app.executeAnyway")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 单条文档修改弹出框 */}
      {isEditModalOpen && docToEdit && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[650px] flex flex-col h-[550px] p-0 overflow-hidden bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl">
            <DialogHeader className="p-4 border-b bg-muted/20">
              <DialogTitle className="flex items-center justify-between text-sm font-bold">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-primary" />
                  <span>{t("search.editDocument")}</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-normal bg-muted px-2 py-0.5 rounded border">
                  {docToEdit._index} / {docToEdit._id}
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 relative min-h-0 bg-background">
              <div className="absolute inset-0">
                <MonacoEditor
                  value={docEditValue}
                  onChange={setDocEditValue}
                  language="json"
                  height="100%"
                  theme={effectiveTheme}
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2.5 bg-muted/20 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                className="h-8 text-xs font-semibold rounded-lg"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleSaveDoc}
                disabled={isExecuting}
                size="sm"
                className="h-8 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/95 text-white shadow-md active:scale-95 transition-all"
              >
                {isExecuting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <CheckSquare className="w-3.5 h-3.5 mr-1.5 text-white" />
                )}
                <span>{t("common.save")}</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default App;
