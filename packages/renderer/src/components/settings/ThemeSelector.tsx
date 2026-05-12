import { Moon, Sun, Monitor } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Button } from '../ui/button'
import { useAppStore, type Theme } from '../../store/useAppStore'

const themeOptions: { value: Theme; label: string; icon: typeof Moon }[] = [
  { value: 'dark', label: 'settings.dark', icon: Moon },
  { value: 'light', label: 'settings.light', icon: Sun },
  { value: 'system', label: 'settings.system', icon: Monitor },
]

export function ThemeSelector() {
  const { theme, setTheme, t } = useAppStore()

  const currentTheme = themeOptions.find((t) => t.value === theme)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          {currentTheme?.icon && <currentTheme.icon className="h-4 w-4" />}
          <span className="hidden sm:inline">{t('settings.theme')}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        {themeOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`gap-2 ${theme === option.value ? 'bg-primary/10 text-primary' : ''}`}
          >
            <option.icon className="h-4 w-4" />
            {t(option.label)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
