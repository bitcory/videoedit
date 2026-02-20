import { useRef, useEffect, useCallback } from 'react'
import Header from './components/Header/Header'
import VideoPreview from './components/VideoPreview/VideoPreview'
import Timeline from './components/Timeline/Timeline'
import Transport from './components/Transport/Transport'
import UploadPrompt from './components/Upload/UploadPrompt'
import SeparationProgress from './components/Separation/SeparationProgress'
import { useProjectStore } from './store/projectStore'
import { usePlaybackStore } from './store/playbackStore'
import { videoEngine } from './video/VideoEngine'
import { stemSeparator, type StemProgress } from './audio/StemSeparator'
import { getVideoMetadata, generateThumbnails, generateId } from './utils/videoUtils'

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { phase, setPhase, setVideo, setTracks, setSeparationProgress, videoFile } = useProjectStore()
  const { togglePlay } = usePlaybackStore()

  // 키보드 단축키
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

    if (e.code === 'Space' && (phase === 'ready' || phase === 'exporting')) {
      e.preventDefault()
      togglePlay()
    }
  }, [togglePlay, phase])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // 자동 음원 분리: phase === 'separating' 일 때 실행
  useEffect(() => {
    if (phase !== 'separating' || !videoFile) return

    let cancelled = false

    const runSeparation = async () => {
      try {
        // 1. 모델 로드 (0-30%)
        setSeparationProgress(0, 'AI 모델 준비 중...')
        await stemSeparator.load((p: StemProgress) => {
          if (cancelled) return
          if (p.stage === 'download') {
            setSeparationProgress(p.progress * 0.3, p.message)
          }
        })

        if (cancelled) return

        // 2. FFmpeg로 오디오 추출 (30-40%)
        setSeparationProgress(30, 'FFmpeg 로딩 중...')
        if (!videoEngine.isLoaded()) {
          await videoEngine.load((p) => {
            if (cancelled) return
            setSeparationProgress(30 + p * 0.05, 'FFmpeg 로딩 중...')
          })
        }
        if (cancelled) return
        setSeparationProgress(35, '비디오에서 오디오 추출 중...')
        const audioBlob = await videoEngine.extractAudioFromFile(videoFile)
        if (cancelled) return
        setSeparationProgress(40, '오디오 추출 완료')

        // 3. 음원 분리 (40-100%)
        const result = await stemSeparator.separate(audioBlob, (p: StemProgress) => {
          if (cancelled) return
          let overall = 40
          if (p.stage === 'extract') {
            overall = 40 + p.progress * 0.05
          } else if (p.stage === 'separate') {
            overall = 45 + p.progress * 0.45
          } else if (p.stage === 'encode') {
            overall = 90 + p.progress * 0.1
          }
          setSeparationProgress(overall, p.message)
        })

        if (cancelled) return

        // 4. 트랙 생성
        const vocalsUrl = URL.createObjectURL(result.vocals)
        const instrumentalUrl = URL.createObjectURL(result.instrumental)

        const currentTracks = useProjectStore.getState().tracks
        const videoTrack = currentTracks.find(t => t.type === 'video')
        const duration = useProjectStore.getState().videoDuration

        setTracks([
          videoTrack || {
            id: generateId(),
            type: 'video',
            name: '영상',
            active: true,
            blob: videoFile,
            url: URL.createObjectURL(videoFile),
            duration,
          },
          {
            id: generateId(),
            type: 'vocals',
            name: '보컬',
            active: true,
            blob: result.vocals,
            url: vocalsUrl,
            duration,
          },
          {
            id: generateId(),
            type: 'instrumental',
            name: '반주',
            active: true,
            blob: result.instrumental,
            url: instrumentalUrl,
            duration,
          },
        ])

        usePlaybackStore.getState().stop()
        setPhase('ready')
      } catch (err) {
        if (cancelled) return
        console.error('음원 분리 실패:', err)
        alert('음원 분리에 실패했습니다: ' + (err instanceof Error ? err.message : ''))
        setPhase('empty')
      }
    }

    runSeparation()

    return () => { cancelled = true }
  }, [phase, videoFile, setPhase, setTracks, setSeparationProgress])

  // UploadPrompt에서 파일 선택 시
  const handleFileSelected = async (file: File) => {
    try {
      setPhase('uploading')
      const metadata = await getVideoMetadata(file)
      const videoUrl = URL.createObjectURL(file)
      const thumbnails = await generateThumbnails(videoUrl, metadata.duration, 10)

      setVideo(file, videoUrl, metadata.duration)

      setTracks([{
        id: generateId(),
        type: 'video',
        name: '영상',
        active: true,
        blob: file,
        url: videoUrl,
        duration: metadata.duration,
        thumbnails,
      }])

      setPhase('separating')
    } catch (err) {
      console.error('비디오 로드 실패:', err)
      setPhase('empty')
    }
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <Header />

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {phase === 'empty' && (
          <UploadPrompt onFileSelected={handleFileSelected} />
        )}

        {phase === 'uploading' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-indigo-500 animate-spin" />
              <p className="text-muted-foreground font-medium">영상 준비 중...</p>
            </div>
          </div>
        )}

        {phase === 'separating' && (
          <SeparationProgress />
        )}

        {(phase === 'ready' || phase === 'exporting') && (
          <>
            <div className="flex-shrink-0 flex justify-center p-2 sm:p-4">
              <VideoPreview ref={videoRef} />
            </div>
            <Timeline />
          </>
        )}
      </div>

      <Transport />
    </div>
  )
}

export default App
