import { useEffect, useRef, useState } from 'react'
import { Circle, CircleDot, CircleDotDashed, TriangleAlert } from 'lucide-react'
import { KeywordsList } from './KeywordsList'
import type { ChecklistRequirement } from '@type/checklist'

interface RequirementItemProps {
  requirement: ChecklistRequirement
  selectedKeywords: Array<string>
  onToggleKeyword: (keyword: string) => void
}

export function RequirementItem({
  requirement,
  selectedKeywords,
  onToggleKeyword,
}: RequirementItemProps) {
  const [showPopover, setShowPopover] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const isFulfilled = requirement.fulfilled ?? false
  const hasAnyFulfilledKeywords = requirement.keywords.some(
    (k) => k.isFulfilled,
  )
  const isPartiallyFulfilled = !isFulfilled && hasAnyFulfilledKeywords
  const hasWarning = requirement.reason && requirement.reason.trim() !== ''

  // Determine which icon and color to use
  const StatusIcon = isFulfilled
    ? CircleDot
    : isPartiallyFulfilled
      ? CircleDotDashed
      : Circle
  const iconColor = isFulfilled
    ? 'text-green-500'
    : isPartiallyFulfilled
      ? 'text-yellow-600'
      : 'text-gray-300'

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setShowPopover(false)
      }
    }

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showPopover])

  return (
    <div className="mb-4">
      <div className="flex items-start gap-2">
        <StatusIcon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconColor}`} />
        <p className="flex-1 text-xs text-gray-800">
          {requirement.requirement}
        </p>
        {hasWarning && (
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setShowPopover(!showPopover)}
              className="flex-shrink-0 rounded p-1 transition-colors hover:bg-amber-50"
              aria-label="Show warning"
            >
              <TriangleAlert className="h-4 w-4 text-amber-500" />
            </button>
            {showPopover && (
              <div className="absolute right-0 z-10 mt-1 w-64 rounded-lg border border-amber-200 bg-white p-3 shadow-lg">
                <div className="text-xs text-amber-900">
                  {requirement.reason}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="ml-5">
        <KeywordsList
          keywords={requirement.keywords}
          selectedKeywords={selectedKeywords}
          onToggleKeyword={onToggleKeyword}
        />
      </div>
    </div>
  )
}
