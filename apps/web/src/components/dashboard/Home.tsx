import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@ui/PageHeader'
import UploadButton from '@upload/UploadButton'
import ApplicationCard from '@dashboard/ApplicationCard'
import {
  deleteJobApplication,
  getAllJobApplications,
  updateJobApplication,
} from '@/api/jobs'

export default function HomePage() {
  const queryClient = useQueryClient()
  const {
    data: jobApplications = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['jobApplications'],
    queryFn: getAllJobApplications,
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { companyName: string; position: string; dueDate: string }
    }) => updateJobApplication(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobApplications'] })
    },
    onError: (updateError) => {
      console.error('Failed to update job application:', updateError)
      alert('Failed to update job application. Please try again.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteJobApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobApplications'] })
    },
    onError: (deleteError) => {
      console.error('Failed to delete job application:', deleteError)
      // TODO: consider use a Toast
      alert('Failed to delete job application. Please try again.')
    },
  })

  const handleEdit = (
    jobId: string,
    data: { companyName: string; position: string; dueDate: string },
  ) => {
    updateMutation.mutate({ id: jobId, data })
  }

  const handleDelete = (jobId: string) => {
    deleteMutation.mutate(jobId)
  }

  let content

  if (isLoading) {
    content = (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading applications...</div>
      </div>
    )
  } else if (error) {
    content = (
      <div className="flex items-center justify-center py-12">
        <div className="text-rose-500">
          Failed to load applications. Please try again.
        </div>
      </div>
    )
  } else if (jobApplications.length === 0) {
    content = (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">
          No applications yet. Upload your first resume to get started!
        </div>
      </div>
    )
  } else {
    content = (
      <div className="grid grid-cols-2 justify-items-center gap-x-1 gap-y-8 md:grid-cols-4 md:gap-x-2">
        {jobApplications.map((app) => (
          <ApplicationCard
            key={app.id}
            jobId={app.id}
            companyName={app.companyName}
            position={app.position}
            dueDate={app.dueDate}
            percent={app.matchPercentage}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className="flex h-screen flex-col"
      style={{
        // backgroundColor: '#F9F6EE',
        backgroundImage: `
          linear-gradient(rgba(209, 213, 219, 0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(209, 213, 219, 0.3) 1px, transparent 1px)
        `,
        backgroundSize: '12px 12px',
      }}
    >
      <PageHeader
        left={<div className="text-2xl font-bold">DASHBOARD</div>}
        right={<UploadButton />}
      />
      <main className="flex-1 overflow-auto p-4">{content}</main>
    </div>
  )
}
