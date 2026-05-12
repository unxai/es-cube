import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  AlertTriangle,
  Database,
  Sparkles,
  Loader2,
  Play,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  CheckSquare,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { MonacoEditor } from "./components/editor/MonacoEditor";
import { InstanceManager } from "./components/instance/InstanceManager";
import { ThemeSelector } from "./components/settings/ThemeSelector";
import { LanguageSelector } from "./components/settings/LanguageSelector";
import { SearchPanel } from "./components/search/SearchPanel";
import { GlobalSelector } from "./components/instance/GlobalSelector";
import { RestTool } from "./components/tools/RestTool";
import { Dashboard } from "./components/tools/Dashboard";
import { Nodes } from "./components/tools/Nodes";
import { Shards } from "./components/tools/Shards";
import { Indices } from "./components/tools/Indices";
import { useConnectionStore } from "./store/useConnectionStore";
import { useAppStore } from "./store/useAppStore";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { detectDangerousOperations } from "./lib/dslDetector";
import { AIProviderSelector } from "./components/settings/AIProviderSelector";
import logoSrc from "./assets/logo.svg";

interface ESHit {
  _index: string;
  _id: string;
  _source: Record<string, unknown>;
  [key: string]: unknown;
}

interface ESQueryResult {
  hits?: {
    hits?: ESHit[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function App() {
  const { selectedInstanceId, selectedIndex, setSelectedIndex } =
    useConnectionStore();
  const { t, theme, aiConfig } = useAppStore();
  const [showInstanceManager, setShowInstanceManager] = useState(false);
  const [query, setQuery] = useState("");
  const [showAIInput, setShowAIInput] = useState(false);
  const [aiQuery, setAIQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [dslCheck, setDslCheck] = useState<ReturnType<
    typeof detectDangerousOperations
  > | null>(null);
  const [showDangerConfirm, setShowDangerConfirm] = useState(false);

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
  const [docToEdit, setDocToEdit] = useState<ESHit | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [docEditValue, setDocEditValue] = useState("");
  const [isQueryEditorCollapsed, setIsQueryEditorCollapsed] = useState(false);
  const [pendingSearchIndex, setPendingSearchIndex] = useState<string | null>(
    null,
  );
  const [indices, setIndices] = useState<{ name: string }[]>([]);
  const [isLoadingIndices, setIsLoadingIndices] = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState<string | null>(
    null,
  );

  type AppView =
    | "search"
    | "rest"
    | "health"
    | "nodes"
    | "shards"
    | "indices"
    | "dashboard";
  const [currentView, setCurrentView] = useState<AppView>("search");

  const effectiveTheme = useMemo(() => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "vs-dark"
        : "light";
    }
    return theme === "dark" ? "vs-dark" : "light";
  }, [theme]);

  useEffect(() => {
    // Initialize store from main process settings
    useAppStore.getState().init();
  }, []);

  // Memoized JSON view to prevent expensive stringify on every render
  const formattedJsonResult = useMemo(() => {
    return queryResult
      ? JSON.stringify(queryResult, null, 2)
      : t("app.noResultsYet") || "No results yet";
  }, [queryResult, t]);

  // Memoized table columns to collect all unique keys from hits
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

  // Truncation helper to prevent massive DOM nodes and memory leaks
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
    if (selectedInstanceId) {
      loadIndices();
    } else {
      setIndices([]);
      setSelectedIndex(null);
    }
  }, [selectedInstanceId]);

  useEffect(() => {
    if (selectedInstanceId && !isExecuting) {
      handleExecuteQuery();
    }
  }, [selectedIndex]);

  const loadIndices = async () => {
    setIsLoadingIndices(true);
    try {
      const result = await window.api.es.getIndices(selectedInstanceId);
      if (result && Array.isArray(result)) {
        setIndices(result.map((name) => ({ name })));
      }
    } catch (error) {
      console.error("Failed to load indices:", error);
    } finally {
      setIsLoadingIndices(false);
    }
  };

  const handleExecuteQuery = useCallback(async () => {
    if (!selectedInstanceId) {
      toast.warning(t("app.selectInstance"));
      return;
    }

    // If user has typed something in search panel but hasn't submitted, use that
    if (pendingSearchQuery !== null) {
      handleSearch(pendingSearchQuery, pendingSearchIndex || undefined);
      return;
    }

    if (dslCheck && !dslCheck.isSafe) {
      setShowDangerConfirm(true);
      return;
    }

    await executeQuery(1, pageSize, sortField, sortOrder);
  }, [selectedInstanceId, dslCheck, t, pageSize, sortField, sortOrder]);

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

      parsedQuery.from = (page - 1) * size;
      parsedQuery.size = size;

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
        console.log("Query result:", result.data);
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

  const handleToolChange = (view: AppView) => {
    setCurrentView(view);
  };

  const handleSearch = (searchQuery: string, index?: string) => {
    // Generate a valid query_string DSL safely
    const dslObj = {
      query: {
        query_string: {
          query: searchQuery ? `*${searchQuery}*` : "*",
        },
      },
      size: 50,
    };
    const dsl = JSON.stringify(dslObj, null, 2);
    setQuery(dsl);
    setPendingSearchQuery(null);
    setPendingSearchIndex(null);

    // Execute query immediately with the new DSL
    setIsExecuting(true);
    setTimeout(async () => {
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
    }, 50);
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
        `/${docToEdit._index}/_doc/${docToEdit._id}`,
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
      <div className="flex items-center gap-2 mb-2 px-1 animate-in fade-in zoom-in duration-200">
        <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-md font-medium">
          {(t("search.selectedCount") || "{count} selected").replace(
            "{count}",
            selectedDocs.size.toString(),
          )}
        </span>
        {singleHit && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-3 gap-1.5"
            onClick={() => handleEditDoc(singleHit)}
          >
            <Edit2 className="w-3.5 h-3.5" />
            {t("common.edit")}
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          className="h-7 text-xs px-3 shadow-sm gap-1.5"
          onClick={handleBatchDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
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
        return <Indices instanceId={instanceId} onViewChange={(view) => setCurrentView(view as AppView)} />;
      case "dashboard":
        return <Dashboard instanceId={instanceId} />;
      case "search":
      default:
        return (
          <div className="h-full flex flex-col gap-6">
            <div className="bg-card border rounded-xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Database className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground tracking-tight">
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
                    className={`gap-1.5 h-8 text-xs font-medium transition-all ${showAIInput ? "bg-primary/10 text-primary border-primary/20" : ""}`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    {t("ai.assistant")}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <SearchPanel
                    onSearch={handleSearch}
                    onQueryChange={(q, idx) => {
                      setPendingSearchQuery(q || null);
                      setPendingSearchIndex(idx);
                    }}
                  />
                </div>
                <Button
                  onClick={handleExecuteQuery}
                  variant={
                    dslCheck && !dslCheck.isSafe ? "destructive" : "default"
                  }
                  className="h-11 px-6 rounded-xl shadow-md font-medium text-sm gap-2 shrink-0 transition-all hover:shadow-lg active:scale-95"
                  disabled={isExecuting}
                >
                  {isExecuting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {t("app.executeQuery")}
                </Button>
              </div>

              {selectedIndex && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-muted-foreground">
                    {t("app.currentIndex")}
                  </span>
                  <span className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    {selectedIndex}
                  </span>
                </div>
              )}

              {showAIInput && (
                <div className="mb-6 p-6 bg-card border rounded-xl shadow-sm space-y-5">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-card-foreground">
                        {t("ai.assistant")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("ai.assistantDesc")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aiQuery" className="text-sm font-medium">
                      {t("app.naturalLanguageQuery")}
                    </Label>
                    <Input
                      id="aiQuery"
                      placeholder={t("ai.placeholder")}
                      value={aiQuery}
                      onChange={(e) => setAIQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAIGenerate()}
                      className="bg-background"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg border">
                      <span className="font-medium text-foreground mr-1">
                        {t("app.promptConstraint")}
                      </span>
                      {t("app.promptConstraintDesc")}
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowAIInput(false)}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        onClick={handleAIGenerate}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            {t("ai.generating")}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            {t("ai.generate")}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {/* Query Editor */}
              <div
                className={`bg-background rounded-xl border shadow-sm flex flex-col overflow-hidden transition-all duration-300 ${isQueryEditorCollapsed ? "h-[44px] flex-none" : "flex-1 min-h-[200px]"}`}
              >
                <div
                  className="flex items-center justify-between px-3 py-2 border-b bg-card cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() =>
                    setIsQueryEditorCollapsed(!isQueryEditorCollapsed)
                  }
                >
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    >
                      {isQueryEditorCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-sm font-semibold text-foreground tracking-tight">
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
                        onClick={() =>
                          setQuery(
                            '{\n  "query": {\n    "match_all": {}\n  }\n}',
                          )
                        }
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {t("common.clear")}
                      </Button>
                    </div>
                  )}
                </div>

                {!isQueryEditorCollapsed && (
                  <div className="flex-1 relative min-h-0 animate-in fade-in duration-300">
                    <div className="absolute inset-0">
                      <MonacoEditor
                        value={query}
                        onChange={setQuery}
                        language="json"
                        height="100%"
                        theme={effectiveTheme}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Query Result */}
              <div
                className={`bg-background rounded-xl border shadow-sm flex flex-col overflow-hidden transition-all duration-300 ${isQueryEditorCollapsed ? "flex-[3]" : "flex-1"} min-h-[300px]`}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b bg-card">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-semibold text-foreground tracking-tight">
                      {t("app.results")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setResultViewMode("json")}
                        className={`h-6 px-2.5 text-xs rounded-md ${resultViewMode === "json" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                      >
                        {t("app.json")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setResultViewMode("table")}
                        className={`h-6 px-2.5 text-xs rounded-md ${resultViewMode === "table" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                      >
                        {t("app.table")}
                      </Button>
                    </div>
                    {queryResult && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQueryResult(null)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {t("common.clear")}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex-1 relative bg-background overflow-hidden min-h-0 flex flex-col">
                  {isExecuting ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  ) : null}
                  {resultViewMode === "json" ? (
                    <div className="flex-1 relative min-h-0">
                      <div className="absolute inset-0">
                        <MonacoEditor
                          value={formattedJsonResult}
                          onChange={() => {}}
                          language="json"
                          height="100%"
                          theme={effectiveTheme}
                          readOnly={true}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-auto p-2">
                      {renderBatchActionBar()}
                      {queryResult?.hits?.hits &&
                      queryResult.hits.hits.length > 0 ? (
                        <div className="flex flex-col h-full">
                          <div className="flex-1 overflow-auto rounded-md border">
                            <table className="w-full text-sm text-left text-muted-foreground relative">
                              <thead className="text-xs text-foreground uppercase bg-muted/50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                  <th className="px-4 py-2 w-10 text-center">
                                    <input
                                      type="checkbox"
                                      className="rounded border-muted-foreground/30 accent-primary"
                                      checked={
                                        selectedDocs.size > 0 &&
                                        selectedDocs.size ===
                                          queryResult.hits.hits.length
                                      }
                                      onChange={toggleSelectAll}
                                    />
                                  </th>
                                  <th className="px-4 py-2 font-medium">
                                    _index
                                  </th>
                                  <th className="px-4 py-2 font-medium">_id</th>
                                  {tableColumns.map((key) => (
                                    <th
                                      key={key}
                                      className="px-4 py-2 font-medium cursor-pointer hover:bg-muted/80 transition-colors group select-none"
                                      onClick={() => {
                                        const newOrder =
                                          sortField === key &&
                                          sortOrder === "desc"
                                            ? "asc"
                                            : "desc";
                                        executeQuery(
                                          1,
                                          pageSize,
                                          key,
                                          newOrder,
                                        );
                                      }}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        {key}
                                        <span className="flex items-center">
                                          {sortField === key ? (
                                            sortOrder === "asc" ? (
                                              <ArrowUp className="w-3.5 h-3.5 text-primary" />
                                            ) : (
                                              <ArrowDown className="w-3.5 h-3.5 text-primary" />
                                            )
                                          ) : (
                                            <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                                          )}
                                        </span>
                                      </div>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {queryResult.hits.hits.map(
                                  (hit: ESHit, idx: number) => (
                                    <tr
                                      key={hit._id || idx}
                                      className="border-b last:border-0 hover:bg-muted/20"
                                    >
                                      <td className="px-4 py-2 w-10 text-center">
                                        <input
                                          type="checkbox"
                                          className="rounded border-muted-foreground/30 accent-primary"
                                          checked={selectedDocs.has(
                                            `${hit._index}|${hit._id}`,
                                          )}
                                          onChange={(e) =>
                                            toggleSelectDoc(
                                              hit,
                                              e.target.checked,
                                            )
                                          }
                                        />
                                      </td>
                                      <td className="px-4 py-2 font-medium text-foreground">
                                        {hit._index}
                                      </td>
                                      <td className="px-4 py-2 font-medium text-foreground">
                                        {hit._id}
                                      </td>
                                      {tableColumns.map((key) => {
                                        const val = hit._source?.[key];
                                        const displayStr = getTruncatedString(
                                          val,
                                          100,
                                        );
                                        const titleStr = getTruncatedString(
                                          val,
                                          400,
                                        );
                                        return (
                                          <td
                                            key={key}
                                            className="px-4 py-2 truncate max-w-[200px]"
                                            title={titleStr}
                                          >
                                            {displayStr}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Pagination Controls */}
                          <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <div className="text-xs text-muted-foreground">
                              {t("common.total")}:{" "}
                              <span className="font-medium text-foreground">
                                {typeof queryResult.hits.total === "object"
                                  ? queryResult.hits.total.value
                                  : queryResult.hits.total}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-xs text-muted-foreground">
                                {t("common.page")} {currentPage}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-3 text-xs"
                                  disabled={currentPage <= 1 || isExecuting}
                                  onClick={() =>
                                    executeQuery(
                                      currentPage - 1,
                                      pageSize,
                                      sortField,
                                      sortOrder,
                                    )
                                  }
                                >
                                  {t("common.prevPage")}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-3 text-xs"
                                  disabled={
                                    currentPage * pageSize >=
                                      (typeof queryResult.hits.total ===
                                      "object"
                                        ? queryResult.hits.total.value
                                        : queryResult.hits.total) || isExecuting
                                  }
                                  onClick={() =>
                                    executeQuery(
                                      currentPage + 1,
                                      pageSize,
                                      sortField,
                                      sortOrder,
                                    )
                                  }
                                >
                                  {t("common.nextPage")}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-4">
                          {queryResult?.error ? (
                            <div className="text-center">
                              <div className="text-destructive text-base font-medium mb-4">
                                {queryResult.error}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 h-9"
                                onClick={() => {
                                  setAIQuery(`分析以下 Elasticsearch 查询错误并提供解决方案: ${queryResult.error}`)
                                  setShowAIInput(true)
                                }}
                              >
                                <Sparkles className="w-4 h-4 text-primary" />
                                {t("ai.assistant")}
                              </Button>
                            </div>
                          ) : (
                            t("app.noTableData")
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {dslCheck && !dslCheck.isSafe && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl mt-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-destructive mb-2">
                      {t("app.dangerousOpWarning")}
                    </h4>
                    <ul className="space-y-1">
                      {dslCheck.dangerousOperations.map((op, i) => (
                        <li
                          key={i}
                          className="text-sm text-destructive/80 flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive/60" />
                          {op}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {isEditModalOpen && docToEdit && (
              <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[700px] flex flex-col h-[600px] p-0 overflow-hidden bg-card/95 backdrop-blur-xl">
                  <DialogHeader className="p-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                      <Edit2 className="w-4 h-4 text-primary" />
                      {t("search.editDocument")}
                      <span className="text-xs text-muted-foreground font-normal ml-2 bg-muted px-2 py-0.5 rounded-md border">
                        {docToEdit._index} / {docToEdit._id}
                      </span>
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
                  <div className="p-4 border-t flex justify-end gap-2 bg-card">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditModalOpen(false)}
                    >
                      {t("cancel")}
                    </Button>
                    <Button onClick={handleSaveDoc} disabled={isExecuting}>
                      {isExecuting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckSquare className="w-4 h-4 mr-2" />
                      )}
                      {t("common.save")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onToolChange={handleToolChange} currentView={currentView} />

        <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
          <div className="flex items-center justify-between px-6 bg-card border-b z-10 shadow-sm h-[60px]">
            <div className="flex items-center gap-4">
              <GlobalSelector />
              <div className="h-4 w-px bg-border/60 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInstanceManager(true)}
                className="h-8 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted px-2"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("app.addInstance")}
              </Button>
            </div>

            <div className="flex items-center gap-2 justify-end shrink-0">
              <AIProviderSelector />
              <div className="h-4 w-px bg-border/40 mx-1" />
              <LanguageSelector />
              <ThemeSelector />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {selectedInstanceId ? (
              renderWorkspace()
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <div className="mb-8">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/10 mb-6 border border-primary/20 overflow-hidden">
                      <img
                        src={logoSrc}
                        alt="Logo"
                        className="w-12 h-12 object-contain"
                      />
                    </div>
                    <h2 className="text-3xl font-bold text-foreground mb-4 tracking-tight">
                      {t("app.welcome")}
                    </h2>
                    <p className="text-muted-foreground text-lg mb-8">
                      {t("app.welcomeDesc")}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-card rounded-xl border shadow-sm">
                      <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">
                        {t("app.aiAssist")}
                      </p>
                    </div>
                    <div className="p-4 bg-card rounded-xl border shadow-sm">
                      <Database className="w-6 h-6 text-green-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">
                        {t("app.esQuery")}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => setShowInstanceManager(true)}
                    size="lg"
                    className="shadow-md px-8 h-12 text-base gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    {t("app.addInstance")}
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

      {showDangerConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {t("app.dangerousOpWarning")}
                </h3>
                <p className="text-sm text-gray-400">
                  {t("app.proceedWithCaution")}
                </p>
              </div>
            </div>
            <p className="text-gray-300 mb-6">{t("app.dangerousOpDesc")}</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDangerConfirm(false)}
                className="flex-1 border-gray-600"
              >
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDangerousConfirm}
                className="flex-1"
              >
                {t("app.executeAnyway")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
