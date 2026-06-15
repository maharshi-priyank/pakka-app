import { createContext, useContext, type ReactNode } from 'react'
import { useProfile } from '@/features/settings/hooks/useProfile'
import { getCountryDefaults, type BankFieldType } from '@/lib/countryDefaults'

export interface WorkspaceSettings {
  country:    string
  currency:   string
  locale:     string
  taxLabel:   string
  taxRate:    number
  bankFields: BankFieldType
  isIndia:    boolean
}

const WorkspaceContext = createContext<WorkspaceSettings>({
  country:    'IN',
  currency:   'INR',
  locale:     'en-IN',
  taxLabel:   'GST',
  taxRate:    18,
  bankFields: 'india',
  isIndia:    true,
})

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile()

  const ws       = profile?.activeWorkspace
  const country  = ws?.country  ?? profile?.country  ?? 'IN'
  const defaults = getCountryDefaults(country)
  const currency = ws?.currency ?? profile?.currency ?? defaults.currency
  const taxLabel = ws?.taxLabel ?? profile?.taxLabel ?? defaults.taxLabel

  const value: WorkspaceSettings = {
    country,
    currency,
    locale:     defaults.locale,
    taxLabel,
    taxRate:    defaults.taxRate,
    bankFields: defaults.bankFields,
    isIndia:    country === 'IN',
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceSettings {
  return useContext(WorkspaceContext)
}
