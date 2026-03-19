import { API_BASE_URL } from './config'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function emitUnauthorized() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent('auth:unauthorized'))
}

export async function apiFetch(
  path: string,
  options?: RequestInit & { suppressUnauthorizedEvent?: boolean },
): Promise<Response> {
  const { suppressUnauthorizedEvent = false, ...requestOptions } = options ?? {}
  const url = `${API_BASE_URL.replace(/\/$/, '')}${path}`
  const response = await fetch(url, {
    credentials: 'include',
    ...requestOptions,
  })

  if (response.status === 401 && !suppressUnauthorizedEvent) {
    emitUnauthorized()
  }

  return response
}

export async function parseApiError(response: Response): Promise<ApiError> {
  let message = `Request failed (status ${response.status})`

  try {
    const json = (await response.json()) as { message?: string }
    if (json.message) {
      message = json.message
    }
  } catch {
    // Keep fallback message when response body is not JSON.
  }

  return new ApiError(message, response.status)
}
