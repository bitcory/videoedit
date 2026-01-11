export interface Project {
  id: string
  name: string
  clips: VideoClip[]
  duration: number
}

export interface VideoClip {
  id: string
  name: string
  file: File | null
  videoUrl: string
  startTime: number      // 타임라인에서의 시작 위치 (초)
  duration: number       // 클립 전체 길이 (초)
  trimStart: number      // 트리밍 시작점 (초)
  trimEnd: number        // 트리밍 끝점 (초)
  thumbnails: string[]   // 썸네일 이미지 URL 배열
}

export interface ExportOptions {
  format: 'mp4' | 'webm' | 'mp3' | 'wav'
  quality: 'low' | 'medium' | 'high'
}

export interface FrameCaptureOptions {
  scale: 1 | 2           // 1x 원본, 2x 업스케일
  format: 'png' | 'jpg'
  quality: number        // JPG인 경우 0-1
}
