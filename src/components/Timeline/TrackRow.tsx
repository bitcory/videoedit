import { Film, Mic, Music2, Eye, EyeOff } from 'lucide-react'
import { Track } from '../../types'
import { useProjectStore } from '../../store/projectStore'
import ThumbnailStrip from './ThumbnailStrip'
import WaveformDisplay from './WaveformDisplay'

interface TrackRowProps {
  track: Track
  mode: 'label' | 'content' | 'toggle'
  contentWidth?: number
}

const TRACK_ICONS = {
  video: Film,
  vocals: Mic,
  instrumental: Music2,
} as const

const TRACK_COLORS = {
  video: '#a78bfa',
  vocals: '#4ade80',
  instrumental: '#60a5fa',
} as const

export default function TrackRow({ track, mode, contentWidth }: TrackRowProps) {
  const { toggleTrack } = useProjectStore()
  const Icon = TRACK_ICONS[track.type]
  const color = TRACK_COLORS[track.type]
  const inactive = !track.active

  // 라벨 모드
  if (mode === 'label') {
    return (
      <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 h-[50px] sm:h-[70px] border-b border-r border-white/[0.06] transition-opacity duration-200 ${inactive ? 'opacity-30' : ''}`}>
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '18' }}>
          <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color }} />
        </div>
        <span className="text-[10px] sm:text-xs font-medium text-foreground/80 truncate w-[48px] sm:w-[80px]">{track.name}</span>
      </div>
    )
  }

  // 토글 모드
  if (mode === 'toggle') {
    return (
      <button
        className={`w-[44px] sm:w-[48px] h-[50px] sm:h-[70px] flex items-center justify-center border-b border-l border-white/[0.06] hover:bg-white/[0.04] active:bg-white/[0.08] transition-all duration-200 ${inactive ? 'opacity-30' : ''}`}
        onClick={(e) => { e.stopPropagation(); toggleTrack(track.id) }}
        title={track.active ? '비활성화' : '활성화'}
      >
        {track.active ? (
          <Eye className="w-4 h-4 text-foreground/50" />
        ) : (
          <EyeOff className="w-4 h-4 text-foreground/20" />
        )}
      </button>
    )
  }

  // 콘텐츠 모드
  return (
    <div className={`h-[50px] sm:h-[70px] border-b border-white/[0.06] transition-opacity duration-200 ${inactive ? 'opacity-30' : ''}`}>
      <div
        className="h-full overflow-hidden rounded-md mx-1"
        style={{ width: contentWidth, marginLeft: 8 }}
      >
        {track.type === 'video' && track.thumbnails ? (
          <ThumbnailStrip thumbnails={track.thumbnails} />
        ) : (
          <WaveformDisplay blob={track.blob} color={color} />
        )}
      </div>
    </div>
  )
}
