import { IndianRupee } from 'lucide-react'

interface Props {
  min:   string
  max:   string
  onMin: (v: string) => void
  onMax: (v: string) => void
}

export default function AmountRangeFilter({ min, max, onMin, onMax }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">Amount</p>
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none" />
          <input
            type="number"
            min={0}
            value={min}
            onChange={e => onMin(e.target.value)}
            placeholder="Min"
            className="h-7 w-24 pl-5 pr-2 rounded-lg border border-[#E4E7EC] dark:border-[#26283A] bg-white dark:bg-[#13141A] text-[11.5px] text-[#101828] dark:text-[#ECEEF3] placeholder:text-[#98A2B3] outline-none focus:border-[#6366F1] transition-colors"
          />
        </div>
        <span className="text-[11px] text-[#98A2B3]">–</span>
        <div className="relative">
          <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none" />
          <input
            type="number"
            min={0}
            value={max}
            onChange={e => onMax(e.target.value)}
            placeholder="Max"
            className="h-7 w-24 pl-5 pr-2 rounded-lg border border-[#E4E7EC] dark:border-[#26283A] bg-white dark:bg-[#13141A] text-[11.5px] text-[#101828] dark:text-[#ECEEF3] placeholder:text-[#98A2B3] outline-none focus:border-[#6366F1] transition-colors"
          />
        </div>
      </div>
    </div>
  )
}
