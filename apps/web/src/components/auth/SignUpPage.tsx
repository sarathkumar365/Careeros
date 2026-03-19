import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AuthPage } from './AuthPage'
import { signUp } from '@/api/auth'
import { ApiError } from '@/api/http'
import { setSession } from '@/auth/session'

export default function SignUpPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: signUp,
    onSuccess: async (user) => {
      setSession(queryClient, user)
      await navigate({ to: '/dashboard' })
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setErrorMessage(error.message)
        return
      }

      setErrorMessage('Failed to create account. Please try again.')
    },
  })

  return (
    <AuthPage
      mode="sign-up"
      onSubmit={async (payload) => {
        setErrorMessage(null)
        await mutation.mutateAsync(payload)
      }}
      errorMessage={errorMessage}
      isSubmitting={mutation.isPending}
    />
  )
}
