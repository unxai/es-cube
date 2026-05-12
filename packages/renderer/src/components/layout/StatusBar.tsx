import { useEffect, useState } from 'react'
import { useConnectionStore } from '../../store/useConnectionStore'

export function StatusBar() {
  const { selectedInstanceId, instances, esVersions } = useConnectionStore()
  const [appVersion, setAppVersion] = useState<string>('Loading...')

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const version = await window.api.getAppVersion()
        setAppVersion(version)
      } catch {
        setAppVersion('Unknown')
      }
    }
    fetchVersion()
  }, [])

  const selectedInstance = instances.find((i) => i.id === selectedInstanceId)

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-card border-t text-xs">
      <div className="flex items-center gap-4">
        {selectedInstance && (
          <>
            <span className="text-muted-foreground">{selectedInstance.name}</span>
            {selectedInstance.version && (
              <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-primary">
                v{selectedInstance.version}
              </span>
            )}
            {selectedInstanceId && esVersions[selectedInstanceId] && (
              <span className="text-muted-foreground">{esVersions[selectedInstanceId]}</span>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-4 text-muted-foreground">
        <span>EsCube v{appVersion}</span>
        <span className="text-green-500">●</span>
      </div>
    </div>
  )
}
