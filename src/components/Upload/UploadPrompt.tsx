import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
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
    <div className="flex-1 flex items-center justify-center p-8">
      <div
        className={`w-full max-w-lg border-2 border-dashed p-12 text-center transition-colors ${
          isDragOver
            ? 'border-white bg-white/10'
            : 'border-white/30 hover:border-white/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex justify-center gap-2 mb-6">
          <div className="w-10 h-10 bg-white border border-white/30 rotate-12" />
          <div className="w-8 h-8 bg-[#333] border border-white/20 -rotate-6" />
          <div className="w-9 h-9 bg-[#222] border border-white/20 rotate-3" />
        </div>

        <h2 className="text-xl font-black text-white mb-2">영상을 업로드하세요</h2>
        <p className="text-sm text-white/50 font-bold mb-6">
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
          <Upload className="h-4 w-4 mr-2" />
          파일 선택
        </Button>

        <p className="text-xs text-white/30 font-bold mt-4">
          MP4, WebM, MOV 등 지원
        </p>
      </div>
    </div>
  )
}
