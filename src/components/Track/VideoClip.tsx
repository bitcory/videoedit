import { VideoClip } from '../../types'
import { useProjectStore } from '../../store/projectStore'
import { cn } from '@/lib/utils'

interface VideoClipProps {
  clip: VideoClip
  pixelsPerSecond: number
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void
}

export default function VideoClipComponent({ clip, pixelsPerSecond, onDragStart }: VideoClipProps) {
  const { selectedClipId, selectClip } = useProjectStore()

  const isSelected = selectedClipId === clip.id
  const clipDuration = clip.trimEnd - clip.trimStart
  const clipWidth = clipDuration * pixelsPerSecond
  const clipLeft = clip.startTime * pixelsPerSecond

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    selectClip(clip.id)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDragStart(e)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
    onDragStart(e)
  }

  return (
    <div
      className={cn(
        "absolute cursor-move transition-all touch-none h-[70px] sm:h-[100px] overflow-hidden border-3 border-black",
        isSelected
          ? "ring-4 ring-[hsl(45,100%,60%)] z-10 shadow-[4px_4px_0_0_hsl(45,100%,60%)]"
          : "shadow-[3px_3px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px]"
      )}
      style={{
        left: clipLeft,
        width: clipWidth
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* 클립 배경 (썸네일 스트립) */}
      <div className="w-full h-full bg-[hsl(340,82%,59%)] overflow-hidden flex">
        {clip.thumbnails.map((thumb, idx) => (
          <div
            key={idx}
            className="h-full flex-shrink-0"
            style={{ width: `${100 / clip.thumbnails.length}%` }}
          >
            <img
              src={thumb}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* 클립 이름 */}
      <div className="absolute top-1 left-2 right-2">
        <span className="text-xs font-bold bg-white text-black px-2 py-0.5 border border-black truncate block max-w-full">
          {clip.name}
        </span>
      </div>

      {/* 트림 핸들 - 왼쪽 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-3 bg-black cursor-ew-resize hover:bg-[hsl(45,100%,60%)] transition-colors"
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
      />

      {/* 트림 핸들 - 오른쪽 */}
      <div
        className="absolute right-0 top-0 bottom-0 w-3 bg-black cursor-ew-resize hover:bg-[hsl(45,100%,60%)] transition-colors"
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
      />
    </div>
  )
}
