import { useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, RotateCcw, AudioWaveform, Mic, Music2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStemStore } from '../../store/stemStore'
import { useProjectStore } from '../../store/projectStore'
import { videoEngine } from '../../video/VideoEngine'
import { stemSeparator, type StemProgress } from '../../audio/StemSeparator'

export default function StemSeparationModal() {
  const {
    modalState, progress, progressMessage,
    vocalsBlob, instrumentalBlob, errorMessage,
    closeModal, setProgress, setResult, setError, reset,
  } = useStemStore()
  const { clips } = useProjectStore()

  const handleStart = useCallback(async () => {
    if (clips.length === 0) return

    try {
      // Stage 1: Load model
      setProgress(0, 'AI 모델 준비 중...')
      await stemSeparator.load((p: StemProgress) => {
        if (p.stage === 'download') {
          setProgress(p.progress * 0.3, p.message) // 0-30%
        }
      })

      // Stage 2: Extract audio from video via FFmpeg
      setProgress(30, '비디오에서 오디오 추출 중...')
      if (!videoEngine.isLoaded()) {
        await videoEngine.load()
      }
      const audioBlob = await videoEngine.extractAudio(clips[0], 'wav')
      setProgress(40, '오디오 추출 완료')

      // Stage 3: Run stem separation
      const result = await stemSeparator.separate(audioBlob, (p: StemProgress) => {
        let overallProgress = 40
        if (p.stage === 'extract') {
          overallProgress = 40 + p.progress * 0.05 // 40-45%
        } else if (p.stage === 'separate') {
          overallProgress = 45 + p.progress * 0.45 // 45-90%
        } else if (p.stage === 'encode') {
          overallProgress = 90 + p.progress * 0.1 // 90-100%
        }
        setProgress(overallProgress, p.message)
      })

      setResult(result.vocals, result.instrumental)
    } catch (err) {
      console.error('음원 분리 실패:', err)
      setError(err instanceof Error ? err.message : '음원 분리에 실패했습니다')
    }
  }, [clips, setProgress, setResult, setError])

  const handleDownload = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  if (modalState === 'closed') return null

  const stageLabel = (() => {
    if (progress <= 30) return '1/4 모델 준비'
    if (progress <= 40) return '2/4 오디오 추출'
    if (progress <= 90) return '3/4 음원 분리'
    return '4/4 인코딩'
  })()

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={modalState !== 'processing' ? closeModal : undefined}
      />

      {/* Modal */}
      <div className="relative w-[90vw] max-w-lg bg-white border-4 border-black shadow-[8px_8px_0_0_#000] p-6 sm:p-8">
        {/* Close button */}
        {modalState !== 'processing' && (
          <button
            onClick={closeModal}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-[hsl(340,82%,59%)] border-2 border-black text-white hover:bg-[hsl(340,82%,50%)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[hsl(271,76%,53%)] border-3 border-black flex items-center justify-center rotate-3">
            <AudioWaveform className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-black">AI 음원 분리</h2>
            <p className="text-sm text-gray-600 font-bold">보컬과 반주를 분리합니다</p>
          </div>
        </div>

        {/* Content by state */}
        {modalState === 'idle' && (
          <div>
            <div className="bg-[hsl(45,100%,90%)] border-3 border-black p-4 mb-6">
              <p className="text-sm text-black font-bold leading-relaxed">
                AI 모델(MDX-Net)을 사용하여 비디오의 오디오에서 보컬과 반주(배경음악)를
                분리합니다. 첫 실행 시 모델 다운로드(~67MB)가 필요하며, 이후에는 캐시에서
                즉시 로드됩니다.
              </p>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 bg-[hsl(340,82%,95%)] border-2 border-black p-3 text-center">
                <Mic className="w-6 h-6 mx-auto mb-1 text-[hsl(340,82%,59%)]" />
                <p className="text-xs font-black text-black">보컬</p>
              </div>
              <div className="flex-1 bg-[hsl(187,71%,90%)] border-2 border-black p-3 text-center">
                <Music2 className="w-6 h-6 mx-auto mb-1 text-[hsl(187,71%,44%)]" />
                <p className="text-xs font-black text-black">반주</p>
              </div>
            </div>

            <Button
              className="w-full mt-6"
              variant="default"
              size="lg"
              onClick={handleStart}
              disabled={clips.length === 0}
            >
              <AudioWaveform className="w-4 h-4 mr-2" />
              {clips.length === 0 ? '비디오를 먼저 업로드하세요' : '음원 분리 시작'}
            </Button>
          </div>
        )}

        {modalState === 'processing' && (
          <div>
            <div className="mb-4">
              <div className="flex justify-between text-sm font-bold text-black mb-2">
                <span>{stageLabel}</span>
                <span>{Math.round(progress)}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-6 bg-white border-3 border-black overflow-hidden">
                <div
                  className="h-full bg-[hsl(150,60%,50%)] transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 font-bold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{progressMessage}</span>
            </div>

            <p className="text-xs text-gray-400 mt-4 font-bold">
              처리 중에는 창을 닫지 마세요
            </p>
          </div>
        )}

        {modalState === 'complete' && (
          <div>
            <div className="bg-[hsl(150,60%,90%)] border-3 border-black p-4 mb-6 text-center">
              <p className="text-lg font-black text-black">분리 완료!</p>
              <p className="text-sm text-gray-600 font-bold">아래 버튼으로 다운로드하세요</p>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full"
                variant="default"
                size="lg"
                onClick={() => vocalsBlob && handleDownload(vocalsBlob, 'vocals.wav')}
              >
                <Mic className="w-4 h-4 mr-2" />
                보컬 다운로드
              </Button>

              <Button
                className="w-full"
                variant="secondary"
                size="lg"
                onClick={() => instrumentalBlob && handleDownload(instrumentalBlob, 'instrumental.wav')}
              >
                <Music2 className="w-4 h-4 mr-2" />
                반주 다운로드
              </Button>
            </div>

            <Button
              className="w-full mt-4"
              variant="outline"
              size="sm"
              onClick={reset}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              다시 분리하기
            </Button>
          </div>
        )}

        {modalState === 'error' && (
          <div>
            <div className="bg-red-50 border-3 border-black p-4 mb-6">
              <p className="text-sm font-black text-red-600">오류 발생</p>
              <p className="text-sm text-red-500 font-bold mt-1">{errorMessage}</p>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1"
                variant="default"
                onClick={reset}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                다시 시도
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={closeModal}
              >
                닫기
              </Button>
            </div>
          </div>
        )}

        {/* Memphis decorative elements */}
        <div className="absolute -top-3 -left-3 w-6 h-6 bg-[hsl(45,100%,60%)] border-2 border-black rotate-45" />
        <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-[hsl(187,71%,54%)] border-2 border-black rounded-full" />
      </div>
    </div>,
    document.body
  )
}
