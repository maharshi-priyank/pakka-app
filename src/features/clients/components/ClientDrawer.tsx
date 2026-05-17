import { useState } from 'react'
import { X, FileText, FileSignature, Receipt, Building2, Mail, Phone, MapPin, Hash, Link2, RotateCcw, Copy, CheckCheck, Video } from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useClient, useRegeneratePortalToken } from '../hooks/useClients'
import ScheduleCallModal from '@/features/meetings/components/ScheduleCallModal'

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-[#F2F4F7] text-[#344054]',
  SENT:      'bg-[#EFF6FF] text-[#2563EB]',
  OPENED:    'bg-[#FFFAEB] text-[#B54708]',
  ACCEPTED:  'bg-[#ECFDF3] text-[#027A48]',
  DECLINED:  'bg-[#FEF3F2] text-[#B42318]',
  EXPIRED:   'bg-[#F2F4F7] text-[#667085]',
  SIGNED:    'bg-[#ECFDF3] text-[#027A48]',
  PAID:      'bg-[#ECFDF3] text-[#027A48]',
  OVERDUE:   'bg-[#FEF3F2] text-[#B42318]',
  PARTIAL:   'bg-[#FFFAEB] text-[#B54708]',
  CANCELLED: 'bg-[#F2F4F7] text-[#667085]',
  VIEWED:    'bg-[#FFFAEB] text-[#B54708]',
}

interface Props {
  clientId: string
  onClose: () => void
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] rounded', className)} />
}

export default function ClientDrawer({ clientId, onClose }: Props) {
  const { data: client, isLoading } = useClient(clientId)
  const regenerate = useRegeneratePortalToken()
  const [copied, setCopied]             = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const appUrl     = (import.meta.env.VITE_API_URL as string).replace('/api/v1', '')
  const portalUrl  = client?.portalToken ? `${appUrl}/portal/${client.portalToken}` : null

  function copyPortalLink() {
    if (!portalUrl) return
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRegenerate() {
    await regenerate.mutateAsync(clientId)
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20 anim-fade" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-white h-full flex flex-col shadow-2xl overflow-hidden anim-slide-right">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAECF0] shrink-0">
          {isLoading ? (
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          ) : (
            <div>
              <h2 className="text-[15px] font-bold text-[#101828]">{client?.name}</h2>
              {client?.company && <p className="text-[12px] text-[#667085]">{client.company}</p>}
            </div>
          )}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => setScheduleOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EAECF0] text-[12px] font-semibold text-[#344054] hover:bg-[#F4F5F8] transition-colors"
            >
              <Video size={12} /> Schedule Call
            </button>
            <button onClick={onClose} className="text-[#98A2B3] hover:text-[#344054] transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isLoading ? (
            <LoadingSkeleton />
          ) : client ? (
            <>
              {/* Contact info */}
              <div className="card p-4 space-y-2.5">
                {client.email && (
                  <InfoRow icon={Mail} label={client.email} />
                )}
                {client.phone && (
                  <InfoRow icon={Phone} label={client.phone} />
                )}
                {client.state && (
                  <InfoRow icon={MapPin} label={client.state} />
                )}
                {client.gstNumber && (
                  <InfoRow icon={Hash} label={client.gstNumber} mono />
                )}
                {!client.email && !client.phone && !client.state && !client.gstNumber && (
                  <p className="text-[12px] text-[#98A2B3]">No contact details added.</p>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard icon={FileText} label="Proposals" count={client._count?.proposals ?? 0} color="text-[#2563EB]" bg="bg-[#EFF6FF]" />
                <StatCard icon={FileSignature} label="Contracts" count={client._count?.contracts ?? 0} color="text-[#5925DC]" bg="bg-[#F4F3FF]" />
                <StatCard icon={Receipt} label="Invoices" count={client._count?.invoices ?? 0} color="text-[#027A48]" bg="bg-[#ECFDF3]" />
              </div>

              {/* Proposals */}
              {client.proposals.length > 0 && (
                <Section title="Proposals" icon={FileText}>
                  {client.proposals.map(p => (
                    <RelationRow
                      key={p.id}
                      title={p.title}
                      sub={formatDate(p.createdAt)}
                      right={formatCurrency(parseFloat(p.totalAmount))}
                      status={p.status}
                    />
                  ))}
                </Section>
              )}

              {/* Contracts */}
              {client.contracts.length > 0 && (
                <Section title="Contracts" icon={FileSignature}>
                  {client.contracts.map(c => (
                    <RelationRow
                      key={c.id}
                      title={c.title}
                      sub={formatDate(c.createdAt)}
                      status={c.status}
                    />
                  ))}
                </Section>
              )}

              {/* Invoices */}
              {client.invoices.length > 0 && (
                <Section title="Invoices" icon={Receipt}>
                  {client.invoices.map(inv => (
                    <RelationRow
                      key={inv.id}
                      title={inv.invoiceNumber}
                      sub={inv.dueDate ? `Due ${formatDate(inv.dueDate)}` : formatDate(inv.createdAt)}
                      right={formatCurrency(parseFloat(inv.total))}
                      status={inv.status}
                    />
                  ))}
                </Section>
              )}

              {client.proposals.length === 0 && client.contracts.length === 0 && client.invoices.length === 0 && (
                <div className="card p-6 text-center">
                  <Building2 size={28} className="text-[#D0D5DD] mx-auto mb-2" />
                  <p className="text-[13px] text-[#98A2B3]">No proposals, contracts, or invoices yet.</p>
                </div>
              )}

              {/* Client Portal */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Link2 size={13} className="text-[#667085]" />
                  <h3 className="text-[12px] font-bold text-[#344054] uppercase tracking-wide">Client Portal</h3>
                </div>
                <div className="card p-4 space-y-3">
                  {portalUrl ? (
                    <>
                      <p className="text-[11.5px] text-[#667085] font-mono bg-[#F4F5F8] rounded-lg px-3 py-2 truncate select-all">
                        {portalUrl}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={copyPortalLink}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6366F1] text-white text-[12px] font-semibold hover:bg-[#4F46E5] transition-colors"
                        >
                          {copied ? <><CheckCheck size={12} /> Copied!</> : <><Copy size={12} /> Copy link</>}
                        </button>
                        <button
                          onClick={handleRegenerate}
                          disabled={regenerate.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EAECF0] text-[12px] font-semibold text-[#667085] hover:bg-[#F4F5F8] hover:text-[#344054] transition-colors disabled:opacity-50"
                        >
                          <RotateCcw size={12} className={regenerate.isPending ? 'animate-spin' : ''} />
                          Regenerate
                        </button>
                      </div>
                      <p className="text-[11px] text-[#98A2B3]">Share this link with {client.name} so they can view all their documents in one place.</p>
                    </>
                  ) : (
                    <button
                      onClick={handleRegenerate}
                      disabled={regenerate.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF2FF] text-[#4338CA] text-[12px] font-semibold hover:bg-[#E0E7FF] transition-colors"
                    >
                      <Link2 size={12} />
                      Generate portal link
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <ScheduleCallModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        clientId={clientId}
        defaultTitle={client ? `Discovery call with ${client.name}` : ''}
      />
    </div>
  )
}

function InfoRow({ icon: Icon, label, mono }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={13} className="text-[#98A2B3] shrink-0" />
      <span className={cn('text-[13px] text-[#344054]', mono && 'font-mono tracking-wide')}>{label}</span>
    </div>
  )
}

function StatCard({ icon: Icon, label, count, color, bg }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; count: number; color: string; bg: string }) {
  return (
    <div className="card p-3 text-center space-y-1.5">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mx-auto', bg)}>
        <Icon size={14} className={color} />
      </div>
      <p className="text-[18px] font-bold text-[#101828]">{count}</p>
      <p className="text-[11px] text-[#98A2B3]">{label}</p>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={13} className="text-[#667085]" />
        <h3 className="text-[12px] font-bold text-[#344054] uppercase tracking-wide">{title}</h3>
      </div>
      <div className="card divide-y divide-[#F2F4F7]">{children}</div>
    </div>
  )
}

function RelationRow({ title, sub, right, status }: { title: string; sub: string; right?: string; status: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[#101828] truncate">{title}</p>
        <p className="text-[11px] text-[#98A2B3]">{sub}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {right && <span className="text-[12px] font-semibold text-[#344054]">{right}</span>}
        <span className={cn('text-[10.5px] font-semibold px-2 py-0.5 rounded-full', STATUS_COLORS[status] ?? 'bg-[#F2F4F7] text-[#344054]')}>
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </span>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="card p-4 space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-4 w-full" />)}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="card divide-y divide-[#F2F4F7]">
          {[1, 2].map(i => <Skeleton key={i} className="h-14 rounded-none" />)}
        </div>
      </div>
    </div>
  )
}
