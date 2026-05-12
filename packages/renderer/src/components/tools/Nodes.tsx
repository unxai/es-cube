import { useEffect, useState, useMemo } from 'react'
import { Server, RefreshCw, Search, Box, Loader2, Cpu, HardDrive, ChevronLeft, ChevronRight } from 'lucide-react'
import type { PluginComponentProps } from '../../../shared/types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useAppStore } from '../../store/useAppStore'

interface NodeInfo {
  name: string
  'node.role': string
  ip: string
  'cpu': string
  'ram.percent': string
  'heap.percent': string
  'disk.used_percent': string
  'load_1m': string
  'uptime': string
}

export function Nodes({ instanceId }: PluginComponentProps) {
  const { t } = useAppStore()
  const [nodes, setNodes] = useState<NodeInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 9

  const fetchNodes = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.es.executeQuery(instanceId, 'GET', '/_cat/nodes?format=json&h=name,node.role,ip,cpu,ram.percent,heap.percent,disk.used_percent,load_1m,uptime&s=name')
      if (result.success) {
        setNodes(result.data)
        setCurrentPage(1)
      } else {
        throw new Error(result.error || 'Failed to fetch nodes')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNodes()
  }, [instanceId])

  const filteredNodes = useMemo(() => {
    return nodes.filter(node => node.name.toLowerCase().includes(query.toLowerCase()) || node.ip.includes(query))
  }, [nodes, query])

  const paginatedNodes = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredNodes.slice(start, start + pageSize)
  }, [filteredNodes, currentPage])

  const totalPages = Math.ceil(filteredNodes.length / pageSize)

  const getRoleColor = (role: string) => {
    if (role.includes('m')) return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
    if (role.includes('d')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
  }

  if (loading && nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading nodes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {t("nodes.title")}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {t("nodes.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder={t("nodes.filter")} 
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
            onClick={fetchNodes}
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {paginatedNodes.map((node) => (
          <div key={node.name} className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <Server className="w-5 h-5 text-primary" />
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">{node.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{node.ip}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getRoleColor(node['node.role'])}`}>
                {node['node.role']}
              </span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Cpu className="w-3 h-3" /> {t("nodes.cpu")}</span>
                  <span className="text-foreground">{node.cpu}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500" 
                    style={{ width: `${node.cpu}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Box className="w-3 h-3" /> {t("nodes.ram")}</span>
                  <span className="text-foreground">{node['ram.percent']}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500" 
                    style={{ width: `${node['ram.percent']}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><HardDrive className="w-3 h-3" /> {t("nodes.disk")}</span>
                  <span className="text-foreground">{node['disk.used_percent']}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 transition-all duration-500" 
                    style={{ width: `${node['disk.used_percent']}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-between items-center text-[10px] text-muted-foreground">
              <span>{t("nodes.load")}: {node.load_1m}</span>
              <span>{t("nodes.uptime")}: {node.uptime}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-4 py-3 bg-muted/20 border rounded-xl flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {t('common.total')}: <span className="font-medium text-foreground">{filteredNodes.length}</span>
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
  )
}
