import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import {
  X, Video, Calendar, Clock, User, Briefcase, FileText,
  ExternalLink, Tag,
} from 'lucide-react'
import { EVENT_COLORS } from '../types'
import type { CalendarEvent } from '../types'

interface Props {
  event:   CalendarEvent | null
  onClose: () => void
}

const SOURCE_LABELS: Record<string, string> = {
  google:  'Google Calendar',
  outlook: 'Outlook',
  pakka:   'Pakka',
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024)
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 1024)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return mobile
}

export default function EventDetailSheet({ event, onClose }: Props) {
  const isMobile = useIsMobile()

  // Close on Escape
  useEffect(() => {
    if (!event) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [event, onClose])

  const sheetClass = isMobile
    ? 'fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden max-h-[88vh]'
    : 'fixed top-0 right-0 bottom-0 z-50 w-[340px] bg-white border-l border-[#EAECF0] shadow-xl flex flex-col overflow-hidden'

  const initial  = isMobile ? { y: '100%' } : { x: '100%' }
  const animate  = isMobile ? { y: 0 }      : { x: 0 }
  const exit     = isMobile ? { y: '100%' } : { x: '100%' }

  const sheetContent = event && (
    <>
      {/* Drag handle — mobile only */}
      {isMobile && (
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#D1D5DB]" />
        </div>
      )}

      {/* Header */}
      <div
        className="px-5 pt-4 pb-4 flex items-start justify-between gap-3 shrink-0"
        style={{ borderBottom: `2px solid ${EVENT_COLORS[event.type].border}` }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
              style={{ backgroundColor: EVENT_COLORS[event.type].bg, color: EVENT_COLORS[event.type].text }}
            >
              {event.type.replace(/_/g, ' ')}
            </span>
            {event.source !== 'pakka' && (
              <span className="text-[10px] font-semibold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
                {SOURCE_LABELS[event.source] ?? event.source}
              </span>
            )}
          </div>
          <h2 className="text-[15px] sm:text-[16px] font-black text-[#0F172A] leading-snug">{event.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#374151] transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {!event.allDay ? (
          <>
            <Row icon={<Calendar size={14} />} label="Date">
              {format(parseISO(event.start), 'EEEE, d MMMM yyyy')}
            </Row>
            <Row icon={<Clock size={14} />} label="Time">
              {format(parseISO(event.start), 'h:mm a')} – {format(parseISO(event.end), 'h:mm a')}
              <span className="ml-1.5 text-[#94A3B8]">
                ({differenceInMinutes(parseISO(event.end), parseISO(event.start))} min)
              </span>
            </Row>
          </>
        ) : (
          <Row icon={<Calendar size={14} />} label="Date">
            {format(parseISO(event.start), 'EEEE, d MMMM yyyy')}
            <span className="ml-2 text-[11px] font-semibold text-[#F59E0B] bg-[#FEF3C7] px-1.5 py-0.5 rounded-full">All day</span>
          </Row>
        )}

        {event.clientName && (
          <Row icon={<User size={14} />} label="Client">{event.clientName}</Row>
        )}
        {event.projectName && (
          <Row icon={<Briefcase size={14} />} label="Project">{event.projectName}</Row>
        )}
        {event.source !== 'pakka' && (
          <Row icon={<Tag size={14} />} label="Source">{SOURCE_LABELS[event.source] ?? event.source}</Row>
        )}
        {event.agenda && (
          <div>
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
              <FileText size={11} /> Agenda
            </div>
            <p className="text-[13px] text-[#374151] leading-relaxed whitespace-pre-wrap">{event.agenda}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {event.meetLink && (
        <div className="px-5 py-4 border-t border-[#EAECF0] shrink-0">
          <a
            href={event.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-[13.5px] font-semibold transition-all"
          >
            <Video size={15} />
            Join meeting
            <ExternalLink size={12} />
          </a>
        </div>
      )}
    </>
  )

  return (
    <AnimatePresence>
      {event && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className={sheetClass}
            initial={initial}
            animate={animate}
            exit={exit}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
          >
            {sheetContent}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <div className="shrink-0 w-5 h-5 flex items-center justify-center text-[#94A3B8] mt-0.5">{icon}</div>
      <div>
        <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-0.5">{label}</div>
        <div className="text-[13px] text-[#374151] font-medium">{children}</div>
      </div>
    </div>
  )
}
