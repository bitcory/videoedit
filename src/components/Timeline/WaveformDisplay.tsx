import { useEffect, useRef } from 'react'

interface WaveformDisplayProps {
  blob: Blob | null
  color?: string
}

export default function WaveformDisplay({ blob, color = '#a78bfa' }: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!blob || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!

    const draw = async () => {
      const audioCtx = new AudioContext({ sampleRate: 44100 })
      try {
        const arrayBuffer = await blob.arrayBuffer()
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
        const data = audioBuffer.getChannelData(0)

        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        ctx.scale(dpr, dpr)

        const w = rect.width
        const h = rect.height
        const step = Math.ceil(data.length / w)
        const mid = h / 2

        ctx.clearRect(0, 0, w, h)
        ctx.fillStyle = color
        ctx.globalAlpha = 0.5

        for (let x = 0; x < w; x++) {
          const start = x * step
          let min = 0
          let max = 0
          for (let j = 0; j < step && start + j < data.length; j++) {
            const val = data[start + j]
            if (val < min) min = val
            if (val > max) max = val
          }
          const top = mid + min * mid
          const bottom = mid + max * mid
          ctx.fillRect(x, top, 1, Math.max(1, bottom - top))
        }
      } finally {
        await audioCtx.close()
      }
    }

    draw().catch(console.error)
  }, [blob, color])

  if (!blob) {
    return <div className="w-full h-full rounded-md bg-white/[0.03]" />
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-md bg-white/[0.03]"
    />
  )
}
