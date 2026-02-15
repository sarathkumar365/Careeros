interface KeywordBadgeProps {
  keyword: string
  isFulfilled: boolean
  isSelected?: boolean
  onClick?: () => void
}

export function KeywordBadge({
  keyword,
  isFulfilled,
  isSelected = false,
  onClick,
}: KeywordBadgeProps) {
  // Fulfilled keywords are not clickable
  const isClickable = !isFulfilled
  const handleClick = isClickable ? onClick : undefined

  const getClassName = () => {
    if (isFulfilled) {
      return 'bg-green-100 text-green-800 cursor-default border-green-800'
    }
    const baseStyle =
      'bg-gray-100 text-gray-500 border-2 cursor-pointer hover:bg-gray-200'
    if (isSelected) {
      return baseStyle + ' border-green-500'
    }
    return baseStyle + ' border-gray-100'
  }

  return (
    <span
      onClick={handleClick}
      className={`inline-flex items-center justify-center px-3 py-1 text-xs transition-all ${getClassName()} `}
    >
      {keyword}
    </span>
  )
}
