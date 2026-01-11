import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { VideoClip, ExportOptions } from '../types'

class VideoEngine {
  private ffmpeg: FFmpeg | null = null
  private loaded = false
  private loading = false

  async load(onProgress?: (progress: number) => void): Promise<void> {
    if (this.loaded) return
    if (this.loading) {
      // 이미 로딩 중이면 완료될 때까지 대기
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

      // jsdelivr CDN 사용 (더 안정적)
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'

      console.log('FFmpeg 로딩 시작...')

      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })

      this.loaded = true
      console.log('FFmpeg 로딩 완료!')
    } catch (error) {
      console.error('FFmpeg 로딩 실패:', error)
      this.ffmpeg = null
      throw new Error('FFmpeg를 로드할 수 없습니다. 네트워크 연결을 확인해주세요.')
    } finally {
      this.loading = false
    }
  }

  isLoaded(): boolean {
    return this.loaded
  }

  /**
   * 비디오 내보내기
   */
  async exportVideo(
    clips: VideoClip[],
    options: ExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      throw new Error('FFmpeg가 로드되지 않았습니다')
    }

    // progress 콜백 등록
    if (onProgress) {
      this.ffmpeg.on('progress', ({ progress }) => {
        onProgress(progress * 100)
      })
    }

    // 단일 클립인 경우 간단히 처리
    if (clips.length === 1) {
      const clip = clips[0]
      if (!clip.file) throw new Error('클립 파일이 없습니다')

      await this.ffmpeg.writeFile('input.mp4', await fetchFile(clip.file))

      const trimDuration = clip.trimEnd - clip.trimStart
      const outputExt = options.format === 'mp3' || options.format === 'wav' ? options.format : 'mp4'

      const args = [
        '-i', 'input.mp4',
        '-ss', clip.trimStart.toString(),
        '-t', trimDuration.toString(),
      ]

      // 오디오만 추출하는 경우
      if (options.format === 'mp3') {
        args.push('-vn', '-acodec', 'libmp3lame', '-q:a', '2')
      } else if (options.format === 'wav') {
        args.push('-vn', '-acodec', 'pcm_s16le')
      } else {
        // 비디오 품질 설정
        const crf = options.quality === 'high' ? '18' : options.quality === 'medium' ? '23' : '28'
        args.push('-c:v', 'libx264', '-crf', crf, '-c:a', 'aac')
      }

      args.push(`output.${outputExt}`)

      await this.ffmpeg.exec(args)
      const data = await this.ffmpeg.readFile(`output.${outputExt}`)

      const mimeType = options.format === 'mp3' ? 'audio/mpeg' :
                       options.format === 'wav' ? 'audio/wav' :
                       options.format === 'webm' ? 'video/webm' : 'video/mp4'

      return new Blob([data], { type: mimeType })
    }

    // 여러 클립 병합은 추후 구현
    throw new Error('여러 클립 병합은 아직 지원되지 않습니다')
  }

  /**
   * 오디오만 추출
   */
  async extractAudio(
    clip: VideoClip,
    format: 'mp3' | 'wav' = 'mp3'
  ): Promise<Blob> {
    return this.exportVideo([clip], { format, quality: 'high' })
  }
}

export const videoEngine = new VideoEngine()
