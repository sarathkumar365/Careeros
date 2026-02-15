import { useMutation, useQueryClient } from '@tanstack/react-query'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { z } from 'zod'
import { useResumeStore } from '@typst-compiler/resumeState'
import { TemplateBuilder } from '@templates/builder'
import {
  DEFAULT_TEMPLATE_NAME,
  premadeTemplates,
} from '@templates/premade-tmpl'
import { TemplateId } from '@templates/templateId'
import type {
  CreateJobApplicationPayload,
  JobApplicationInput,
} from '@/api/jobs'
import { createJobApplication } from '@/api/jobs'

export function useCreateJobApplication() {
  const queryClient = useQueryClient()
  const setParsingResume = useResumeStore((state) => state.setParsingResume)
  const setParsingChecklist = useResumeStore(
    (state) => state.setParsingChecklist,
  )

  const mutation = useMutation({
    mutationFn: createJobApplication,
    onSuccess() {
      setParsingResume(true)
      setParsingChecklist(true)
      queryClient.invalidateQueries({ queryKey: ['jobApplications'] })
    },
  })

  function handleSubmit(payload: JobApplicationInput) {
    // FIX: the whole point is to get jsonSchema of the default template
    const defaultConfig = premadeTemplates[DEFAULT_TEMPLATE_NAME]
    const defaultTemplateId = TemplateId.toJSON(defaultConfig)
    const jsonSchema = buildResumeJsonSchema(defaultTemplateId)

    const jobApplicationPayload: CreateJobApplicationPayload = {
      ...payload,
      templateId: defaultTemplateId,
      jsonSchema,
    }

    mutation.mutate(jobApplicationPayload)
  }

  return {
    handleSubmit,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
  }
}

function buildResumeJsonSchema(templateId: string) {
  const builder = new TemplateBuilder(templateId)
  const sectionSchemas = builder.getDataSchemas() // Use data schemas (no defaults, all required)
  const uiSchemas = builder.getUISchemas()

  const schemaShape: Record<string, z.ZodTypeAny> = {}
  Object.entries(sectionSchemas).forEach(([sectionId, sectionSchema]) => {
    const uiSchema = uiSchemas.find((s) => s.id === sectionId)
    schemaShape[sectionId] = uiSchema?.multiple
      ? z.array(sectionSchema)
      : sectionSchema
  })

  const zodSchema = z.object(schemaShape)
  return zodToJsonSchema(zodSchema) as Record<string, unknown>
}
