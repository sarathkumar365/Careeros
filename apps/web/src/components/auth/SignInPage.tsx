import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { AuthPage } from './AuthPage'
import { signIn } from '@/api/auth'
import { ApiError } from '@/api/http'
import { setSession } from '@/auth/session'

export default function SignInPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const search = useSearch({ from: '/sign-in' })

  const mutation = useMutation({
    mutationFn: signIn,
    onSuccess: async (user) => {
      setSession(queryClient, user)
      await navigate({
        to: search.redirect || '/dashboard',
      })
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setErrorMessage(error.message)
        return
      }

      setErrorMessage('Failed to sign in. Please try again.')
    },
  })

  return (
    <AuthPage
      mode="sign-in"
      onSubmit={async (payload) => {
        setErrorMessage(null)
        await mutation.mutateAsync(payload)
      }}
      errorMessage={errorMessage}
      isSubmitting={mutation.isPending}
    />
  )
}
