import type { QueryClient } from '@tanstack/react-query'
import { getSession } from '@/api/auth'
import { ApiError } from '@/api/http'

export const SESSION_QUERY_KEY = ['auth', 'me'] as const

export async function getSessionOrNull(queryClient: QueryClient) {
  try {
    return await queryClient.fetchQuery({
      queryKey: SESSION_QUERY_KEY,
      queryFn: getSession,
      staleTime: 60_000,
      retry: false,
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }

    throw error
  }
}

export function setSession(queryClient: QueryClient, user: unknown) {
  queryClient.setQueryData(SESSION_QUERY_KEY, user)
}

export function clearSession(queryClient: QueryClient) {
  queryClient.setQueryData(SESSION_QUERY_KEY, null)
}
