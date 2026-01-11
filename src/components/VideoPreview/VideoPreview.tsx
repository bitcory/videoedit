import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { usePlaybackStore } from '../../store/playbackStore'
import { Card } from '@/components/ui/card'

interface VideoPreviewProps {}

const VideoPreview = forwardRef<HTMLVideoElement, VideoPreviewProps>((_, ref) => {
  const internalRef = useRef<HTMLVideoElement>(null)
  const lastClipIdRef = useRef<string | null>(null)
  const { clips, getProjectDuration } = useProjectStore()
  const { isPlaying, currentTime, setCurrentTime, volume, pause } = usePlaybackStore()

  useImperativeHandle(ref, () => internalRef.current!, [])

  const findClipAtTime = useCallback((time: number) => {
    for (const clip of clips) {
      const clipDuration = clip.trimEnd - clip.trimStart
      const clipEnd = clip.startTime + clipDuration
      if (time >= clip.startTime && time < clipEnd) {
        return clip
      }
    }
    return null
  }, [clips])

  const activeClip = findClipAtTime(currentTime)
  const projectDuration = getProjectDuration()

  useEffect(() => {
    if (!internalRef.current) return

    if (activeClip && lastClipIdRef.current !== activeClip.id) {
      lastClipIdRef.current = activeClip.id
      const clipTime = currentTime - activeClip.startTime + activeClip.trimStart
      if (internalRef.current.src !== activeClip.videoUrl) {
        internalRef.current.src = activeClip.videoUrl
        internalRef.current.currentTime = clipTime
      }
    }
  }, [activeClip, currentTime])

  useEffect(() => {
    if (!internalRef.current) return

    if (isPlaying) {
      if (activeClip) {
        internalRef.current.play().catch(() => {})
      }
    } else {
      internalRef.current.pause()
    }
  }, [isPlaying, activeClip])

  useEffect(() => {
    if (internalRef.current) {
      internalRef.current.volume = volume
    }
  }, [volume])

  useEffect(() => {
    if (!internalRef.current || !activeClip) return

    const clipTime = currentTime - activeClip.startTime + activeClip.trimStart
    if (Math.abs(internalRef.current.currentTime - clipTime) > 0.1) {
      internalRef.current.currentTime = clipTime
    }
  }, [currentTime, activeClip])

  useEffect(() => {
    if (!isPlaying || activeClip) return

    const interval = setInterval(() => {
      const newTime = currentTime + 0.1
      if (newTime >= projectDuration) {
        pause()
        setCurrentTime(projectDuration)
      } else {
        setCurrentTime(newTime)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isPlaying, activeClip, currentTime, projectDuration, pause, setCurrentTime])

  const handleTimeUpdate = () => {
    if (!internalRef.current || !activeClip || !isPlaying) return

    const videoTime = internalRef.current.currentTime
    const clipDuration = activeClip.trimEnd - activeClip.trimStart

    if (videoTime >= activeClip.trimEnd) {
      const clipEndTime = activeClip.startTime + clipDuration
      setCurrentTime(clipEndTime)
      return
    }

    const timelineTime = activeClip.startTime + (videoTime - activeClip.trimStart)
    setCurrentTime(timelineTime)
  }

  if (clips.length === 0) {
    return (
      <Card className="flex items-center justify-center w-full max-w-2xl aspect-video bg-muted">
        <p className="text-muted-foreground text-base sm:text-lg font-medium">Upload a video to get started</p>
      </Card>
    )
  }

  if (!activeClip) {
    return (
      <video
        ref={internalRef}
        className="max-w-full max-h-[50vh] sm:max-h-[60vh] bg-black rounded-lg"
        playsInline
      />
    )
  }

  return (
    <video
      ref={internalRef}
      src={activeClip.videoUrl}
      className="max-w-full max-h-[50vh] sm:max-h-[60vh] rounded-lg shadow-lg"
      onTimeUpdate={handleTimeUpdate}
      playsInline
    />
  )
})

VideoPreview.displayName = 'VideoPreview'

export default VideoPreview
