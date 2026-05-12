import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Button } from '../ui/button'
import { useAppStore } from '../../store/useAppStore'

export function LanguageSelector() {
  const { locale, setLocale, availableLocales } = useAppStore()

  const currentLocale = availableLocales.find((l) => l.code === locale)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <span className="text-lg">{currentLocale?.flag}</span>
          <span className="hidden sm:inline">{currentLocale?.nativeName}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        {availableLocales.map((loc) => (
          <DropdownMenuItem
            key={loc.code}
            onClick={() => setLocale(loc.code)}
            className={`gap-2 ${locale === loc.code ? 'bg-primary/10 text-primary' : ''}`}
          >
            <span className="text-lg">{loc.flag}</span>
            <span>{loc.nativeName}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
