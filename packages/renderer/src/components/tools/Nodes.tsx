import { useEffect, useState, useMemo } from 'react'
import { 
  Server, 
  RefreshCw, 
  Search, 
  Box, 
  Loader2, 
  Cpu, 
  HardDrive, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Layers,
  Activity,
  Gauge
} from 'lucide-react'
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

// 环形进度条组件
interface CircularProgressProps {
  percent: number
  label: string
  colorClass: string
  icon: any
}

function CircularProgress({ percent, label, colorClass, icon: Icon }: CircularProgressProps) {
  const radius = 24
  const stroke = 3
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference

  return (
    <div className="flex items-center gap-3 bg-muted/20 hover:bg-muted/30 p-2.5 rounded-xl border border-border/40 hover:border-border/60 transition-all duration-300">
      <div className="relative flex items-center justify-center shrink-0">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            className="text-muted/10 dark:text-muted/5"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            className={`${colorClass} transition-all duration-700 ease-out`}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute text-foreground/80">
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none mb-1">{label}</span>
        <span className="text-xs font-bold text-foreground font-mono leading-none">{percent}%</span>
      </div>
    </div>
  )
}

export function Nodes({ instanceId }: PluginComponentProps) {
  const { t } = useAppStore()
  const [nodes, setNodes] = useState<NodeInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 6

  const fetchNodes = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.es.executeQuery(
        instanceId, 
        'GET', 
        '/_cat/nodes?format=json&h=name,node.role,ip,cpu,ram.percent,heap.percent,disk.used_percent,load_1m,uptime&s=name'
      )
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
    return nodes.filter(node => 
      node.name.toLowerCase().includes(query.toLowerCase()) || 
      node.ip.includes(query)
    )
  }, [nodes, query])

  const paginatedNodes = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredNodes.slice(start, start + pageSize)
  }, [filteredNodes, currentPage])

  const totalPages = Math.ceil(filteredNodes.length / pageSize)

  // 计算摘要数据
  const summaryStats = useMemo(() => {
    if (nodes.length === 0) return { total: 0, dataNodes: 0, avgCpu: 0, avgRam: 0 }
    
    let totalCpu = 0
    let totalRam = 0
    let dataNodesCount = 0
    
    nodes.forEach(n => {
      totalCpu += parseFloat(n.cpu) || 0
      totalRam += parseFloat(n['ram.percent']) || 0
      if (n['node.role'].includes('d')) {
        dataNodesCount++
      }
    })
    
    return {
      total: nodes.length,
      dataNodes: dataNodesCount,
      avgCpu: Math.round(totalCpu / nodes.length),
      avgRam: Math.round(totalRam / nodes.length)
    }
  }, [nodes])

  // 解析并渲染角色小芯片
  const renderRoleBadges = (roleStr: string) => {
    const roleMap: { [key: string]: { label: string, color: string } } = {
      'm': { label: 'Master Eligible', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
      'd': { label: 'Data Node', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      'i': { label: 'Ingest Node', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      'c': { label: 'Coordinate Only', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      's': { label: 'Content Node', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
      't': { label: 'Transform Node', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
      'r': { label: 'Remote Client', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' }
    }

    return (
      <div className="flex flex-wrap gap-1 select-none">
        {roleStr.split('').map((char, index) => {
          const info = roleMap[char] || { label: `Role: ${char.toUpperCase()}`, color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' }
          return (
            <span 
              key={index} 
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border tracking-wider uppercase cursor-help transition-all hover:scale-105 ${info.color}`}
              title={info.label}
            >
              {char}
            </span>
          )
        })}
      </div>
    )
  }

  // 根据指标计算健康状态灯
  const getNodeHealthLight = (cpu: number, ram: number, disk: number) => {
    const maxVal = Math.max(cpu, ram, disk)
    if (maxVal > 85) {
      return (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
      )
    }
    if (maxVal > 70) {
      return (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
      )
    }
    return (
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
    )
  }

  if (loading && nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Activity className="w-5 h-5 text-primary absolute animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground/80 font-medium tracking-wide">
          Loading cluster nodes...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 头部面板 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
            <Server className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {t("nodes.title")}
            </h2>
            <p className="text-muted-foreground text-xs mt-0.5">
              {t("nodes.description")}
            </p>
          </div>
        </div>

        {/* 控制工具栏 */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input 
              placeholder={t("nodes.filter")} 
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9 w-52 md:w-60 bg-card/60 backdrop-blur-sm h-9 border-border/60 text-muted-foreground/90 placeholder:text-muted-foreground/40 focus:border-primary/50 transition-all text-xs"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNodes}
            disabled={loading}
            className="gap-2 h-9 px-3 border-border/60 bg-card/60 hover:bg-muted/50 backdrop-blur-sm text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs flex items-center gap-3">
          <Box className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* 集群节点摘要横栏 */}
      {nodes.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-xl flex items-center justify-between border border-border/20 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{t("nodes.summary.total") || "Total Nodes"}</span>
              <span className="text-2xl font-black text-foreground mt-1 font-mono">{summaryStats.total}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <Server className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="glass-panel p-4 rounded-xl flex items-center justify-between border border-border/20 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{t("nodes.summary.data") || "Data Nodes"}</span>
              <span className="text-2xl font-black text-foreground mt-1 font-mono">{summaryStats.dataNodes}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Database className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="glass-panel p-4 rounded-xl flex items-center justify-between border border-border/20 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{t("nodes.summary.cpu") || "Avg CPU Usage"}</span>
              <span className="text-2xl font-black text-foreground mt-1 font-mono">{summaryStats.avgCpu}%</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="glass-panel p-4 rounded-xl flex items-center justify-between border border-border/20 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{t("nodes.summary.ram") || "Avg RAM Usage"}</span>
              <span className="text-2xl font-black text-foreground mt-1 font-mono">{summaryStats.avgRam}%</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <Gauge className="w-4 h-4 text-purple-400" />
            </div>
          </div>
        </div>
      )}

      {/* 节点卡片列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {paginatedNodes.map((node) => {
          const cpuVal = parseInt(node.cpu) || 0
          const ramVal = parseInt(node['ram.percent']) || 0
          const heapVal = parseInt(node['heap.percent']) || 0
          const diskVal = parseInt(node['disk.used_percent']) || 0

          return (
            <div 
              key={node.name} 
              className="glass-panel rounded-2xl p-5 shadow-sm border border-border/20 transition-all duration-300 hover:border-primary/30 hover:shadow-md group flex flex-col justify-between relative overflow-hidden"
            >
              {/* 微观科技点状背景 */}
              <div className="absolute inset-0 communication-dot-flow opacity-15 pointer-events-none" />

              <div className="relative z-10">
                {/* 头部信息 */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3 overflow-hidden mr-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                      <Server className="w-5 h-5 text-primary" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors text-sm">
                          {node.name}
                        </h3>
                        {getNodeHealthLight(cpuVal, ramVal, diskVal)}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{node.ip}</p>
                    </div>
                  </div>
                  {/* 角色 */}
                  {renderRoleBadges(node['node.role'])}
                </div>

                {/* SVG 环形进度圈矩阵 2x2 */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <CircularProgress 
                    percent={cpuVal} 
                    label={t("nodes.cpu") || "CPU"} 
                    colorClass="text-blue-500" 
                    icon={Cpu} 
                  />
                  <CircularProgress 
                    percent={ramVal} 
                    label={t("nodes.ram") || "RAM"} 
                    colorClass="text-purple-500" 
                    icon={Gauge} 
                  />
                  <CircularProgress 
                    percent={heapVal} 
                    label="Heap" 
                    colorClass="text-emerald-500" 
                    icon={Box} 
                  />
                  <CircularProgress 
                    percent={diskVal} 
                    label={t("nodes.disk") || "Disk"} 
                    colorClass="text-amber-500" 
                    icon={HardDrive} 
                  />
                </div>
              </div>

              {/* 尾部元数据 */}
              <div className="relative z-10 pt-4 border-t border-border/20 flex justify-between items-center text-[10px] text-muted-foreground/80 font-mono">
                <span className="flex items-center gap-1">
                  Load: <strong className="text-foreground/90">{node.load_1m}</strong>
                </span>
                <span className="flex items-center gap-1">
                  Uptime: <strong className="text-foreground/90">{node.uptime}</strong>
                </span>
              </div>
            </div>
          )
        })}
        {paginatedNodes.length === 0 && (
          <div className="col-span-full py-16 text-center glass-panel rounded-2xl border border-border/10">
            <p className="text-muted-foreground text-sm italic">
              No cluster nodes found matching your query.
            </p>
          </div>
        )}
      </div>

      {/* 分页控制 */}
      {totalPages > 1 && (
        <div className="px-5 py-3 glass-panel border border-border/20 rounded-xl flex items-center justify-between shadow-sm">
          <div className="text-xs text-muted-foreground">
            {t('common.total')}: <span className="font-semibold text-foreground">{filteredNodes.length}</span>
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
  )
}
