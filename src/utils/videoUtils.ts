import { FrameCaptureOptions } from '../types'

/**
 * 비디오 파일에서 메타데이터 추출
 */
export async function getVideoMetadata(file: File): Promise<{
  duration: number
  width: number
  height: number
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      })
      URL.revokeObjectURL(video.src)
    }

    video.onerror = () => {
      reject(new Error('비디오 메타데이터를 읽을 수 없습니다'))
      URL.revokeObjectURL(video.src)
    }

    video.src = URL.createObjectURL(file)
  })
}

/**
 * 비디오에서 썸네일 생성
 */
export async function generateThumbnails(
  videoUrl: string,
  duration: number,
  count: number = 10
): Promise<string[]> {
  const video = document.createElement('video')
  video.src = videoUrl
  video.crossOrigin = 'anonymous'

  await new Promise<void>((resolve) => {
    video.onloadeddata = () => resolve()
  })

  const thumbnails: string[] = []
  const interval = duration / count

  for (let i = 0; i < count; i++) {
    const time = i * interval
    video.currentTime = time

    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve()
    })

    const canvas = document.createElement('canvas')
    canvas.width = 160
    canvas.height = 90
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    thumbnails.push(canvas.toDataURL('image/jpeg', 0.7))
  }

  return thumbnails
}

/**
 * 현재 프레임 캡처 (업스케일 지원)
 */
export function captureFrame(
  video: HTMLVideoElement,
  options: FrameCaptureOptions = { scale: 1, format: 'png', quality: 0.92 }
): string {
  const { scale, format, quality } = options

  const width = video.videoWidth * scale
  const height = video.videoHeight * scale

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')!

  // 고품질 업스케일링 설정
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  ctx.drawImage(video, 0, 0, width, height)

  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
  return canvas.toDataURL(mimeType, format === 'jpg' ? quality : undefined)
}

/**
 * Data URL을 파일로 다운로드
 */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * 시간을 MM:SS.ms 형식으로 포맷
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

/**
 * 고유 ID 생성
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
