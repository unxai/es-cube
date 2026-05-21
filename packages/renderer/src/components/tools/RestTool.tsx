import { useState, useMemo, useEffect } from 'react'
import { Play, Loader2, Database, Globe, Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { MonacoEditor } from '../editor/MonacoEditor'
import { useAppStore } from '../../store/useAppStore'
import { useConnectionStore } from '../../store/useConnectionStore'
import { toast } from 'sonner'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD'

export function RestTool() {
  const { t, theme } = useAppStore()
  const effectiveTheme = useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'light'
    }
    return theme === 'dark' ? 'vs-dark' : 'light'
  }, [theme])
  
  const { selectedInstanceId, selectedIndex } = useConnectionStore()
  const [method, setMethod] = useState<Method>('GET')
  const [path, setPath] = useState('_search')
  const [body, setBody] = useState('{\n  "query": {\n    "match_all": {}\n  }\n}')
  const [response, setResponse] = useState<Record<string, unknown> | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  useEffect(() => {
    if (selectedIndex) {
      const pathParts = path.split('/')
      let basePath = path
      if (pathParts.length > 1 && !path.startsWith('/')) {
        basePath = pathParts.slice(1).join('/')
      }
      if (!path.startsWith('/')) {
        setPath(`${selectedIndex}/${basePath}`)
      }
    }
  }, [selectedIndex])

  const formattedResponse = useMemo(() => {
    return response ? JSON.stringify(response, null, 2) : ''
  }, [response])

  const handleSendRequest = async () => {
    if (!selectedInstanceId) {
      toast.error('No instance selected')
      return
    }

    setIsExecuting(true)
    try {
      let parsedBody = undefined
      if (body.trim() && (method === 'POST' || method === 'PUT')) {
        try {
          parsedBody = JSON.parse(body)
        } catch {
          toast.error('Invalid JSON body')
          setIsExecuting(false)
          return
        }
      }

      const result = await window.api.es.executeQuery(
        selectedInstanceId,
        method,
        path.startsWith('/') ? path : `/${path}`,
        parsedBody
      )

      if (result.success) {
        setResponse(result.data)
        toast.success('Request completed')
      } else {
        setResponse({ error: result.error })
        toast.error('Request failed')
      }
    } catch (error) {
      console.error('REST Tool error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setResponse({ error: errorMsg })
      toast.error('Error: ' + errorMsg)
    } finally {
      setIsExecuting(false)
    }
  }

  const methods: Method[] = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD']

  // 多彩的科技发光配置
  const methodConfigs = {
    GET: {
      color: "text-blue-500 dark:text-blue-400",
      activeBg: "bg-blue-500/15 border-blue-500/35 text-blue-500 shadow-sm shadow-blue-500/5",
    },
    POST: {
      color: "text-emerald-500 dark:text-emerald-400",
      activeBg: "bg-emerald-500/15 border-emerald-500/35 text-emerald-500 shadow-sm shadow-emerald-500/5",
    },
    PUT: {
      color: "text-amber-500 dark:text-amber-400",
      activeBg: "bg-amber-500/15 border-amber-500/35 text-amber-500 shadow-sm shadow-amber-500/5",
    },
    DELETE: {
      color: "text-rose-500 dark:text-rose-400",
      activeBg: "bg-rose-500/15 border-rose-500/35 text-rose-500 shadow-sm shadow-rose-500/5",
    },
    HEAD: {
      color: "text-cyan-500 dark:text-cyan-400",
      activeBg: "bg-cyan-500/15 border-cyan-500/35 text-cyan-500 shadow-sm shadow-cyan-500/5",
    },
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 顶部工具栏 (毛玻璃，多彩发光Method键) */}
      <div className="p-3 border-b border-border/40 flex items-center gap-3 bg-card/25 backdrop-blur-md sticky top-0 z-10 shrink-0">
        
        {/* 多彩 Method 控制排 */}
        <div className="flex bg-muted/40 rounded-xl p-0.5 border border-border/40 relative">
          {methods.map((m) => {
            const isActive = method === m;
            const currentConf = methodConfigs[m];
            return (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all duration-200 border border-transparent ${
                  isActive
                    ? currentConf.activeBg
                    : `${currentConf.color} opacity-70 hover:opacity-100 hover:bg-muted/60`
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>

        {/* 输入端点条 */}
        <div className="flex-1 flex items-center gap-2 bg-muted/30 hover:bg-muted/50 px-3.5 py-1.5 rounded-xl border border-border/40 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-250">
          <Globe className="w-4 h-4 text-muted-foreground/60 shrink-0" />
          <span className="text-xs text-muted-foreground/50 select-none font-semibold">/</span>
          
          {selectedIndex && !path.startsWith(selectedIndex) && (
            <button
              onClick={() => setPath(`${selectedIndex}/${path}`)}
              className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-[9px] font-semibold hover:bg-primary/15 transition-all flex items-center gap-1 shrink-0 active:scale-95 border border-primary/25"
              title={`Prefix with ${selectedIndex}`}
            >
              <span className="font-mono">{selectedIndex}</span>
              <Plus className="w-2.5 h-2.5 text-primary" />
            </button>
          )}
          
          <Input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="endpoint (e.g. _cat/indices)"
            className="flex-1 bg-transparent border-none outline-none shadow-none focus-visible:ring-0 h-6 text-xs p-0 text-foreground/80 placeholder:text-muted-foreground/45 focus:text-foreground font-mono"
          />
        </div>

        {/* 运行按钮 */}
        <Button
          onClick={handleSendRequest}
          disabled={isExecuting || !selectedInstanceId}
          className="gap-2 h-9 px-4.5 rounded-xl shadow-md hover:shadow-primary/10 hover:shadow-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold active:scale-95 transition-all text-xs"
        >
          {isExecuting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>{t('rest.send')}</span>
        </Button>
      </div>

      {/* 主分栏内容 (磨砂毛玻璃双卡片) */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4 bg-slate-50/50 dark:bg-slate-950/20">
        
        {/* 左侧：请求体 (Request Body) */}
        <div className="w-1/2 flex flex-col bg-card/65 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-border/60 overflow-hidden shadow-sm relative">
          <div className="px-4 py-2.5 border-b border-border/40 bg-muted/20 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Request Body (JSON)
            </span>
            {method === 'GET' && body.trim() && (
              <span className="text-[9px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-semibold animate-pulse">
                GET typically has no body
              </span>
            )}
          </div>
          <div className="flex-1 relative">
            <div className="absolute inset-0">
              <MonacoEditor
                value={body}
                onChange={setBody}
                language="json"
                height="100%"
                theme={effectiveTheme}
              />
            </div>
          </div>
        </div>

        {/* 右侧：响应内容 (Response Body) */}
        <div className="w-1/2 flex flex-col bg-card/65 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-border/60 overflow-hidden shadow-sm relative">
          <div className="px-4 py-2.5 border-b border-border/40 bg-muted/20 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {t('rest.response')}
            </span>
            {response && (
              <span className="text-[9px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-semibold">
                Success
              </span>
            )}
          </div>
          
          <div className="flex-1 relative">
            <div className="absolute inset-0">
              {/* 点状流体通信动画 & 毛玻璃加载态 */}
              {isExecuting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/55 backdrop-blur-[2px] z-10 animate-in fade-in duration-200">
                  <div className="absolute inset-0 communication-dot-flow opacity-[0.25] pointer-events-none" />
                  
                  <div className="relative relative-loading-container z-20">
                    <div className="w-12 h-12 rounded-full border-2 border-primary/10 border-t-primary animate-spin" />
                    <Database className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-xs text-muted-foreground/80 mt-3.5 font-semibold animate-pulse tracking-wider relative z-20">
                    Communicating with Elasticsearch...
                  </span>
                </div>
              )}
              
              {response ? (
                <MonacoEditor
                  value={formattedResponse}
                  onChange={() => { }}
                  language="json"
                  height="100%"
                  theme={effectiveTheme}
                  readOnly={true}
                />
              ) : (
                /* 暂无响应空占位 */
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center animate-in fade-in duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 border border-border/20 shadow-sm relative group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Play className="w-6 h-6 text-muted-foreground/45 transition-transform group-hover:scale-105 duration-200" />
                  </div>
                  <p className="text-xs font-semibold text-foreground/80 mb-1">No Response Yet</p>
                  <p className="text-[10px] text-muted-foreground/75 leading-relaxed max-w-[220px]">
                    Enter an endpoint index, query body, and click "Send Request" to trigger REST communication.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
