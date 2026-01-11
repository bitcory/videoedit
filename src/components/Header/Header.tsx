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
  AlignLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useProjectStore } from '../../store/projectStore'
import { usePlaybackStore } from '../../store/playbackStore'
import { videoEngine } from '../../video/VideoEngine'
import { getVideoMetadata, generateThumbnails, generateId, captureFrame, downloadDataUrl } from '../../utils/videoUtils'
import { VideoClip, ExportOptions } from '../../types'

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
        console.error('Failed to load video:', err)
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
      console.error('Export failed:', err)
      alert('Export failed')
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
      console.error('Audio extraction failed:', err)
      alert('Audio extraction failed')
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
      <header className="bg-background border-b p-2 sm:p-3 relative z-50">
        <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-foreground">VIDEO EDIT</h1>
            <ThemeToggle />
          </div>

          {/* File operations */}
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
                  <span className="hidden sm:inline">Upload</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upload video</TooltipContent>
            </Tooltip>
          </div>

          {/* Edit operations */}
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
                  <span className="hidden sm:inline">Split</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Split clip at playhead</TooltipContent>
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
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete selected clip</TooltipContent>
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
                  <span className="hidden sm:inline">Align</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove gaps between clips</TooltipContent>
            </Tooltip>
          </div>

          {/* Frame capture - hidden on mobile */}
          <div className="hidden md:flex items-center gap-2">
            <select
              value={captureScale}
              onChange={(e) => setCaptureScale(Number(e.target.value) as 1 | 2)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value={1}>1x Original</option>
              <option value={2}>2x Upscale</option>
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
                  <span className="hidden lg:inline">Capture</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save current frame as image</TooltipContent>
            </Tooltip>
          </div>

          {/* Zoom controls - simplified on mobile */}
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
              <TooltipContent>Zoom out</TooltipContent>
            </Tooltip>
            <span className="font-medium min-w-[50px] text-center text-sm">{Math.round(zoom * 100)}%</span>
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
              <TooltipContent>Zoom in</TooltipContent>
            </Tooltip>
          </div>

          {/* Export */}
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
                  <span className="hidden sm:inline">{isExporting ? `${Math.round(exportProgress)}%` : 'Export'}</span>
                  {isExporting && <span className="sm:hidden text-xs">{Math.round(exportProgress)}%</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export video</TooltipContent>
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
                  <span className="hidden sm:inline">Audio</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Extract audio</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>
    </TooltipProvider>
  )
}
