import { Film, Mic, Music2, Eye, EyeOff } from 'lucide-react'
import { Track } from '../../types'
import { useProjectStore } from '../../store/projectStore'
import ThumbnailStrip from './ThumbnailStrip'
import WaveformDisplay from './WaveformDisplay'

interface TrackRowProps {
  track: Track
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

export default function TrackRow({ track }: TrackRowProps) {
  const { toggleTrack } = useProjectStore()
  const Icon = TRACK_ICONS[track.type]
  const color = TRACK_COLORS[track.type]

  return (
    <div className={`flex items-stretch h-[50px] sm:h-[70px] border-b border-white/10 transition-opacity ${!track.active ? 'opacity-30' : ''}`}>
      {/* 라벨 */}
      <div className="w-[72px] sm:w-[120px] flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 bg-[#1a1a1a] border-r border-white/10">
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color }} />
        <span className="text-[10px] sm:text-xs font-bold text-white truncate">{track.name}</span>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 relative overflow-hidden">
        {track.type === 'video' && track.thumbnails ? (
          <ThumbnailStrip thumbnails={track.thumbnails} />
        ) : (
          <WaveformDisplay blob={track.blob} color={color} />
        )}
      </div>

      {/* 토글 - 44px 최소 터치 타겟 */}
      <button
        className="w-[44px] sm:w-[48px] flex-shrink-0 flex items-center justify-center bg-[#1a1a1a] border-l border-white/10 hover:bg-white/10 active:bg-white/20 transition-colors"
        onClick={(e) => { e.stopPropagation(); toggleTrack(track.id) }}
        title={track.active ? '비활성화' : '활성화'}
      >
        {track.active ? (
          <Eye className="w-4 h-4 text-white/70" />
        ) : (
          <EyeOff className="w-4 h-4 text-white/30" />
        )}
      </button>
    </div>
  )
}
