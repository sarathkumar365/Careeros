import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

interface AppTopNavProps {
  rightSlot?: ReactNode
  showNavLinks?: boolean
}

function NavLink({ to, label }: { to: '/' | '/dashboard'; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-full border border-transparent px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
      activeProps={{
        className:
          'rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm',
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
  return (
    <header className="relative z-20 border-b border-slate-200/70 bg-[#f7f7f4]/95 backdrop-blur">
      <div className="w-full px-4 py-4 sm:px-8">
        <div className="grid w-full grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div className="justify-self-center text-sm font-semibold tracking-[0.08em] text-slate-900 uppercase sm:justify-self-start">
            careeros
          </div>

          <div className="flex items-center justify-center">
            {showNavLinks ? (
              <nav className="flex items-center justify-center gap-2">
                <NavLink to="/" label="Home" />
                <NavLink to="/dashboard" label="Dashboard" />
              </nav>
            ) : null}
          </div>

          <div className="justify-self-center sm:justify-self-end">
            {rightSlot}
          </div>
        </div>
      </div>
    </header>
  )
}
