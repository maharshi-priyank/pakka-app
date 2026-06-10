import { useState } from 'react'
import { Loader2, Tag } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

async function redeemPromo(code: string): Promise<{ plan: string; expiresAt: string | null }> {
  const { data } = await api.post<{ data: { plan: string; expiresAt: string | null } }>(
    '/users/redeem-promo',
    { code },
  )
  return data.data
}

export default function PromoCodeInput() {
  const [code, setCode] = useState('')
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: redeemPromo,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      toast.success(`${result.plan} plan activated. No billing — this is a gifted access code.`)
      setCode('')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Invalid or expired promo code'
      toast.error(msg)
    },
  })

  return (
    <div className="bg-white dark:bg-[#1A1B27] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Tag size={14} className="text-[#6366F1]" />
        <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Have a promo code?</p>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter code"
          className="flex-1 h-9 px-3 text-[13px] rounded-lg border border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#21222D] text-[#101828] dark:text-[#ECEEF3] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
          disabled={isPending}
        />
        <button
          onClick={() => code.trim() && mutate(code.trim())}
          disabled={isPending || !code.trim()}
          className="h-9 px-4 rounded-lg bg-[#6366F1] text-white text-[12px] font-semibold hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : null}
          Apply
        </button>
      </div>
    </div>
  )
}
