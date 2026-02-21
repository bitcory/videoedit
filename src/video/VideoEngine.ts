import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { Track } from '../types'

class VideoEngine {
  private ffmpeg: FFmpeg | null = null
  private loaded = false
  private loading = false

  async load(onProgress?: (progress: number) => void): Promise<void> {
    if (this.loaded) return
    if (this.loading) {
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      return
    }

    this.loading = true

    try {
      this.ffmpeg = new FFmpeg()

      this.ffmpeg.on('progress', ({ progress }) => {
        onProgress?.(progress * 100)
      })

      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'

      const loadPromise = (async () => {
        const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript')
        const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
        await this.ffmpeg!.load({ coreURL, wasmURL })
      })()

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('FFmpeg 로딩 시간 초과 (30초)')), 30000)
      )

      await Promise.race([loadPromise, timeoutPromise])

      this.loaded = true
    } catch (error) {
      console.error('FFmpeg 로딩 실패:', error)
      this.ffmpeg = null
      throw new Error('FFmpeg를 로드할 수 없습니다: ' + (error instanceof Error ? error.message : '네트워크 연결을 확인해주세요.'))
    } finally {
      this.loading = false
    }
  }

  isLoaded(): boolean {
    return this.loaded
  }

  /**
   * 비디오 파일에서 WAV 오디오 추출
   */
  async extractAudioFromFile(file: File): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      throw new Error('FFmpeg가 로드되지 않았습니다')
    }

    await this.ffmpeg.writeFile('input.mp4', await fetchFile(file))

    await this.ffmpeg.exec([
      '-i', 'input.mp4',
      '-vn', '-acodec', 'pcm_s16le',
      '-ar', '44100', '-ac', '2',
      'output.wav'
    ])

    const data = await this.ffmpeg.readFile('output.wav')
    return new Blob([data], { type: 'audio/wav' })
  }

  /**
   * 활성 트랙 기반 내보내기
   *
   * | 활성 트랙          | 동작                          |
   * |--------------------|-------------------------------|
   * | 영상+보컬+반주     | 원본 파일 그대로 복사          |
   * | 영상+오디오 1개    | -map 0:v -map 1:a 합성        |
   * | 영상만             | -an 무음 영상                 |
   * | 오디오만 (1개)     | WAV 복사                      |
   * | 오디오 2개         | amix 필터로 믹싱              |
   */
  async exportTracks(
    videoFile: File,
    tracks: Track[],
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      throw new Error('FFmpeg가 로드되지 않았습니다')
    }

    if (onProgress) {
      this.ffmpeg.on('progress', ({ progress }) => {
        onProgress(progress * 100)
      })
    }

    const activeTracks = tracks.filter(t => t.active)
    const hasVideo = activeTracks.some(t => t.type === 'video')
    const audioTracks = activeTracks.filter(t => t.type !== 'video')

    // 영상+보컬+반주 = 모두 활성 → 원본 복사
    if (hasVideo && audioTracks.length === 2) {
      return new Blob([videoFile], { type: 'video/mp4' })
    }

    // 영상만 (무음)
    if (hasVideo && audioTracks.length === 0) {
      await this.ffmpeg.writeFile('input.mp4', await fetchFile(videoFile))
      await this.ffmpeg.exec(['-i', 'input.mp4', '-an', '-c:v', 'copy', 'output.mp4'])
      const data = await this.ffmpeg.readFile('output.mp4')
      return new Blob([data], { type: 'video/mp4' })
    }

    // 영상 + 오디오 1개
    if (hasVideo && audioTracks.length === 1) {
      await this.ffmpeg.writeFile('input.mp4', await fetchFile(videoFile))
      await this.ffmpeg.writeFile('audio.wav', await fetchFile(audioTracks[0].blob!))
      await this.ffmpeg.exec([
        '-i', 'input.mp4', '-i', 'audio.wav',
        '-map', '0:v', '-map', '1:a',
        '-c:v', 'copy', '-c:a', 'aac', '-shortest',
        'output.mp4'
      ])
      const data = await this.ffmpeg.readFile('output.mp4')
      return new Blob([data], { type: 'video/mp4' })
    }

    // 오디오만 1개
    if (!hasVideo && audioTracks.length === 1) {
      return audioTracks[0].blob!
    }

    // 오디오 2개 → amix
    if (!hasVideo && audioTracks.length === 2) {
      await this.ffmpeg.writeFile('a1.wav', await fetchFile(audioTracks[0].blob!))
      await this.ffmpeg.writeFile('a2.wav', await fetchFile(audioTracks[1].blob!))
      await this.ffmpeg.exec([
        '-i', 'a1.wav', '-i', 'a2.wav',
        '-filter_complex', 'amix=inputs=2:duration=longest',
        'output.wav'
      ])
      const data = await this.ffmpeg.readFile('output.wav')
      return new Blob([data], { type: 'audio/wav' })
    }

    throw new Error('내보낼 활성 트랙이 없습니다')
  }
}

export const videoEngine = new VideoEngine()
