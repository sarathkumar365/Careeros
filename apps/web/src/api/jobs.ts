import type { Checklist } from '@type/checklist'

export const API_BASE_URL: string = import.meta.env.VITE_BFF_URL ?? '/api'

export const TASK_MESSAGE_TYPES = [
  'resume.parsing',
  'resume.tailoring',
  'checklist.parsing',
  'checklist.matching',
  'score.updating',
] as const

export type TaskMessageType = (typeof TASK_MESSAGE_TYPES)[number]

export const TASK_COMPLETED_RESULT_TYPES = [
  'resume.parsing.completed',
  'resume.tailoring.completed',
  'checklist.parsing.completed',
  'checklist.matching.completed',
  'score.updating.completed',
] as const

export const TASK_FAILED_RESULT_TYPES = [
  'resume.parsing.failed',
  'resume.tailoring.failed',
  'checklist.parsing.failed',
  'checklist.matching.failed',
  'score.updating.failed',
] as const

export type TaskCompletedResultType = (typeof TASK_COMPLETED_RESULT_TYPES)[number]
export type TaskFailedResultType = (typeof TASK_FAILED_RESULT_TYPES)[number]
export type TaskResultType = TaskCompletedResultType | TaskFailedResultType

// Failed tasks map: task message type -> ISO timestamp when it failed
export type FailedTasksMap = Partial<Record<TaskMessageType, string>>

export interface CreateJobApplicationResponse {
  id: string
}

export interface JobApplicationInput {
  rawResumeContent: string
  jobDescription: string
  companyName: string
  position: string
  dueDate: string
}

export interface CreateJobApplicationPayload extends JobApplicationInput {
  templateId: string
  jsonSchema: Record<string, unknown>
}

export interface JobApplication {
  id: string
  companyName: string
  position: string
  dueDate: string
  matchPercentage: number
  applicationStatus: string | null
  createdAt: string
  updatedAt: string
}

export interface JobApplicationDetails extends JobApplication {
  templateId: string
  jobDescription: string
  tailoredResume: Record<string, unknown> | null
  originalResume: string
  checklist: Checklist | null
  failedTasks: FailedTasksMap
}

export interface TailorResumePayload {
  checklist: Checklist
  resumeStructure: Record<string, unknown>
  jsonSchema: Record<string, unknown>
}

export interface GeneralAPIResponse {
  success: boolean
}

export interface UpdateJobApplicationPayload {
  companyName: string
  position: string
  dueDate: string
}

export async function createJobApplication(
  payload: CreateJobApplicationPayload,
): Promise<CreateJobApplicationResponse> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/jobs`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.json()
    throw new Error(
      errorBody?.message ||
        `Failed to create job application (status ${response.status})`,
    )
  }

  return (await response.json()) as CreateJobApplicationResponse
}

export async function getAllJobApplications(): Promise<Array<JobApplication>> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/jobs`
  const response = await fetch(url, {
    method: 'GET',
  })

  if (!response.ok) {
    const errorBody = await response.json()
    throw new Error(
      errorBody?.message ||
        `Failed to get job applications (status ${response.status})`,
    )
  }

  return (await response.json()) as Array<JobApplication>
}

export async function getJobApplication(
  id: string,
): Promise<JobApplicationDetails> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/jobs/${id}`
  const response = await fetch(url, {
    method: 'GET',
  })

  if (!response.ok) {
    const errorBody = await response.json()
    throw new Error(
      errorBody?.message ||
        `Failed to get job application (status ${response.status})`,
    )
  }

  return (await response.json()) as JobApplicationDetails
}

export async function updateJobApplication(
  id: string,
  payload: UpdateJobApplicationPayload,
): Promise<void> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/jobs/${id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.json()
    throw new Error(
      errorBody?.message ||
        `Failed to update job application (status ${response.status})`,
    )
  }
}

export async function deleteJobApplication(id: string): Promise<void> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/jobs/${id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const errorBody = await response.json()
    throw new Error(
      errorBody?.message ||
        `Failed to delete job application (status ${response.status})`,
    )
  }
}

export async function saveResume(
  jobId: string,
  resumeStructure: Record<string, unknown>,
  templateId: string,
): Promise<GeneralAPIResponse> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/jobs/${jobId}/resume`
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ resumeStructure, templateId }),
  })

  if (!response.ok) {
    const errorBody = await response.json()
    throw new Error(
      errorBody?.message || `Failed to save resume (status ${response.status})`,
    )
  }

  return (await response.json()) as GeneralAPIResponse
}

export async function tailorResume(
  jobId: string,
  payload: TailorResumePayload,
): Promise<GeneralAPIResponse> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/jobs/${jobId}/resume/tailor`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.json()
    throw new Error(
      errorBody?.message ||
        `Failed to tailor resume (status ${response.status})`,
    )
  }

  return (await response.json()) as GeneralAPIResponse
}

export interface RetryFailedTasksResponse {
  success: boolean
  message: string
  retriedTasks: Array<TaskMessageType>
}

export async function retryFailedTasks(
  jobId: string,
  jsonSchema?: Record<string, unknown>,
): Promise<RetryFailedTasksResponse> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/jobs/${jobId}/retry`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jsonSchema }),
  })

  if (!response.ok) {
    const errorBody = await response.json()
    throw new Error(
      errorBody?.message ||
        `Failed to retry failed tasks (status ${response.status})`,
    )
  }

  return (await response.json()) as RetryFailedTasksResponse
}
