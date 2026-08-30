import { create } from 'zustand'

export interface Gamify {
  level: number;
  xp: number;
  streak: number;
  streak_points?: number;
  streak_freeze_count?: number;
}

interface GamifyState {
  gamify: Gamify;
  setGamify: (gamify: Gamify) => void;
  addXp: (amount: number) => void;
}

export const useGamifyStore = create<GamifyState>((set) => ({
  gamify: { level: 1, xp: 0, streak: 0 },

  setGamify: (gamify) => set({ gamify }),

  addXp: (amount) => set((state) => ({
    gamify: { ...state.gamify, xp: state.gamify.xp + amount }
  }))
}))
