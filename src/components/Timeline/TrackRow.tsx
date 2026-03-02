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
  video: { bg: 'bg-content4', text: 'text-secondary', hex: '#60a5fa' },
  vocals: { bg: 'bg-content3', text: 'text-primary', hex: '#4ade80' },
  instrumental: { bg: 'bg-content2', text: 'text-warning', hex: '#fbbf24' },
} as const

export default function TrackRow({ track, mode, contentWidth }: TrackRowProps) {
  const { toggleTrack } = useProjectStore()
  const Icon = TRACK_ICONS[track.type]
  const colors = TRACK_COLORS[track.type]
  const inactive = !track.active

  // 라벨 모드
  if (mode === 'label') {
    return (
      <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 h-[50px] sm:h-[70px] border-b-2 border-r-3 border-foreground transition-opacity duration-200 ${inactive ? 'opacity-30' : ''}`}>
        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-sm flex items-center justify-center flex-shrink-0 ${colors.bg} border-2 border-foreground`}>
          <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${colors.text}`} />
        </div>
        <span className="text-[10px] sm:text-xs font-bold text-foreground truncate w-[48px] sm:w-[80px]">{track.name}</span>
      </div>
    )
  }

  // 토글 모드
  if (mode === 'toggle') {
    return (
      <button
        className={`w-[44px] sm:w-[48px] h-[50px] sm:h-[70px] flex items-center justify-center border-b-2 border-l-3 border-foreground hover:bg-content2 active:bg-content3 transition-all duration-150 ${inactive ? 'opacity-30' : ''}`}
        onClick={(e) => { e.stopPropagation(); toggleTrack(track.id) }}
        title={track.active ? '비활성화' : '활성화'}
      >
        {track.active ? (
          <Eye className="w-4 h-4 text-foreground" />
        ) : (
          <EyeOff className="w-4 h-4 text-foreground/30" />
        )}
      </button>
    )
  }

  // 콘텐츠 모드
  return (
    <div className={`h-[50px] sm:h-[70px] border-b-2 border-foreground transition-opacity duration-200 ${inactive ? 'opacity-30' : ''}`}>
      <div
        className="h-full overflow-hidden rounded-sm mx-1 border-2 border-foreground/30"
        style={{ width: contentWidth, marginLeft: 8 }}
      >
        {track.type === 'video' && track.thumbnails ? (
          <ThumbnailStrip thumbnails={track.thumbnails} />
        ) : (
          <WaveformDisplay blob={track.blob} color={colors.hex} />
        )}
      </div>
    </div>
  )
}
