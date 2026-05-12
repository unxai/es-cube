import { useState } from 'react'
import { BrainCircuit, Plus, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Button } from '../ui/button'
import { useAppStore, type AIConfig } from '../../store/useAppStore'

const DEFAULT_PROVIDERS = {
  openai: {
    label: 'OpenAI',
    defaultModels: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini'],
    baseUrl: 'https://api.openai.com/v1',
  },
  anthropic: {
    label: 'Anthropic',
    defaultModels: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'],
    baseUrl: 'https://api.anthropic.com/v1',
  },
  gemini: {
    label: 'Gemini',
    defaultModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'],
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  },
  deepseek: {
    label: 'DeepSeek',
    defaultModels: ['deepseek-chat', 'deepseek-reasoner'],
    baseUrl: 'https://api.deepseek.com/v1',
  },
} as const

export function AIProviderSelector() {
  const { aiConfig, setAIConfig, t } = useAppStore()
  const [dynamicModels, setDynamicModels] = useState<Record<string, string[]>>({})
  const [isLoadingModels, setIsLoadingModels] = useState<Record<string, boolean>>({})
  const [customModel, setCustomModel] = useState('')

  const fetchModels = async (providerKey: keyof typeof DEFAULT_PROVIDERS) => {
    if (providerKey !== 'openai' && providerKey !== 'deepseek') return
    if (!aiConfig.providers[providerKey]?.apiKey) return

    setIsLoadingModels(prev => ({ ...prev, [providerKey]: true }))
    try {
      const baseUrl = aiConfig.providers[providerKey]?.baseUrl || DEFAULT_PROVIDERS[providerKey].baseUrl
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
        headers: {
          'Authorization': `Bearer ${aiConfig.providers[providerKey].apiKey}`,
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data && data.data && Array.isArray(data.data)) {
          const models = data.data.map((m: { id: string }) => m.id).filter((id: string) => !id.includes('whisper') && !id.includes('dall-e') && !id.includes('tts'))
          setDynamicModels(prev => ({ ...prev, [providerKey]: models }))
        }
      }
    } catch (error) {
      console.error(`Failed to fetch models for ${providerKey}:`, error)
    } finally {
      setIsLoadingModels(prev => ({ ...prev, [providerKey]: false }))
    }
  }

  const handleProviderOpen = (providerKey: keyof typeof DEFAULT_PROVIDERS) => {
    if (!dynamicModels[providerKey] && !isLoadingModels[providerKey]) {
      fetchModels(providerKey)
    }
  }

  const handleModelSelect = (provider: AIConfig['provider'], model: string) => {
    setAIConfig({ provider, model })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 shrink-0 bg-background/50 hover:bg-muted/50 border-muted-foreground/20 hover:border-muted-foreground/40 transition-all shadow-sm h-8"
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
              <BrainCircuit className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="hidden sm:inline text-xs font-medium text-foreground">
              {DEFAULT_PROVIDERS[aiConfig.provider]?.label}
              <span className="text-muted-foreground mx-1.5 opacity-50">/</span>
              <span className="text-muted-foreground">{aiConfig.model}</span>
            </span>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-2">
          {t('ai.selectModel') || 'Select AI Model'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.entries(DEFAULT_PROVIDERS) as [keyof typeof DEFAULT_PROVIDERS, typeof DEFAULT_PROVIDERS[keyof typeof DEFAULT_PROVIDERS]][]).map(([providerKey, provider]) => {
          const hasApiKey = !!aiConfig.providers[providerKey]?.apiKey
          const modelsToDisplay = dynamicModels[providerKey] && dynamicModels[providerKey].length > 0 
            ? dynamicModels[providerKey] 
            : provider.defaultModels

          return (
          <DropdownMenuSub key={providerKey}>
            <DropdownMenuSubTrigger 
              className={`gap-2 px-3 ${!hasApiKey ? 'opacity-50 cursor-not-allowed' : ''}`} 
              onMouseEnter={() => hasApiKey && handleProviderOpen(providerKey)}
            >
              <span className="flex-1 text-sm">{provider.label}</span>
              {aiConfig.provider === providerKey && (
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm font-bold">ACTIVE</span>
              )}
              {!hasApiKey && (
                <span className="text-[10px] text-muted-foreground/50">{t('ai.keyRequired')}</span>
              )}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="max-h-80 overflow-y-auto w-56 p-1">
                {!hasApiKey ? (
                  <div className="px-3 py-4 text-xs text-muted-foreground flex flex-col items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
                      <BrainCircuit className="w-3 h-3 text-muted-foreground/50" />
                    </div>
                    <span>{t('ai.configureApiKey')}</span>
                    <span className="text-[10px] opacity-60">{t('ai.inSettings')}</span>
                  </div>
                ) : isLoadingModels[providerKey] ? (
                  <div className="px-3 py-4 text-xs text-muted-foreground flex flex-col items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    Loading models...
                  </div>
                ) : (
                  modelsToDisplay.map((model) => (
                    <DropdownMenuItem
                      key={model}
                      onClick={() => handleModelSelect(providerKey, model)}
                      className="gap-2 px-3 py-2 text-xs"
                    >
                      <span className="flex-1 truncate">{model}</span>
                      {aiConfig.provider === providerKey && aiConfig.model === model && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </DropdownMenuItem>
                  ))
                )}
                {hasApiKey && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="p-2 bg-muted/30 rounded-md m-1">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="Custom model..."
                          value={customModel}
                          onChange={(e) => setCustomModel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && customModel.trim()) {
                              handleModelSelect(providerKey, customModel.trim())
                              setCustomModel('')
                            }
                          }}
                          className="flex-1 min-w-0 bg-background border border-muted-foreground/20 rounded-md px-2 py-1.5 text-[10px] outline-none focus:border-primary transition-colors text-muted-foreground/70 placeholder:text-muted-foreground/50 focus:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          variant="primary"
                          size="icon"
                          className="h-7 w-7 shrink-0 rounded-md"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (customModel.trim()) {
                              handleModelSelect(providerKey, customModel.trim())
                              setCustomModel('')
                            }
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        )})}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
