/**
 * ONNX Runtime Web based stem separator (MDX-Net).
 * Singleton pattern matching VideoEngine.
 */
import * as ort from 'onnxruntime-web'
import {
  stft, istft, decodeAudioToStereo, encodeWavStereo,
  splitIntoChunks, mergeChunks,
  FFT_SIZE, DIM_F, NUM_BINS,
  type ComplexSpectrum,
} from './AudioProcessor'

// ── Model config ──

const MODEL_URLS = [
  'https://huggingface.co/Politrees/UVR_resources/resolve/main/models/MDXNet/UVR-MDX-NET-Inst_HQ_2.onnx',
  'https://huggingface.co/seanghay/uvr_models/resolve/main/UVR-MDX-NET-Inst_HQ_2.onnx',
]
const MODEL_DB_NAME = 'stem-separator-cache'
const MODEL_DB_STORE = 'models'
const MODEL_KEY = 'UVR-MDX-NET-Inst_HQ_2'

const SEGMENT_SIZE = 256 // time frames per model input

// ── Progress callback type ──

export interface StemProgress {
  stage: 'download' | 'extract' | 'separate' | 'encode'
  progress: number
  message: string
}

// ── IndexedDB helpers ──

function openModelDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MODEL_DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(MODEL_DB_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getCachedModel(): Promise<ArrayBuffer | null> {
  try {
    const db = await openModelDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MODEL_DB_STORE, 'readonly')
      const store = tx.objectStore(MODEL_DB_STORE)
      const req = store.get(MODEL_KEY)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

async function cacheModel(data: ArrayBuffer): Promise<void> {
  try {
    const db = await openModelDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MODEL_DB_STORE, 'readwrite')
      const store = tx.objectStore(MODEL_DB_STORE)
      const req = store.put(data, MODEL_KEY)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    // Cache failure is non-critical
  }
}

// ── Model download with streaming progress + fallback URLs ──

async function downloadModel(onProgress: (pct: number) => void): Promise<ArrayBuffer> {
  let lastError: Error | null = null

  for (const url of MODEL_URLS) {
    try {
      const response = await fetch(url, { mode: 'cors' })
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} from ${new URL(url).hostname}`)
        continue
      }

      const contentLength = Number(response.headers.get('content-length') || 0)
      const reader = response.body!.getReader()
      const chunks: Uint8Array[] = []
      let received = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        received += value.byteLength
        if (contentLength > 0) {
          onProgress((received / contentLength) * 100)
        }
      }

      const result = new Uint8Array(received)
      let offset = 0
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.byteLength
      }

      return result.buffer
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }
  }

  throw new Error(`모델 다운로드 실패: ${lastError?.message}`)
}

// ── Singleton Separator ──

class StemSeparator {
  private session: ort.InferenceSession | null = null
  private loading = false
  private loaded = false

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
      // Step 1: Configure ONNX Runtime for COEP-compatible loading
      ort.env.wasm.numThreads = 1
      ort.env.wasm.proxy = false

      // Step 2: Fetch WASM binary from CDN (bypasses COEP)
      onProgress?.({ stage: 'download', progress: 0, message: 'WASM 런타임 준비 중...' })
      try {
        const wasmUrl = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.2/dist/ort-wasm-simd-threaded.jsep.wasm'
        const wasmResponse = await fetch(wasmUrl, { mode: 'cors' })
        if (!wasmResponse.ok) throw new Error(`HTTP ${wasmResponse.status}`)
        ort.env.wasm.wasmBinary = await wasmResponse.arrayBuffer()
      } catch (e) {
        console.error('WASM 런타임 로드 실패:', e)
        throw new Error('WASM 런타임을 다운로드할 수 없습니다. 네트워크 연결을 확인해주세요.')
      }

      // Step 3: Download or load cached ONNX model
      let modelBuffer = await getCachedModel()

      if (!modelBuffer) {
        onProgress?.({ stage: 'download', progress: 5, message: '모델 다운로드 중...' })
        modelBuffer = await downloadModel((pct) => {
          onProgress?.({ stage: 'download', progress: 5 + pct * 0.9, message: `모델 다운로드 중... ${Math.round(pct)}%` })
        })
        await cacheModel(modelBuffer)
        onProgress?.({ stage: 'download', progress: 95, message: '모델 다운로드 완료' })
      } else {
        onProgress?.({ stage: 'download', progress: 95, message: '캐시에서 모델 로드됨' })
      }

      // Step 4: Create inference session
      onProgress?.({ stage: 'download', progress: 97, message: '추론 세션 생성 중...' })
      this.session = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      })

      this.loaded = true
      onProgress?.({ stage: 'download', progress: 100, message: '모델 준비 완료' })
    } catch (error) {
      console.error('모델 로딩 실패:', error)
      this.session = null
      throw error instanceof Error ? error : new Error('AI 모델을 로드할 수 없습니다.')
    } finally {
      this.loading = false
    }
  }

  isLoaded(): boolean {
    return this.loaded
  }

  /**
   * Separate vocals from instrumental.
   * Returns { vocals, instrumental } as stereo WAV Blobs.
   */
  async separate(
    audioBlob: Blob,
    onProgress?: (p: StemProgress) => void
  ): Promise<{ vocals: Blob; instrumental: Blob }> {
    if (!this.session) throw new Error('모델이 로드되지 않았습니다')

    // 1. Decode audio to stereo
    onProgress?.({ stage: 'extract', progress: 0, message: '오디오 디코딩 중...' })
    const [left, right] = await decodeAudioToStereo(audioBlob)
    onProgress?.({ stage: 'extract', progress: 100, message: '오디오 디코딩 완료' })

    // 2. Split both channels into chunks
    const { chunks: leftChunks, offsets } = splitIntoChunks(left)
    const { chunks: rightChunks } = splitIntoChunks(right)

    const instrLeftChunks: Float32Array[] = []
    const instrRightChunks: Float32Array[] = []

    // 3. Process each stereo chunk pair
    for (let c = 0; c < leftChunks.length; c++) {
      onProgress?.({
        stage: 'separate',
        progress: (c / leftChunks.length) * 100,
        message: `음원 분리 중... (${c + 1}/${leftChunks.length})`
      })

      const [instrL, instrR] = await this.processChunk(leftChunks[c], rightChunks[c])
      instrLeftChunks.push(instrL)
      instrRightChunks.push(instrR)
    }

    onProgress?.({ stage: 'separate', progress: 100, message: '음원 분리 완료' })

    // 4. Merge chunks
    const instrLeft = mergeChunks(instrLeftChunks, offsets, left.length)
    const instrRight = mergeChunks(instrRightChunks, offsets, right.length)

    // 5. Vocals = original - instrumental
    const vocalLeft = new Float32Array(left.length)
    const vocalRight = new Float32Array(right.length)
    for (let i = 0; i < left.length; i++) {
      vocalLeft[i] = left[i] - instrLeft[i]
      vocalRight[i] = right[i] - instrRight[i]
    }

    // 6. Encode to stereo WAV
    onProgress?.({ stage: 'encode', progress: 0, message: 'WAV 인코딩 중...' })
    const vocalsBlob = encodeWavStereo(vocalLeft, vocalRight)
    const instrumentalBlob = encodeWavStereo(instrLeft, instrRight)
    onProgress?.({ stage: 'encode', progress: 100, message: '인코딩 완료' })

    return { vocals: vocalsBlob, instrumental: instrumentalBlob }
  }

  /**
   * Process one stereo audio chunk through the model.
   * STFT → segment into 256-frame blocks → model inference → merge → iSTFT
   * Returns [instrumentalLeft, instrumentalRight].
   */
  private async processChunk(
    leftAudio: Float32Array,
    rightAudio: Float32Array,
  ): Promise<[Float32Array, Float32Array]> {
    if (!this.session) throw new Error('세션 없음')

    // Pad audio with n_fft/2 zeros on both sides to match PyTorch center=True
    // This prevents edge artifacts from incomplete window overlap
    const pad = Math.floor(FFT_SIZE / 2)
    const paddedLength = leftAudio.length + 2 * pad
    const paddedLeft = new Float32Array(paddedLength)
    const paddedRight = new Float32Array(paddedLength)
    paddedLeft.set(leftAudio, pad)
    paddedRight.set(rightAudio, pad)

    // STFT both channels (on padded audio)
    const leftSpec = stft(paddedLeft)
    const rightSpec = stft(paddedRight)
    const numFrames = leftSpec.numFrames

    // Pad to multiple of SEGMENT_SIZE
    const paddedFrames = Math.max(SEGMENT_SIZE, Math.ceil(numFrames / SEGMENT_SIZE) * SEGMENT_SIZE)
    const zeroFrame = new Float32Array(NUM_BINS)
    for (let i = numFrames; i < paddedFrames; i++) {
      leftSpec.real.push(new Float32Array(zeroFrame))
      leftSpec.imag.push(new Float32Array(zeroFrame))
      rightSpec.real.push(new Float32Array(zeroFrame))
      rightSpec.imag.push(new Float32Array(zeroFrame))
    }

    // Process each segment
    const nSegments = paddedFrames / SEGMENT_SIZE
    const outLR: Float32Array[] = [] // left real
    const outLI: Float32Array[] = [] // left imag
    const outRR: Float32Array[] = [] // right real
    const outRI: Float32Array[] = [] // right imag

    for (let s = 0; s < nSegments; s++) {
      const start = s * SEGMENT_SIZE

      // Build input tensor [1, 4, DIM_F, SEGMENT_SIZE]
      // Channels: [left_real, left_imag, right_real, right_imag]
      // Layout (row-major): offset = c*DIM_F*SEGMENT_SIZE + f*SEGMENT_SIZE + t
      const inputData = new Float32Array(4 * DIM_F * SEGMENT_SIZE)

      for (let t = 0; t < SEGMENT_SIZE; t++) {
        const frameIdx = start + t
        for (let f = 0; f < DIM_F; f++) {
          const base = f * SEGMENT_SIZE + t
          inputData[0 * DIM_F * SEGMENT_SIZE + base] = leftSpec.real[frameIdx][f]
          inputData[1 * DIM_F * SEGMENT_SIZE + base] = leftSpec.imag[frameIdx][f]
          inputData[2 * DIM_F * SEGMENT_SIZE + base] = rightSpec.real[frameIdx][f]
          inputData[3 * DIM_F * SEGMENT_SIZE + base] = rightSpec.imag[frameIdx][f]
        }
      }

      const inputTensor = new ort.Tensor('float32', inputData, [1, 4, DIM_F, SEGMENT_SIZE])
      const feeds: Record<string, ort.Tensor> = { [this.session.inputNames[0]]: inputTensor }
      const results = await this.session.run(feeds)
      const outputData = results[this.session.outputNames[0]].data as Float32Array

      // Extract output frames for this segment
      for (let t = 0; t < SEGMENT_SIZE; t++) {
        const lr = new Float32Array(NUM_BINS)
        const li = new Float32Array(NUM_BINS)
        const rr = new Float32Array(NUM_BINS)
        const ri = new Float32Array(NUM_BINS)

        for (let f = 0; f < DIM_F; f++) {
          const base = f * SEGMENT_SIZE + t
          lr[f] = outputData[0 * DIM_F * SEGMENT_SIZE + base]
          li[f] = outputData[1 * DIM_F * SEGMENT_SIZE + base]
          rr[f] = outputData[2 * DIM_F * SEGMENT_SIZE + base]
          ri[f] = outputData[3 * DIM_F * SEGMENT_SIZE + base]
        }
        // Nyquist bin (index DIM_F = 3072) stays zero

        outLR.push(lr)
        outLI.push(li)
        outRR.push(rr)
        outRI.push(ri)
      }
    }

    // Trim to original frame count and build spectrums
    const mkSpec = (real: Float32Array[], imag: Float32Array[]): ComplexSpectrum => ({
      real: real.slice(0, numFrames),
      imag: imag.slice(0, numFrames),
      numFrames,
      numBins: NUM_BINS,
    })

    // iSTFT to padded length, then trim padding
    const fullLeft = istft(mkSpec(outLR, outLI), paddedLength)
    const fullRight = istft(mkSpec(outRR, outRI), paddedLength)

    return [
      fullLeft.slice(pad, pad + leftAudio.length),
      fullRight.slice(pad, pad + rightAudio.length),
    ]
  }
}

export const stemSeparator = new StemSeparator()
