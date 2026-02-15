import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ResumeUploadSection from './ResumeUploadSection'

describe('ResumeUploadSection', () => {
  it('renders FilePreview when file is provided from parent prop', async () => {
    const initialFile = new File(['resume'], 'resume.txt', {
      type: 'text/plain',
    })

    render(
      <ResumeUploadSection selectedFile={initialFile} onFileChange={() => {}} />,
    )

    await waitFor(() => {
      expect(screen.getByText('resume.txt')).toBeTruthy()
    })
  })

  it('propagates changed file to parent callback', async () => {
    const onFileChange = vi.fn()
    const initialFile = new File(['old'], 'resume.txt', {
      type: 'text/plain',
    })
    const newFile = new File(['new'], 'updated.txt', { type: 'text/plain' })

    const { container } = render(
      <ResumeUploadSection
        selectedFile={initialFile}
        onFileChange={onFileChange}
      />,
    )

    const input = container.querySelector('input[type="file"]')
    expect(input).not.toBeNull()
    if (!input) {
      throw new Error('Expected file input to exist')
    }

    fireEvent.change(input, {
      target: { files: [newFile] },
    })

    await waitFor(() => {
      expect(onFileChange).toHaveBeenCalledWith(newFile)
    })
  })

  it('propagates null when file is removed', async () => {
    const onFileChange = vi.fn()
    const initialFile = new File(['resume'], 'resume.txt', {
      type: 'text/plain',
    })

    render(
      <ResumeUploadSection
        selectedFile={initialFile}
        onFileChange={onFileChange}
      />,
    )

    const removeButton = await screen.findByRole('button', { name: 'Remove' })
    fireEvent.click(removeButton)

    await waitFor(() => {
      expect(onFileChange).toHaveBeenCalledWith(null)
    })
  })
})
