import { useEffect, useState } from 'react'
import { WandSparkles } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useResumeStore } from '@typst-compiler/resumeState'
import SplitText from '@ui/AnimatedText'
import type { Checklist } from '@type/checklist'
import type { TemplateData } from '@templates/template.types'
import { tailorResume } from '@/api/jobs'

interface TailoringButtonProps {
  jobId?: string
  checklist?: Checklist
  resumeStructure?: TemplateData
  jsonSchema?: Record<string, unknown>
}

const INITIAL_MATCHING_MESSAGES = [
  'checking resume against requirements',
  'analyzing fit',
  'evaluating qualifications',
  'comparing skills',
  'assessing experience',
  'reviewing match',
  'calculating compatibility',
]

const TAILORING_MESSAGES = [
  'tailoring resume',
  'optimizing content',
  'highlighting strengths',
  'refining experience',
  'enhancing impact',
  'polishing achievements',
  'improving presentation',
]

const CHECKLIST_MATCHING_MESSAGES = [
  'rechecking requirements',
  'validating improvements',
  'analyzing new fit',
  'updating match score',
  'verifying alignment',
  'calculating compatibility',
  'finalizing assessment',
]

export function TailoringButton({
  jobId,
  checklist,
  resumeStructure,
  jsonSchema,
}: TailoringButtonProps) {
  const [messageIndex, setMessageIndex] = useState(0)

  const setTailoringResume = useResumeStore((state) => state.setTailoringResume)
  const isTailoringResume = useResumeStore((state) => state.isTailoringResume)
  const isMatchingTailoredResume = useResumeStore(
    (state) => state.isMatchingTailoredResume,
  )

  // Check if checklist matching is completed
  const isChecklistReady = Boolean(
    checklist &&
      (checklist.hardRequirements.length > 0 ||
        checklist.softRequirements.length > 0 ||
        checklist.preferredSkills.length > 0),
  )

  const tailorMutation = useMutation({
    mutationFn: () => {
      if (!jobId || !checklist || !resumeStructure || !jsonSchema) {
        throw new Error('Missing required data for tailoring')
      }
      return tailorResume(jobId, {
        checklist,
        resumeStructure,
        jsonSchema,
      })
    },
    onSuccess: () => {
      console.log('[Tailoring] Request sent successfully')
      setTailoringResume(true)
    },
    onError: (error) => {
      console.error('[Tailoring] Failed:', error)
      setTailoringResume(false)
    },
  })

  // Determine which message list to use
  const getCurrentMessages = () => {
    if (!isChecklistReady) {
      return INITIAL_MATCHING_MESSAGES
    } else if (isTailoringResume) {
      return TAILORING_MESSAGES
    } else if (isMatchingTailoredResume) {
      return CHECKLIST_MATCHING_MESSAGES
    }
    return INITIAL_MATCHING_MESSAGES
  }

  // Reset message index when switching between message lists
  useEffect(() => {
    setMessageIndex(0)
  }, [isTailoringResume, isMatchingTailoredResume, isChecklistReady])

  // Cycle through messages while any loading state is active
  const shouldCycleMessages =
    !isChecklistReady || isTailoringResume || isMatchingTailoredResume

  useEffect(() => {
    if (!shouldCycleMessages) {
      return
    }

    const currentMessages = getCurrentMessages()
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % currentMessages.length)
    }, 2000)

    return () => clearInterval(interval)
  }, [
    shouldCycleMessages,
    isTailoringResume,
    isMatchingTailoredResume,
    isChecklistReady,
  ])

  const handleClick = () => {
    if (isLoading) {
      return
    }

    console.log('=== Tailoring Data ===')
    console.log('Job ID:', jobId)
    console.log('Checklist with user selections:', checklist)
    console.log('Resume structure (latest form data):', resumeStructure)
    console.log('JSON Schema:', jsonSchema)

    tailorMutation.mutate()
  }

  // Determine if button is in loading state
  const isLoading =
    !isChecklistReady ||
    isTailoringResume ||
    isMatchingTailoredResume ||
    tailorMutation.isPending

  // Determine button content
  const currentMessages = getCurrentMessages()
  let buttonContent

  if (!isChecklistReady || isTailoringResume || isMatchingTailoredResume) {
    // Show cycling messages when waiting for checklist or when tailoring
    buttonContent = (
      <div className="flex w-full flex-row items-center justify-center gap-3">
        <SplitText
          key={currentMessages[messageIndex]}
          text={currentMessages[messageIndex]}
          className="text-xs"
          delay={30}
          duration={0.3}
          ease="power2.out"
          splitType="words"
          from={{ opacity: 0, y: 10 }}
          to={{ opacity: 1, y: 0 }}
          threshold={0}
          rootMargin="0px"
          textAlign="center"
        />
      </div>
    )
  } else {
    // Ready state - show normal button
    buttonContent = (
      <div className="flex flex-row items-center justify-center gap-2">
        <WandSparkles size={16} />
        <span>Tailoring</span>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="relative w-full cursor-pointer overflow-hidden bg-black px-3 py-2 text-gray-200 transition-all duration-200 hover:bg-gray-200 hover:text-black focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none active:scale-96 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="relative z-10">{buttonContent}</div>
    </button>
  )
}
