import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import UploadButton from '@upload/UploadButton'
import ApplicationCard from '@dashboard/ApplicationCard'
import { AppTopNav } from '@/components/navigation/AppTopNav'
import {
  deleteJobApplication,
  getAllJobApplications,
  updateJobApplication,
} from '@/api/jobs'

export default function DashboardPage() {
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
      <div className="grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
      className="flex min-h-screen flex-col"
      style={{
        backgroundImage: `
          linear-gradient(rgba(209, 213, 219, 0.22) 1px, transparent 1px),
          linear-gradient(90deg, rgba(209, 213, 219, 0.22) 1px, transparent 1px)
        `,
        backgroundSize: '12px 12px',
      }}
    >
      <AppTopNav rightSlot={<UploadButton />} />
      <main className="mx-auto w-full max-w-6xl flex-1 overflow-auto px-4 py-8 sm:px-6">
        {content}
      </main>
    </div>
  )
}
