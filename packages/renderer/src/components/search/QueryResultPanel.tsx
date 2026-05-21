import React from "react";
import {
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Loader2,
  Sparkles,
  Database,
  Layers,
} from "lucide-react";
import { Button } from "../ui/button";
import { MonacoEditor } from "../editor/MonacoEditor";
import { useAppStore } from "../../store/useAppStore";

export interface ESHit {
  _index: string;
  _id: string;
  _source: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ESQueryResult {
  hits?: {
    hits?: ESHit[];
    total?: number | { value: number; [key: string]: unknown };
    [key: string]: unknown;
  };
  error?: string;
  [key: string]: unknown;
}

interface QueryResultPanelProps {
  queryResult: ESQueryResult | null;
  isExecuting: boolean;
  resultViewMode: "json" | "table";
  setResultViewMode: (mode: "json" | "table") => void;
  setQueryResult: (res: ESQueryResult | null) => void;
  formattedJsonResult: string;
  isQueryEditorCollapsed: boolean;
  resultHeight: number;
  startResizingResult: (e: React.MouseEvent) => void;
  selectedDocs: Set<string>;
  toggleSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleSelectDoc: (hit: ESHit, checked: boolean) => void;
  renderBatchActionBar: () => React.ReactNode;
  tableColumns: string[];
  getTruncatedString: (val: unknown, limit?: number) => string;
  currentPage: number;
  pageSize: number;
  sortField: string | null;
  sortOrder: "asc" | "desc";
  executeQuery: (
    page?: number,
    size?: number,
    field?: string | null,
    order?: "asc" | "desc"
  ) => Promise<void>;
  handleEditDoc: (hit: ESHit) => void;
  effectiveTheme: string;
  setShowAIInput: (show: boolean) => void;
  setAIQuery: (q: string) => void;
}

export function QueryResultPanel({
  queryResult,
  isExecuting,
  resultViewMode,
  setResultViewMode,
  setQueryResult,
  formattedJsonResult,
  isQueryEditorCollapsed,
  resultHeight,
  startResizingResult,
  selectedDocs,
  toggleSelectAll,
  toggleSelectDoc,
  renderBatchActionBar,
  tableColumns,
  getTruncatedString,
  currentPage,
  pageSize,
  sortField,
  sortOrder,
  executeQuery,
  effectiveTheme,
  setShowAIInput,
  setAIQuery,
}: QueryResultPanelProps) {
  const { t } = useAppStore();

  const totalHits = queryResult?.hits?.total
    ? typeof queryResult.hits.total === "object"
      ? queryResult.hits.total.value
      : queryResult.hits.total
    : 0;

  return (
    <div
      className={`bg-background rounded-xl border border-border/80 shadow-sm flex flex-col overflow-hidden transition-all duration-300 ${
        isQueryEditorCollapsed ? "flex-1" : "flex-none"
      }`}
    >
      {/* 结果栏头部 */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20 pulse-dot-green" />
          <span className="text-xs font-semibold text-foreground tracking-tight">
            {t("app.results")}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border/40">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResultViewMode("json")}
              className={`h-6 px-2.5 text-[10px] font-semibold rounded-md transition-all ${
                resultViewMode === "json"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("app.json")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResultViewMode("table")}
              className={`h-6 px-2.5 text-[10px] font-semibold rounded-md transition-all ${
                resultViewMode === "table"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("app.table")}
            </Button>
          </div>
          {queryResult && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQueryResult(null)}
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground font-semibold rounded-md"
            >
              {t("common.clear")}
            </Button>
          )}
        </div>
      </div>

      {/* 主展示区 */}
      <div className="flex-1 relative bg-background overflow-hidden min-h-0 flex flex-col">
        {/* 全局科技感 loading 遮罩 */}
        {isExecuting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] z-20 animate-in fade-in duration-200">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-primary/10 border-t-primary animate-spin" />
              <Layers className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <span className="text-xs text-muted-foreground mt-3 font-semibold tracking-wider animate-pulse">
              Fetching documents...
            </span>
          </div>
        )}

        {/* JSON 模式 */}
        {resultViewMode === "json" ? (
          <div
            className="relative min-h-0"
            style={{
              height: isQueryEditorCollapsed ? "calc(100vh - 220px)" : `${resultHeight}px`,
            }}
          >
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
          /* 表格模式 */
          <div
            className="relative overflow-auto p-4 flex flex-col"
            style={{
              height: isQueryEditorCollapsed ? "calc(100vh - 220px)" : `${resultHeight}px`,
            }}
          >
            {renderBatchActionBar()}

            {queryResult?.hits?.hits && queryResult.hits.hits.length > 0 ? (
              <div className="flex flex-col h-full min-h-0">
                <div className="flex-1 overflow-auto rounded-lg border border-border/60 shadow-inner">
                  <table className="w-full text-xs text-left text-muted-foreground border-collapse">
                    <thead className="text-[10px] text-foreground font-semibold uppercase bg-muted/65 sticky top-0 z-10 shadow-sm border-b">
                      <tr>
                        <th className="px-4 py-2.5 w-10 text-center bg-muted/65">
                          <input
                            type="checkbox"
                            className="rounded border-muted-foreground/30 accent-primary focus:ring-0 w-3.5 h-3.5"
                            checked={
                              selectedDocs.size > 0 &&
                              selectedDocs.size === queryResult.hits.hits.length
                            }
                            onChange={toggleSelectAll}
                          />
                        </th>
                        <th className="px-4 py-2.5 font-semibold text-foreground/80 bg-muted/65">
                          _index
                        </th>
                        <th className="px-4 py-2.5 font-semibold text-foreground/80 bg-muted/65">
                          _id
                        </th>
                        {tableColumns.map((key) => (
                          <th
                            key={key}
                            className="px-4 py-2.5 font-semibold text-foreground/80 cursor-pointer hover:bg-muted/90 transition-colors group select-none bg-muted/65"
                            onClick={() => {
                              const newOrder =
                                sortField === key && sortOrder === "desc" ? "asc" : "desc";
                              executeQuery(1, pageSize, key, newOrder);
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{key}</span>
                              <span className="flex items-center">
                                {sortField === key ? (
                                  sortOrder === "asc" ? (
                                    <ArrowUp className="w-3.5 h-3.5 text-primary" />
                                  ) : (
                                    <ArrowDown className="w-3.5 h-3.5 text-primary" />
                                  )
                                ) : (
                                  <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:opacity-100 transition-opacity" />
                                )}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {queryResult.hits.hits.map((hit: ESHit, idx: number) => {
                        const isSelected = selectedDocs.has(`${hit._index}|${hit._id}`);
                        return (
                          <tr
                            key={hit._id || idx}
                            className={`hover:bg-primary/5 active:bg-primary/10 cursor-pointer transition-colors duration-150 ${
                              isSelected ? "bg-primary/5 dark:bg-primary/10" : ""
                            }`}
                            onClick={() => handleEditDoc(hit)}
                          >
                            <td
                              className="px-4 py-2.5 w-10 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                className="rounded border-muted-foreground/30 accent-primary focus:ring-0 w-3.5 h-3.5"
                                checked={isSelected}
                                onChange={(e) => toggleSelectDoc(hit, e.target.checked)}
                              />
                            </td>
                            <td className="px-4 py-2.5 font-medium text-foreground max-w-[120px] truncate">
                              <span className="px-2 py-0.5 bg-muted text-[10px] text-muted-foreground rounded border font-mono">
                                {hit._index}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-medium text-foreground max-w-[120px] truncate font-mono">
                              {hit._id}
                            </td>
                            {tableColumns.map((key) => {
                              const val = hit._source?.[key];
                              const displayStr = getTruncatedString(val, 100);
                              const titleStr = getTruncatedString(val, 400);
                              return (
                                <td
                                  key={key}
                                  className="px-4 py-2.5 truncate max-w-[200px]"
                                  title={titleStr}
                                >
                                  {displayStr}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 分页控制面板 */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60 shrink-0">
                  <div className="text-[10px] text-muted-foreground">
                    {t("common.total")}:{" "}
                    <span className="font-semibold text-foreground/80 bg-muted px-2 py-0.5 rounded border">
                      {totalHits.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-[10px] text-muted-foreground font-medium">
                      {t("common.page")} {currentPage}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-[10px] font-semibold rounded-md border-border/80 hover:bg-muted/80 active:scale-95 transition-all"
                        disabled={currentPage <= 1 || isExecuting}
                        onClick={() =>
                          executeQuery(currentPage - 1, pageSize, sortField, sortOrder)
                        }
                      >
                        {t("common.prevPage")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-[10px] font-semibold rounded-md border-border/80 hover:bg-muted/80 active:scale-95 transition-all"
                        disabled={currentPage * pageSize >= totalHits || isExecuting}
                        onClick={() =>
                          executeQuery(currentPage + 1, pageSize, sortField, sortOrder)
                        }
                      >
                        {t("common.nextPage")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* 无数据空状态 (Empty State) */
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-4 p-8 min-h-[300px]">
                {queryResult?.error ? (
                  <div className="text-center max-w-md p-6 rounded-xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 glass-panel animate-in zoom-in-95 duration-200">
                    <div className="text-destructive text-sm font-semibold mb-2">
                      Request Error
                    </div>
                    <div className="text-muted-foreground text-xs font-mono break-all leading-relaxed p-3 bg-background/50 rounded-lg border border-border/40 text-left max-h-[120px] overflow-auto">
                      {queryResult.error}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8 mt-4 text-xs font-semibold rounded-lg hover:bg-primary/5 active:scale-95 transition-all border-primary/20 hover:border-primary/40 text-primary"
                      onClick={() => {
                        setAIQuery(
                          `分析以下 Elasticsearch 查询错误并提供解决方案: ${queryResult.error}`
                        );
                        setShowAIInput(true);
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t("ai.assistant")}</span>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center flex flex-col items-center max-w-xs animate-in fade-in duration-300">
                    <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-4 border border-border/20 shadow-sm relative group overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <Database className="w-6 h-6 text-muted-foreground/50 transition-transform group-hover:scale-110 duration-200" />
                    </div>
                    <p className="text-xs font-semibold text-foreground/80 mb-1">
                      {t("app.noTableData") || "No query results yet"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/75 leading-relaxed">
                      Enter your DSL in the query editor above and click "Execute Query" to inspect cluster documents.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 底部阻尼拖拽条 (仅在未折叠且为 JSON 时) */}
        {!isQueryEditorCollapsed && (
          <div
            className="h-1.5 w-full bg-border/40 hover:bg-primary/20 cursor-row-resize transition-colors flex items-center justify-center relative z-10 shrink-0"
            onMouseDown={startResizingResult}
          >
            <div className="w-10 h-[3px] bg-muted-foreground/30 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}
