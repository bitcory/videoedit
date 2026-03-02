import { AudioWaveform } from 'lucide-react'
import { useProjectStore } from '../../store/projectStore'

export default function SeparationProgress() {
  const { separationProgress, separationMessage } = useProjectStore()

  const stageLabel = (() => {
    if (separationProgress < 30) return '1/4 모델 준비'
    if (separationProgress < 40) return '2/4 오디오 추출'
    if (separationProgress < 90) return '3/4 음원 분리'
    return '4/4 인코딩'
  })()

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
      <div className="neo-card w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-primary border-3 border-foreground flex items-center justify-center shadow-neo-sm flex-shrink-0">
            <AudioWaveform className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground animate-pulse" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black text-foreground uppercase">음원 분리 중</h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">보컬과 반주를 분리하고 있습니다</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs sm:text-sm font-bold text-foreground mb-2">
            <span>{stageLabel}</span>
            <span className="text-primary">{Math.round(separationProgress)}%</span>
          </div>
          <div className="h-3 sm:h-4 rounded-none bg-content2 border-3 border-foreground overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out relative overflow-hidden"
              style={{ width: `${separationProgress}%` }}
            >
              <div className="absolute inset-0 animate-progress-shine" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground font-medium">
          <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-none border-3 border-foreground/30 border-t-primary animate-spin flex-shrink-0" />
          <span className="truncate">{separationMessage || '준비 중...'}</span>
        </div>

        <p className="text-[10px] sm:text-xs text-muted-foreground/60 mt-4 font-medium">
          처리 중에는 페이지를 닫지 마세요
        </p>
      </div>
    </div>
  )
}
