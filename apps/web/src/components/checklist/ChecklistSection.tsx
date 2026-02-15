import { RequirementItem } from './RequirementItem'
import type { ChecklistRequirement } from '@type/checklist'

interface ChecklistSectionProps {
  title: string
  requirements: Array<ChecklistRequirement>
  selectedKeywords: Array<string>
  onToggleKeyword: (keyword: string) => void
}

export function ChecklistSection({
  title,
  requirements,
  selectedKeywords,
  onToggleKeyword,
}: ChecklistSectionProps) {
  if (requirements.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
      <div>
        {requirements.map((requirement, index) => (
          <RequirementItem
            key={index}
            requirement={requirement}
            selectedKeywords={selectedKeywords}
            onToggleKeyword={onToggleKeyword}
          />
        ))}
      </div>
    </div>
  )
}
