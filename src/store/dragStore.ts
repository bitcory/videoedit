import { create } from 'zustand'

interface DragState {
  isDragging: boolean
  draggedClipId: string | null
  dragStartX: number
  dragStartTime: number

  // Actions
  startDrag: (clipId: string, startX: number, startTime: number) => void
  endDrag: () => void
}

export const useDragStore = create<DragState>((set) => ({
  isDragging: false,
  draggedClipId: null,
  dragStartX: 0,
  dragStartTime: 0,

  startDrag: (clipId, startX, startTime) => set({
    isDragging: true,
    draggedClipId: clipId,
    dragStartX: startX,
    dragStartTime: startTime
  }),

  endDrag: () => set({
    isDragging: false,
    draggedClipId: null,
    dragStartX: 0,
    dragStartTime: 0
  })
}))
