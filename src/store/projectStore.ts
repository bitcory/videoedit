import { create } from 'zustand'
import { Track, AppPhase } from '../types'

interface ProjectState {
  phase: AppPhase
  videoFile: File | null
  videoUrl: string
  videoDuration: number
  tracks: Track[]
  separationProgress: number
  separationMessage: string
  exportProgress: number

  // Actions
  setPhase: (phase: AppPhase) => void
  setVideo: (file: File, url: string, duration: number) => void
  setTracks: (tracks: Track[]) => void
  toggleTrack: (trackId: string) => void
  setSeparationProgress: (progress: number, message: string) => void
  setExportProgress: (progress: number) => void
  reset: () => void
  getDuration: () => number
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  phase: 'empty',
  videoFile: null,
  videoUrl: '',
  videoDuration: 0,
  tracks: [],
  separationProgress: 0,
  separationMessage: '',
  exportProgress: 0,

  setPhase: (phase) => set({ phase }),

  setVideo: (file, url, duration) => set({
    videoFile: file,
    videoUrl: url,
    videoDuration: duration,
  }),

  setTracks: (tracks) => set({ tracks }),

  toggleTrack: (trackId) => set((state) => ({
    tracks: state.tracks.map(t =>
      t.id === trackId ? { ...t, active: !t.active } : t
    )
  })),

  setSeparationProgress: (progress, message) => set({
    separationProgress: progress,
    separationMessage: message,
  }),

  setExportProgress: (progress) => set({ exportProgress: progress }),

  reset: () => set({
    phase: 'empty',
    videoFile: null,
    videoUrl: '',
    videoDuration: 0,
    tracks: [],
    separationProgress: 0,
    separationMessage: '',
    exportProgress: 0,
  }),

  getDuration: () => get().videoDuration,
}))
