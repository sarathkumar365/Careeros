import type { ReactNode } from 'react'

interface PageHeaderProps {
  left?: ReactNode
  center?: ReactNode
  right?: ReactNode
  backgroundColor?: string
}

export function PageHeader({
  left,
  center,
  right,
  backgroundColor = '#fafafa',
}: PageHeaderProps) {
  return (
    <header
      className="relative z-20 grid grid-cols-3 items-center border-b"
      style={{ backgroundColor }}
    >
      <div className="justify-self-start">{left}</div>
      <div className="justify-self-center text-center">{center}</div>
      <div className="flex items-center justify-self-end">{right}</div>
    </header>
  )
}
