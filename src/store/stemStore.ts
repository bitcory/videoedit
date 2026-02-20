import { create } from 'zustand'

type ModalState = 'closed' | 'idle' | 'processing' | 'complete' | 'error'

interface StemState {
  modalState: ModalState
  progress: number
  progressMessage: string
  vocalsBlob: Blob | null
  instrumentalBlob: Blob | null
  errorMessage: string

  openModal: () => void
  closeModal: () => void
  setProgress: (progress: number, message: string) => void
  setResult: (vocals: Blob, instrumental: Blob) => void
  setError: (message: string) => void
  reset: () => void
}

export const useStemStore = create<StemState>((set) => ({
  modalState: 'closed',
  progress: 0,
  progressMessage: '',
  vocalsBlob: null,
  instrumentalBlob: null,
  errorMessage: '',

  openModal: () => set({
    modalState: 'idle',
    progress: 0,
    progressMessage: '',
    vocalsBlob: null,
    instrumentalBlob: null,
    errorMessage: '',
  }),

  closeModal: () => set({ modalState: 'closed' }),

  setProgress: (progress, message) => set({
    modalState: 'processing',
    progress,
    progressMessage: message,
  }),

  setResult: (vocals, instrumental) => set({
    modalState: 'complete',
    progress: 100,
    vocalsBlob: vocals,
    instrumentalBlob: instrumental,
  }),

  setError: (message) => set({
    modalState: 'error',
    errorMessage: message,
  }),

  reset: () => set({
    modalState: 'idle',
    progress: 0,
    progressMessage: '',
    vocalsBlob: null,
    instrumentalBlob: null,
    errorMessage: '',
  }),
}))
