import { create } from 'zustand'
import { VideoClip } from '../types'

interface ProjectState {
  projectName: string
  clips: VideoClip[]
  selectedClipId: string | null
  zoom: number

  // Actions
  setProjectName: (name: string) => void
  addClip: (clip: VideoClip) => void
  removeClip: (clipId: string) => void
  updateClip: (clipId: string, updates: Partial<VideoClip>) => void
  selectClip: (clipId: string | null) => void
  setZoom: (zoom: number) => void
  splitClip: (clipId: string, splitTime: number) => void
  collapseGaps: () => void  // 빈 공간 제거
  getProjectDuration: () => number
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectName: '새 프로젝트',
  clips: [],
  selectedClipId: null,
  zoom: 1,

  setProjectName: (name) => set({ projectName: name }),

  addClip: (clip) => set((state) => ({
    clips: [...state.clips, clip]
  })),

  removeClip: (clipId) => set((state) => ({
    clips: state.clips.filter(c => c.id !== clipId),
    selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId
  })),

  updateClip: (clipId, updates) => set((state) => ({
    clips: state.clips.map(c =>
      c.id === clipId ? { ...c, ...updates } : c
    )
  })),

  selectClip: (clipId) => set({ selectedClipId: clipId }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),

  splitClip: (clipId, splitTime) => set((state) => {
    const clip = state.clips.find(c => c.id === clipId)
    if (!clip) return state

    const relativeTime = splitTime - clip.startTime
    if (relativeTime <= clip.trimStart || relativeTime >= clip.trimEnd) return state

    const firstClip: VideoClip = {
      ...clip,
      id: `${clip.id}-1`,
      trimEnd: relativeTime
    }

    const secondClip: VideoClip = {
      ...clip,
      id: `${clip.id}-2`,
      startTime: splitTime,
      trimStart: relativeTime
    }

    return {
      clips: state.clips.map(c => c.id === clipId ? firstClip : c).concat(secondClip)
    }
  }),

  // 빈 공간 제거 - 클립들을 시작 시간 순으로 정렬하고 간격 없이 붙임
  collapseGaps: () => set((state) => {
    if (state.clips.length === 0) return state

    // 시작 시간 순으로 정렬
    const sortedClips = [...state.clips].sort((a, b) => a.startTime - b.startTime)

    let currentTime = 0
    const collapsedClips = sortedClips.map(clip => {
      const clipDuration = clip.trimEnd - clip.trimStart
      const newClip = { ...clip, startTime: currentTime }
      currentTime += clipDuration
      return newClip
    })

    return { clips: collapsedClips }
  }),

  getProjectDuration: () => {
    const { clips } = get()
    if (clips.length === 0) return 0
    return Math.max(...clips.map(c => c.startTime + (c.trimEnd - c.trimStart)))
  }
}))
