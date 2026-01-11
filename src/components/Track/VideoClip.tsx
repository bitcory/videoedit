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
        "absolute cursor-move transition-all touch-none h-[70px] sm:h-[100px] rounded-md overflow-hidden border shadow-sm",
        isSelected
          ? "ring-2 ring-primary ring-offset-2 z-10 border-primary"
          : "border-border hover:border-primary/50"
      )}
      style={{
        left: clipLeft,
        width: clipWidth
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Clip background (thumbnail strip) */}
      <div className="w-full h-full bg-primary/10 overflow-hidden flex">
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

      {/* Clip name */}
      <div className="absolute top-1 left-2 right-2">
        <span className="text-xs font-medium bg-background/90 text-foreground px-2 py-0.5 rounded truncate block max-w-full">
          {clip.name}
        </span>
      </div>

      {/* Trim handle - left */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 bg-foreground/20 cursor-ew-resize hover:bg-primary transition-colors"
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
      />

      {/* Trim handle - right */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 bg-foreground/20 cursor-ew-resize hover:bg-primary transition-colors"
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
      />
    </div>
  )
}
