import type { ReactNode } from 'react'

interface InvertedCircleButtonProps {
  onClick: () => void
  children: ReactNode
  className?: string
  ariaLabel?: string
  variant?: 'light' | 'dark'
  bordered?: boolean
}

export function InvertedCircleButton({
  onClick,
  children,
  className = '',
  ariaLabel,
  variant = 'light',
  bordered = true,
}: InvertedCircleButtonProps) {
  const variantClasses =
    variant === 'dark'
      ? 'bg-black text-white border-white hover:bg-white hover:text-black'
      : 'bg-white border-black hover:bg-black hover:text-white'

  const borderClass = bordered ? 'border' : ''

  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full p-1.5 transition-colors ${borderClass} ${variantClasses} ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}
