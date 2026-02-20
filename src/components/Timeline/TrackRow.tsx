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
  video: '#ffffff',
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
      <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 h-[50px] sm:h-[70px] border-b border-r border-white/10 ${inactive ? 'opacity-30' : ''}`}>
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color }} />
        <span className="text-[10px] sm:text-xs font-bold text-white truncate w-[48px] sm:w-[80px]">{track.name}</span>
      </div>
    )
  }

  // 토글 모드
  if (mode === 'toggle') {
    return (
      <button
        className={`w-[44px] sm:w-[48px] h-[50px] sm:h-[70px] flex items-center justify-center border-b border-l border-white/10 hover:bg-white/10 active:bg-white/20 transition-colors ${inactive ? 'opacity-30' : ''}`}
        onClick={(e) => { e.stopPropagation(); toggleTrack(track.id) }}
        title={track.active ? '비활성화' : '활성화'}
      >
        {track.active ? (
          <Eye className="w-4 h-4 text-white/70" />
        ) : (
          <EyeOff className="w-4 h-4 text-white/30" />
        )}
      </button>
    )
  }

  // 콘텐츠 모드
  return (
    <div className={`h-[50px] sm:h-[70px] border-b border-white/10 ${inactive ? 'opacity-30' : ''}`}>
      <div
        className="h-full overflow-hidden"
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
