/**
 * DSP utilities for stem separation:
 * Hann window, mixed-radix 6144-point FFT, STFT/iSTFT, WAV encode/decode, chunk split/merge
 */

const SAMPLE_RATE = 44100
const FFT_SIZE = 6144
const HOP_LENGTH = 1024
const NUM_BINS = FFT_SIZE / 2 + 1 // 3073
const DIM_F = FFT_SIZE / 2 // 3072 (model frequency dimension)

// ── Hann Window ──

function createHannWindow(size: number): Float32Array {
  const window = new Float32Array(size)
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / size))
  }
  return window
}

// ── Radix-2 FFT (power-of-2, used internally by mixed-radix) ──

function bitReverse(n: number, bits: number): number {
  let reversed = 0
  for (let i = 0; i < bits; i++) {
    reversed = (reversed << 1) | (n & 1)
    n >>= 1
  }
  return reversed
}

function fftRadix2(real: Float32Array, imag: Float32Array, inverse: boolean): void {
  const N = real.length
  const bits = Math.log2(N)

  for (let i = 0; i < N; i++) {
    const j = bitReverse(i, bits)
    if (j > i) {
      let tmp = real[i]; real[i] = real[j]; real[j] = tmp
      tmp = imag[i]; imag[i] = imag[j]; imag[j] = tmp
    }
  }

  const sign = inverse ? 1 : -1
  for (let size = 2; size <= N; size *= 2) {
    const halfSize = size / 2
    const angle = (sign * 2 * Math.PI) / size
    const wReal = Math.cos(angle)
    const wImag = Math.sin(angle)

    for (let i = 0; i < N; i += size) {
      let curReal = 1
      let curImag = 0
      for (let j = 0; j < halfSize; j++) {
        const evenIdx = i + j
        const oddIdx = i + j + halfSize
        const tReal = curReal * real[oddIdx] - curImag * imag[oddIdx]
        const tImag = curReal * imag[oddIdx] + curImag * real[oddIdx]
        real[oddIdx] = real[evenIdx] - tReal
        imag[oddIdx] = imag[evenIdx] - tImag
        real[evenIdx] += tReal
        imag[evenIdx] += tImag
        const newCurReal = curReal * wReal - curImag * wImag
        curImag = curReal * wImag + curImag * wReal
        curReal = newCurReal
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < N; i++) {
      real[i] /= N
      imag[i] /= N
    }
  }
}

// ── Mixed-radix 6144-point FFT (6144 = 3 × 2048) ──

function fft6144Forward(real: Float32Array, imag: Float32Array): void {
  const N1 = 3
  const N2 = 2048

  // Step 1: Extract 3 decimated subsequences, compute 2048-point FFT each
  const subReal: Float32Array[] = []
  const subImag: Float32Array[] = []

  for (let n1 = 0; n1 < N1; n1++) {
    const sr = new Float32Array(N2)
    const si = new Float32Array(N2)
    for (let n2 = 0; n2 < N2; n2++) {
      sr[n2] = real[N1 * n2 + n1]
      si[n2] = imag[N1 * n2 + n1]
    }
    fftRadix2(sr, si, false)
    subReal.push(sr)
    subImag.push(si)
  }

  // Step 2: Twiddle factors + 3-point DFT for each frequency bin k2
  const w3r = Math.cos(-2 * Math.PI / 3) // -0.5
  const w3i = Math.sin(-2 * Math.PI / 3) // -√3/2
  const w32r = w3r * w3r - w3i * w3i     // -0.5
  const w32i = 2 * w3r * w3i             // +√3/2

  for (let k2 = 0; k2 < N2; k2++) {
    // z0 = Y0[k2] (no twiddle for n1=0)
    const z0r = subReal[0][k2]
    const z0i = subImag[0][k2]

    // z1 = Y1[k2] * W_6144^k2
    const a1 = -2 * Math.PI * k2 / FFT_SIZE
    const tw1r = Math.cos(a1), tw1i = Math.sin(a1)
    const z1r = subReal[1][k2] * tw1r - subImag[1][k2] * tw1i
    const z1i = subReal[1][k2] * tw1i + subImag[1][k2] * tw1r

    // z2 = Y2[k2] * W_6144^(2*k2)
    const a2 = -2 * Math.PI * 2 * k2 / FFT_SIZE
    const tw2r = Math.cos(a2), tw2i = Math.sin(a2)
    const z2r = subReal[2][k2] * tw2r - subImag[2][k2] * tw2i
    const z2i = subReal[2][k2] * tw2i + subImag[2][k2] * tw2r

    // k1=0: X[k2]
    real[k2] = z0r + z1r + z2r
    imag[k2] = z0i + z1i + z2i

    // k1=1: X[2048+k2] = z0 + z1*W3 + z2*W3^2
    real[N2 + k2] = z0r + (z1r * w3r - z1i * w3i) + (z2r * w32r - z2i * w32i)
    imag[N2 + k2] = z0i + (z1r * w3i + z1i * w3r) + (z2r * w32i + z2i * w32r)

    // k1=2: X[4096+k2] = z0 + z1*W3^2 + z2*W3
    real[2 * N2 + k2] = z0r + (z1r * w32r - z1i * w32i) + (z2r * w3r - z2i * w3i)
    imag[2 * N2 + k2] = z0i + (z1r * w32i + z1i * w32r) + (z2r * w3i + z2i * w3r)
  }
}

/**
 * 6144-point FFT/iFFT. Arrays must be length 6144.
 * Inverse uses conjugate trick: conj → forward → conj → scale.
 */
function fft6144(real: Float32Array, imag: Float32Array, inverse: boolean): void {
  if (inverse) {
    for (let i = 0; i < FFT_SIZE; i++) imag[i] = -imag[i]
    fft6144Forward(real, imag)
    const invN = 1 / FFT_SIZE
    for (let i = 0; i < FFT_SIZE; i++) {
      real[i] *= invN
      imag[i] = -imag[i] * invN
    }
  } else {
    fft6144Forward(real, imag)
  }
}

// ── STFT / iSTFT ──

export interface ComplexSpectrum {
  real: Float32Array[] // [numFrames][numBins]
  imag: Float32Array[] // [numFrames][numBins]
  numFrames: number
  numBins: number
}

export function stft(audio: Float32Array): ComplexSpectrum {
  const window = createHannWindow(FFT_SIZE)
  const numFrames = Math.max(0, Math.floor((audio.length - FFT_SIZE) / HOP_LENGTH) + 1)
  const realFrames: Float32Array[] = []
  const imagFrames: Float32Array[] = []

  for (let f = 0; f < numFrames; f++) {
    const offset = f * HOP_LENGTH
    const real = new Float32Array(FFT_SIZE)
    const imag = new Float32Array(FFT_SIZE)
    for (let i = 0; i < FFT_SIZE; i++) {
      real[i] = (audio[offset + i] || 0) * window[i]
    }

    fft6144(real, imag, false)

    realFrames.push(real.slice(0, NUM_BINS))
    imagFrames.push(imag.slice(0, NUM_BINS))
  }

  return { real: realFrames, imag: imagFrames, numFrames, numBins: NUM_BINS }
}

export function istft(spectrum: ComplexSpectrum, outputLength: number): Float32Array {
  const window = createHannWindow(FFT_SIZE)
  const output = new Float32Array(outputLength)
  const windowSum = new Float32Array(outputLength)

  for (let f = 0; f < spectrum.numFrames; f++) {
    const offset = f * HOP_LENGTH
    const real = new Float32Array(FFT_SIZE)
    const imag = new Float32Array(FFT_SIZE)

    for (let i = 0; i < NUM_BINS; i++) {
      real[i] = spectrum.real[f][i]
      imag[i] = spectrum.imag[f][i]
    }
    // Conjugate symmetry for negative frequencies
    for (let i = 1; i < NUM_BINS - 1; i++) {
      real[FFT_SIZE - i] = real[i]
      imag[FFT_SIZE - i] = -imag[i]
    }

    fft6144(real, imag, true)

    for (let i = 0; i < FFT_SIZE; i++) {
      const idx = offset + i
      if (idx < outputLength) {
        output[idx] += real[i] * window[i]
        windowSum[idx] += window[i] * window[i]
      }
    }
  }

  for (let i = 0; i < outputLength; i++) {
    if (windowSum[i] > 1e-8) {
      output[i] /= windowSum[i]
    }
  }

  return output
}

// ── WAV Decode / Encode ──

export async function decodeAudioToStereo(blob: Blob): Promise<[Float32Array, Float32Array]> {
  const arrayBuffer = await blob.arrayBuffer()
  const audioCtx = new OfflineAudioContext(2, 1, SAMPLE_RATE)
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

  if (audioBuffer.numberOfChannels >= 2) {
    return [
      new Float32Array(audioBuffer.getChannelData(0)),
      new Float32Array(audioBuffer.getChannelData(1)),
    ]
  }

  const mono = audioBuffer.getChannelData(0)
  return [new Float32Array(mono), new Float32Array(mono)]
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

export function encodeWavStereo(left: Float32Array, right: Float32Array): Blob {
  const numChannels = 2
  const bitsPerSample = 16
  const byteRate = SAMPLE_RATE * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const numSamples = left.length
  const dataSize = numSamples * numChannels * (bitsPerSample / 8)
  const bufferSize = 44 + dataSize
  const buffer = new ArrayBuffer(bufferSize)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, bufferSize - 8, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const sl = Math.max(-1, Math.min(1, left[i]))
    view.setInt16(offset, sl < 0 ? sl * 0x8000 : sl * 0x7FFF, true)
    offset += 2
    const sr = Math.max(-1, Math.min(1, right[i]))
    view.setInt16(offset, sr < 0 ? sr * 0x8000 : sr * 0x7FFF, true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

// ── Chunk Split / Merge ──

const CHUNK_DURATION = 30
const OVERLAP_DURATION = 2

export function splitIntoChunks(audio: Float32Array): { chunks: Float32Array[], offsets: number[] } {
  const chunkSamples = CHUNK_DURATION * SAMPLE_RATE
  const overlapSamples = OVERLAP_DURATION * SAMPLE_RATE
  const stepSamples = chunkSamples - overlapSamples

  if (audio.length <= chunkSamples) {
    return { chunks: [audio], offsets: [0] }
  }

  const chunks: Float32Array[] = []
  const offsets: number[] = []
  let pos = 0

  while (pos < audio.length) {
    const end = Math.min(pos + chunkSamples, audio.length)
    const chunk = audio.slice(pos, end)

    if (chunk.length < FFT_SIZE) {
      const padded = new Float32Array(FFT_SIZE)
      padded.set(chunk)
      chunks.push(padded)
    } else {
      chunks.push(chunk)
    }
    offsets.push(pos)

    if (end >= audio.length) break
    pos += stepSamples
  }

  return { chunks, offsets }
}

export function mergeChunks(chunks: Float32Array[], offsets: number[], totalLength: number): Float32Array {
  if (chunks.length === 1) {
    return chunks[0].slice(0, totalLength)
  }

  const output = new Float32Array(totalLength)
  const weight = new Float32Array(totalLength)

  for (let c = 0; c < chunks.length; c++) {
    const offset = offsets[c]
    const chunk = chunks[c]
    const len = Math.min(chunk.length, totalLength - offset)

    for (let i = 0; i < len; i++) {
      let w = 1.0
      const overlapSamples = OVERLAP_DURATION * SAMPLE_RATE

      if (c > 0 && i < overlapSamples) {
        w = i / overlapSamples
      }
      if (c < chunks.length - 1 && i >= len - overlapSamples) {
        w = (len - i) / overlapSamples
      }

      output[offset + i] += chunk[i] * w
      weight[offset + i] += w
    }
  }

  for (let i = 0; i < totalLength; i++) {
    if (weight[i] > 1e-8) {
      output[i] /= weight[i]
    }
  }

  return output
}

export { FFT_SIZE, HOP_LENGTH, NUM_BINS, DIM_F, SAMPLE_RATE }
