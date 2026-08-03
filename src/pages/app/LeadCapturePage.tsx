import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, UserPlus, Archive, RefreshCw, Copy, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatDate } from '@/lib/utils'
import { useLeads, useArchiveLead, useUnarchiveLead } from '@/features/leads/hooks/useLeads'
import type { Lead } from '@/features/leads/schemas/lead.schema'
import ConvertLeadToContactModal from '@/features/leads/components/ConvertLeadToContactModal'
import { useLeadCaptureForm } from '@/features/forms/hooks/useForms'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

function EmbedPanel() {
  const { data: form, isLoading, isError, refetch } = useLeadCaptureForm()
  const [copied, setCopied] = useState(false)

  const shareUrl = form ? `${window.location.origin}/q/${form.token}` : ''
  const embedCode = form
    ? `<iframe\n  src="${shareUrl}"\n  width="100%"\n  height="640"\n  style="border:none;border-radius:12px;"\n  title="${form.title}"\n></iframe>`
    : ''

  function copyEmbed() {
    if (!embedCode) return
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Your embed code</p>
        {form && (
          <Link
            to={`/forms/${form.id}`}
            className="text-[12px] font-semibold text-[#3538CD] dark:text-indigo-400 hover:underline"
          >
            Customize fields
          </Link>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-[120px] w-full rounded-lg" />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8]">Couldn't load your embed code</p>
          <button
            onClick={() => refetch()}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF4FF] dark:bg-indigo-950/40 text-[#3538CD] dark:text-indigo-400 text-[12px] font-semibold hover:bg-[#E0EAFF] transition-colors"
          >
            <RefreshCw size={11} />
            Retry
          </button>
        </div>
      ) : (
        <div className="relative">
          <pre className="text-[11.5px] font-mono text-[#344054] dark:text-[#C2C8D8] bg-[#F9FAFB] dark:bg-[#1A1B23] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
            {embedCode}
          </pre>
          <button
            onClick={copyEmbed}
            className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-[#13141A] border border-[#E4E7EC] dark:border-[#26283A] text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
          >
            {copied ? <><CheckCheck size={11} className="text-[#027A48]" /> Copied!</> : <><Copy size={11} /> Copy</>}
          </button>
        </div>
      )}
    </div>
  )
}

export default function LeadCapturePage() {
  const { data, isLoading, isError, refetch } = useLeads({ limit: 200, hasSourceForm: true })
  const archiveMutation = useArchiveLead()
  const unarchiveMutation = useUnarchiveLead()
  const [convertLead, setConvertLead] = useState<Lead | null>(null)

  const leads = data?.items ?? []

  function handleDismiss(lead: Lead) {
    archiveMutation.mutate(lead.id, {
      onSuccess: () => {
        toast('Lead dismissed', {
          action: {
            label: 'Undo',
            onClick: () => unarchiveMutation.mutate(lead.id),
          },
        })
      },
    })
  }

  return (
    <div className="max-w-[900px] space-y-5">
      <div>
        <h1 className="text-[22px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight">Lead Capture</h1>
        <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
          Embed your form on your website, then review submissions and convert the ones worth pursuing.
        </p>
      </div>

      <EmbedPanel />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A]">
              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-14 bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A]">
          <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Couldn't load your leads</p>
          <button
            onClick={() => refetch()}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF4FF] dark:bg-indigo-950/40 text-[#3538CD] dark:text-indigo-400 text-[12px] font-semibold hover:bg-[#E0EAFF] transition-colors"
          >
            <RefreshCw size={11} />
            Retry
          </button>
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A]">
          <div className="w-12 h-12 rounded-2xl bg-[#F9FAFB] dark:bg-[#1A1B23] flex items-center justify-center mb-3">
            <Inbox size={20} className="text-[#D0D5DD] dark:text-[#3D4258]" />
          </div>
          <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">No submissions yet</p>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1 text-center max-w-[280px] leading-relaxed">
            Copy the embed code above and add it to your website to start collecting leads.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map(lead => (
            <div
              key={lead.id}
              className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3] truncate">
                  {lead.name}
                  {lead.company && <span className="text-[#98A2B3] dark:text-[#545C74] font-normal"> · {lead.company}</span>}
                </p>
                <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
                  {lead.sourceForm?.title ?? 'Website form'} · {formatDate(lead.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDismiss(lead)}
                  disabled={archiveMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#667085] dark:text-[#8B92A8] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] transition-colors disabled:opacity-50"
                >
                  <Archive size={12} />
                  Dismiss
                </button>
                <button
                  onClick={() => setConvertLead(lead)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF4FF] dark:bg-indigo-950/40 text-[#3538CD] dark:text-indigo-400 text-[12px] font-semibold hover:bg-[#E0EAFF] dark:hover:bg-indigo-950/60 transition-colors"
                >
                  <UserPlus size={12} />
                  Convert
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {convertLead && (
        <ConvertLeadToContactModal
          lead={convertLead}
          open={!!convertLead}
          onClose={() => setConvertLead(null)}
        />
      )}
    </div>
  )
}
