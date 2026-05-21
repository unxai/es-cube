import { useEffect, useState, useMemo } from 'react'
import { 
  RefreshCw, 
  Search, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  LayoutGrid, 
  Table2, 
  Database, 
  Server, 
  Activity, 
  Layers, 
  HardDrive 
} from 'lucide-react'
import type { PluginComponentProps } from '../../../shared/types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useAppStore } from '../../store/useAppStore'

interface ShardInfo {
  index: string
  shard: string
  prirep: string
  state: string
  docs: string
  store: string
  ip: string
  node: string
}

export function Shards({ instanceId }: PluginComponentProps) {
  const { t } = useAppStore()
  const [shards, setShards] = useState<ShardInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<'matrix' | 'table'>('matrix')

  // Pagination for Table View
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12

  const fetchShards = async () => {
    setLoading(true)
    try {
      const result = await window.api.es.executeQuery(
        instanceId, 
        'GET', 
        '/_cat/shards?format=json&h=index,shard,prirep,state,docs,store,ip,node&s=index,shard'
      )
      if (result.success) {
        setShards(result.data)
        setCurrentPage(1)
      } else {
        throw new Error(result.error || 'Failed to fetch shards')
      }
    } catch {
      // Errors are silently ignored
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShards()
  }, [instanceId])

  const filteredShards = useMemo(() => {
    return shards.filter(shard => 
      shard.index.toLowerCase().includes(query.toLowerCase()) || 
      (shard.node && shard.node.toLowerCase().includes(query.toLowerCase()))
    )
  }, [shards, query])

  // Grouped shards for Topology Matrix View
  const groupedByIndex = useMemo(() => {
    const groups: { [key: string]: { index: string; shards: { [key: string]: ShardInfo[] }; totalDocs: number; totalStoreBytes: number } } = {}
    
    filteredShards.forEach(s => {
      if (!groups[s.index]) {
        groups[s.index] = { index: s.index, shards: {}, totalDocs: 0, totalStoreBytes: 0 }
      }
      if (!groups[s.index].shards[s.shard]) {
        groups[s.index].shards[s.shard] = []
      }
      groups[s.index].shards[s.shard].push(s)
      
      // Accumulate docs
      if (s.docs) {
        groups[s.index].totalDocs += parseInt(s.docs) || 0
      }
    })
    
    return Object.values(groups)
  }, [filteredShards])

  // Pagination for Table View
  const paginatedShards = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredShards.slice(start, start + pageSize)
  }, [filteredShards, currentPage])

  const totalPages = Math.ceil(filteredShards.length / pageSize)

  if (loading && shards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Activity className="w-5 h-5 text-primary absolute animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground/80 font-medium tracking-wide">
          Loading shards topology...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 头部面板 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {t("shards.title")}
              </h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                {t("shards.description")}
              </p>
            </div>
          </div>
        </div>

        {/* 交互控制栏 */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 视图切换 Segmented Control */}
          <div className="flex bg-secondary/80 p-0.5 rounded-lg border border-border/40 backdrop-blur-md">
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-300 ${
                viewMode === 'matrix' 
                  ? 'bg-card text-foreground shadow-sm border border-border/5' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {t("shards.view.matrix") || "Topology Matrix"}
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-300 ${
                viewMode === 'table' 
                  ? 'bg-card text-foreground shadow-sm border border-border/5' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              {t("shards.view.table") || "Data Table"}
            </button>
          </div>

          {/* 过滤搜索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input 
              placeholder={t("shards.filter")} 
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9 w-52 md:w-60 bg-card/60 backdrop-blur-sm h-9 border-border/60 text-muted-foreground/90 placeholder:text-muted-foreground/40 focus:border-primary/50 transition-all text-xs"
            />
          </div>

          {/* 刷新 */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchShards}
            disabled={loading}
            className="gap-2 h-9 px-3 border-border/60 bg-card/60 hover:bg-muted/50 backdrop-blur-sm text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      {/* 视图展示区 */}
      {viewMode === 'matrix' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {groupedByIndex.map((idxGroup) => (
            <div 
              key={idxGroup.index} 
              className="glass-panel rounded-xl p-5 shadow-sm border border-border/20 transition-all hover:border-primary/20 hover:shadow-md flex flex-col justify-between"
            >
              <div>
                {/* 索引名头部 */}
                <div className="flex items-center justify-between mb-4 border-b border-border/30 pb-3">
                  <div className="flex items-center gap-2 overflow-hidden mr-3">
                    <Database className="w-4 h-4 text-primary/75 shrink-0" />
                    <span className="font-semibold text-foreground text-sm truncate" title={idxGroup.index}>
                      {idxGroup.index}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[10px] text-muted-foreground font-mono bg-muted/30 px-2 py-0.5 rounded-full border border-border/20">
                    <span>Docs: {idxGroup.totalDocs.toLocaleString()}</span>
                  </div>
                </div>

                {/* 分片芯片拓扑矩阵 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Object.entries(idxGroup.shards)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([shardId, shardInfos]) => (
                      <div 
                        key={shardId} 
                        className="bg-muted/20 border border-border/40 rounded-lg p-2.5 flex flex-col gap-1.5"
                      >
                        {/* 分片序列号 */}
                        <div className="text-[10px] font-bold text-muted-foreground/80 tracking-wider">
                          SHARD #{shardId}
                        </div>

                        {/* 芯片排布 */}
                        <div className="flex flex-wrap gap-1.5">
                          {shardInfos.map((shard, shardIdx) => {
                            const isPrimary = shard.prirep === 'p'
                            const isStarted = shard.state === 'STARTED'
                            const isUnassigned = shard.state === 'UNASSIGNED'
                            
                            return (
                              <div 
                                key={shardIdx}
                                className={`group relative flex items-center justify-center px-2 py-1 rounded text-[10px] font-mono font-semibold border tracking-tight cursor-help transition-all ${
                                  isPrimary 
                                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/15' 
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/15'
                                }`}
                              >
                                <span>{isPrimary ? 'P' : 'R'}</span>

                                {/* 状态指示呼吸灯 */}
                                <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                    isStarted ? 'bg-emerald-400' : isUnassigned ? 'bg-rose-400' : 'bg-amber-400'
                                  }`}></span>
                                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                                    isStarted ? 'bg-emerald-500' : isUnassigned ? 'bg-rose-500' : 'bg-amber-500'
                                  }`}></span>
                                </span>

                                {/* 悬浮的高清 Glassmorphism Tooltip */}
                                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 opacity-0 group-hover:opacity-100 transition-all duration-300 z-50 glass-panel p-3.5 rounded-xl shadow-xl border border-border/30 text-left">
                                  <div className="flex items-center justify-between border-b border-border/20 pb-1.5 mb-1.5">
                                    <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                                      <Layers className="w-3.5 h-3.5 text-primary" />
                                      Shard #{shard.shard} ({isPrimary ? 'Primary' : 'Replica'})
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                      isStarted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                    }`}>
                                      {shard.state}
                                    </span>
                                  </div>
                                  <div className="space-y-1 text-[10px] text-muted-foreground font-mono">
                                    <div className="flex justify-between">
                                      <span>Index:</span>
                                      <span className="text-foreground font-medium truncate max-w-[120px]">{shard.index}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="flex items-center gap-1"><Server className="w-3 h-3" /> Node:</span>
                                      <span className="text-foreground font-medium">{shard.node || <span className="text-destructive">UNASSIGNED</span>}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>IP Address:</span>
                                      <span className="text-foreground font-medium">{shard.ip || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Documents:</span>
                                      <span className="text-foreground font-medium">{shard.docs ? parseInt(shard.docs).toLocaleString() : '0'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> Size:</span>
                                      <span className="text-foreground font-medium">{shard.store || '-'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
          {groupedByIndex.length === 0 && (
            <div className="col-span-full py-16 text-center glass-panel rounded-xl border border-border/10">
              <p className="text-muted-foreground text-sm italic">
                No active indices found matching your query.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* 表格展示视图 */
        <div className="glass-panel border border-border/20 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/30">
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground">{t("shards.table.index")}</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground text-center">{t("shards.table.shard")}</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground text-center">{t("shards.table.type")}</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground text-center">{t("shards.table.state")}</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground text-right">{t("shards.table.docs")}</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground text-right">{t("shards.table.size")}</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground">{t("shards.table.node")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {paginatedShards.map((shard, i) => {
                  const isStarted = shard.state === 'STARTED'
                  const isUnassigned = shard.state === 'UNASSIGNED'
                  
                  return (
                    <tr 
                      key={`${shard.index}-${shard.shard}-${i}`} 
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-5 py-3 font-medium text-foreground">{shard.index}</td>
                      <td className="px-5 py-3 text-center font-mono font-bold text-muted-foreground">{shard.shard}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
                          shard.prirep === 'p' 
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {shard.prirep === 'p' ? 'Primary' : 'Replica'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-muted/40 border border-border/30">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              isStarted ? 'bg-emerald-400' : isUnassigned ? 'bg-rose-400' : 'bg-amber-400'
                            }`}></span>
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                              isStarted ? 'bg-emerald-500' : isUnassigned ? 'bg-rose-500' : 'bg-amber-500'
                            }`}></span>
                          </span>
                          <span className={isStarted ? 'text-emerald-500' : isUnassigned ? 'text-rose-500' : 'text-amber-500'}>
                            {shard.state}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground font-mono">
                        {shard.docs ? parseInt(shard.docs).toLocaleString() : '-'}
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground font-mono">
                        {shard.store || '-'}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground font-medium">
                        {shard.node ? (
                          <span className="flex items-center gap-1.5">
                            <Server className="w-3.5 h-3.5 text-muted-foreground/60" />
                            {shard.node}
                          </span>
                        ) : (
                          <span className="text-destructive font-semibold flex items-center gap-1.5">
                            <Server className="w-3.5 h-3.5 text-destructive/60" />
                            {t("shards.table.unassigned")}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {paginatedShards.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-muted-foreground italic">
                      {loading ? 'Fetching shards...' : 'No shards found matching your query.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-5 py-3 bg-muted/10 border-t border-border/20 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {t('common.total')}: <span className="font-semibold text-foreground">{filteredShards.length}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-xs text-muted-foreground">
                  {t('common.page')} {currentPage} / {totalPages}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-card/60 hover:bg-muted/50 border-border/60"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    title={t('common.prevPage')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-card/60 hover:bg-muted/50 border-border/60"
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
      )}
    </div>
  )
}
