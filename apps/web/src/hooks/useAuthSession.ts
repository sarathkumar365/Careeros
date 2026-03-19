import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSession, signOut } from '@/api/auth'
import { SESSION_QUERY_KEY, clearSession } from '@/auth/session'

export function useAuthSession() {
  const queryClient = useQueryClient()

  const sessionQuery = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: getSession,
    retry: false,
    staleTime: 60_000,
  })

  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSettled: () => {
      clearSession(queryClient)
      queryClient.removeQueries({ queryKey: ['jobApplications'] })
      queryClient.removeQueries({ queryKey: ['jobApplication'] })
    },
  })

  return {
    session: sessionQuery.data ?? null,
    isAuthenticated: Boolean(sessionQuery.data),
    isLoading: sessionQuery.isLoading,
    signOut: async () => {
      await signOutMutation.mutateAsync()
    },
    isSigningOut: signOutMutation.isPending,
  }
}
