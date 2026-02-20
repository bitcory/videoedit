import { Loader2 } from 'lucide-react'
import { useProjectStore } from '../../store/projectStore'

export default function SeparationProgress() {
  const { separationProgress, separationMessage } = useProjectStore()

  const stageLabel = (() => {
    if (separationProgress <= 30) return '1/4 모델 준비'
    if (separationProgress <= 40) return '2/4 오디오 추출'
    if (separationProgress <= 90) return '3/4 음원 분리'
    return '4/4 인코딩'
  })()

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md bg-[#111] border border-white/20 shadow-[6px_6px_0_0_rgba(255,255,255,0.1)] p-5 sm:p-8 relative">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white border border-white/30 flex items-center justify-center rotate-3 flex-shrink-0">
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-black animate-spin" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black text-white">음원 분리 중</h2>
            <p className="text-[10px] sm:text-xs text-white/50 font-bold">보컬과 반주를 분리하고 있습니다</p>
          </div>
        </div>

        <div className="mb-3 sm:mb-4">
          <div className="flex justify-between text-xs sm:text-sm font-bold text-white mb-1.5 sm:mb-2">
            <span>{stageLabel}</span>
            <span>{Math.round(separationProgress)}%</span>
          </div>
          <div className="h-5 sm:h-6 bg-[#1a1a1a] border border-white/20 overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300 ease-out"
              style={{ width: `${separationProgress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs sm:text-sm text-white/50 font-bold">
          <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin flex-shrink-0" />
          <span className="truncate">{separationMessage || '준비 중...'}</span>
        </div>

        <p className="text-[10px] sm:text-xs text-white/30 mt-3 sm:mt-4 font-bold">
          처리 중에는 페이지를 닫지 마세요
        </p>

        <div className="absolute -top-2 -left-2 w-4 h-4 bg-white border border-white/30 rotate-45" />
        <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-[#333] border border-white/20 rounded-full" />
      </div>
    </div>
  )
}
