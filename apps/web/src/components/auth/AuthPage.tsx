import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'

interface AuthPageProps {
  mode: 'sign-in' | 'sign-up'
  onSubmit: (payload: { email: string; password: string }) => Promise<void>
  errorMessage?: string | null
  isSubmitting: boolean
}

export function AuthPage({
  mode,
  onSubmit,
  errorMessage,
  isSubmitting,
}: AuthPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const isSignIn = mode === 'sign-in'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit({ email, password })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {isSignIn ? 'Sign in' : 'Create account'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isSignIn
            ? 'Sign in to access your dashboard and editor.'
            : 'Create your account to start managing applications.'}
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
            placeholder="you@example.com"
            required
          />

          <label className="block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
            placeholder="At least 8 characters"
            minLength={8}
            required
          />

          {errorMessage ? (
            <p className="text-sm text-rose-600" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? 'Submitting...'
              : isSignIn
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          {isSignIn ? 'Need an account?' : 'Already have an account?'}{' '}
          <Link
            to={isSignIn ? '/sign-up' : '/sign-in'}
            className="font-medium text-slate-900 underline"
          >
            {isSignIn ? 'Sign up' : 'Sign in'}
          </Link>
        </p>
      </section>
    </main>
  )
}
