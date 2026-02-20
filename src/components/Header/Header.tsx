import { useRef, useState } from 'react'
import { Upload, Download, Loader2, AudioWaveform } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useProjectStore } from '../../store/projectStore'
import { videoEngine } from '../../video/VideoEngine'
import { getVideoMetadata, generateThumbnails, generateId } from '../../utils/videoUtils'

export default function Header() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { phase, setPhase, setVideo, videoFile, tracks, setExportProgress, exportProgress } = useProjectStore()
  const [isExporting, setIsExporting] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('video/')) return

    try {
      setPhase('uploading')
      const metadata = await getVideoMetadata(file)
      const videoUrl = URL.createObjectURL(file)
      const thumbnails = await generateThumbnails(videoUrl, metadata.duration, 10)

      setVideo(file, videoUrl, metadata.duration)

      useProjectStore.getState().setTracks([{
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

    e.target.value = ''
  }

  const handleExport = async () => {
    if (!videoFile || tracks.length === 0) return

    const activeTracks = tracks.filter(t => t.active)
    if (activeTracks.length === 0) {
      alert('내보낼 활성 트랙이 없습니다')
      return
    }

    try {
      setIsExporting(true)
      setPhase('exporting')

      if (!videoEngine.isLoaded()) {
        await videoEngine.load((p) => setExportProgress(p))
      }

      const blob = await videoEngine.exportTracks(videoFile, tracks, (p) => setExportProgress(p))

      const hasVideo = activeTracks.some(t => t.type === 'video')
      const ext = hasVideo ? 'mp4' : 'wav'
      const mime = hasVideo ? 'video/mp4' : 'audio/wav'

      const url = URL.createObjectURL(new Blob([blob], { type: mime }))
      const a = document.createElement('a')
      a.href = url
      a.download = `export.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('내보내기 실패:', err)
      alert('내보내기에 실패했습니다: ' + (err instanceof Error ? err.message : ''))
    } finally {
      setIsExporting(false)
      setExportProgress(0)
      setPhase('ready')
    }
  }

  return (
    <TooltipProvider>
      <header className="bg-background/80 backdrop-blur-xl border-b border-white/[0.06] px-3 py-2 sm:px-4 sm:py-2.5 relative z-50 safe-area-top">
        <div className="flex items-center justify-between gap-2">
          {/* 로고 */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <AudioWaveform className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <h1 className="text-sm sm:text-lg font-bold text-foreground tracking-tight truncate">
              TB <span className="gradient-text">음원분리</span>
            </h1>
          </div>

          {/* 업로드 + 내보내기 */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={phase === 'separating' || isExporting}
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1.5">업로드</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>새 영상 업로드</TooltipContent>
            </Tooltip>

            {(phase === 'ready' || phase === 'exporting') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs">{Math.round(exportProgress)}%</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">내보내기</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>활성 트랙 내보내기</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </header>
    </TooltipProvider>
  )
}
