import { Video, AlertCircle } from 'lucide-react'
import { EVENT_COLORS } from '../types'
import type { CalendarEvent } from '../types'

interface Props {
  event:   CalendarEvent
  onClick: (event: CalendarEvent) => void
  compact?: boolean
}

export default function EventChip({ event, onClick, compact = false }: Props) {
  const colors = EVENT_COLORS[event.type]

  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(event) }}
      className="w-full text-left rounded px-1.5 truncate flex items-center gap-1 hover:opacity-80 transition-opacity"
      style={{
        backgroundColor: colors.bg,
        borderLeft:      `2.5px solid ${colors.border}`,
        color:           colors.text,
        fontSize:        compact ? 11 : 12,
        fontWeight:      500,
        paddingTop:      compact ? 1 : 2,
        paddingBottom:   compact ? 1 : 2,
        lineHeight:      1.35,
      }}
    >
      {event.type === 'meeting' && (
        <Video size={compact ? 9 : 10} style={{ flexShrink: 0 }} />
      )}
      {event.type === 'project_deadline' && (
        <AlertCircle size={compact ? 9 : 10} style={{ flexShrink: 0 }} />
      )}
      <span className="truncate">{event.title}</span>
    </button>
  )
}
