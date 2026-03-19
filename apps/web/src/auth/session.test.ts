import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { getSessionOrNull } from './session'
import { ApiError } from '@/api/http'

vi.mock('@/api/auth', () => ({
  getSession: vi.fn(),
}))

describe('getSessionOrNull', () => {
  it('returns null for 401', async () => {
    const { getSession } = await import('@/api/auth')
    ;(getSession as any).mockRejectedValue(new ApiError('Unauthorized', 401))

    const queryClient = new QueryClient()
    await expect(getSessionOrNull(queryClient)).resolves.toBeNull()
  })

  it('rethrows non-401 errors', async () => {
    const { getSession } = await import('@/api/auth')
    ;(getSession as any).mockRejectedValue(new ApiError('Server', 500))

    const queryClient = new QueryClient()
    await expect(getSessionOrNull(queryClient)).rejects.toBeInstanceOf(ApiError)
  })
})
