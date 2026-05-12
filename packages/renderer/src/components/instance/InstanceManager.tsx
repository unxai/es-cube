import { useState } from 'react'
import { useConnectionStore } from '../../store/useConnectionStore'
import { useAppStore } from '../../store/useAppStore'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

export function InstanceManager({ onClose }: { onClose: () => void }) {
  const { addInstance } = useConnectionStore()
  const { t } = useAppStore()
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    authType: 'basic' as 'none' | 'basic' | 'bearer' | 'apiKey',
    username: '',
    password: '',
    apiKey: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const newInstance = await window.api.storage.addInstance({
        id: `instance-${Date.now()}`,
        ...formData,
      })
      addInstance(newInstance)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add instance')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('app.addInstance')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('app.instanceName')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Production"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">{t('app.esUrl')}</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="e.g. http://localhost:9200"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="authType">{t('app.authType') || '认证方式'}</Label>
            <Select 
              value={formData.authType} 
              onValueChange={(val: any) => setFormData({ ...formData, authType: val })}
            >
              <SelectTrigger id="authType">
                <SelectValue placeholder="选择认证方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('app.authNone') || '无认证'}</SelectItem>
                <SelectItem value="basic">{t('app.authBasic') || 'Basic 认证'}</SelectItem>
                <SelectItem value="bearer">{t('app.authBearer') || 'Bearer Token'}</SelectItem>
                <SelectItem value="apiKey">{t('app.authApiKey') || 'API Key'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.authType === 'basic' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">{t('app.username')}</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. elastic"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('app.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="•••••••••"
                />
              </div>
            </>
          )}

          {(formData.authType === 'apiKey' || formData.authType === 'bearer') && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">{t('app.apiKey')}</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="•••••••••"
              />
            </div>
          )}

          {error && (
            <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? t('app.adding') : t('app.addInstance')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
