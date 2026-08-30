import { apiClient } from './client'
import type { UserSettings } from '@/store/useSettingsStore'

export const authApi = {
  getMe: async () => {
    const res = await apiClient.get('/api/v1/auth/me')
    return res.data
  },

  getConfig: async () => {
    const res = await apiClient.get('/api/v1/auth/config')
    return res.data
  },

  getUserSettings: async () => {
    const res = await apiClient.get('/api/v1/user/settings')
    return res.data
  },

  updateUserSettings: async (settings: Partial<UserSettings>) => {
    const res = await apiClient.patch('/api/v1/user/settings', settings)
    return res.data
  },

  login: async (credentials: any) => {
    const res = await apiClient.post('/api/v1/auth/login', credentials)
    return res.data
  },

  changePassword: async (passwords: { current_password: string; new_password: string }) => {
    const res = await apiClient.post('/api/v1/auth/change-password', passwords)
    return res.data
  },
}

export default authApi
