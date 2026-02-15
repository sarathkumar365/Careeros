import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UploadModal from './UploadModal'

const loadLastResumeMock = vi.fn()

vi.mock('@/utils/lastResumeCache', () => ({
  loadLastResume: () => loadLastResumeMock(),
}))

vi.mock('@/components/upload/ResumeUploadSection', () => ({
  default: ({
    selectedFile,
    onFileChange,
  }: {
    selectedFile: File | null
    onFileChange: (file: File | null) => void
  }) => (
    <div data-testid="resume-upload-section">
      {selectedFile ? selectedFile.name : 'none'}
      <button type="button" onClick={() => onFileChange(null)}>
        clear-file
      </button>
    </div>
  ),
}))

describe('UploadModal', () => {
  beforeEach(() => {
    loadLastResumeMock.mockReset()
  })

  it('prefills selected file from cache when modal opens', async () => {
    loadLastResumeMock.mockResolvedValue(
      new File(['cached'], 'cached-resume.txt', {
        type: 'text/plain',
      }),
    )

    render(
      <UploadModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={() => {}}
        isSubmitting={false}
      />,
    )

    await waitFor(() => {
      const section = screen.getByTestId('resume-upload-section')
      expect(section.textContent).toContain('cached-resume.txt')
    })
  })

  it('does not reapply cached file after user clears before cache resolves', async () => {
    let resolveLoad: ((file: File | null) => void) | null = null
    loadLastResumeMock.mockReturnValue(
      new Promise<File | null>((resolve) => {
        resolveLoad = resolve
      }),
    )

    render(
      <UploadModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={() => {}}
        isSubmitting={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'clear-file' }))

    resolveLoad?.(
      new File(['cached'], 'cached-resume.txt', {
        type: 'text/plain',
      }),
    )

    await waitFor(() => {
      const section = screen.getByTestId('resume-upload-section')
      expect(section.textContent).toContain('none')
      expect(section.textContent).not.toContain('cached-resume.txt')
    })
  })
})
