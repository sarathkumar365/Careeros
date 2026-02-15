import type { ReactNode } from 'react'

interface InvertedButtonProps {
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  children: ReactNode
  className?: string
  ariaLabel?: string
  title?: string
  bgColor?: string
  textColor?: string
  hoverBgColor?: string
  hoverTextColor?: string
}

export function InvertedButton({
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  children,
  className = '',
  ariaLabel,
  title,
  bgColor = 'bg-black',
  textColor = 'text-gray-200',
  hoverBgColor = 'hover:bg-gray-200',
  hoverTextColor = 'hover:text-black',
}: InvertedButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      title={title || ariaLabel}
      className={`cursor-pointer ${bgColor} px-3 py-2 ${textColor} transition-all duration-200 ${hoverBgColor} ${hoverTextColor} focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none active:scale-96 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {loading && (
        <span
          className="mr-2 inline-block h-4 w-4 animate-spin border-2 border-gray-200/50 border-t-gray-200"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
}
