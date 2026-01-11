import { create } from 'zustand'

interface PlaybackState {
  isPlaying: boolean
  currentTime: number
  volume: number

  // Actions
  play: () => void
  pause: () => void
  stop: () => void
  setCurrentTime: (time: number) => void
  setVolume: (volume: number) => void
  togglePlay: () => void
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  isPlaying: false,
  currentTime: 0,
  volume: 1,

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false, currentTime: 0 }),
  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying }))
}))
