import { useRef, useEffect, useState, useCallback } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { usePlaybackStore } from '../../store/playbackStore'
import TrackRow from './TrackRow'

const PIXELS_PER_SECOND_BASE = 100
const PADDING = 8

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
  const duration = getDuration() || 10
  const contentWidth = duration * pixelsPerSecond
  const playheadPosition = currentTime * pixelsPerSecond + PADDING

  const generateRulerMarks = () => {
    const marks = []
    const interval = zoom < 0.5 ? 10 : zoom < 1 ? 5 : zoom < 2 ? 2 : 1

    for (let i = 0; i <= duration; i += interval) {
      marks.push(
        <div
          key={i}
          className="absolute top-0 flex flex-col"
          style={{ left: i * pixelsPerSecond + PADDING }}
        >
          <div className="w-px h-3 bg-white/20" />
          <span className="text-[10px] sm:text-xs font-medium text-white/30 ml-1">{i}초</span>
        </div>
      )
    }
    return marks
  }

  const getTimeFromClientX = useCallback((clientX: number) => {
    const trackArea = trackAreaRef.current
    if (!trackArea) return 0
    const rect = trackArea.getBoundingClientRect()
    const scrollLeft = trackArea.scrollLeft
    const x = clientX - rect.left + scrollLeft - PADDING
    return Math.max(0, Math.min(x / pixelsPerSecond, duration))
  }, [pixelsPerSecond, duration])

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (isPlayheadDragging) return
    setCurrentTime(getTimeFromClientX(e.clientX))
  }

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

  const scrollWidth = contentWidth + PADDING * 2

  return (
    <div className="bg-card/50 backdrop-blur-sm border-t border-white/[0.06] relative flex-1 min-h-0">
      <div className="flex h-full">
        {/* 고정 라벨 열 */}
        <div className="flex-shrink-0 z-10 bg-card/80 backdrop-blur-sm">
          <div className="h-6 sm:h-8 border-b border-white/[0.06]" />
          {tracks.map(track => (
            <TrackRow key={`label-${track.id}`} track={track} mode="label" />
          ))}
        </div>

        {/* 스크롤 가능한 콘텐츠 영역 */}
        <div
          ref={trackAreaRef}
          className="flex-1 overflow-x-auto overflow-y-hidden"
          onClick={handleTimelineClick}
        >
          <div style={{ width: scrollWidth, minWidth: '100%' }}>
            {/* 눈금자 */}
            <div className="h-6 sm:h-8 bg-card/60 border-b border-white/[0.06] relative">
              {generateRulerMarks()}
            </div>

            {/* 트랙 콘텐츠 행들 */}
            <div className="relative">
              {tracks.map(track => (
                <TrackRow key={`content-${track.id}`} track={track} mode="content" contentWidth={contentWidth} />
              ))}

              {/* 재생헤드 */}
              <div
                className="absolute top-0 bottom-0 z-20 cursor-ew-resize touch-none"
                style={{ left: playheadPosition - 22, width: 44 }}
                onMouseDown={handlePlayheadStart}
                onTouchStart={handlePlayheadStart}
              >
                <div className="absolute left-[21px] top-0 bottom-0 w-0.5 bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                <div className="absolute left-[15px] -top-1 w-3.5 h-3.5 rounded-full gradient-primary shadow-lg shadow-indigo-500/40 ring-2 ring-indigo-300/30" />
              </div>

              {tracks.length === 0 && (
                <div className="h-[80px] flex items-center justify-center">
                  <p className="text-muted-foreground/50 text-sm">트랙 없음</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 고정 토글 열 */}
        <div className="flex-shrink-0 z-10 bg-card/80 backdrop-blur-sm">
          <div className="h-6 sm:h-8 border-b border-white/[0.06]" />
          {tracks.map(track => (
            <TrackRow key={`toggle-${track.id}`} track={track} mode="toggle" />
          ))}
        </div>
      </div>
    </div>
  )
}
