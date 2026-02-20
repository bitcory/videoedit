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
  const wasPlayingRef = useRef(false)

  // 모든 활성 오디오 요소를 가져오는 헬퍼
  const getActiveAudioElements = useCallback(() => {
    const elements: HTMLAudioElement[] = []
    for (const track of tracks) {
      if (track.type === 'video' || !track.active || !track.url) continue
      const el = audioRefs.current.get(track.id)
      if (el) elements.push(el)
    }
    return elements
  }, [tracks])

  // RAF 기반 동기화 루프: 비디오 요소를 마스터 클럭으로 사용
  const syncLoop = useCallback(() => {
    const video = videoRef.current
    if (!video || video.paused) {
      rafRef.current = 0
      return
    }

    const masterTime = video.currentTime
    const audioEls = getActiveAudioElements()

    for (const el of audioEls) {
      const drift = Math.abs(el.currentTime - masterTime)
      if (drift > SYNC_THRESHOLD) {
        el.currentTime = masterTime
      }
    }

    // store 업데이트는 VideoPreview의 timeupdate에서 처리
    rafRef.current = requestAnimationFrame(syncLoop)
  }, [videoRef, getActiveAudioElements])

  // 재생 상태 변경 감지 → 동시에 play/pause
  const isPlaying = usePlaybackStore(s => s.isPlaying)
  const volume = usePlaybackStore(s => s.volume)
  const currentTime = usePlaybackStore(s => s.currentTime)

  useEffect(() => {
    const audioEls = getActiveAudioElements()
    const video = videoRef.current

    if (isPlaying) {
      // 먼저 모든 오디오를 비디오 시간에 맞춤
      const masterTime = video ? video.currentTime : currentTime
      for (const el of audioEls) {
        el.currentTime = masterTime
        el.play().catch(() => {})
      }
      // RAF 동기화 루프 시작
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(syncLoop)
      }
      wasPlayingRef.current = true
    } else {
      // 모두 정지
      for (const el of audioEls) {
        el.pause()
      }
      // RAF 루프 정리
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
      // 재생 중이었다가 정지된 경우 → 시간 동기화
      if (wasPlayingRef.current) {
        const masterTime = video ? video.currentTime : currentTime
        for (const el of audioEls) {
          el.currentTime = masterTime
        }
        wasPlayingRef.current = false
      }
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }
  }, [isPlaying, getActiveAudioElements, videoRef, syncLoop, currentTime])

  // 정지 상태에서 시크 시 오디오도 같이 이동
  useEffect(() => {
    if (isPlaying) return
    const audioEls = getActiveAudioElements()
    for (const el of audioEls) {
      el.currentTime = currentTime
    }
  }, [currentTime, isPlaying, getActiveAudioElements])

  // 볼륨 동기화
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

  // 활성 오디오 트랙만 필터
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
