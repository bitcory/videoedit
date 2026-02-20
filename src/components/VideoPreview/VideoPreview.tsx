import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { usePlaybackStore } from '../../store/playbackStore'
import AudioTrackPlayer from './AudioTrackPlayer'

const VideoPreview = forwardRef<HTMLVideoElement>((_, ref) => {
  const internalRef = useRef<HTMLVideoElement>(null)
  const { videoUrl, tracks, phase } = useProjectStore()
  const isPlaying = usePlaybackStore(s => s.isPlaying)
  const setCurrentTime = usePlaybackStore(s => s.setCurrentTime)
  const pause = usePlaybackStore(s => s.pause)
  const currentTime = usePlaybackStore(s => s.currentTime)
  const duration = useProjectStore(s => s.videoDuration)

  useImperativeHandle(ref, () => internalRef.current!, [])

  const videoTrackActive = tracks.some(t => t.type === 'video' && t.active)

  // 재생/정지 동기화
  useEffect(() => {
    const video = internalRef.current
    if (!video) return

    if (isPlaying && videoTrackActive) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [isPlaying, videoTrackActive])

  // 정지 상태에서 시크할 때 비디오 시간 맞춤
  useEffect(() => {
    const video = internalRef.current
    if (!video || isPlaying) return
    if (Math.abs(video.currentTime - currentTime) > 0.05) {
      video.currentTime = currentTime
    }
  }, [currentTime, isPlaying])

  // 비디오 timeupdate → store (마스터 클럭)
  const handleTimeUpdate = useCallback(() => {
    const video = internalRef.current
    if (!video || !isPlaying) return

    const t = video.currentTime
    if (t >= duration) {
      pause()
      setCurrentTime(duration)
      return
    }
    setCurrentTime(t)
  }, [isPlaying, duration, pause, setCurrentTime])

  if (phase === 'empty' || phase === 'uploading') {
    return null
  }

  if (!videoUrl) return null

  return (
    <div className="relative flex justify-center">
      <video
        ref={internalRef}
        src={videoUrl}
        className="w-full max-h-[35vh] sm:max-h-[50vh] object-contain border border-white/20 shadow-[4px_4px_0_0_rgba(255,255,255,0.1)]"
        onTimeUpdate={handleTimeUpdate}
        muted
        playsInline
      />
      <AudioTrackPlayer tracks={tracks} videoRef={internalRef} />
    </div>
  )
})

VideoPreview.displayName = 'VideoPreview'

export default VideoPreview
