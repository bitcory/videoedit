import { useEffect, useRef, useCallback } from 'react'
import { Track } from '../../types'
import { usePlaybackStore } from '../../store/playbackStore'

interface AudioTrackPlayerProps {
  tracks: Track[]
  videoRef: React.RefObject<HTMLVideoElement | null>
}

const SYNC_THRESHOLD = 0.05

export default function AudioTrackPlayer({ tracks, videoRef }: AudioTrackPlayerProps) {
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const rafRef = useRef<number>(0)

  const getActiveAudioElements = useCallback(() => {
    const elements: HTMLAudioElement[] = []
    for (const track of tracks) {
      if (track.type === 'video' || !track.active || !track.url) continue
      const el = audioRefs.current.get(track.id)
      if (el) elements.push(el)
    }
    return elements
  }, [tracks])

  // RAF 기반 동기화 루프: 비디오를 마스터 클럭으로 사용
  const startSyncLoop = useCallback(() => {
    if (rafRef.current) return

    const tick = () => {
      const video = videoRef.current
      if (!video || video.paused) {
        rafRef.current = 0
        return
      }

      const masterTime = video.currentTime
      const audioEls = getActiveAudioElements()

      for (const el of audioEls) {
        if (Math.abs(el.currentTime - masterTime) > SYNC_THRESHOLD) {
          el.currentTime = masterTime
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [videoRef, getActiveAudioElements])

  const stopSyncLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  const isPlaying = usePlaybackStore(s => s.isPlaying)
  const volume = usePlaybackStore(s => s.volume)
  const currentTime = usePlaybackStore(s => s.currentTime)

  // isPlaying 변경 시 동시에 play/pause (currentTime 의존성 제거!)
  useEffect(() => {
    const audioEls = getActiveAudioElements()
    const video = videoRef.current

    if (isPlaying) {
      const masterTime = video ? video.currentTime : currentTime
      for (const el of audioEls) {
        el.currentTime = masterTime
        el.play().catch(() => {})
      }
      // 비디오가 실제로 재생 시작한 후 동기화 루프 시작
      const waitAndSync = () => {
        if (video && !video.paused) {
          startSyncLoop()
        } else {
          requestAnimationFrame(waitAndSync)
        }
      }
      requestAnimationFrame(waitAndSync)
    } else {
      stopSyncLoop()
      for (const el of audioEls) {
        el.pause()
      }
    }

    return () => stopSyncLoop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying])

  // 정지 상태에서 시크
  useEffect(() => {
    if (isPlaying) return
    const audioEls = getActiveAudioElements()
    for (const el of audioEls) {
      el.currentTime = currentTime
    }
  }, [currentTime, isPlaying, getActiveAudioElements])

  // 볼륨
  useEffect(() => {
    for (const [, el] of audioRefs.current) {
      el.volume = volume
    }
  }, [volume])

  // 비디오 항상 음소거
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true
    }
  })

  const activeAudioTracks = tracks.filter(t => t.type !== 'video' && t.active && t.url)

  return (
    <>
      {activeAudioTracks.map(track => (
        <audio
          key={track.id}
          ref={(el) => {
            if (el) {
              el.volume = volume
              audioRefs.current.set(track.id, el)
            } else {
              audioRefs.current.delete(track.id)
            }
          }}
          src={track.url}
          preload="auto"
        />
      ))}
    </>
  )
}
