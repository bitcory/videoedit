export type TrackType = 'video' | 'vocals' | 'instrumental'
export type AppPhase = 'empty' | 'uploading' | 'separating' | 'ready' | 'exporting'

export interface Track {
  id: string
  type: TrackType
  name: string
  active: boolean       // false = 내보내기에서 제외
  blob: Blob | null
  url: string
  duration: number
  thumbnails?: string[] // 영상 트랙 전용
}

export interface ExportOptions {
  format: 'mp4' | 'webm' | 'mp3' | 'wav'
  quality: 'low' | 'medium' | 'high'
}
