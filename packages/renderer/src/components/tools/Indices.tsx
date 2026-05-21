import { useEffect, useState, useMemo } from 'react'
import { 
  RefreshCw, 
  Search, 
  Box, 
  Database, 
  Loader2, 
  MoreHorizontal, 
  Trash2, 
  Eraser, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight,
  Info,
  Tag,
  Settings
} from 'lucide-react'
import type { PluginComponentProps } from '../../../shared/types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '../ui/dialog'
import { useAppStore } from '../../store/useAppStore'
import { useConnectionStore } from '../../store/useConnectionStore'
import { toast } from 'sonner'

interface IndexInfo {
  health: string
  status: string
  index: string
  uuid: string
  pri: string
  rep: string
  'docs.count': string
  'docs.deleted': string
  'store.size': string
  'pri.store.size': string
}

interface IndicesProps extends PluginComponentProps {
  onViewChange?: (view: string) => void
}

// 辅助大小转换（转成字节做比例计算）
function parseSizeToBytes(sizeStr: string): number {
  if (!sizeStr) return 0;
  const cleaned = sizeStr.toLowerCase().trim();
  const value = parseFloat(cleaned);
  if (isNaN(value)) return 0;
  
  if (cleaned.endsWith('kb')) return value * 1024;
  if (cleaned.endsWith('mb')) return value * 1024 * 1024;
  if (cleaned.endsWith('gb')) return value * 1024 * 1024 * 1024;
  if (cleaned.endsWith('tb')) return value * 1024 * 1024 * 1024 * 1024;
  if (cleaned.endsWith('b')) return value;
  return value; // 默认
}

export function Indices({ instanceId, onViewChange }: IndicesProps) {
  const { t } = useAppStore()
  const { setSelectedIndex } = useConnectionStore()
  const [indices, setIndices] = useState<IndexInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12

  // Mapping/Info Dialog
  const [selectedIdx, setSelectedIdx] = useState<IndexInfo | null>(null)
  const [mappingData, setMappingData] = useState<Record<string, unknown> | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  const fetchIndices = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.es.executeQuery(instanceId, 'GET', '/_cat/indices?format=json&h=health,status,index,uuid,pri,rep,docs.count,docs.deleted,store.size,pri.store.size&s=index')
      if (result.success) {
        setIndices(result.data)
        setCurrentPage(1)
      } else {
        throw new Error(result.error || 'Failed to fetch indices')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIndices()
  }, [instanceId])

  const filteredIndices = useMemo(() => {
    return indices.filter(idx => idx.index.toLowerCase().includes(query.toLowerCase()))
  }, [indices, query])

  const paginatedIndices = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredIndices.slice(start, start + pageSize)
  }, [filteredIndices, currentPage])

  const totalPages = Math.ceil(filteredIndices.length / pageSize)

  // 存储最大大小和文档数，用于柱状指示图占比计算
  const maxBytes = useMemo(() => {
    const sizes = indices.map(idx => parseSizeToBytes(idx['store.size']));
    return Math.max(...sizes, 1);
  }, [indices]);

  const maxDocs = useMemo(() => {
    const docCounts = indices.map(idx => parseInt(idx['docs.count']) || 0);
    return Math.max(...docCounts, 1);
  }, [indices]);

  const handleSearchIndex = (indexName: string) => {
    setSelectedIndex(indexName)
    onViewChange?.('search')
  }

  const handleViewDetail = async (idx: IndexInfo) => {
    setSelectedIdx(idx)
    setShowInfo(true)
    setIsLoadingDetail(true)
    try {
      const result = await window.api.es.executeQuery(instanceId, 'GET', `/${idx.index}`)
      if (result.success) {
        setMappingData(result.data[idx.index])
      }
    } catch {
      toast.error('Failed to load mapping')
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleClearIndex = async (indexName: string) => {
    if (!confirm(t('indices.actions.confirmClear'))) return
    
    try {
      const result = await window.api.es.executeQuery(instanceId, 'POST', `/${indexName}/_delete_by_query`, {
        query: { match_all: {} }
      })
      if (result.success) {
        toast.success(`Cleared documents in ${indexName}`)
        fetchIndices()
      } else {
        toast.error(result.error || 'Failed to clear documents')
      }
    } catch {
      toast.error('Operation failed')
    }
  }

  const handleDeleteIndex = async (indexName: string) => {
    if (!confirm(t('indices.actions.confirmDelete'))) return
    
    try {
      const result = await window.api.es.executeQuery(instanceId, 'DELETE', `/${indexName}`)
      if (result.success) {
        toast.success(`Deleted index ${indexName}`)
        fetchIndices()
      } else {
        toast.error(result.error || 'Failed to delete index')
      }
    } catch {
      toast.error('Operation failed')
    }
  }

  const getHealthIndicator = (healthVal: string) => {
    switch (healthVal) {
      case 'green':
        return (
          <div className="relative w-4 h-4 shrink-0 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500 opacity-20 scale-125 pulse-ring-green" />
            <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot-green shadow-sm shadow-emerald-500/20" />
          </div>
        );
      case 'yellow':
        return (
          <div className="relative w-4 h-4 shrink-0 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-amber-500 opacity-20 scale-125 pulse-ring-green" />
            <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/20" />
          </div>
        );
      case 'red':
      default:
        return (
          <div className="relative w-4 h-4 shrink-0 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-rose-500 opacity-25 scale-125 pulse-ring-green animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/20" />
          </div>
        );
    }
  };

  if (loading && indices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3.5">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-primary/10 border-t-primary animate-spin" />
          <Database className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-xs text-muted-foreground font-semibold animate-pulse tracking-wider">
          Loading indices...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      {/* 标题 & 过滤 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground tracking-tight">
              {t("indices.title")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("indices.description")}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
            <Input 
              placeholder={t("indices.filter")} 
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9 w-52 bg-background/80 h-9 rounded-xl border border-border/80 focus-visible:ring-primary/40 text-xs text-muted-foreground/80 placeholder:text-muted-foreground/45"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchIndices}
            disabled={loading}
            className="gap-2 h-9 px-4 rounded-xl border-border/80 hover:bg-muted active:scale-95 transition-all text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t("common.refresh")}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/5 dark:bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs flex items-center gap-3 animate-in zoom-in-95 duration-200">
          <Box className="w-4 h-4 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* 旗舰化毛玻璃表格面板 */}
      <div className="bg-card/65 dark:bg-slate-900/40 backdrop-blur-md border border-border/60 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border/40 text-foreground font-semibold">
                <th className="px-4 py-3 text-center w-16">{t("indices.table.health")}</th>
                <th className="px-4 py-3">{t("indices.table.name")}</th>
                <th className="px-4 py-3 text-center w-24">{t("indices.table.status")}</th>
                <th className="px-4 py-3 text-right w-16">{t("indices.table.pri")}</th>
                <th className="px-4 py-3 text-right w-16">{t("indices.table.rep")}</th>
                <th className="px-4 py-3 text-right w-36">{t("indices.table.docs")}</th>
                <th className="px-4 py-3 text-right w-36">{t("indices.table.size")}</th>
                <th className="px-4 py-3 text-center w-16">{t("indices.table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paginatedIndices.map((idx) => {
                const docCount = parseInt(idx['docs.count']) || 0;
                const storeSize = parseSizeToBytes(idx['store.size']);
                
                // 占比比例计算
                const sizePercentage = (storeSize / maxBytes) * 100;
                const docsPercentage = (docCount / maxDocs) * 100;

                return (
                  <tr key={idx.index} className="hover:bg-primary/5 active:bg-primary/10 transition-colors duration-150 group">
                    {/* 心跳呼吸灯健康单元 */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center">
                        {getHealthIndicator(idx.health)}
                      </div>
                    </td>
                    
                    <td className="px-4 py-4 max-w-[200px] truncate">
                      <button 
                        onClick={() => handleSearchIndex(idx.index)}
                        className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5 font-mono text-[11px] group/link cursor-pointer"
                      >
                        {idx.index}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 text-primary transition-opacity" />
                      </button>
                      <div className="text-[9px] text-muted-foreground/75 mt-0.5 font-mono select-all truncate">{idx.uuid}</div>
                    </td>
                    
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        idx.status === 'open' 
                          ? 'bg-green-500/10 text-green-500 border border-green-500/20 shadow-sm' 
                          : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                      }`}>
                        {idx.status}
                      </span>
                    </td>
                    
                    <td className="px-4 py-4 text-right text-muted-foreground font-mono text-[10px]">{idx.pri}</td>
                    <td className="px-4 py-4 text-right text-muted-foreground font-mono text-[10px]">{idx.rep}</td>
                    
                    {/* 文档数比例条 */}
                    <td className="px-4 py-4 text-right space-y-1">
                      <div className="font-semibold text-foreground/80">{docCount.toLocaleString()}</div>
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="h-1 w-16 bg-muted rounded-full overflow-hidden shrink-0">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: `${docsPercentage || 2}%` }} />
                        </div>
                        <span className="text-[8px] text-muted-foreground/60 shrink-0 min-w-[20px] font-mono">{Math.round(docsPercentage)}%</span>
                      </div>
                    </td>
                    
                    {/* 存储大小比例条 */}
                    <td className="px-4 py-4 text-right space-y-1">
                      <div className="font-semibold text-foreground/80">{idx['store.size']}</div>
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="h-1 w-16 bg-muted rounded-full overflow-hidden shrink-0">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${sizePercentage || 2}%` }} />
                        </div>
                        <span className="text-[8px] text-muted-foreground/60 shrink-0 min-w-[20px] font-mono">{Math.round(sizePercentage)}%</span>
                      </div>
                    </td>
                    
                    <td className="px-4 py-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted rounded-lg active:scale-95 transition-all">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-xl border border-border/80 rounded-xl shadow-lg">
                          <DropdownMenuItem onClick={() => handleSearchIndex(idx.index)} className="gap-2 text-xs font-semibold rounded-lg cursor-pointer">
                            <Search className="w-3.5 h-3.5 text-primary" /> {t('indices.actions.search')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewDetail(idx)} className="gap-2 text-xs font-semibold rounded-lg cursor-pointer">
                            <Info className="w-3.5 h-3.5 text-blue-500" /> {t('indices.actions.mapping')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="border-border/40" />
                          <DropdownMenuItem onClick={() => handleClearIndex(idx.index)} className="gap-2 text-xs font-semibold text-amber-500 focus:text-amber-500 rounded-lg cursor-pointer">
                            <Eraser className="w-3.5 h-3.5" /> {t('indices.actions.clearDocs')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteIndex(idx.index)} className="gap-2 text-xs font-semibold text-rose-500 focus:text-rose-500 rounded-lg cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" /> {t('indices.actions.deleteIndex')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
              {paginatedIndices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground italic text-xs leading-relaxed">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        Fetching indices...
                      </span>
                    ) : 'No indices found matching your query.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分页控制 (带有极窄发光阴影) */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-muted/20 border-t border-border/40 flex items-center justify-between shrink-0">
            <div className="text-[10px] text-muted-foreground">
              {t('common.total')}: <span className="font-semibold text-foreground/80 bg-muted px-2 py-0.5 rounded border border-border/40">{filteredIndices.length}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-[10px] text-muted-foreground font-semibold">
                {t('common.page')} {currentPage} / {totalPages}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-lg hover:bg-muted active:scale-95 transition-all"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  title={t('common.prevPage')}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-lg hover:bg-muted active:scale-95 transition-all"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  title={t('common.nextPage')}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 磨砂毛玻璃弹窗 Mapping Info Dialog */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="sm:max-w-[750px] max-h-[75vh] flex flex-col p-0 bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl">
          <DialogHeader className="p-4 pb-2 border-b bg-muted/20">
            <DialogTitle className="flex items-center justify-between text-xs font-bold font-mono">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                <span>{selectedIdx?.index}</span>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-5 bg-background space-y-5">
            {isLoadingDetail ? (
              <div className="flex flex-col items-center justify-center h-44 gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground font-semibold">Loading mapping details...</p>
              </div>
            ) : (
              <div className="space-y-5">
                {mappingData?.aliases && Object.keys(mappingData.aliases).length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      <Tag className="w-3 h-3 text-primary" /> {t('indices.actions.aliases')}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(mappingData.aliases).map(alias => (
                        <span key={alias} className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-[10px] font-semibold font-mono">
                          {alias}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Monaco JSON 的替换或极简高亮 pre 排布 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground/80 uppercase tracking-widest">
                    <Info className="w-3 h-3 text-blue-500" /> Mapping
                  </div>
                  <pre className="bg-muted/40 border border-border/60 rounded-xl p-4 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner max-h-56 overflow-y-auto">
                    {JSON.stringify(mappingData?.mappings, null, 2)}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground/80 uppercase tracking-widest">
                    <Settings className="w-3 h-3 text-emerald-500" /> Settings
                  </div>
                  <pre className="bg-muted/40 border border-border/60 rounded-xl p-4 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner max-h-44 overflow-y-auto">
                    {JSON.stringify(mappingData?.settings, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t flex justify-end bg-muted/20 shrink-0">
            <Button
              onClick={() => setShowInfo(false)}
              size="sm"
              className="h-8 text-xs font-semibold rounded-lg bg-primary text-white shadow-md active:scale-95 transition-all px-4"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
