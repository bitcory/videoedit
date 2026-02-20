import { useRef, useEffect, useState, useCallback } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { usePlaybackStore } from '../../store/playbackStore'
import TrackRow from './TrackRow'

const PIXELS_PER_SECOND_BASE = 100

export default function Timeline() {
  const trackAreaRef = useRef<HTMLDivElement>(null)
  const { tracks, getDuration, phase } = useProjectStore()
  const { currentTime, setCurrentTime } = usePlaybackStore()
  const [isPlayheadDragging, setIsPlayheadDragging] = useState(false)
  const [zoom, setZoom] = useState(1)

  const handleWheel = useCallback((e: WheelEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const isZoomModifier = isMac ? e.metaKey : e.ctrlKey

    if (isZoomModifier) {
      e.preventDefault()
      const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom(z => Math.max(0.1, Math.min(10, z + zoomDelta)))
    }
  }, [])

  useEffect(() => {
    const trackArea = trackAreaRef.current
    if (!trackArea) return

    trackArea.addEventListener('wheel', handleWheel, { passive: false })
    return () => trackArea.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const pixelsPerSecond = PIXELS_PER_SECOND_BASE * zoom
  const duration = getDuration() || 60
  const timelineWidth = Math.max(duration * pixelsPerSecond, 800)
  const playheadPosition = currentTime * pixelsPerSecond + 8

  const generateRulerMarks = () => {
    const marks = []
    const interval = zoom < 0.5 ? 10 : zoom < 1 ? 5 : zoom < 2 ? 2 : 1

    for (let i = 0; i <= duration; i += interval) {
      marks.push(
        <div
          key={i}
          className="absolute top-0 flex flex-col"
          style={{ left: i * pixelsPerSecond + 8 }}
        >
          <div className="w-0.5 h-3 bg-white/40" />
          <span className="text-[10px] sm:text-xs font-bold text-white/60 ml-1">{i}초</span>
        </div>
      )
    }
    return marks
  }

  // 클릭/터치로 시크
  const getTimeFromClientX = useCallback((clientX: number) => {
    const trackArea = trackAreaRef.current
    if (!trackArea) return 0
    const rect = trackArea.getBoundingClientRect()
    const scrollLeft = trackArea.scrollLeft
    const x = clientX - rect.left + scrollLeft - 8
    return Math.max(0, Math.min(x / pixelsPerSecond, duration))
  }, [pixelsPerSecond, duration])

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (isPlayheadDragging) return
    setCurrentTime(getTimeFromClientX(e.clientX))
  }

  // 재생헤드 드래그 (마우스 + 터치)
  const handlePlayheadStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsPlayheadDragging(true)
  }

  useEffect(() => {
    if (!isPlayheadDragging) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX
      if (clientX != null) {
        setCurrentTime(getTimeFromClientX(clientX))
      }
    }

    const handleEnd = () => setIsPlayheadDragging(false)

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove, { passive: true })
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isPlayheadDragging, getTimeFromClientX, setCurrentTime])

  if (phase !== 'ready' && phase !== 'exporting') {
    return null
  }

  return (
    <div className="bg-[#141414] border-t border-white/10 relative flex-1 min-h-0">
      <div
        ref={trackAreaRef}
        className="overflow-x-auto overflow-y-auto h-full"
        onClick={handleTimelineClick}
      >
        <div style={{ width: timelineWidth, minWidth: '100%' }}>
          {/* 눈금자 */}
          <div className="h-6 sm:h-8 bg-[#1a1a1a] border-b border-white/10 relative sticky top-0 z-10">
            {generateRulerMarks()}
          </div>

          {/* 트랙 행들 */}
          <div className="relative">
            {tracks.map(track => (
              <TrackRow key={track.id} track={track} />
            ))}

            {/* 재생헤드 */}
            <div
              className="absolute top-0 bottom-0 z-20 cursor-ew-resize touch-none"
              style={{ left: playheadPosition - 22, width: 44 }}
              onMouseDown={handlePlayheadStart}
              onTouchStart={handlePlayheadStart}
            >
              <div className="absolute left-[21px] top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.5)]" />
              <div className="absolute left-[14px] -top-1 w-[16px] h-[16px] bg-white border border-white/50 transform rotate-45" />
            </div>

            {tracks.length === 0 && (
              <div className="h-[80px] flex items-center justify-center">
                <p className="text-white/30 font-bold text-sm">트랙 없음</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
