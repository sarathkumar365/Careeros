import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { SquarePen } from 'lucide-react'
import ScoreCircle from '@ui/ScoreCircle'
import Card from '@ui/Card'
import EditJobDialog from '@dashboard/EditJobModal'
import { InvertedCircleButton } from '@ui/InvertedCircleButton'

export interface ResumeCardProps {
  jobId: string
  companyName: string
  position: string
  dueDate: string
  percent: number
  className?: string
  onDelete?: (jobId: string) => void
  onEdit?: (
    jobId: string,
    data: { companyName: string; position: string; dueDate: string },
  ) => void
}

interface ResumeCardContentProps {
  companyName: string
  position: string
  dueDate: string
}

function ResumeCardContent({
  companyName,
  position,
  dueDate,
}: ResumeCardContentProps) {
  return (
    <div className="flex h-full flex-col items-start justify-end">
      <div className="font-semibold text-black">{companyName}</div>
      <div className="text-black">{position}</div>
      <div className="text-sm text-black">{dueDate}</div>
    </div>
  )
}

export default function ApplicationCard({
  jobId,
  companyName,
  position,
  dueDate,
  percent,
  className = '',
  onDelete,
  onEdit,
}: ResumeCardProps) {
  const navigate = useNavigate()
  const [showEditDialog, setShowEditDialog] = useState(false)

  const directToEditorPage = () => {
    navigate({
      to: '/editor',
      search: { jobId },
      state: { companyName, position } as any,
    })
  }

  const handleSaveEdit = (data: {
    companyName: string
    position: string
    dueDate: string
  }) => {
    setShowEditDialog(false)
    if (onEdit) {
      onEdit(jobId, data)
    }
  }

  const handleDelete = () => {
    setShowEditDialog(false)
    if (onDelete) {
      onDelete(jobId)
    }
  }

  return (
    <>
      <Card interactive className={`group ${className}`}>
        <div className="relative h-full">
          <InvertedCircleButton
            onClick={() => setShowEditDialog(true)}
            className="absolute -top-7 -right-7 z-10 opacity-0 transition-opacity group-hover:opacity-100"
            ariaLabel="Edit job application"
          >
            <SquarePen className="h-4 w-4" />
          </InvertedCircleButton>

          {/* Card Content */}
          <div
            className="flex h-full flex-row items-end justify-between pt-8"
            onClick={directToEditorPage}
          >
            <ResumeCardContent
              companyName={companyName}
              position={position}
              dueDate={dueDate}
            />
            <ScoreCircle percent={percent} />
          </div>
        </div>
      </Card>

      {/* Edit Dialog */}
      <EditJobDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSave={handleSaveEdit}
        onDelete={handleDelete}
        initialData={{ companyName, position, dueDate }}
      />
    </>
  )
}
