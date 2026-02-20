import { Play, Pause, Square, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { usePlaybackStore } from '../../store/playbackStore'
import { useProjectStore } from '../../store/projectStore'
import { formatTime } from '../../utils/videoUtils'

export default function Transport() {
  const { isPlaying, currentTime, volume, togglePlay, stop, setCurrentTime, setVolume } = usePlaybackStore()
  const { phase, getDuration } = useProjectStore()

  const duration = getDuration()

  if (phase !== 'ready' && phase !== 'exporting') {
    return null
  }

  return (
    <div className="bg-[#0d0d0d] border-t border-white/10 px-2 py-1.5 sm:p-3 safe-area-bottom">
      {/* 시크바 - 모바일에서 상단 배치 */}
      <div className="mb-1.5 sm:hidden">
        <Slider
          min={0}
          max={duration || 100}
          step={0.01}
          value={[currentTime]}
          onValueChange={([value]) => setCurrentTime(value)}
          className="touch-pan-x"
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* 재생 컨트롤 */}
        <div className="flex items-center gap-1">
          <Button
            variant="memphis"
            size="icon"
            className="h-10 w-10 sm:h-11 sm:w-11"
            onClick={togglePlay}
            title={isPlaying ? '일시정지' : '재생'}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={stop}
            title="정지"
          >
            <Square className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>

        {/* 시간 표시 */}
        <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[#1a1a1a] border border-white/20 font-mono text-xs sm:text-sm font-bold shadow-[2px_2px_0_0_rgba(255,255,255,0.1)] text-white whitespace-nowrap">
          <span>{formatTime(currentTime)}</span>
          <span className="mx-1 sm:mx-2 text-white/30">/</span>
          <span className="text-white/50">{formatTime(duration)}</span>
        </div>

        {/* 시크바 - 데스크탑 */}
        <div className="hidden sm:flex flex-1 min-w-[200px]">
          <Slider
            min={0}
            max={duration || 100}
            step={0.01}
            value={[currentTime]}
            onValueChange={([value]) => setCurrentTime(value)}
            className="touch-pan-x"
          />
        </div>

        {/* 모바일 스페이서 */}
        <div className="flex-1 sm:hidden" />

        {/* 볼륨 컨트롤 - 데스크탑 */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white/70 hover:text-white"
            onClick={() => setVolume(volume > 0 ? 0 : 1)}
          >
            {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[volume]}
            onValueChange={([value]) => setVolume(value)}
            className="w-24"
          />
          <span className="text-sm font-bold text-white/70 w-10">{Math.round(volume * 100)}%</span>
        </div>

        {/* 모바일 볼륨 버튼 */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden h-10 w-10 text-white/70 active:text-white"
          onClick={() => setVolume(volume > 0 ? 0 : 1)}
        >
          {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
