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
  const { selectedInstanceId, selectedIndex, setSelectedIndex } = useConnectionStore()
  const [method, setMethod] = useState<Method>('GET')
  const [path, setPath] = useState('_search')

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
  const [body, setBody] = useState('{\n  "query": {\n    "match_all": {}\n  }\n}')
  const [response, setResponse] = useState<Record<string, unknown> | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

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

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 border-b flex items-center gap-3 bg-card/30">
        <div className="flex bg-muted rounded-lg p-0.5 border">
          {methods.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${method === m
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border focus-within:border-primary/50 transition-colors">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground select-none">/</span>
          {selectedIndex && !path.startsWith(selectedIndex) && (
            <button
              onClick={() => setPath(`${selectedIndex}/${path}`)}
              className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition-colors flex items-center gap-1 shrink-0"
              title={`Prefix with ${selectedIndex}`}
            >
              {selectedIndex}
              <Plus className="w-2.5 h-2.5" />
            </button>
          )}
          <Input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="endpoint (e.g. _cat/indices)"
            className="flex-1 bg-transparent border-none outline-none shadow-none focus-visible:ring-0 h-6 text-sm p-0 text-muted-foreground/70 placeholder:text-muted-foreground/50 focus:text-foreground"
          />
        </div>

        <Button
          onClick={handleSendRequest}
          disabled={isExecuting || !selectedInstanceId}
          className="gap-2 h-9"
        >
          {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          {t('rest.send')}
        </Button>
      </div>

      {/* Main Content: Split Panes */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Request Body */}
        <div className="w-1/2 flex flex-col border-r">
          <div className="px-4 py-2 border-b bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Request Body (JSON)</span>
            {method === 'GET' && body.trim() && (
              <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">GET requests typically don't have a body</span>
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

        {/* Right: Response */}
        <div className="w-1/2 flex flex-col bg-muted/5">
          <div className="px-4 py-2 border-b bg-muted/20">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('rest.response')}</span>
          </div>
          <div className="flex-1 relative">
            <div className="absolute inset-0">
              {isExecuting ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/50 backdrop-blur-[2px] z-10">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    <Database className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-sm text-muted-foreground animate-pulse">Communicating with Elasticsearch...</span>
                </div>
              ) : null}
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
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Play className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium mb-1">No Response Yet</p>
                  <p className="text-xs max-w-[200px]">Enter an endpoint and body, then click "Send Request" to see the results here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
