import { useState, useEffect, useRef } from 'react'
import { Search, X, Database, ArrowRight, History, Trash2 } from 'lucide-react'
import { useConnectionStore } from '../../store/useConnectionStore'
import { useAppStore } from '../../store/useAppStore'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { toast } from 'sonner'

interface SearchPanelProps {
  onSearch: (query: string, index?: string) => void
  onQueryChange?: (query: string, index: string | null) => void
}

interface ESHit {
  _index: string
  _id: string
  _source?: Record<string, unknown>
}

interface SearchResult {
  index: string
  type: 'index' | 'document' | 'field'
  name: string
  preview?: string
}

export function SearchPanel({ onSearch, onQueryChange }: SearchPanelProps) {
  const queryInputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const { selectedInstanceId, selectedIndex } = useConnectionStore()
  const { t, searchHistory, addSearchHistory, clearSearchHistory } = useAppStore()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.length >= 2 && selectedInstanceId) {
      setIsSearching(true)
      const timer = setTimeout(async () => {
        try {
          const path = selectedIndex ? `/${selectedIndex}/_search` : '/_search'
          const result = await window.api.es.executeQuery(
            selectedInstanceId,
            'POST',
            path,
            {
              query: { 
                query_string: { 
                  query: `*${query}*`,
                  analyze_wildcard: true,
                  default_operator: 'AND'
                } 
              },
              size: 10
            }
          )

          let docResults: SearchResult[] = []
          if (result.success && result.data?.hits?.hits) {
            docResults = result.data.hits.hits.map((hit: ESHit) => {
              const source = hit._source || {}
              const title = source.title || source.name || source.label || source.content || source.text || source.message || hit._id
              const preview = JSON.stringify(source).substring(0, 80)
              return {
                index: hit._index,
                type: 'document' as const,
                name: String(title).substring(0, 60),
                preview: preview.length > 80 ? preview + '...' : preview
              }
            })
          }

          setSearchResults(docResults.slice(0, 8))
        } catch (error) {
          console.error('Search error:', error)
          toast.error('Search error: ' + (error instanceof Error ? error.message : 'Unknown'))
        } finally {
          setIsSearching(false)
        }
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setSearchResults([])
    }
  }, [query, selectedInstanceId])

  const handleSubmit = () => {
    if (query.trim()) {
      addSearchHistory(query.trim())
      onSearch(query.trim(), selectedIndex || undefined)
      setShowResults(false)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    setQuery(result.name)
    onSearch(result.name, result.index || undefined)
    setShowResults(false)
  }

  const clearSearch = () => {
    setQuery('')
    onQueryChange?.('', selectedIndex)
    setSearchResults([])
    queryInputRef.current?.focus()
  }

  return (
    <div ref={panelRef} className="relative w-full max-w-4xl mx-auto">
      <div className={`
        relative bg-card
        rounded-xl shadow-sm 
        border transition-all duration-300 focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/30
        ${showResults ? 'rounded-b-none border-b-transparent' : ''}
      `}>
        <div className="flex items-center gap-2 p-1.5 px-3">
          <div className="relative pl-1">
            <Search className={`w-4.5 h-4.5 transition-colors ${
              isSearching ? 'text-primary animate-pulse' : 'text-muted-foreground'
            }`} />
          </div>
          
          <Input
            ref={queryInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowResults(true)
              onQueryChange?.(e.target.value, selectedIndex)
            }}
            onFocus={() => setShowResults(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit()
              } else if (e.key === 'Escape') {
                setShowResults(false)
              }
            }}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent border-none outline-none text-muted-foreground/70 placeholder:text-muted-foreground/50 shadow-none focus-visible:ring-0 px-3 h-11 text-sm font-medium focus:text-foreground"
          />

          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSearch}
              className="h-8 w-8 mr-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {showResults && (searchResults.length > 0 || (query.length < 2 && searchHistory.length > 0)) && (
        <div className="absolute top-full left-0 right-0 bg-card border border-t-0 border-primary/30 rounded-b-xl shadow-xl z-50 overflow-hidden ring-4 ring-primary/10">
          <div className="p-2 flex flex-col gap-0.5">
            {searchResults.length > 0 ? (
              searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left group"
                >
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                    result.type === 'index' ? 'bg-primary/10 text-primary border border-primary/20' :
                    result.type === 'document' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                    'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                  }`}>
                    {result.type === 'index' && <Database className="w-4 h-4" />}
                    {result.type === 'document' && <Search className="w-4 h-4" />}
                    {result.type === 'field' && <span className="text-xs font-bold">F</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {result.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border">
                        {result.type}
                      </span>
                    </div>
                    {result.preview && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{result.preview}</p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                </button>
              ))
            ) : query.length < 2 && searchHistory.length > 0 ? (
              <>
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('search.history')}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation()
                      clearSearchHistory()
                    }}
                    className="h-6 text-[10px] text-muted-foreground hover:text-destructive gap-1 px-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    {t('search.clearHistory')}
                  </Button>
                </div>
                {searchHistory.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(item)
                      onSearch(item, selectedIndex || undefined)
                      setShowResults(false)
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <History className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-foreground text-sm font-medium truncate flex-1">{item}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </>
            ) : null}
          </div>
          
        </div>
      )}
    </div>
  )
}