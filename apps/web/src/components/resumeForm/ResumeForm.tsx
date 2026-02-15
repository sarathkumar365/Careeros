import { useResumeStore } from '@typst-compiler/resumeState'
import { DynamicSection } from '@/components/resumeForm/DynamicSection'
import { TemplateBuilder } from '@/templates/builder'
import { TemplateId } from '@/templates/templateId'

export default function ResumeForm() {
  // FIX: now the templateid is a json string or json
  // and we should get the state from the useResumeStore right?
  const templateId = useResumeStore((state) => state.templateId)
  const config = TemplateId.parse(templateId)
  const builder = new TemplateBuilder(templateId)
  const schemas = builder.getUISchemas()

  // Create a lookup map for schema by ID
  const schemaById = Object.fromEntries(schemas.map((s) => [s.id, s]))

  // Get section order from config
  const sectionOrder = config.sections.map((s) => s.id)

  return (
    <div className="h-full overflow-y-auto border-r">
      {sectionOrder.map((sectionId) => {
        const sectionSchema = schemaById[sectionId]
        return <DynamicSection key={sectionSchema.id} schema={sectionSchema} />
      })}
    </div>
  )
}
