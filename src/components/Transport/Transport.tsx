import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  VolumeX
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { usePlaybackStore } from '../../store/playbackStore'
import { useProjectStore } from '../../store/projectStore'
import { formatTime } from '../../utils/videoUtils'

export default function Transport() {
  const { isPlaying, currentTime, volume, togglePlay, stop, setCurrentTime, setVolume } = usePlaybackStore()
  const { getProjectDuration, clips } = useProjectStore()

  const duration = clips.length > 0 ? clips[0].duration : 0
  const projectDuration = getProjectDuration() || duration

  const handleSkipBack = () => {
    setCurrentTime(Math.max(0, currentTime - 5))
  }

  const handleSkipForward = () => {
    setCurrentTime(Math.min(projectDuration, currentTime + 5))
  }

  return (
    <div className="bg-muted border-t p-2 sm:p-3">
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center sm:justify-start">
        {/* Playback controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={handleSkipBack}
            title="Skip back 5s"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="default"
            size="icon"
            className="h-10 w-10 sm:h-11 sm:w-11"
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={stop}
            title="Stop"
          >
            <Square className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={handleSkipForward}
            title="Skip forward 5s"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Time display */}
        <div className="px-3 py-1.5 rounded-md bg-background border font-mono text-sm">
          <span className="font-semibold">{formatTime(currentTime)}</span>
          <span className="mx-2 text-muted-foreground">/</span>
          <span className="text-muted-foreground">{formatTime(projectDuration)}</span>
        </div>

        {/* Seek bar */}
        <div className="flex-1 min-w-[120px] sm:min-w-[200px] order-last sm:order-none w-full sm:w-auto mt-2 sm:mt-0">
          <Slider
            min={0}
            max={projectDuration || 100}
            step={0.01}
            value={[currentTime]}
            onValueChange={([value]) => setCurrentTime(value)}
            className="touch-pan-x"
          />
        </div>

        {/* Volume controls - desktop */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
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
          <span className="text-sm font-medium w-10">{Math.round(volume * 100)}%</span>
        </div>

        {/* Mobile volume button */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden h-8 w-8"
          onClick={() => setVolume(volume > 0 ? 0 : 1)}
        >
          {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
