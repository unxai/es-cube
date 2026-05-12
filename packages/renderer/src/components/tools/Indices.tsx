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

  if (loading && indices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading indices...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {t("indices.title")}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {t("indices.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder={t("indices.filter")} 
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9 w-64 bg-background/50 h-9 text-muted-foreground/70 placeholder:text-muted-foreground/50 focus:text-foreground"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchIndices}
            disabled={loading}
            className="gap-2 h-9"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-3">
          <Box className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-4 py-3 font-semibold text-muted-foreground w-20">{t("indices.table.health")}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">{t("indices.table.name")}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-center">{t("indices.table.status")}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">{t("indices.table.pri")}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">{t("indices.table.rep")}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">{t("indices.table.docs")}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">{t("indices.table.size")}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right w-20">{t("indices.table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedIndices.map((idx) => (
                <tr key={idx.index} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-4 py-3">
                    <div 
                      className={`w-3 h-3 rounded-full shadow-sm ${
                        idx.health === 'green' ? 'bg-green-500' : 
                        idx.health === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} 
                      title={idx.health}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => handleSearchIndex(idx.index)}
                      className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5 group/link"
                    >
                      {idx.index}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </button>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{idx.uuid}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      idx.status === 'open' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                    }`}>
                      {idx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground font-mono">{idx.pri}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground font-mono">{idx.rep}</td>
                  <td className="px-4 py-3 text-right font-medium">{parseInt(idx['docs.count']).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium">{idx['store.size']}</td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleSearchIndex(idx.index)} className="gap-2">
                          <Search className="w-4 h-4" /> {t('indices.actions.search')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewDetail(idx)} className="gap-2">
                          <Info className="w-4 h-4" /> {t('indices.actions.mapping')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleClearIndex(idx.index)} className="gap-2 text-warning">
                          <Eraser className="w-4 h-4" /> {t('indices.actions.clearDocs')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteIndex(idx.index)} className="gap-2 text-destructive">
                          <Trash2 className="w-4 h-4" /> {t('indices.actions.deleteIndex')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {paginatedIndices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground italic">
                    {loading ? 'Fetching indices...' : 'No indices found matching your query.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-muted/20 border-t flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {t('common.total')}: <span className="font-medium text-foreground">{filteredIndices.length}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xs text-muted-foreground">
                {t('common.page')} {currentPage} / {totalPages}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  title={t('common.prevPage')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  title={t('common.nextPage')}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Dialog */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              {selectedIdx?.index}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
            {isLoadingDetail ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading mapping...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {mappingData?.aliases && Object.keys(mappingData.aliases).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      <Tag className="w-3 h-3" /> {t('indices.actions.aliases')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(mappingData.aliases).map(alias => (
                        <span key={alias} className="px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md text-xs font-medium">
                          {alias}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <Info className="w-3 h-3" /> Mapping
                  </div>
                  <pre className="bg-card border rounded-lg p-4 text-[13px] font-mono overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(mappingData?.mappings, null, 2)}
                  </pre>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <Settings className="w-3 h-3" /> Settings
                  </div>
                  <pre className="bg-card border rounded-lg p-4 text-[13px] font-mono overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(mappingData?.settings, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t bg-card">
            <Button onClick={() => setShowInfo(false)}>{t('common.cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
