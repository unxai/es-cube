import { useState, useEffect, useRef } from 'react'
import { Database, Search, ChevronDown, Check, Plus, Loader2 } from 'lucide-react'
import { useConnectionStore } from '../../store/useConnectionStore'
import { useAppStore } from '../../store/useAppStore'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

export function GlobalSelector() {
  const { instances, selectedInstanceId, selectInstance, selectedIndex, setSelectedIndex } = useConnectionStore()
  const { t } = useAppStore()
  const [indices, setIndices] = useState<string[]>([])
  const [isLoadingIndices, setIsLoadingIndices] = useState(false)
  const [showInstanceDropdown, setShowInstanceDropdown] = useState(false)
  const [showIndexDropdown, setShowIndexDropdown] = useState(false)
  const [indexQuery, setIndexQuery] = useState('')
  const instanceRef = useRef<HTMLDivElement>(null)
  const indexRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (instanceRef.current && !instanceRef.current.contains(event.target as Node)) {
        setShowInstanceDropdown(false)
      }
      if (indexRef.current && !indexRef.current.contains(event.target as Node)) {
        setShowIndexDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const loadIndices = async () => {
      if (!selectedInstanceId) {
        setIndices([])
        return
      }
      setIsLoadingIndices(true)
      try {
        const result = await window.api.es.getIndices(selectedInstanceId)
        if (result && Array.isArray(result)) {
          setIndices(result)
        }
      } catch (error) {
        console.error('Failed to load indices:', error)
      } finally {
        setIsLoadingIndices(false)
      }
    }
    loadIndices()
  }, [selectedInstanceId])

  const selectedInstance = instances.find(i => i.id === selectedInstanceId)
  const filteredIndices = indices.filter(idx => idx.toLowerCase().includes(indexQuery.toLowerCase()))

  return (
    <div className="flex items-center gap-2">
      {/* Instance Selector */}
      <div ref={instanceRef} className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInstanceDropdown(!showInstanceDropdown)}
          className={`h-9 px-3 gap-2 min-w-[140px] justify-between border-muted-foreground/20 hover:border-primary/50 transition-all ${
            showInstanceDropdown ? 'ring-2 ring-primary/20 border-primary/50' : ''
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Database className={`w-4 h-4 shrink-0 ${selectedInstance ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="truncate text-xs font-medium">
              {selectedInstance ? selectedInstance.name : t('app.selectInstance')}
            </span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${showInstanceDropdown ? 'rotate-180' : ''}`} />
        </Button>

        {showInstanceDropdown && (
          <div className="absolute top-full left-0 mt-1.5 w-64 bg-card/95 backdrop-blur-xl border rounded-xl shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-1.5 flex flex-col gap-0.5">
              {instances.map((instance) => (
                <button
                  key={instance.id}
                  onClick={() => {
                    selectInstance(instance.id)
                    setShowInstanceDropdown(false)
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors ${
                    selectedInstanceId === instance.id 
                      ? 'bg-primary/10 text-primary' 
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedInstanceId === instance.id ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{instance.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{instance.url}</span>
                    </div>
                  </div>
                  {selectedInstanceId === instance.id && <Check className="w-4 h-4 shrink-0 ml-2" />}
                </button>
              ))}
              {instances.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No instances found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-border/60 mx-1" />

      {/* Index Selector */}
      <div ref={indexRef} className="relative">
        <Button
          variant="outline"
          size="sm"
          disabled={!selectedInstanceId}
          onClick={() => setShowIndexDropdown(!showIndexDropdown)}
          className={`h-9 px-3 gap-2 min-w-[160px] justify-between border-muted-foreground/20 hover:border-primary/50 transition-all ${
            showIndexDropdown ? 'ring-2 ring-primary/20 border-primary/50' : ''
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Search className={`w-4 h-4 shrink-0 ${selectedIndex ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="truncate text-xs font-medium">
              {isLoadingIndices ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : selectedIndex ? (
                selectedIndex
              ) : (
                t('app.selectIndex')
              )}
            </span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${showIndexDropdown ? 'rotate-180' : ''}`} />
        </Button>

        {showIndexDropdown && (
          <div className="absolute top-full left-0 mt-1.5 w-72 bg-card/95 backdrop-blur-xl border rounded-xl shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-2 border-b bg-muted/30">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Filter indices..."
                  value={indexQuery}
                  onChange={(e) => setIndexQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background border-muted-foreground/20"
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-1.5 flex flex-col gap-0.5">
              {selectedIndex && (
                <button
                  onClick={() => {
                    setSelectedIndex(null)
                    setShowIndexDropdown(false)
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 rotate-45" />
                  Clear Selection
                </button>
              )}
              {filteredIndices.map((idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedIndex(idx)
                    setShowIndexDropdown(false)
                    setIndexQuery('')
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                    selectedIndex === idx 
                      ? 'bg-primary/10 text-primary' 
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <span className="text-xs font-medium truncate">{idx}</span>
                  {selectedIndex === idx && <Check className="w-3.5 h-3.5 shrink-0 ml-2" />}
                </button>
              ))}
              {filteredIndices.length === 0 && !isLoadingIndices && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No indices found
                </div>
              )}
              {isLoadingIndices && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
