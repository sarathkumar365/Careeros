import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthPage } from './AuthPage'
import type { ReactNode } from 'react'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

describe('AuthPage', () => {
  it('submits email and password for sign in', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <AuthPage
        mode="sign-in"
        onSubmit={onSubmit}
        isSubmitting={false}
        errorMessage={null}
      />,
    )

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      })
    })
  })

  it('renders API errors', () => {
    render(
      <AuthPage
        mode="sign-up"
        onSubmit={vi.fn()}
        isSubmitting={false}
        errorMessage="Email already registered"
      />,
    )

    expect(screen.getByRole('alert').textContent).toContain(
      'Email already registered',
    )
  })
})
