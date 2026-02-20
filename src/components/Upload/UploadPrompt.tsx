import { useRef, useState } from 'react'
import { Upload, Film } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UploadPromptProps {
  onFileSelected: (file: File) => void
}

export default function UploadPrompt({ onFileSelected }: UploadPromptProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFile = (file: File) => {
    if (file.type.startsWith('video/')) {
      onFileSelected(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
      <div
        className={`w-full max-w-lg rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-300 ${
          isDragOver
            ? 'border-indigo-400/60 bg-indigo-500/[0.08] scale-[1.01]'
            : 'border-white/[0.12] hover:border-white/[0.2] hover:bg-white/[0.02]'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Film className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">영상을 업로드하세요</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mb-6 sm:mb-8">
          드래그 & 드롭 또는 버튼을 클릭하세요
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileInput}
          className="hidden"
        />

        <Button
          variant="default"
          size="lg"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          파일 선택
        </Button>

        <p className="text-[10px] sm:text-xs text-muted-foreground/60 mt-4 sm:mt-6">
          MP4, WebM, MOV 등 지원
        </p>
      </div>
    </div>
  )
}
