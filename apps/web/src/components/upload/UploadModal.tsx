import { useEffect, useRef, useState } from 'react'
import { InvertedButton } from '@ui/InvertedButton'
import { Modal } from '@ui/Modal'
import type { UploadModalSubmitPayload } from './UploadButton'
import type { JobApplicationFormData } from '@/components/upload/JobDetailsSection'
import ResumeUploadSection from '@/components/upload/ResumeUploadSection'
import JobDetailsSection from '@/components/upload/JobDetailsSection'
import { loadLastResume } from '@/utils/lastResumeCache'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: UploadModalSubmitPayload) => void
  isSubmitting?: boolean
  errorMessage?: string | null
}

export default function UploadModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  errorMessage = null,
}: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [jobFormData, setJobFormData] = useState<JobApplicationFormData | null>(
    null,
  )
  const [isJobFormValid, setIsJobFormValid] = useState(false)
  const loadRequestIdRef = useRef(0)
  const hasUserInteractedWithFileRef = useRef(false)

  useEffect(() => {
    if (isOpen) {
      hasUserInteractedWithFileRef.current = false
      const requestId = ++loadRequestIdRef.current
      ;(async () => {
        const cachedFile = await loadLastResume()
        if (
          cachedFile === null ||
          requestId !== loadRequestIdRef.current ||
          hasUserInteractedWithFileRef.current
        ) {
          return
        }

        setSelectedFile((currentFile) => currentFile ?? cachedFile)
      })()
    } else {
      setSelectedFile(null)
      setJobFormData(null)
      setIsJobFormValid(false)
      hasUserInteractedWithFileRef.current = false
    }

    return () => {
      loadRequestIdRef.current += 1
    }
  }, [isOpen])

  function handleFileChange(file: File | null) {
    hasUserInteractedWithFileRef.current = true
    setSelectedFile(file)
  }

  function handleJobFormChange(
    formData: JobApplicationFormData,
    isValid: boolean,
  ) {
    setJobFormData(formData)
    setIsJobFormValid(isValid)
  }

  function handleSubmit() {
    if (!selectedFile || !jobFormData || !isJobFormValid || isSubmitting) {
      return
    }

    onSubmit({
      resumeFile: selectedFile,
      ...jobFormData,
    })
  }

  const canSubmit = Boolean(selectedFile && isJobFormValid)

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      maxWidth="xl"
      actions={
        <>
          <InvertedButton onClick={onClose}>Cancel</InvertedButton>
          <InvertedButton
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={isSubmitting}
          >
            Create application
          </InvertedButton>
        </>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,520px),minmax(0,440px)]">
        <ResumeUploadSection
          selectedFile={selectedFile}
          onFileChange={handleFileChange}
        />
        <JobDetailsSection onFormChange={handleJobFormChange} />
      </div>

      {errorMessage && (
        <p className="mt-2 text-sm text-rose-500">{errorMessage}</p>
      )}
    </Modal>
  )
}
