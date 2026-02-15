import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { FilePlus } from 'lucide-react'
import type { JobApplicationInput } from '@/api/jobs'
import { InvertedButton } from '@/components/ui/InvertedButton'
import UploadModal from '@/components/upload/UploadModal'
import { useCreateJobApplication } from '@/hooks/useCreateJobApplication'
import { extractResumeText } from '@/utils/resumeTextExtractor'
import { saveLastResume } from '@/utils/lastResumeCache'

export interface UploadModalSubmitPayload {
  resumeFile: File
  jobDescription: string
  companyName: string
  position: string
  dueDate: string
}

export default function UploadButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const navigate = useNavigate()

  const { handleSubmit, isPending, isSuccess, error, data } =
    useCreateJobApplication()

  const errorMessage =
    extractionError ||
    (error
      ? error instanceof Error
        ? error.message
        : 'Something went wrong. Please try again.'
      : null)

  useEffect(() => {
    if (isSuccess && data) {
      setIsModalOpen(false)
      navigate({
        to: '/editor',
        search: { jobId: data.id },
      })
    }
  }, [isSuccess, data, navigate])

  const handleClose = () => {
    if (!isPending) {
      setIsModalOpen(false)
      setExtractionError(null)
    }
  }

  const handleModalSubmit = async (payload: UploadModalSubmitPayload) => {
    setExtractionError(null)

    try {
      const rawResumeContent = await extractResumeText(payload.resumeFile)
      await saveLastResume(payload.resumeFile)
      const input: JobApplicationInput = {
        rawResumeContent,
        jobDescription: payload.jobDescription,
        companyName: payload.companyName,
        position: payload.position,
        dueDate: payload.dueDate,
      }
      handleSubmit(input)
    } catch (err) {
      setExtractionError('Failed to read resume file. Please try again.')
    }
  }

  return (
    <>
      <InvertedButton
        onClick={() => setIsModalOpen(true)}
        title="New application"
      >
        <div className="flex flex-row items-center gap-2">
          <FilePlus size={16} />
          <span>NEW</span>
        </div>
      </InvertedButton>

      <UploadModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onSubmit={handleModalSubmit}
        isSubmitting={isPending}
        errorMessage={errorMessage}
      />
    </>
  )
}
