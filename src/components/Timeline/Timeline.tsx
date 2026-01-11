import { useRef, useEffect, useState, useCallback } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { usePlaybackStore } from '../../store/playbackStore'
import { useDragStore } from '../../store/dragStore'
import VideoClipComponent from '../Track/VideoClip'

const PIXELS_PER_SECOND_BASE = 100

export default function Timeline() {
  const trackAreaRef = useRef<HTMLDivElement>(null)
  const { clips, zoom, setZoom, getProjectDuration, updateClip, selectClip } = useProjectStore()
  const { currentTime, setCurrentTime } = usePlaybackStore()
  const { isDragging, draggedClipId, dragStartX, dragStartTime, startDrag, endDrag } = useDragStore()
  const [isPlayheadDragging, setIsPlayheadDragging] = useState(false)

  // Ctrl/Cmd + Scroll = Zoom, Alt + Scroll = Horizontal scroll
  const handleWheel = useCallback((e: WheelEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const isZoomModifier = isMac ? e.metaKey : e.ctrlKey
    const isHorizontalModifier = e.altKey

    if (isZoomModifier) {
      e.preventDefault()
      const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom(zoom + zoomDelta)
    } else if (isHorizontalModifier) {
      e.preventDefault()
      if (trackAreaRef.current) {
        trackAreaRef.current.scrollLeft += e.deltaY
      }
    }
  }, [zoom, setZoom])

  useEffect(() => {
    const trackArea = trackAreaRef.current
    if (!trackArea) return

    trackArea.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      trackArea.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  const pixelsPerSecond = PIXELS_PER_SECOND_BASE * zoom
  const projectDuration = getProjectDuration() || 60
  const timelineWidth = Math.max(projectDuration * pixelsPerSecond, 800)

  const generateRulerMarks = () => {
    const marks = []
    const interval = zoom < 0.5 ? 10 : zoom < 1 ? 5 : zoom < 2 ? 2 : 1

    for (let i = 0; i <= projectDuration; i += interval) {
      marks.push(
        <div
          key={i}
          className="absolute top-0 flex flex-col"
          style={{ left: i * pixelsPerSecond + 8 }}
        >
          <div className="w-0.5 h-3 bg-foreground/40" />
          <span className="text-xs text-muted-foreground ml-1">{i}s</span>
        </div>
      )
    }
    return marks
  }

  const playheadPosition = currentTime * pixelsPerSecond + 8

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (isDragging || isPlayheadDragging) return

    const trackArea = trackAreaRef.current
    if (!trackArea) return

    const rect = trackArea.getBoundingClientRect()
    const scrollLeft = trackArea.scrollLeft
    const x = e.clientX - rect.left + scrollLeft - 8
    const time = x / pixelsPerSecond

    setCurrentTime(Math.max(0, time))
    selectClip(null)
  }

  const SNAP_THRESHOLD = 10

  const getSnapPoints = (excludeClipId: string) => {
    const points: number[] = [0]
    clips.forEach(clip => {
      if (clip.id !== excludeClipId) {
        const clipDuration = clip.trimEnd - clip.trimStart
        points.push(clip.startTime)
        points.push(clip.startTime + clipDuration)
      }
    })
    return points
  }

  const applySnap = (time: number, clipId: string, clipDuration: number) => {
    const snapPoints = getSnapPoints(clipId)
    const clipEnd = time + clipDuration

    for (const point of snapPoints) {
      const distanceStart = Math.abs(time - point) * pixelsPerSecond
      if (distanceStart < SNAP_THRESHOLD) {
        return point
      }
      const distanceEnd = Math.abs(clipEnd - point) * pixelsPerSecond
      if (distanceEnd < SNAP_THRESHOLD) {
        return point - clipDuration
      }
    }
    return time
  }

  useEffect(() => {
    if (!isDragging) return

    const draggedClip = clips.find(c => c.id === draggedClipId)
    const clipDuration = draggedClip ? draggedClip.trimEnd - draggedClip.trimStart : 0

    const updateClipPosition = (clientX: number) => {
      const deltaX = clientX - dragStartX
      const deltaTime = deltaX / pixelsPerSecond
      let newStartTime = Math.max(0, dragStartTime + deltaTime)

      if (draggedClipId) {
        newStartTime = applySnap(newStartTime, draggedClipId, clipDuration)
        updateClip(draggedClipId, { startTime: newStartTime })
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      updateClipPosition(e.clientX)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateClipPosition(e.touches[0].clientX)
      }
    }

    const handleEnd = () => {
      endDrag()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, draggedClipId, dragStartX, dragStartTime, pixelsPerSecond, updateClip, endDrag, clips])

  const handleClipDragStart = (clipId: string, e: React.MouseEvent | React.TouchEvent) => {
    const clip = clips.find(c => c.id === clipId)
    if (!clip) return

    selectClip(clipId)

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    startDrag(clipId, clientX, clip.startTime)
  }

  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsPlayheadDragging(true)
  }

  const handlePlayheadTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
    setIsPlayheadDragging(true)
  }

  useEffect(() => {
    if (!isPlayheadDragging) return

    const updatePlayheadPosition = (clientX: number) => {
      const trackArea = trackAreaRef.current
      if (!trackArea) return

      const rect = trackArea.getBoundingClientRect()
      const scrollLeft = trackArea.scrollLeft
      const x = clientX - rect.left + scrollLeft - 8
      const time = Math.max(0, Math.min(x / pixelsPerSecond, projectDuration))
      setCurrentTime(time)
    }

    const handleMouseMove = (e: MouseEvent) => {
      updatePlayheadPosition(e.clientX)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updatePlayheadPosition(e.touches[0].clientX)
      }
    }

    const handleEnd = () => {
      setIsPlayheadDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isPlayheadDragging, pixelsPerSecond, projectDuration, setCurrentTime])

  return (
    <div className="bg-muted/50 border-t relative">
      <div
        ref={trackAreaRef}
        className="overflow-x-auto overflow-y-hidden"
        onClick={handleTimelineClick}
      >
        <div style={{ width: timelineWidth, minWidth: '100%' }}>
          {/* Ruler */}
          <div className="h-8 bg-secondary/50 border-b relative">
            {generateRulerMarks()}
          </div>

          {/* Track area */}
          <div className="relative bg-muted h-[100px] sm:h-[140px]">
            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: Math.ceil(projectDuration) }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px bg-border/50"
                  style={{ left: i * pixelsPerSecond + 8 }}
                />
              ))}
            </div>

            {/* Video clips */}
            <div className="absolute top-3 sm:top-4 h-[70px] sm:h-[100px]" style={{ left: 8 }}>
              {clips.map(clip => (
                <VideoClipComponent
                  key={clip.id}
                  clip={clip}
                  pixelsPerSecond={pixelsPerSecond}
                  onDragStart={(e) => handleClipDragStart(clip.id, e)}
                />
              ))}
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 z-20 cursor-ew-resize group touch-none"
              style={{ left: playheadPosition - 20, width: 40 }}
              onMouseDown={handlePlayheadMouseDown}
              onTouchStart={handlePlayheadTouchStart}
            >
              <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-destructive" />
              <div className="absolute left-[11px] -top-1 w-5 h-5 bg-destructive transform rotate-45" />
            </div>

            {/* Empty state */}
            {clips.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-muted-foreground font-medium text-sm sm:text-base px-4 text-center bg-background/70 py-2 rounded-md">
                  Upload or drag a video to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
