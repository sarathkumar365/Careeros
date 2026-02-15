import { UploadCloud } from 'lucide-react'
import type { DragEvent } from 'react'

export interface FileDropzoneProps {
  onFileSelect: () => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void
  isDragActive: boolean
  acceptedFileTypes: string
}

export function FileDropzone({
  onFileSelect,
  onDrop,
  onDragOver,
  onDragLeave,
  isDragActive,
  acceptedFileTypes,
}: FileDropzoneProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFileSelect}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`mt-2 flex h-[24rem] cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-transparent text-center transition hover:border-gray-300 ${
        isDragActive ? 'bg-gray-300' : 'bg-white'
      }`}
    >
      <UploadCloud />
      <span className="text-sm">Drop your resume here</span>
      <span className="text-xs">or click to browse</span>
      <p className="mt-3 text-xs">Supported formats: {acceptedFileTypes}</p>
      <p className="mt-4 text-xs">Max file size: 5MB</p>
    </div>
  )
}
