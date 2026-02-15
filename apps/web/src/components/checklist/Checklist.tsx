import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { z } from 'zod'
import { useResumeStore } from '@typst-compiler/resumeState'
import { getJobApplication } from '@api/jobs'
import { TemplateBuilder } from '@templates/builder'
import { ChecklistSection } from '@checklist/ChecklistSection'
import ScoreCircle from '@ui/ScoreCircle'
import type { Checklist } from '@type/checklist'
import { AIStatusButton } from '@/components/ai-status'

interface ChecklistProps {
  matchPercentage?: number
}

export default function Checklist({ matchPercentage = 0 }: ChecklistProps) {
  const searchParams = useSearch({ from: '/editor' })
  const jobId = (searchParams as { jobId?: string }).jobId

  const { data: jobApplication } = useQuery({
    queryKey: ['jobApplication', jobId],
    queryFn: () => getJobApplication(jobId!),
    enabled: !!jobId,
  })

  const safePercent = Number.isFinite(matchPercentage)
    ? Math.max(0, Math.min(100, matchPercentage))
    : 0

  const checklist = jobApplication?.checklist

  // Get current resume form data (latest user input)
  const resumeData = useResumeStore((state) => state.data)
  const templateId = useResumeStore((state) => state.templateId)

  // Generate JSON schema for the current template
  const jsonSchema = useMemo(() => {
    const builder = new TemplateBuilder(templateId)
    const sectionSchemas = builder.getDataSchemas() // Use data schemas (no defaults, all required)
    const uiSchemas = builder.getUISchemas()

    // Build Zod structure schema from all sections
    const schemaShape: Record<string, z.ZodTypeAny> = {}
    Object.entries(sectionSchemas).forEach(([sectionId, sectionSchema]) => {
      const uiSchema = uiSchemas.find((s) => s.id === sectionId)
      if (uiSchema?.multiple) {
        schemaShape[sectionId] = z.array(sectionSchema)
      } else {
        schemaShape[sectionId] = sectionSchema
      }
    })

    const zodSchema = z.object(schemaShape)
    return zodToJsonSchema(zodSchema) as Record<string, unknown>
  }, [templateId])

  // Track selected keywords for needTailoring
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(
    new Set(),
  )

  // Initialize from checklist.needTailoring when checklist loads
  useEffect(() => {
    if (checklist?.needTailoring) {
      setSelectedKeywords(new Set(checklist.needTailoring))
    }
  }, [checklist?.needTailoring])

  // Toggle keyword selection (only for unfulfilled keywords)
  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords((prev) => {
      const next = new Set(prev)
      if (next.has(keyword)) {
        next.delete(keyword)
      } else {
        next.add(keyword)
      }
      return next
    })
  }

  // Create updated checklist with only needTailoring modified
  const checklistWithSelections: Checklist | undefined = checklist
    ? {
        ...checklist,
        needTailoring: Array.from(selectedKeywords),
      }
    : undefined

  const selectedKeywordsArray = Array.from(selectedKeywords)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-6 pb-4">
        <h2 className="text-lg font-semibold">Checklist</h2>
        <ScoreCircle percent={safePercent} size={42} />
      </div>
      <AIStatusButton
        jobId={jobId}
        checklist={checklistWithSelections}
        resumeStructure={resumeData}
        jsonSchema={jsonSchema}
        failedTasks={jobApplication?.failedTasks}
      />
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {checklist ? (
          <>
            <ChecklistSection
              title="Hard Requirements"
              requirements={checklist.hardRequirements}
              selectedKeywords={selectedKeywordsArray}
              onToggleKeyword={toggleKeyword}
            />
            <ChecklistSection
              title="Soft Requirements"
              requirements={checklist.softRequirements}
              selectedKeywords={selectedKeywordsArray}
              onToggleKeyword={toggleKeyword}
            />
            <ChecklistSection
              title="Preferred Skills"
              requirements={checklist.preferredSkills}
              selectedKeywords={selectedKeywordsArray}
              onToggleKeyword={toggleKeyword}
            />
          </>
        ) : (
          <p className="text-sm text-gray-500">No checklist data available</p>
        )}
      </div>
    </div>
  )
}
