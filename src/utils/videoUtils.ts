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
    video.playsInline = true
    video.muted = true

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(video.src)
      reject(new Error('비디오 메타데이터 로딩 시간 초과'))
    }, 15000)

    video.onloadedmetadata = () => {
      clearTimeout(timeout)
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      })
      URL.revokeObjectURL(video.src)
    }

    video.onerror = () => {
      clearTimeout(timeout)
      reject(new Error('비디오 메타데이터를 읽을 수 없습니다'))
      URL.revokeObjectURL(video.src)
    }

    video.src = URL.createObjectURL(file)
    video.load()
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
  video.playsInline = true
  video.muted = true
  video.preload = 'auto'
  video.src = videoUrl

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => resolve(), 8000)
    video.onloadeddata = () => {
      clearTimeout(timeout)
      resolve()
    }
    video.load()
  })

  const thumbnails: string[] = []
  const interval = duration / count

  for (let i = 0; i < count; i++) {
    const time = i * interval
    video.currentTime = time

    await new Promise<void>((resolve) => {
      const seekTimeout = setTimeout(() => resolve(), 3000)
      video.onseeked = () => {
        clearTimeout(seekTimeout)
        resolve()
      }
    })

    try {
      const canvas = document.createElement('canvas')
      canvas.width = 160
      canvas.height = 90
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      thumbnails.push(canvas.toDataURL('image/jpeg', 0.7))
    } catch {
      thumbnails.push('')
    }
  }

  return thumbnails
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
