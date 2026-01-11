import { useRef, useEffect, useCallback } from 'react'
import Header from './components/Header/Header'
import VideoPreview from './components/VideoPreview/VideoPreview'
import Timeline from './components/Timeline/Timeline'
import Transport from './components/Transport/Transport'
import { useProjectStore } from './store/projectStore'
import { usePlaybackStore } from './store/playbackStore'
import { getVideoMetadata, generateThumbnails, generateId } from './utils/videoUtils'
import { VideoClip } from './types'

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { addClip, removeClip, selectedClipId, splitClip } = useProjectStore()
  const { currentTime, togglePlay } = usePlaybackStore()

  // 키보드 단축키
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 입력 필드에서는 무시
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

    switch (e.code) {
      case 'Space':
        e.preventDefault()
        togglePlay()
        break
      case 'Delete':
      case 'Backspace':
        if (selectedClipId) {
          removeClip(selectedClipId)
        }
        break
      case 'KeyS':
        if (selectedClipId) {
          splitClip(selectedClipId, currentTime)
        }
        break
    }
  }, [togglePlay, selectedClipId, removeClip, splitClip, currentTime])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // 드래그 앤 드롭으로 파일 추가
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()

    const files = Array.from(e.dataTransfer.files)

    for (const file of files) {
      if (!file.type.startsWith('video/')) continue

      try {
        const metadata = await getVideoMetadata(file)
        const videoUrl = URL.createObjectURL(file)
        const thumbnails = await generateThumbnails(videoUrl, metadata.duration, 10)

        const clip: VideoClip = {
          id: generateId(),
          name: file.name,
          file,
          videoUrl,
          startTime: 0,
          duration: metadata.duration,
          trimStart: 0,
          trimEnd: metadata.duration,
          thumbnails
        }

        addClip(clip)
      } catch (err) {
        console.error('비디오 로드 실패:', err)
      }
    }
  }

  return (
    <div
      className="h-screen flex flex-col bg-background"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <Header videoRef={videoRef} />

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {/* Video preview */}
        <div className="flex justify-center p-2 sm:p-4 bg-muted/30">
          <VideoPreview ref={videoRef} />
        </div>

        {/* Timeline */}
        <Timeline />
      </div>

      {/* Transport controls */}
      <Transport />
    </div>
  )
}

export default App
