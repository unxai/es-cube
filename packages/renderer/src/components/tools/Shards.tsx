import { useEffect, useState, useMemo } from 'react'
import { RefreshCw, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  const fetchShards = async () => {
    setLoading(true)
    try {
      const result = await window.api.es.executeQuery(instanceId, 'GET', '/_cat/shards?format=json&h=index,shard,prirep,state,docs,store,ip,node&s=index,shard')
      if (result.success) {
        setShards(result.data)
        setCurrentPage(1)
      } else {
        throw new Error(result.error || 'Failed to fetch shards')
      }
    } catch {
      // Errors are silently ignored - shards table will remain empty if data fails to load
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
      shard.node.toLowerCase().includes(query.toLowerCase())
    )
  }, [shards, query])

  const paginatedShards = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredShards.slice(start, start + pageSize)
  }, [filteredShards, currentPage])

  const totalPages = Math.ceil(filteredShards.length / pageSize)

  if (loading && shards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading shards...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {t("shards.title")}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {t("shards.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder={t("shards.filter")} 
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
            onClick={fetchShards}
            disabled={loading}
            className="gap-2 h-9"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-4 py-3 font-semibold text-muted-foreground">{t("shards.table.index")}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-center">{t("shards.table.shard")}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-center">{t("shards.table.type")}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-center">{t("shards.table.state")}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">{t("shards.table.docs")}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">{t("shards.table.size")}</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">{t("shards.table.node")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedShards.map((shard, i) => (
                <tr key={`${shard.index}-${shard.shard}-${i}`} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{shard.index}</td>
                  <td className="px-4 py-3 text-center">{shard.shard}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      shard.prirep === 'p' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                    }`}>
                      {shard.prirep === 'p' ? 'Primary' : 'Replica'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      shard.state === 'STARTED' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {shard.state}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{shard.docs ? parseInt(shard.docs).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground font-mono">{shard.store || '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground italic">{shard.node || <span className="text-destructive not-italic">{t("shards.table.unassigned")}</span>}</td>
                </tr>
              ))}
              {paginatedShards.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground italic">
                    {loading ? 'Fetching shards...' : 'No shards found matching your query.'}
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
              {t('common.total')}: <span className="font-medium text-foreground">{filteredShards.length}</span>
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
    </div>
  )
}
