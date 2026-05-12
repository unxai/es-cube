import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { translations, locales, type Locale, type Translations } from '../i18n'

export type Theme = 'dark' | 'light' | 'system'

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'deepseek'

export interface AIProviderConfig {
  apiKey: string
  baseUrl?: string
}

export interface AIConfig {
  provider: AIProvider
  model: string
  providers: Record<AIProvider, AIProviderConfig>
}

export interface LogConfig {
  enabled: boolean
  level: 'debug' | 'info' | 'warn' | 'error'
  maxFileSize: number
  maxFiles: number
}

export interface AppState {
  theme: Theme
  locale: string
  availableLocales: Locale[]
  aiConfig: AIConfig
  logConfig: LogConfig
  developerMode: boolean
  isInitialized: boolean

  init: () => Promise<void>
  setTheme: (theme: Theme) => void
  setLocale: (locale: string) => void
  setAIConfig: (config: Partial<AIConfig>) => void
  setLogConfig: (config: Partial<LogConfig>) => void
  setDeveloperMode: (enabled: boolean) => void
  searchHistory: string[]
  addSearchHistory: (query: string) => void
  clearSearchHistory: () => void
  t: (key: string) => string
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      locale: 'zh-CN',
      availableLocales: locales,
      aiConfig: {
        provider: 'openai',
        model: 'gpt-4o',
        providers: {
          openai: { apiKey: '' },
          anthropic: { apiKey: '' },
          gemini: { apiKey: '' },
          deepseek: { apiKey: '' },
        }
      },
      logConfig: {
        enabled: true,
        level: 'info',
        maxFileSize: 10,
        maxFiles: 5,
      },
      developerMode: false,
      isInitialized: false,
      searchHistory: [],

      init: async () => {
        if (get().isInitialized) return
        try {
          const settings = await window.api?.storage.getSettings()
          if (settings) {
            set((state) => ({
              theme: settings.theme || state.theme,
              locale: settings.defaultLanguage || state.locale,
              developerMode: settings.developerMode ?? state.developerMode,
              aiConfig: {
                ...state.aiConfig,
                ...settings.aiConfig,
                providers: {
                  ...state.aiConfig.providers,
                  ...(settings.aiConfig?.providers || {})
                }
              },
              autoUpdate: settings.autoUpdate,
              isInitialized: true
            }))
            // Apply theme
            get().setTheme(settings.theme || get().theme)
          }
        } catch (error) {
          console.error('Failed to hydrate app store:', error)
        }
      },

      setTheme: async (theme) => {
        set({ theme })
        if (typeof document !== 'undefined') {
          const root = document.documentElement
          root.classList.remove('dark')

          if (theme === 'dark') {
            root.classList.add('dark')
          } else if (theme === 'light') {
            root.classList.remove('dark')
          } else if (typeof window !== 'undefined') {
            const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            if (isSystemDark) {
              root.classList.add('dark')
            }
          }
        }
        await window.api?.storage.updateSettings({ theme })
      },

      setLocale: async (locale) => {
        if (translations[locale]) {
          set({ locale })
          await window.api?.storage.updateSettings({ defaultLanguage: locale })
        }
      },

      setAIConfig: async (config) => {
        const newAIConfig = { ...get().aiConfig, ...config }
        if (config.providers) {
          newAIConfig.providers = { ...get().aiConfig.providers, ...config.providers }
        }
        set({ aiConfig: newAIConfig })
        await window.api?.storage.updateSettings({ aiConfig: newAIConfig })
      },

      setLogConfig: async (config) => {
        const newLogConfig = { ...get().logConfig, ...config }
        set({ logConfig: newLogConfig })
        // Log config is stored separately in main process
        // but we can sync it via updateSettings if we want, or use a separate IPC
        // For now, let's just update the local state. 
        // In main process LogService loads from its own config.
      },

      setDeveloperMode: async (enabled) => {
        set({ developerMode: enabled })
        await window.api?.storage.updateSettings({ developerMode: enabled })
      },

      addSearchHistory: (query) => {
        if (!query.trim()) return
        set((state) => {
          const newHistory = [query, ...state.searchHistory.filter((h) => h !== query)].slice(0, 10)
          return { searchHistory: newHistory }
        })
      },

      clearSearchHistory: () => {
        set({ searchHistory: [] })
      },

      t: (key: string) => {
        const { locale } = get();
        const trans: Translations = translations[locale] || translations["en-US"];

        const parts = key.split(".");
        let result: unknown = trans;

        for (const part of parts) {
          result = (result as Record<string, unknown>)?.[part];
          if (result === undefined) break;
        }

        if (typeof result === "string") return result;

        // Fallback to English if not found in current locale
        if (locale !== "en-US") {
          let enResult: unknown = translations["en-US"];
          for (const part of parts) {
            enResult = (enResult as Record<string, unknown>)?.[part];
            if (enResult === undefined) break;
          }
          if (typeof enResult === "string") return enResult;
        }

        return key;
      },
    }),
    {
      name: 'escube-app-storage',
      partialize: (state) => ({
        theme: state.theme,
        locale: state.locale,
        aiConfig: state.aiConfig,
        logConfig: state.logConfig,
        developerMode: state.developerMode,
        searchHistory: state.searchHistory,
      }),
    }
  )
)
