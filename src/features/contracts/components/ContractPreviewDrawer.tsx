import { useNavigate } from 'react-router-dom'
import { IndianRupee, User, Briefcase, Calendar, CheckCircle, FileText } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import DocumentPreviewDrawer from '@/components/shared/DocumentPreviewDrawer'
import { useContract } from '../hooks/useContracts'

function fmt(v: string | number) {
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT:    'bg-[#F2F4F7] text-[#344054]',
  SENT:     'bg-[#EFF6FF] text-[#2563EB]',
  SIGNED:   'bg-[#ECFDF3] text-[#027A48]',
  DECLINED: 'bg-[#FEF3F2] text-[#B42318]',
  VOID:     'bg-[#F2F4F7] text-[#667085]',
}

interface Props {
  id: string | null
  onClose: () => void
}

export default function ContractPreviewDrawer({ id, onClose }: Props) {
  const navigate = useNavigate()
  const { data: contract, isLoading } = useContract(id)

  const open = !!id

  const content       = contract?.content
  const clauses       = content?.clauses       ?? []
  const scopeItems    = content?.scopeItems    ?? []
  const deliverables  = content?.deliverables  ?? []
  const paySchedule   = content?.paymentSchedule ?? []
  const totalAmount   = content?.totalAmount   ?? 0
  const gstAmount     = content?.gstAmount     ?? 0

  const clientName = contract?.client?.name ?? undefined
  const clientCo   = contract?.client?.company ?? undefined

  const statusBadge = contract ? (
    <span className={cn(
      'text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0',
      STATUS_STYLES[contract.status] ?? 'bg-[#F2F4F7] text-[#344054]',
    )}>
      {contract.status.charAt(0) + contract.status.slice(1).toLowerCase()}
    </span>
  ) : undefined

  const metaRow = contract ? (
    <>
      {clientName && (
        <span className="flex items-center gap-1 text-[11.5px] text-[#667085] dark:text-[#8B92A8]">
          <User size={11} className="shrink-0" />
          {clientName}{clientCo ? ` · ${clientCo}` : ''}
        </span>
      )}
      {contract.project && (
        <span className="flex items-center gap-1 text-[11.5px] text-[#667085] dark:text-[#8B92A8]">
          <Briefcase size={11} className="shrink-0" />
          {contract.project.name}
        </span>
      )}
      <span className="flex items-center gap-1 text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">
        <Calendar size={11} className="shrink-0" />
        {formatDate(contract.createdAt)}
      </span>
    </>
  ) : undefined

  return (
    <DocumentPreviewDrawer
      open={open}
      onClose={onClose}
      onEdit={contract ? () => { onClose(); navigate(`/contracts/${contract.id}`) } : undefined}
      title={contract?.title ?? 'Contract'}
      statusBadge={statusBadge}
      metaRow={metaRow}
      editLabel="Edit Contract"
      isLoading={isLoading || (open && !contract)}
    >
      {contract && (
        <div className="px-5 py-5 space-y-6">

          {/* Amount summary */}
          {totalAmount > 0 && (
            <div className="bg-[#F8F9FF] dark:bg-[#1A1B2E] border border-[#E0E4FF] dark:border-[#2D3060] rounded-xl p-4">
              <div className="flex items-baseline gap-1">
                <IndianRupee size={14} className="text-[#3538CD] dark:text-indigo-400 shrink-0 mb-0.5" strokeWidth={2.5} />
                <span className="text-[26px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tabular-nums leading-none">
                  {fmt(totalAmount)}
                </span>
              </div>
              {gstAmount > 0 && (
                <p className="text-[11.5px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
                  incl. GST ₹{fmt(gstAmount)}
                </p>
              )}
              {contract.signedAt && (
                <div className="flex items-center gap-1 mt-3 text-[11.5px] text-[#027A48] dark:text-emerald-400">
                  <CheckCircle size={11} /> Signed {formatDate(contract.signedAt)}
                </div>
              )}
            </div>
          )}

          {/* Intro / project description */}
          {content?.intro && (
            <Section title="Introduction">
              <p className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8] leading-relaxed whitespace-pre-line">{content.intro}</p>
            </Section>
          )}
          {content?.projectDescription && (
            <Section title="Project Description">
              <p className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8] leading-relaxed whitespace-pre-line">{content.projectDescription}</p>
            </Section>
          )}

          {/* Scope items */}
          {scopeItems.length > 0 && (
            <Section title="Scope of Work">
              <div className="space-y-2">
                {scopeItems.map((s, i) => (
                  <div key={i}>
                    <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8]">{s.title}</p>
                    {s.description && <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5 leading-relaxed">{s.description}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Deliverables */}
          {deliverables.length > 0 && (
            <Section title="Deliverables">
              <ul className="space-y-1">
                {deliverables.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] text-[#344054] dark:text-[#C2C8D8]">
                    <span className="text-[#3538CD] dark:text-indigo-400 mt-0.5 shrink-0">→</span>
                    <span>{d.item}{d.format ? <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] ml-1.5">({d.format})</span> : null}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Payment schedule */}
          {paySchedule.length > 0 && (
            <Section title="Payment Schedule">
              <div className="space-y-2">
                {paySchedule.map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-[#F2F4F7] dark:border-[#26283A] last:border-0">
                    <div>
                      <p className="text-[12.5px] font-medium text-[#344054] dark:text-[#C2C8D8]">{m.milestone}</p>
                      {m.dueOn && <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">{m.dueOn}</p>}
                    </div>
                    <span className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3] tabular-nums">₹{fmt(m.amount)}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Clauses */}
          {clauses.length > 0 && (
            <Section title="Contract Clauses">
              <div className="space-y-4">
                {clauses.map((c, i) => (
                  <div key={i}>
                    <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
                      {i + 1}. {c.title}
                    </p>
                    <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-1.5 leading-relaxed whitespace-pre-line">{c.body}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Signer info */}
          {(content?.signerName || content?.signerEmail) && (
            <Section title="Signing Details">
              {content.signerName && <p className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8]">Name: {content.signerName}</p>}
              {content.signerEmail && <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5">{content.signerEmail}</p>}
              {content.signerPhone && <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5">{content.signerPhone}</p>}
            </Section>
          )}

          {/* No content fallback */}
          {clauses.length === 0 && scopeItems.length === 0 && !content?.intro && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText size={28} className="text-[#D0D5DD] dark:text-[#3D4258] mb-3" />
              <p className="text-[13px] text-[#667085] dark:text-[#8B92A8]">No content added yet</p>
            </div>
          )}

        </div>
      )}
    </DocumentPreviewDrawer>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-widest mb-3">{title}</h3>
      {children}
    </div>
  )
}
