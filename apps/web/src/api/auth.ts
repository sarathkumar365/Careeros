import { apiFetch, parseApiError } from './http'

export interface SessionUser {
  id: string
  email: string
  role: 'ADMIN' | 'USER'
}

export interface AuthPayload {
  email: string
  password: string
}

export async function signUp(payload: AuthPayload): Promise<SessionUser> {
  const response = await apiFetch('/auth/sign-up', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return (await response.json()) as SessionUser
}

export async function signIn(payload: AuthPayload): Promise<SessionUser> {
  const response = await apiFetch('/auth/sign-in', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return (await response.json()) as SessionUser
}

export async function signOut(): Promise<void> {
  const response = await apiFetch('/auth/sign-out', {
    method: 'POST',
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }
}

export async function getSession(): Promise<SessionUser> {
  const response = await apiFetch('/auth/me', {
    method: 'GET',
    suppressUnauthorizedEvent: true,
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return (await response.json()) as SessionUser
}
