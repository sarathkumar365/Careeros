import { StrictMode, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { useQueryClient } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useLocation,
  useNavigate,
} from '@tanstack/react-router'
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import EditorPage from '@editor/Editor'
import HomePage from '@dashboard/Home'
import DashboardPage from '@dashboard/DashboardPage'
import reportWebVitals from './reportWebVitals.ts'
import SignInPage from '@/components/auth/SignInPage'
import SignUpPage from '@/components/auth/SignUpPage'
import * as TanStackQueryProvider from '@/integrations/tanstack-query/root-provider.tsx'
import { clearSession, getSessionOrNull } from '@/auth/session'

import './styles.css'

function RootLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  useEffect(() => {
    const onUnauthorized = () => {
      clearSession(queryClient)
      if (location.pathname === '/sign-in' || location.pathname === '/sign-up') {
        return
      }
      void navigate({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }

    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => {
      window.removeEventListener('auth:unauthorized', onUnauthorized)
    }
  }, [location.href, location.pathname, navigate, queryClient])

  return (
    <>
      <Outlet />
      {/* <TanStackRouterDevtools /> */}
    </>
  )
}

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardPage,
  beforeLoad: async ({ context, location }) => {
    const session = await getSessionOrNull(context.queryClient)
    if (!session) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }
  },
})

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/editor',
  component: EditorPage,
  beforeLoad: async ({ context, location }) => {
    const session = await getSessionOrNull(context.queryClient)
    if (!session) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }
  },
  validateSearch: (search: Record<string, unknown>) => ({
    jobId: (search.jobId as string) || undefined,
  }),
})

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  component: SignInPage,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string) || undefined,
  }),
  beforeLoad: async ({ context }) => {
    const session = await getSessionOrNull(context.queryClient)
    if (session) {
      throw redirect({ to: '/dashboard' })
    }
  },
})

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  component: SignUpPage,
  beforeLoad: async ({ context }) => {
    const session = await getSessionOrNull(context.queryClient)
    if (session) {
      throw redirect({ to: '/dashboard' })
    }
  },
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  editorRoute,
  signInRoute,
  signUpRoute,
])

const TanStackQueryProviderContext = TanStackQueryProvider.getContext()
const router = createRouter({
  routeTree,
  context: {
    ...TanStackQueryProviderContext,
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <TanStackQueryProvider.Provider {...TanStackQueryProviderContext}>
        <RouterProvider router={router} />
      </TanStackQueryProvider.Provider>
    </StrictMode>,
  )
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
