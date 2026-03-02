/**
 * Stem separator - thin wrapper that delegates all heavy work to a Web Worker.
 * The main thread only handles audio decoding (OfflineAudioContext) and Blob creation.
 */
import { decodeAudioToStereo } from './AudioProcessor'

export interface StemProgress {
  stage: 'download' | 'extract' | 'separate' | 'encode'
  progress: number
  message: string
}

class StemSeparator {
  private worker: Worker | null = null
  private loaded = false
  private loading = false

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL('./separationWorker.ts', import.meta.url),
        { type: 'module' },
      )
    }
    return this.worker
  }

  async load(onProgress?: (p: StemProgress) => void): Promise<void> {
    if (this.loaded) return
    if (this.loading) {
      while (this.loading) {
        await new Promise(r => setTimeout(r, 100))
      }
      return
    }
    this.loading = true

    try {
      const worker = this.getWorker()

      await new Promise<void>((resolve, reject) => {
        const handler = (e: MessageEvent) => {
          const msg = e.data
          if (msg.type === 'progress') {
            onProgress?.({
              stage: msg.stage,
              progress: msg.progress,
              message: msg.message,
            })
          } else if (msg.type === 'loaded') {
            worker.removeEventListener('message', handler)
            resolve()
          } else if (msg.type === 'error') {
            worker.removeEventListener('message', handler)
            reject(new Error(msg.message))
          }
        }
        worker.addEventListener('message', handler)
        worker.postMessage({ type: 'load' })
      })

      this.loaded = true
    } catch (error) {
      throw error instanceof Error ? error : new Error('AI 모델을 로드할 수 없습니다.')
    } finally {
      this.loading = false
    }
  }

  isLoaded(): boolean {
    return this.loaded
  }

  async separate(
    audioBlob: Blob,
    onProgress?: (p: StemProgress) => void,
  ): Promise<{ vocals: Blob; instrumental: Blob }> {
    if (!this.loaded) throw new Error('모델이 로드되지 않았습니다')

    // Decode audio on main thread (OfflineAudioContext is lightweight async)
    onProgress?.({ stage: 'extract', progress: 0, message: '오디오 디코딩 중...' })
    const [left, right] = await decodeAudioToStereo(audioBlob)
    onProgress?.({ stage: 'extract', progress: 100, message: '오디오 디코딩 완료' })

    const worker = this.getWorker()

    return new Promise<{ vocals: Blob; instrumental: Blob }>((resolve, reject) => {
      const handler = (e: MessageEvent) => {
        const msg = e.data
        if (msg.type === 'progress') {
          onProgress?.({
            stage: msg.stage,
            progress: msg.progress,
            message: msg.message,
          })
        } else if (msg.type === 'result') {
          worker.removeEventListener('message', handler)
          const vocals = new Blob([msg.vocals], { type: 'audio/wav' })
          const instrumental = new Blob([msg.instrumental], { type: 'audio/wav' })
          resolve({ vocals, instrumental })
        } else if (msg.type === 'error') {
          worker.removeEventListener('message', handler)
          reject(new Error(msg.message))
        }
      }
      worker.addEventListener('message', handler)

      // Transfer Float32Arrays to worker (zero-copy)
      worker.postMessage(
        { type: 'separate', left, right },
        [left.buffer, right.buffer],
      )
    })
  }
}

export const stemSeparator = new StemSeparator()
