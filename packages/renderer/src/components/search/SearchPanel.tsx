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
    // We only want to show search history when the query is empty or very short
    if (query.length < 2) {
      setSearchResults([])
    }
  }, [query])

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

      {showResults && query.length < 2 && searchHistory.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-card border border-t-0 border-primary/30 rounded-b-xl shadow-xl z-50 overflow-hidden ring-4 ring-primary/10">
          <div className="p-2 flex flex-col gap-0.5">
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
          </div>
        </div>
      )}
    </div>
  )
}