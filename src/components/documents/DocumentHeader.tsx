import { cn } from '@/lib/utils'

interface DocumentHeaderProps {
  logoUrl:       string | null
  senderName:    string
  senderEmail:   string
  gstNumber?:    string | null
  docType:       'Invoice' | 'Proposal' | 'Contract'
  docIdentifier: string
  docDate:       string
  statusBadge?:  React.ReactNode
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DocumentHeader({
  logoUrl, senderName, senderEmail, gstNumber,
  docType, docIdentifier, docDate, statusBadge,
}: DocumentHeaderProps) {
  const initial = senderName.charAt(0).toUpperCase()
  const isInvoice = docType === 'Invoice'

  return (
    <div
      className="flex items-center justify-between px-7 py-5 bg-[#F8F9FF] border-b border-[#EAECF0]"
      style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
    >
      {/* Left — logo / avatar + sender info */}
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={senderName}
            className="h-10 w-auto max-w-[140px] object-contain rounded-lg"
          />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-[#2563EB] flex items-center justify-center text-white text-[17px] font-bold shrink-0">
            {initial}
          </div>
        )}
        <div>
          <p className="text-[14px] font-bold text-[#101828] leading-snug">{senderName}</p>
          <p className="text-[11px] text-[#667085]">{senderEmail}</p>
          {gstNumber && (
            <p className="text-[10px] text-[#98A2B3] mt-0.5">GST: {gstNumber}</p>
          )}
        </div>
      </div>

      {/* Right — doc type, identifier, date, status */}
      <div className="text-right">
        <p className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-widest mb-1">
          {docType}
        </p>
        <p className={cn(
          'font-extrabold text-[#101828] leading-snug',
          isInvoice ? 'text-[19px]' : 'text-[15px] max-w-[200px]',
        )}>
          {docIdentifier}
        </p>
        <p className="text-[11px] text-[#667085] mt-1">{fmtDate(docDate)}</p>
        {statusBadge && <div className="mt-1.5">{statusBadge}</div>}
      </div>
    </div>
  )
}
