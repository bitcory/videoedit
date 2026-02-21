import { AudioWaveform, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '../../store/projectStore'

export default function SeparationProgress() {
  const { separationProgress, separationMessage } = useProjectStore()

  const stageLabel = (() => {
    if (separationProgress < 30) return '1/4 모델 준비'
    if (separationProgress < 40) return '2/4 오디오 추출'
    if (separationProgress < 90) return '3/4 음원 분리'
    return '4/4 인코딩'
  })()

  const handleSkip = () => {
    const store = useProjectStore.getState()
    const tracks = store.tracks
    const videoTrack = tracks.find(t => t.type === 'video')
    if (videoTrack) {
      store.setTracks([videoTrack])
    }
    store.setPhase('ready')
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-card/80 backdrop-blur-xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <AudioWaveform className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-pulse" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-foreground">음원 분리 중</h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground">보컬과 반주를 분리하고 있습니다</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs sm:text-sm font-medium text-foreground/80 mb-2">
            <span>{stageLabel}</span>
            <span className="text-primary">{Math.round(separationProgress)}%</span>
          </div>
          <div className="h-2 sm:h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full gradient-primary transition-all duration-500 ease-out shadow-[0_0_12px_rgba(99,102,241,0.4)] relative overflow-hidden"
              style={{ width: `${separationProgress}%` }}
            >
              <div className="absolute inset-0 animate-progress-shine" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-white/10 border-t-primary animate-spin flex-shrink-0" />
          <span className="truncate">{separationMessage || '준비 중...'}</span>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground/40">
            처리 중에는 페이지를 닫지 마세요
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <SkipForward className="h-3.5 w-3.5" />
            건너뛰기
          </Button>
        </div>
      </div>
    </div>
  )
}
