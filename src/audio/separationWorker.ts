/**
 * Web Worker for stem separation.
 * Runs all heavy computation (STFT, ONNX inference, iSTFT) off the main thread.
 */
/// <reference lib="webworker" />

import * as ort from 'onnxruntime-web'
import {
  stft, istft, splitIntoChunks, mergeChunks, encodeWavStereo,
  FFT_SIZE, DIM_F, NUM_BINS,
  type ComplexSpectrum,
} from './AudioProcessor'

const SEGMENT_SIZE = 256

const MODEL_URLS = [
  'https://huggingface.co/Politrees/UVR_resources/resolve/main/models/MDXNet/UVR-MDX-NET-Inst_HQ_2.onnx',
  'https://huggingface.co/seanghay/uvr_models/resolve/main/UVR-MDX-NET-Inst_HQ_2.onnx',
]
const MODEL_DB_NAME = 'stem-separator-cache'
const MODEL_DB_STORE = 'models'
const MODEL_KEY = 'UVR-MDX-NET-Inst_HQ_2'

let session: ort.InferenceSession | null = null

// ── Helpers ──

function progress(stage: string, pct: number, message: string) {
  self.postMessage({ type: 'progress', stage, progress: pct, message })
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

// ── Model loading ──

async function loadModel(): Promise<void> {
  if (session) {
    self.postMessage({ type: 'loaded' })
    return
  }

  ort.env.wasm.numThreads = 1
  ort.env.wasm.proxy = false

  progress('download', 0, 'WASM 런타임 준비 중...')
  try {
    const wasmUrl = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.2/dist/ort-wasm-simd-threaded.jsep.wasm'
    const wasmResponse = await fetch(wasmUrl, { mode: 'cors' })
    if (!wasmResponse.ok) throw new Error(`HTTP ${wasmResponse.status}`)
    ort.env.wasm.wasmBinary = await wasmResponse.arrayBuffer()
  } catch (e) {
    throw new Error('WASM 런타임을 다운로드할 수 없습니다. 네트워크 연결을 확인해주세요.')
  }

  let modelBuffer = await getCachedModel()

  if (!modelBuffer) {
    progress('download', 5, '모델 다운로드 중...')
    modelBuffer = await downloadModel((pct) => {
      progress('download', 5 + pct * 0.9, `모델 다운로드 중... ${Math.round(pct)}%`)
    })
    await cacheModel(modelBuffer)
    progress('download', 95, '모델 다운로드 완료')
  } else {
    progress('download', 95, '캐시에서 모델 로드됨')
  }

  progress('download', 97, '추론 세션 생성 중...')
  session = await ort.InferenceSession.create(modelBuffer, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  })

  progress('download', 100, '모델 준비 완료')
  self.postMessage({ type: 'loaded' })
}

// ── Chunk processing ──

async function processChunkAsync(
  leftAudio: Float32Array,
  rightAudio: Float32Array,
): Promise<[Float32Array, Float32Array]> {
  if (!session) throw new Error('세션 없음')

  const pad = Math.floor(FFT_SIZE / 2)
  const paddedLength = leftAudio.length + 2 * pad
  const paddedLeft = new Float32Array(paddedLength)
  const paddedRight = new Float32Array(paddedLength)
  paddedLeft.set(leftAudio, pad)
  paddedRight.set(rightAudio, pad)

  const leftSpec = stft(paddedLeft)
  const rightSpec = stft(paddedRight)
  const numFrames = leftSpec.numFrames

  const paddedFrames = Math.max(SEGMENT_SIZE, Math.ceil(numFrames / SEGMENT_SIZE) * SEGMENT_SIZE)
  const zeroFrame = new Float32Array(NUM_BINS)
  for (let i = numFrames; i < paddedFrames; i++) {
    leftSpec.real.push(new Float32Array(zeroFrame))
    leftSpec.imag.push(new Float32Array(zeroFrame))
    rightSpec.real.push(new Float32Array(zeroFrame))
    rightSpec.imag.push(new Float32Array(zeroFrame))
  }

  const nSegments = paddedFrames / SEGMENT_SIZE
  const outLR: Float32Array[] = []
  const outLI: Float32Array[] = []
  const outRR: Float32Array[] = []
  const outRI: Float32Array[] = []

  for (let s = 0; s < nSegments; s++) {
    const start = s * SEGMENT_SIZE

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
    const feeds: Record<string, ort.Tensor> = { [session!.inputNames[0]]: inputTensor }
    const results = await session!.run(feeds)
    const outputData = results[session!.outputNames[0]].data as Float32Array

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

      outLR.push(lr)
      outLI.push(li)
      outRR.push(rr)
      outRI.push(ri)
    }
  }

  const mkSpec = (real: Float32Array[], imag: Float32Array[]): ComplexSpectrum => ({
    real: real.slice(0, numFrames),
    imag: imag.slice(0, numFrames),
    numFrames,
    numBins: NUM_BINS,
  })

  const fullLeft = istft(mkSpec(outLR, outLI), paddedLength)
  const fullRight = istft(mkSpec(outRR, outRI), paddedLength)

  return [
    fullLeft.slice(pad, pad + leftAudio.length),
    fullRight.slice(pad, pad + rightAudio.length),
  ]
}

// ── Separation ──

async function separate(left: Float32Array, right: Float32Array): Promise<void> {
  if (!session) throw new Error('모델이 로드되지 않았습니다')

  progress('extract', 100, '오디오 디코딩 완료')

  const { chunks: leftChunks, offsets } = splitIntoChunks(left)
  const { chunks: rightChunks } = splitIntoChunks(right)

  const instrLeftChunks: Float32Array[] = []
  const instrRightChunks: Float32Array[] = []

  for (let c = 0; c < leftChunks.length; c++) {
    progress('separate', (c / leftChunks.length) * 100, `음원 분리 중... (${c + 1}/${leftChunks.length})`)
    const [instrL, instrR] = await processChunkAsync(leftChunks[c], rightChunks[c])
    instrLeftChunks.push(instrL)
    instrRightChunks.push(instrR)
  }

  progress('separate', 100, '음원 분리 완료')

  const instrLeft = mergeChunks(instrLeftChunks, offsets, left.length)
  const instrRight = mergeChunks(instrRightChunks, offsets, right.length)

  const vocalLeft = new Float32Array(left.length)
  const vocalRight = new Float32Array(right.length)
  for (let i = 0; i < left.length; i++) {
    vocalLeft[i] = left[i] - instrLeft[i]
    vocalRight[i] = right[i] - instrRight[i]
  }

  progress('encode', 0, 'WAV 인코딩 중...')
  const vocalsBlob = encodeWavStereo(vocalLeft, vocalRight)
  const instrumentalBlob = encodeWavStereo(instrLeft, instrRight)
  progress('encode', 100, '인코딩 완료')

  const vocalsBuffer = await vocalsBlob.arrayBuffer()
  const instrBuffer = await instrumentalBlob.arrayBuffer()

  self.postMessage(
    { type: 'result', vocals: vocalsBuffer, instrumental: instrBuffer },
    [vocalsBuffer, instrBuffer] as any,
  )
}

// ── Message handler ──

self.onmessage = async (e: MessageEvent) => {
  try {
    switch (e.data.type) {
      case 'load':
        await loadModel()
        break
      case 'separate':
        await separate(e.data.left, e.data.right)
        break
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
