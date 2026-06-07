export type CalendarEventType =
  | 'meeting'
  | 'project_deadline'
  | 'google_external'
  | 'outlook_external'

export type CalendarEventSource = 'pakka' | 'google' | 'outlook'

export type CalendarView = 'day' | 'week' | 'month'

export interface CalendarEvent {
  id:           string
  type:         CalendarEventType
  title:        string
  start:        string
  end:          string
  allDay:       boolean
  clientName?:  string
  projectName?: string
  meetLink?:    string
  agenda?:      string
  source:       CalendarEventSource
}

export const EVENT_COLORS: Record<CalendarEventType, { bg: string; border: string; text: string }> = {
  meeting:          { bg: '#EEF2FF', border: '#6366F1', text: '#4338CA' },
  project_deadline: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
  google_external:  { bg: '#DCFCE7', border: '#16A34A', text: '#14532D' },
  outlook_external: { bg: '#E0F2FE', border: '#0284C7', text: '#0C4A6E' },
}
