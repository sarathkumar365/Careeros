import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose?: () => void
  children: ReactNode
  actions?: ReactNode
  leftActions?: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({
  open,
  onClose,
  children,
  actions,
  leftActions,
  maxWidth = 'md',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }

    if (open) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const widthClass =
    maxWidth === 'sm'
      ? 'w-96'
      : maxWidth === 'lg'
        ? 'w-[600px]'
        : maxWidth === 'xl'
          ? 'w-full max-w-5xl'
          : 'w-[500px]'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[90vh] flex-col border-2 ${widthClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto bg-white p-7">{children}</div>
        {(actions || leftActions) && (
          <div className="flex justify-between border-t-2 bg-white">
            <div>{leftActions}</div>
            <div>{actions}</div>
          </div>
        )}
      </div>
    </div>
  )
}
