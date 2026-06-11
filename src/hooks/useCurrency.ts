import { useWorkspace } from '@/contexts/WorkspaceContext'
import { formatCurrency } from '@/lib/utils'

export function useCurrency() {
  const { currency, locale } = useWorkspace()
  return {
    format:   (amount: number) => formatCurrency(amount, currency, locale),
    currency,
    locale,
  }
}
