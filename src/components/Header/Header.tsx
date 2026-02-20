import { useRef, useState } from 'react'
import {
  Upload,
  Scissors,
  Trash2,
  Camera,
  ZoomIn,
  ZoomOut,
  Music,
  Film,
  AlignLeft,
  AudioWaveform
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useProjectStore } from '../../store/projectStore'
import { usePlaybackStore } from '../../store/playbackStore'
import { videoEngine } from '../../video/VideoEngine'
import { getVideoMetadata, generateThumbnails, generateId, captureFrame, downloadDataUrl } from '../../utils/videoUtils'
import { VideoClip, ExportOptions } from '../../types'
import { useStemStore } from '../../store/stemStore'
import StemSeparationModal from '../StemSeparation/StemSeparationModal'

interface HeaderProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
}

export default function Header({ videoRef }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { clips, addClip, removeClip, selectedClipId, splitClip, zoom, setZoom, collapseGaps } = useProjectStore()
  const { currentTime } = usePlaybackStore()
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [captureScale, setCaptureScale] = useState<1 | 2>(1)
  const { openModal: openStemModal } = useStemStore()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

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

    e.target.value = ''
  }

  const handleDelete = () => {
    if (selectedClipId) {
      removeClip(selectedClipId)
    }
  }

  const handleSplit = () => {
    if (selectedClipId) {
      splitClip(selectedClipId, currentTime)
    }
  }

  const handleExportVideo = async () => {
    if (clips.length === 0) return

    try {
      setIsExporting(true)
      if (!videoEngine.isLoaded()) {
        await videoEngine.load(setExportProgress)
      }

      const options: ExportOptions = { format: 'mp4', quality: 'high' }
      const blob = await videoEngine.exportVideo(clips, options, setExportProgress)

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'export.mp4'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('내보내기 실패:', err)
      alert('내보내기에 실패했습니다')
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  const handleExportAudio = async () => {
    if (clips.length === 0) return

    try {
      setIsExporting(true)
      if (!videoEngine.isLoaded()) {
        await videoEngine.load(setExportProgress)
      }

      const blob = await videoEngine.extractAudio(clips[0], 'mp3')

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'audio.mp3'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('오디오 추출 실패:', err)
      alert('오디오 추출에 실패했습니다')
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  const handleCaptureFrame = () => {
    if (!videoRef.current) return

    const dataUrl = captureFrame(videoRef.current, {
      scale: captureScale,
      format: 'png',
      quality: 1
    })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadDataUrl(dataUrl, `frame-${captureScale}x-${timestamp}.png`)
  }

  return (
    <TooltipProvider>
      <header className="bg-[hsl(45,100%,60%)] border-b-4 border-black p-2 sm:p-3 relative z-50">
        <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
          {/* 로고 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 bg-[hsl(340,82%,59%)] border-2 border-black rotate-12" />
              <div className="w-6 h-6 bg-[hsl(187,71%,54%)] border-2 border-black -rotate-6 -ml-3" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-black tracking-tight">TB 비디오에디터</h1>
            <ThemeToggle />
          </div>

          {/* 파일 작업 */}
          <div className="flex items-center gap-1 sm:gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">업로드</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>비디오 업로드</TooltipContent>
            </Tooltip>
          </div>

          {/* 편집 작업 */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSplit}
                  disabled={!selectedClipId}
                >
                  <Scissors className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">분할</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>재생헤드 위치에서 클립 분할</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={!selectedClipId}
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">삭제</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>선택한 클립 삭제</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={collapseGaps}
                  disabled={clips.length < 2}
                >
                  <AlignLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">정렬</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>클립 사이 빈 공간 제거</TooltipContent>
            </Tooltip>
          </div>

          {/* 프레임 캡처 - 모바일 숨김 */}
          <div className="hidden md:flex items-center gap-2">
            <select
              value={captureScale}
              onChange={(e) => setCaptureScale(Number(e.target.value) as 1 | 2)}
              className="h-9 border-2 border-black bg-white text-black px-3 text-sm font-bold shadow-[2px_2px_0_0_#000]"
            >
              <option value={1}>1x 원본</option>
              <option value={2}>2x 업스케일</option>
            </select>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCaptureFrame}
                  disabled={clips.length === 0}
                >
                  <Camera className="h-4 w-4 sm:mr-2" />
                  <span className="hidden lg:inline">캡처</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>현재 프레임을 이미지로 저장</TooltipContent>
            </Tooltip>
          </div>

          {/* 줌 컨트롤 - 모바일 간소화 */}
          <div className="hidden sm:flex items-center gap-1 sm:gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setZoom(zoom - 0.2)}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>축소</TooltipContent>
            </Tooltip>
            <span className="font-bold min-w-[50px] text-center text-sm bg-white text-black border-2 border-black px-2 py-1">{Math.round(zoom * 100)}%</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setZoom(zoom + 0.2)}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>확대</TooltipContent>
            </Tooltip>
          </div>

          {/* 내보내기 */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleExportVideo}
                  disabled={clips.length === 0 || isExporting}
                >
                  <Film className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{isExporting ? `${Math.round(exportProgress)}%` : '내보내기'}</span>
                  {isExporting && <span className="sm:hidden text-xs">{Math.round(exportProgress)}%</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent>비디오 내보내기</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportAudio}
                  disabled={clips.length === 0 || isExporting}
                >
                  <Music className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">오디오</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>오디오 추출</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="memphis"
                  size="sm"
                  onClick={openStemModal}
                  disabled={clips.length === 0 || isExporting}
                >
                  <AudioWaveform className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">음원 분리</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI로 보컬/반주 분리</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>
      <StemSeparationModal />
    </TooltipProvider>
  )
}
