import { create } from 'zustand'

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AutoSaveState {
  status: AutoSaveStatus
  message: string
  timer: any
  notifySaving: (msg?: string) => void
  notifySaved: (msg?: string) => void
  notifyError: (msg?: string) => void
}

export const useAutoSaveStore = create<AutoSaveState>((set, get) => ({
  status: 'idle',
  message: '',
  timer: null,
  notifySaving: (msg = 'Saving...') => {
    const { timer } = get()
    if (timer) clearTimeout(timer)
    set({ status: 'saving', message: msg })
  },
  notifySaved: (msg = 'Auto-saved') => {
    const { timer } = get()
    if (timer) clearTimeout(timer)
    set({ status: 'saved', message: msg })
    const newTimer = setTimeout(() => {
      set({ status: 'idle', message: '', timer: null })
    }, 1800)
    set({ timer: newTimer })
  },
  notifyError: (msg = 'Failed to save') => {
    const { timer } = get()
    if (timer) clearTimeout(timer)
    set({ status: 'error', message: msg })
    const newTimer = setTimeout(() => {
      set({ status: 'idle', message: '', timer: null })
    }, 3000)
    set({ timer: newTimer })
  },
}))
