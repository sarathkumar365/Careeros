import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuthSession } from '@/hooks/useAuthSession'

interface AppTopNavProps {
  rightSlot?: ReactNode
  showNavLinks?: boolean
}

const NAV_ITEM_BASE =
  'inline-flex h-8 items-center rounded-full px-3 text-xs font-medium transition'

function NavLink({ to, label }: { to: '/' | '/dashboard'; label: string }) {
  return (
    <Link
      to={to}
      className={`${NAV_ITEM_BASE} text-slate-600 hover:text-slate-900`}
      activeProps={{
        className: `${NAV_ITEM_BASE} bg-slate-900 text-white`,
      }}
      activeOptions={{ exact: true }}
    >
      {label}
    </Link>
  )
}

export function AppTopNav({
  rightSlot,
  showNavLinks = true,
}: AppTopNavProps) {
  const navigate = useNavigate()
  const { session, isAuthenticated, signOut, isSigningOut } = useAuthSession()
  const userName = session ? session.email.split('@')[0] : 'User'
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isMenuOpen) return

    const onClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return
      const targetNode = event.target as Node
      if (!menuRef.current.contains(targetNode)) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', onClickOutside)
    return () => {
      window.removeEventListener('mousedown', onClickOutside)
    }
  }, [isMenuOpen])

  const handleSignOut = async () => {
    try {
      await signOut()
    } finally {
      setIsMenuOpen(false)
      await navigate({ to: '/sign-in' })
    }
  }

  const authActions = isAuthenticated ? (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Profile menu"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
        >
          <UserRound size={14} />
        </button>
      </div>

      {isMenuOpen ? (
        <div className="absolute top-10 right-0 z-30 min-w-36 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg">
          <div className="px-2.5 py-1.5 text-xs font-medium text-slate-700">
            {userName}
          </div>
          <button
            type="button"
            onClick={() => {
              void handleSignOut()
            }}
            disabled={isSigningOut}
            className="inline-flex w-full items-center gap-2 rounded-full px-2.5 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60"
          >
            <LogOut size={13} />
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      ) : null}
    </div>
  ) : (
    <div className="flex items-center gap-1.5">
      <Link
        to="/sign-in"
        className="inline-flex h-8 items-center rounded-full border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
      >
        Sign in
      </Link>
      <Link
        to="/sign-up"
        className="inline-flex h-8 items-center rounded-full bg-slate-900 px-3 text-xs font-medium text-white transition hover:bg-slate-800"
      >
        Create account
      </Link>
    </div>
  )

  return (
    <header className="relative z-20 border-b border-slate-300/70 bg-[#f7f7f4]/95 backdrop-blur">
      <div className="w-full px-4 py-2.5 sm:px-8">
        <div className="grid w-full grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div className="justify-self-center text-sm font-semibold tracking-[0.12em] text-slate-900 uppercase sm:justify-self-start">
            careeros
          </div>

          <div className="flex items-center justify-center">
            {showNavLinks ? (
              <nav className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white/90 p-1">
                <NavLink to="/" label="Home" />
                <NavLink to="/dashboard" label="Dashboard" />
              </nav>
            ) : null}
          </div>

          <div className="flex items-center gap-2 justify-self-center sm:justify-self-end">
            {rightSlot}
            {authActions}
          </div>
        </div>
      </div>
    </header>
  )
}
