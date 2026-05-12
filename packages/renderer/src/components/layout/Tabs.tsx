import { useConnectionStore } from '../../store/useConnectionStore'

export function Tabs() {
  const { activeTabs, currentActiveId, setCurrentActiveTab, removeTab } = useConnectionStore()

  if (activeTabs.length === 0) {
    return null
  }

  return (
    <div className="flex items-center overflow-x-auto gap-2">
      {activeTabs.map((tab) => (
        <div
          key={tab.id}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors text-sm font-medium border ${
            currentActiveId === tab.id
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
          }`}
          onClick={() => setCurrentActiveTab(tab.id)}
        >
          <span className="truncate max-w-[200px]">{tab.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              removeTab(tab.id)
            }}
            className="text-muted-foreground hover:text-destructive ml-1 px-1 rounded-sm hover:bg-destructive/10"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
