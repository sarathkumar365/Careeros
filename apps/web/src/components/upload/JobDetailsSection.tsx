import { useState } from 'react'
import { InputField } from '@ui/InputField'
import { DatePicker } from '@ui/DatePicker'
import type { JobApplicationInput } from '@/api/jobs'

export type JobApplicationFormData = Omit<
  JobApplicationInput,
  'rawResumeContent'
>

export interface JobDetailsSectionProps {
  onFormChange: (data: JobApplicationFormData, isValid: boolean) => void
}

export default function JobDetailsSection({
  onFormChange,
}: JobDetailsSectionProps) {
  const [jobDescription, setJobDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [position, setPosition] = useState('')
  const [dueDate, setDueDate] = useState('')

  const handleFormChange = (updates?: {
    jobDescription?: string
    companyName?: string
    position?: string
    dueDate?: string
  }) => {
    const currentJobDescription = updates?.jobDescription ?? jobDescription
    const currentCompanyName = updates?.companyName ?? companyName
    const currentPosition = updates?.position ?? position
    const currentDueDate = updates?.dueDate ?? dueDate

    const formData: JobApplicationFormData = {
      jobDescription: currentJobDescription.trim(),
      companyName: currentCompanyName.trim(),
      position: currentPosition.trim(),
      dueDate: currentDueDate,
    }
    const isValid = Boolean(
      currentJobDescription.trim() &&
        currentCompanyName.trim() &&
        currentPosition.trim() &&
        currentDueDate,
    )
    onFormChange(formData, isValid)
  }

  return (
    <section className="min-w-0 pl-6">
      <h2 className="text-lg font-semibold">Job details</h2>
      <div className="mt-2 space-y-2">
        <div className="grid grid-cols-2 gap-4">
          <InputField
            id="companyName"
            label="Company"
            type="text"
            value={companyName}
            onChange={(value) => {
              setCompanyName(value)
              handleFormChange({ companyName: value })
            }}
            placeholder="Google, Apple, etc."
          />
          <InputField
            id="position"
            label="Position"
            type="text"
            value={position}
            onChange={(value) => {
              setPosition(value)
              handleFormChange({ position: value })
            }}
            placeholder="Software Engineer"
          />
        </div>

        <DatePicker
          id="dueDate"
          label="Application Due Date"
          value={dueDate}
          onChange={(value) => {
            setDueDate(value)
            handleFormChange({ dueDate: value })
          }}
          disablePastDates
        />

        <div>
          <label
            htmlFor="jobDescription"
            className="mb-1 block text-sm font-medium"
          >
            Job Description
          </label>
          <textarea
            id="jobDescription"
            name="jobDescription"
            value={jobDescription}
            onChange={(event) => {
              setJobDescription(event.target.value)
              handleFormChange({ jobDescription: event.target.value })
            }}
            placeholder="Paste the job description here..."
            className="mt-1 h-[15rem] w-full resize-none border-b border-gray-300 p-3 leading-relaxed text-slate-800 outline-none focus:border-black focus-visible:outline-2 focus-visible:outline-offset-2"
          />
        </div>
      </div>
    </section>
  )
}
