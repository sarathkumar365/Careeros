import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useResumeStore } from '@typst-compiler/resumeState'
import { TailoringButton } from './TailoringButton'
import type { ComponentProps } from 'react'

const tailorResumeMock = vi.fn()

vi.mock('@/api/jobs', async () => {
  const actual = await vi.importActual('@/api/jobs')
  return {
    ...actual,
    tailorResume: (...args: Array<unknown>) => tailorResumeMock(...args),
  }
})

vi.mock('@ui/AnimatedText', () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
}))

const READY_CHECKLIST = {
  hardRequirements: [{ requirement: 'React', keywords: [], reason: '' }],
  softRequirements: [],
  preferredSkills: [],
  needTailoring: [],
}

const RESUME_STRUCTURE = {
  summary: { value: 'hello' },
}

describe('TailoringButton', () => {
  beforeEach(() => {
    tailorResumeMock.mockReset()
    useResumeStore.setState({
      isTailoringResume: false,
      isMatchingTailoredResume: false,
    })
  })

  function renderButton(
    props?: Partial<ComponentProps<typeof TailoringButton>>,
  ) {
    const queryClient = new QueryClient()

    return render(
      <QueryClientProvider client={queryClient}>
        <TailoringButton
          jobId="job-1"
          checklist={READY_CHECKLIST as any}
          resumeStructure={RESUME_STRUCTURE as any}
          jsonSchema={{ type: 'object' }}
          {...props}
        />
      </QueryClientProvider>,
    )
  }

  it('is disabled when checklist is not ready', () => {
    renderButton({ checklist: undefined })
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true)
  })

  it('is enabled when checklist is ready and no active task flags', () => {
    renderButton()
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(false)
  })

  it('is disabled while tailoring flag is active', () => {
    useResumeStore.setState({ isTailoringResume: true })
    renderButton()
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true)
  })

  it('sets tailoring flag on successful tailor request', async () => {
    tailorResumeMock.mockResolvedValue({ success: true })
    renderButton()

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(tailorResumeMock).toHaveBeenCalledTimes(1)
      expect(useResumeStore.getState().isTailoringResume).toBe(true)
    })
  })
})
