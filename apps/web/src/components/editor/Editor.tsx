import { useState } from 'react'
import { useLocation, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useResumeStore } from '@typst-compiler/resumeState'
import { ArrowBigLeft, Columns2, Columns3 } from 'lucide-react'
import ResumeRender from '@editor/ResumeRender'
import Checklist from '@checklist/Checklist'
import ResumeForm from '@resumeForm/ResumeForm'
import useEditorWebSocket from '@hooks/useEditorWebSocket'
import { useSyncJobApplicationToStore } from '@hooks/useSyncJobApplicationToStore'
import { InvertedButton } from '@ui/InvertedButton'
import { PageHeader } from '@ui/PageHeader'
import DownloadResumeButton from '@editor/DownloadResumeButton'
import SaveResumeButton from '@editor/SaveResumeButton'
import ResumeParsingLoader from '@editor/ResumeParsingLoader'
import { getJobApplication } from '@api/jobs'
import { ManageSectionsButton } from '@resumeForm/ManageSectionsButton'
import { DocumentConfigButton } from '@resumeForm/DocumentConfigButton'
import type { ReactNode } from 'react'

interface EditorPageContainerProps {
  children: ReactNode
  companyName?: string
  position?: string
  jobId?: string
  showChecklist: boolean
  onToggleChecklist: () => void
}

// Editor layout with horizontal header and three-pane workspace
export function EditorPageLayout({
  children,
  companyName,
  position,
  jobId,
  showChecklist,
  onToggleChecklist,
}: EditorPageContainerProps) {
  const navigate = useNavigate()

  return (
    <div className="flex h-screen flex-col">
      <PageHeader
        left={
          <>
            <InvertedButton
              onClick={() => navigate({ to: '/' })}
              ariaLabel="Back to dashboard"
              title="Back"
            >
              <ArrowBigLeft size={16} />
            </InvertedButton>
            <InvertedButton
              onClick={onToggleChecklist}
              ariaLabel={
                showChecklist ? 'Switch to 2 columns' : 'Switch to 3 columns'
              }
              title="Toggle columns"
              className="-mr-[2px]"
            >
              {showChecklist ? <Columns2 size={16} /> : <Columns3 size={16} />}
            </InvertedButton>
          </>
        }
        center={
          companyName &&
          position && (
            <>
              <span>{companyName}</span>
              <span className="mx-2">-</span>
              <span>{position}</span>
            </>
          )
        }
        right={
          <>
            <ManageSectionsButton />
            <DocumentConfigButton />
            <SaveResumeButton jobId={jobId} />
            <DownloadResumeButton
              companyName={companyName}
              position={position}
            />
          </>
        }
      />
      <div className="grid flex-1 grid-cols-8 overflow-hidden">{children}</div>
    </div>
  )
}

export default function EditorPage() {
  // Layout state - default to showing checklist (3 columns)
  const [showChecklist, setShowChecklist] = useState(true)

  // Get jobId from URL search params (?jobId=123)
  // Type is automatically inferred from route's validateSearch
  const { jobId } = useSearch({ from: '/editor' })

  // Get navigation state (passed from dashboard or upload)
  const location = useLocation()
  const navState = location.state as { companyName?: string; position?: string }

  const isParsingResume = useResumeStore((state) => state.isParsingResume)
  const isParsingChecklist = useResumeStore((state) => state.isParsingChecklist)

  // Fetch job application data from database (for persistence/refresh)
  const { data: jobApplication } = useQuery({
    queryKey: ['jobApplication', jobId],
    queryFn: () => getJobApplication(jobId!),
    enabled: !!jobId,
  })

  // Use navigation state first (immediate), fallback to API data
  const companyName = navState.companyName ?? jobApplication?.companyName
  const position = navState.position ?? jobApplication?.position

  // Connect to WebSocket for real-time updates
  useEditorWebSocket({
    jobId,
    enabled: !!jobId,
  })

  // Sync job application data to store (templateId + tailored resume)
  useSyncJobApplicationToStore(jobApplication)

  return (
    <EditorPageLayout
      companyName={companyName}
      position={position}
      jobId={jobId}
      showChecklist={showChecklist}
      onToggleChecklist={() => setShowChecklist(!showChecklist)}
    >
      <div
        className={`h-full overflow-hidden ${showChecklist ? 'col-span-2' : 'col-span-3'}`}
      >
        <ResumeForm />
      </div>
      <div
        className={`h-full overflow-hidden ${showChecklist ? 'col-span-4' : 'col-span-5'}`}
      >
        <ResumeRender expanded={!showChecklist} />
      </div>
      {showChecklist && (
        <div className="relative z-10 col-span-2 h-full overflow-hidden">
          <Checklist matchPercentage={jobApplication?.matchPercentage} />
        </div>
      )}
      <ResumeParsingLoader
        isParsingResume={isParsingResume}
        isParsingChecklist={isParsingChecklist}
      />
    </EditorPageLayout>
  )
}
