import { useEffect } from 'react'
import { TailoringButton } from './TailoringButton'
import { RetryButton } from './RetryButton'
import { useAITaskStore } from './aiTaskStore'
import type { Checklist } from '@type/checklist'
import type { TemplateData } from '@templates/template.types'
import type { FailedTasksMap } from '@/api/jobs'

interface AIStatusButtonProps {
  jobId?: string
  checklist?: Checklist
  resumeStructure?: TemplateData
  jsonSchema?: Record<string, unknown>
  failedTasks?: FailedTasksMap
}

export function AIStatusButton({
  jobId,
  checklist,
  resumeStructure,
  jsonSchema,
  failedTasks,
}: AIStatusButtonProps) {
  // Sync failed tasks from props to store
  const syncFailedTasks = useAITaskStore((state) => state.syncFailedTasks)
  useEffect(() => {
    syncFailedTasks(failedTasks || {})
  }, [failedTasks, syncFailedTasks])

  // Check if any task failed (using store helper)
  const hasAnyError = useAITaskStore((state) => state.hasAnyFailedTask())

  // Switch between retry and tailoring based on error state
  return (
    <div className="mx-6 mb-4">
      {hasAnyError ? (
        <RetryButton jobId={jobId} jsonSchema={jsonSchema} />
      ) : (
        <TailoringButton
          jobId={jobId}
          checklist={checklist}
          resumeStructure={resumeStructure}
          jsonSchema={jsonSchema}
        />
      )}
    </div>
  )
}
