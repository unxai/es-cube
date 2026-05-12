import { enUS } from './en-US'
import { zhCN } from './zh-CN'

export type Translations = typeof enUS

export interface Locale {
  code: string
  name: string
  nativeName: string
  flag: string
}

export const locales: Locale[] = [
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'en-US', name: 'English', nativeName: 'English', flag: '🇺🇸' },
]

export const translations: Record<string, Translations> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}
