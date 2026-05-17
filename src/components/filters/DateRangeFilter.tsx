interface Props {
  label:  string
  from:   string
  to:     string
  onFrom: (v: string) => void
  onTo:   (v: string) => void
}

export default function DateRangeFilter({ label, from, to, onFrom, onTo }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          onChange={e => onFrom(e.target.value)}
          className="h-7 px-2 rounded-lg border border-[#E4E7EC] dark:border-[#26283A] bg-white dark:bg-[#13141A] text-[11.5px] text-[#101828] dark:text-[#ECEEF3] outline-none focus:border-[#6366F1] transition-colors"
        />
        <span className="text-[11px] text-[#98A2B3]">–</span>
        <input
          type="date"
          value={to}
          onChange={e => onTo(e.target.value)}
          className="h-7 px-2 rounded-lg border border-[#E4E7EC] dark:border-[#26283A] bg-white dark:bg-[#13141A] text-[11.5px] text-[#101828] dark:text-[#ECEEF3] outline-none focus:border-[#6366F1] transition-colors"
        />
      </div>
    </div>
  )
}
