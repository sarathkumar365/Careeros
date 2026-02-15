import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'

export function useFileUpload(onFileSelection?: (file: File | null) => void) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  function handleFileSelection(file: File | null) {
    if (!file) {
      setSelectedFile(null)
      onFileSelection?.(null)
      return
    }
    setSelectedFile(file)
    onFileSelection?.(file)
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    handleFileSelection(file)
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragActive(false)
    const file = event.dataTransfer.files[0]
    handleFileSelection(file)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (!isDragActive) {
      setIsDragActive(true)
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const related = event.relatedTarget as Node | null
    if (related && event.currentTarget.contains(related)) {
      return
    }
    setIsDragActive(false)
  }

  function triggerFileDialog() {
    fileInputRef.current?.click()
  }

  function removeSelectedFile() {
    handleFileSelection(null)
  }

  function resetFileUpload() {
    setSelectedFile(null)
    setIsDragActive(false)
  }

  function setSelectedFileState(file: File | null) {
    setSelectedFile(file)
  }

  return {
    fileInputRef,
    selectedFile,
    setSelectedFileState,
    isDragActive,
    handleInputChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    triggerFileDialog,
    removeSelectedFile,
    resetFileUpload,
  }
}
