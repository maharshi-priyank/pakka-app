interface Props {
  size?:      number
  className?: string
}

export default function AIIcon({ size = 14, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Hexagon frame */}
      <path
        d="M7 1.2L12.2 4.1V9.9L7 12.8L1.8 9.9V4.1L7 1.2Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      {/* Center node */}
      <circle cx="7" cy="7" r="1.25" fill="currentColor" />
      {/* Subtle inner connectors — top, bottom-left, bottom-right */}
      <line x1="7"    y1="5.75" x2="7"    y2="3.6"  stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.45" strokeLinecap="round" />
      <line x1="5.92" y1="7.62" x2="4.05" y2="8.7"  stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.45" strokeLinecap="round" />
      <line x1="8.08" y1="7.62" x2="9.95" y2="8.7"  stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.45" strokeLinecap="round" />
    </svg>
  )
}
