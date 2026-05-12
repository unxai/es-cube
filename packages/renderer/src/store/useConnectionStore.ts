import { create } from 'zustand'
import type { ESInstance, Settings } from '../../../shared/types'

export interface Tab {
  id: string
  instanceId: string
  title: string
  type: 'query' | 'dashboard' | 'health'
}

export interface ConnectionState {
  instances: ESInstance[]
  activeTabs: Tab[]
  currentActiveId: string | null
  esVersions: Record<string, string>
  settings: Settings
  selectedInstanceId: string | null
  selectedIndex: string | null

  setInstances: (instances: ESInstance[]) => void
  addInstance: (instance: ESInstance) => void
  updateInstance: (id: string, updates: Partial<ESInstance>) => void
  deleteInstance: (id: string) => void
  selectInstance: (id: string | null) => void
  setSelectedIndex: (index: string | null) => void

  addTab: (tab: Omit<Tab, 'id'>) => void
  removeTab: (id: string) => void
  setCurrentActiveTab: (id: string) => void

  setESVersion: (instanceId: string, version: string) => void
  clearESVersions: () => void

  setSettings: (settings: Settings) => void
  updateSettings: (updates: Partial<Settings>) => void
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  instances: [],
  activeTabs: [],
  currentActiveId: null,
  esVersions: {},
  settings: {
    theme: 'dark',
    fontSize: 14,
    autoConnect: false,
  },
  selectedInstanceId: null,
  selectedIndex: null,

  setInstances: (instances) => set({ instances }),
  addInstance: (instance) => set((state) => ({
    instances: [...state.instances, instance],
  })),
  updateInstance: (id, updates) => set((state) => ({
    instances: state.instances.map((inst) =>
      inst.id === id ? { ...inst, ...updates } : inst
    ),
  })),
  deleteInstance: (id) => set((state) => ({
    instances: state.instances.filter((inst) => inst.id !== id),
    selectedInstanceId: state.selectedInstanceId === id ? null : state.selectedInstanceId,
  })),
  selectInstance: (id) => set({ selectedInstanceId: id, selectedIndex: null }),
  setSelectedIndex: (index) => set({ selectedIndex: index }),

  addTab: (tab) => {
    const newTab: Tab = {
      ...tab,
      id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
    set((state) => ({
      activeTabs: [...state.activeTabs, newTab],
      currentActiveId: newTab.id,
    }))
  },
  removeTab: (id) => set((state) => ({
    activeTabs: state.activeTabs.filter((tab) => tab.id !== id),
    currentActiveId: state.currentActiveId === id
      ? state.activeTabs.find((tab) => tab.id !== id)?.id || null
      : state.currentActiveId,
  })),
  setCurrentActiveTab: (id) => set({ currentActiveId: id }),

  setESVersion: (instanceId, version) => set((state) => ({
    esVersions: { ...state.esVersions, [instanceId]: version },
  })),
  clearESVersions: () => set({ esVersions: {} }),

  setSettings: (settings) => set({ settings }),
  updateSettings: (updates) => set((state) => ({
    settings: { ...state.settings, ...updates },
  })),
}))
