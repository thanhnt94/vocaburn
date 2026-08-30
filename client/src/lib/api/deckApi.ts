import { apiClient } from './client'

export interface DeckRoadmapResponse {
  active_roadmaps: any[]
  today_date: string
}

export const deckApi = {
  getRoadmapDecks: async (dateStr?: string) => {
    const params = dateStr ? { date: dateStr } : {}
    const res = await apiClient.get('/api/v1/deck/roadmap/decks', { params })
    return res.data as DeckRoadmapResponse
  },

  getDeckById: async (deckId: number | string) => {
    const res = await apiClient.get(`/api/v1/deck/${deckId}`)
    return res.data
  },

  getPracticeSettings: async (deckId: number | string) => {
    const res = await apiClient.get(`/api/v1/deck/${deckId}/practice-settings`)
    return res.data
  },

  updateDeckSettings: async (deckId: number | string, settings: any) => {
    const res = await apiClient.post(`/api/v1/deck/${deckId}/user-settings`, settings)
    return res.data
  },

  getPlayCards: async (deckId: number | string, mode: string = 'fsrs') => {
    const res = await apiClient.get(`/api/v1/deck/${deckId}/play`, { params: { mode } })
    return res.data
  },

  submitCardAnswer: async (deckId: number | string, answerData: any) => {
    const res = await apiClient.post(`/api/v1/deck/${deckId}/answer`, answerData)
    return res.data
  },

  explainCard: async (payload: { card?: string; question?: string; options?: string[]; correct_answer?: string }) => {
    const res = await apiClient.post('/api/v1/deck/explain', payload)
    return res.data
  },
}

export default deckApi
