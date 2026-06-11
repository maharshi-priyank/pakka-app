# Internationalisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a country + currency workspace setting that cascades through formatting, tax labels, bank fields, PDFs, and billing so international users can use ClearWork without friction, while India stays the default with zero change for existing users.

**Architecture:** A `country` field on `Profile` (null → treated as `'IN'`) drives per-country defaults (currency, tax label, bank field layout) via a shared static config. A React `WorkspaceContext` holds these settings app-wide; a `useCurrency()` hook returns a bound formatter. Stripe handles subscription billing for non-IN users; Cashfree remains unchanged for IN.

**Tech Stack:** NestJS + Prisma (backend), React + TanStack Query v5 + Tailwind (frontend), Stripe Node SDK (billing), `Intl.NumberFormat` (currency formatting)

---

## Task 1: Prisma schema — add internationalisation fields to Profile

**Files:**
- Modify: `pakka-api/prisma/schema.prisma`

- [ ] **Step 1: Add 6 new nullable fields to the `Profile` model**

Open `pakka-api/prisma/schema.prisma`. Find the `Profile` model (around line 35). After the `upiId` field, add:

```prisma
  country       String?
  currency      String?
  taxLabel      String?
  ibanNumber    String?
  swiftCode     String?
  routingNumber String?
```

- [ ] **Step 2: Generate and run the migration**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma migrate dev --name add_internationalisation_fields
```

Expected: migration created and applied, no errors.

- [ ] **Step 3: Verify the schema change compiles**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client` message, no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add country/currency/taxLabel/iban/swift/routing fields to Profile"
```

---

## Task 2: Country defaults config (shared lib — create in both repos)

**Files:**
- Create: `pakka-api/src/lib/countryDefaults.ts`
- Create: `pakka-app/src/lib/countryDefaults.ts`

- [ ] **Step 1: Create the shared config in the API**

Create `pakka-api/src/lib/countryDefaults.ts`:

```typescript
export type BankFieldType = 'india' | 'iban' | 'routing' | 'bsb' | 'generic'

export interface CountryDefaults {
  currency:   string
  taxLabel:   string
  taxRate:    number
  bankFields: BankFieldType
  locale:     string
  dateFormat: string
}

export const COUNTRY_DEFAULTS: Record<string, CountryDefaults> = {
  IN: { currency: 'INR', taxLabel: 'GST',      taxRate: 18, bankFields: 'india',   locale: 'en-IN', dateFormat: 'DD/MM/YYYY' },
  US: { currency: 'USD', taxLabel: 'Sales Tax', taxRate: 0,  bankFields: 'routing', locale: 'en-US', dateFormat: 'MM/DD/YYYY' },
  GB: { currency: 'GBP', taxLabel: 'VAT',       taxRate: 20, bankFields: 'iban',    locale: 'en-GB', dateFormat: 'DD/MM/YYYY' },
  AU: { currency: 'AUD', taxLabel: 'GST',       taxRate: 10, bankFields: 'bsb',     locale: 'en-AU', dateFormat: 'DD/MM/YYYY' },
  CA: { currency: 'CAD', taxLabel: 'GST/HST',   taxRate: 5,  bankFields: 'routing', locale: 'en-CA', dateFormat: 'DD/MM/YYYY' },
  AE: { currency: 'AED', taxLabel: 'VAT',       taxRate: 5,  bankFields: 'iban',    locale: 'en-AE', dateFormat: 'DD/MM/YYYY' },
  SG: { currency: 'SGD', taxLabel: 'GST',       taxRate: 9,  bankFields: 'generic', locale: 'en-SG', dateFormat: 'DD/MM/YYYY' },
}

export const GENERIC_DEFAULTS: CountryDefaults = {
  currency: 'USD', taxLabel: 'Tax', taxRate: 0, bankFields: 'generic', locale: 'en-US', dateFormat: 'DD/MM/YYYY',
}

export function getCountryDefaults(country: string | null | undefined): CountryDefaults {
  if (!country || country === 'IN') return COUNTRY_DEFAULTS['IN']
  return COUNTRY_DEFAULTS[country] ?? GENERIC_DEFAULTS
}
```

- [ ] **Step 2: Create identical config in the app**

Create `pakka-app/src/lib/countryDefaults.ts` with the exact same content as above.

- [ ] **Step 3: Compile-check the API lib**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit both**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add src/lib/countryDefaults.ts
git commit -m "feat: add countryDefaults shared config"

cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/lib/countryDefaults.ts
git commit -m "feat: add countryDefaults shared config"
```

---

## Task 3: Backend — wire country into profile DTO and service responses

**Files:**
- Modify: `pakka-api/src/modules/users/dto/upsert-user.dto.ts`
- Modify: `pakka-api/src/modules/users/users.service.ts`

- [ ] **Step 1: Add new fields to `UpdateUserDto`**

In `pakka-api/src/modules/users/dto/upsert-user.dto.ts`, add these fields to `UpdateUserDto` after the existing `upiId` field:

```typescript
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ibanNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  swiftCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  routingNumber?: string;
```

- [ ] **Step 2: Find the `getMe` / profile response in users.service.ts**

```bash
grep -n "getMe\|findProfile\|getProfile\|select\|profile\b" /Users/mvaghela/Documents/MyProjects/pakka-api/src/modules/users/users.service.ts | head -30
```

- [ ] **Step 3: Add new fields to the profile `select` clause**

In `users.service.ts`, find the Prisma `select` block that returns the profile. Add these fields to it:

```typescript
country:       true,
currency:      true,
taxLabel:      true,
ibanNumber:    true,
swiftCode:     true,
routingNumber: true,
```

- [ ] **Step 4: Default null `country` to `'IN'` in the returned profile**

In the same service method, after fetching the profile, add a country default before returning:

```typescript
// Treat null country as India (backward compat for existing users)
if (profile && profile.country == null) {
  (profile as any).country = 'IN';
}
```

Or if the service maps the response, set it in the mapping:
```typescript
country: profile.country ?? 'IN',
```

- [ ] **Step 5: Add new fields to the `update` Prisma call**

In the `updateMe` / `updateProfile` method, ensure the new fields are passed through from `dto` to `prisma.profile.update`:

```typescript
...(dto.country      !== undefined && { country:       dto.country      || null }),
...(dto.currency     !== undefined && { currency:       dto.currency     || null }),
...(dto.taxLabel     !== undefined && { taxLabel:       dto.taxLabel     || null }),
...(dto.ibanNumber   !== undefined && { ibanNumber:     dto.ibanNumber   || null }),
...(dto.swiftCode    !== undefined && { swiftCode:      dto.swiftCode    || null }),
...(dto.routingNumber!== undefined && { routingNumber:  dto.routingNumber|| null }),
```

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/users/dto/upsert-user.dto.ts src/modules/users/users.service.ts
git commit -m "feat: expose country/currency/taxLabel/bank fields in user profile API"
```

---

## Task 4: Frontend — WorkspaceContext + useCurrency hook

**Files:**
- Create: `pakka-app/src/contexts/WorkspaceContext.tsx`
- Create: `pakka-app/src/hooks/useCurrency.ts`
- Modify: `pakka-app/src/lib/utils.ts` — make `formatCurrency` locale-aware with backward-compat defaults
- Modify: `pakka-app/src/main.tsx` (or app root) — wrap with `WorkspaceProvider`

- [ ] **Step 1: Update `formatCurrency` in utils.ts to be locale-aware**

Open `pakka-app/src/lib/utils.ts`. Replace the existing `formatCurrency`:

```typescript
export function formatCurrency(amount: number, currency = 'INR', locale = 'en-IN'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}
```

This is fully backward-compatible — all existing call sites with no params continue to produce Indian formatting.

- [ ] **Step 2: Add `UserProfile` fields to the profile type in `useProfile.ts`**

Open `pakka-app/src/features/settings/hooks/useProfile.ts`. Add to the `UserProfile` interface:

```typescript
  country:       string | null
  currency:      string | null
  taxLabel:      string | null
  ibanNumber:    string | null
  swiftCode:     string | null
  routingNumber: string | null
```

- [ ] **Step 3: Create `WorkspaceContext.tsx`**

Create `pakka-app/src/contexts/WorkspaceContext.tsx`:

```typescript
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

  const country  = profile?.country  ?? 'IN'
  const defaults = getCountryDefaults(country)
  const currency = profile?.currency ?? defaults.currency
  const taxLabel = profile?.taxLabel ?? defaults.taxLabel

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
```

- [ ] **Step 4: Create `useCurrency.ts` hook**

Create `pakka-app/src/hooks/useCurrency.ts`:

```typescript
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { formatCurrency } from '@/lib/utils'

export function useCurrency() {
  const { currency, locale } = useWorkspace()
  return {
    format: (amount: number) => formatCurrency(amount, currency, locale),
    currency,
    locale,
  }
}
```

- [ ] **Step 5: Wrap the app with `WorkspaceProvider`**

Open `pakka-app/src/main.tsx` (or wherever the React app is bootstrapped). Check the existing provider tree:

```bash
grep -n "Provider\|render\|createRoot" /Users/mvaghela/Documents/MyProjects/pakka-app/src/main.tsx
```

Add `WorkspaceProvider` inside the existing provider tree, after `QueryClientProvider` (it needs TanStack Query to be available):

```tsx
import { WorkspaceProvider } from '@/contexts/WorkspaceContext'

// Inside the JSX tree, wrap children:
<QueryClientProvider client={queryClient}>
  <WorkspaceProvider>
    {/* rest of app */}
  </WorkspaceProvider>
</QueryClientProvider>
```

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/contexts/WorkspaceContext.tsx src/hooks/useCurrency.ts src/lib/utils.ts src/features/settings/hooks/useProfile.ts src/main.tsx
git commit -m "feat: add WorkspaceContext, useCurrency hook, locale-aware formatCurrency"
```

---

## Task 5: Frontend — update high-visibility formatCurrency call sites

**Files:**
- Modify: `pakka-app/src/features/dashboard/widgets/StatCardWidget.tsx`
- Modify: `pakka-app/src/features/dashboard/widgets/CollectionWidget.tsx`
- Modify: `pakka-app/src/features/dashboard/widgets/RevenueChartWidget.tsx`
- Modify: `pakka-app/src/features/reports/components/PlTab.tsx`
- Modify: `pakka-app/src/pages/app/ReportsPage.tsx`
- Modify: `pakka-app/src/pages/app/ProjectsPage.tsx`

These are the most visible surfaces. The pattern for each file is the same:

1. Remove `formatCurrency` from the `@/lib/utils` import
2. Add `import { useCurrency } from '@/hooks/useCurrency'`
3. Inside the component function, add: `const { format } = useCurrency()`
4. Replace every `formatCurrency(x)` call with `format(x)`

> **Note on `CollectionWidget.tsx`:** This file also has `.replace('₹', '')` calls — remove those entirely when switching to `format()` since `Intl.NumberFormat` renders the correct symbol automatically.

- [ ] **Step 1: Update `StatCardWidget.tsx`**

```bash
# Check current formatCurrency usage in this file
grep -n "formatCurrency" /Users/mvaghela/Documents/MyProjects/pakka-app/src/features/dashboard/widgets/StatCardWidget.tsx
```

In `StatCardWidget.tsx`:
- Add `import { useCurrency } from '@/hooks/useCurrency'`
- Add `const { format } = useCurrency()` at the top of `StatCardWidget` component
- Replace all `formatCurrency(...)` with `format(...)`
- Note: `META` is defined outside the component and references `formatCurrency` in lambdas — move those lambdas inline or pass `format` as a parameter to `META` resolver

Since `META` uses functions for `value` and `sub`, the cleanest approach is to move the `format` call to the render site:

```tsx
// Instead of:
value: s => formatCurrency(s.revenueThisMonth ?? 0),

// Keep as-is but call format() at render time:
// In the render JSX where m.value(stats) is called, wrap it:
// Change value to return a number instead of string, then format at render
```

Actually simpler: keep `META.value` returning a number and format in the JSX:

```tsx
// In META, change value functions to return number:
value: s => s.revenueThisMonth ?? 0,
// sub stays using format from a closure — pass it in
```

Easiest approach: add `const { format } = useCurrency()` to the component and wrap the `m.value(stats)` call at the render site:

```tsx
// In the JSX:
<p className="text-[26px] font-extrabold ...">
  {stats ? (typeof m.value(stats) === 'number' ? format(m.value(stats) as number) : m.value(stats)) : '—'}
</p>
```

But this is messy. The cleanest fix for StatCardWidget: update `META` value functions to return numbers for currency stats, and format at render time. `open_proposals` can stay as `String(s.openProposals ?? 0)`. For `sub` functions that use `formatCurrency`, also convert them.

Full replacement for `StatCardWidget.tsx` — here are the META sub/value functions to update:

```tsx
// revenue_month:
sub:   s => s.revenueChange != null
  ? `${s.revenueChange >= 0 ? '+' : ''}${s.revenueChange}% vs last month`
  : `Last month: ${format(s.revenueLastMonth ?? 0)}`,
value: s => format(s.revenueThisMonth ?? 0),

// pipeline:
value: s => format(s.pipelineValue ?? 0),

// overdue:
value: s => format(s.overdueAmount ?? 0),

// open_proposals stays:
value: s => String(s.openProposals ?? 0),
```

Move the `META` object inside the component so `format` is in scope, or pass format as a parameter. Moving it inside the component is simplest — it's a small object.

- [ ] **Step 2: Update `CollectionWidget.tsx`**

Add `useCurrency` import and `const { format } = useCurrency()`. Replace:
- `formatCurrency(total)` → `format(total)`
- `<IndianRupee size={9} />{formatCurrency(sentAmount).replace('₹', '')}` → `{format(sentAmount)}` (remove the `IndianRupee` icon and `.replace()`)
- Same for `overdueAmount`

Also remove `IndianRupee` from the lucide import if it's only used here.

- [ ] **Step 3: Update `RevenueChartWidget.tsx`**

Add `useCurrency` and `const { format } = useCurrency()`. Replace:
```tsx
formatter={(value) => [formatCurrency(value as number), 'Revenue']}
// becomes:
formatter={(value) => [format(value as number), 'Revenue']}
```

- [ ] **Step 4: Update `PlTab.tsx`**

Add `useCurrency` and `const { format } = useCurrency()`. Replace all `formatCurrency(...)` calls with `format(...)` — there are ~10 of them.

- [ ] **Step 5: Update `ReportsPage.tsx`**

Same pattern — add `useCurrency`, replace `formatCurrency(...)` with `format(...)`. Also replace the `IndianRupee` icon in StatCard `icon` props with a currency-neutral `DollarSign` or `Coins` from lucide (or keep `IndianRupee` for IN only):

```tsx
// In ReportsPage, for icon:
const { isIndia } = useWorkspace()
// ...
icon={isIndia ? IndianRupee : DollarSign}
```

- [ ] **Step 6: Update `ProjectsPage.tsx`**

Same pattern — add `useCurrency`, replace `formatCurrency(...)`.

- [ ] **Step 7: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/dashboard/widgets/StatCardWidget.tsx \
        src/features/dashboard/widgets/CollectionWidget.tsx \
        src/features/dashboard/widgets/RevenueChartWidget.tsx \
        src/features/reports/components/PlTab.tsx \
        src/pages/app/ReportsPage.tsx \
        src/pages/app/ProjectsPage.tsx
git commit -m "feat: use workspace-aware currency formatting in dashboard and reports"
```

---

## Task 6: Frontend — BusinessTab country/currency section + conditional bank fields

**Files:**
- Modify: `pakka-app/src/features/settings/components/BusinessTab.tsx`

This is the settings UI where users set their country. The tab currently only has bank fields. We need to:
1. Add a "Country & Currency" card at the top
2. Make bank fields conditional based on `bankFields` type
3. Hide GSTIN/PAN for non-IN users (those are on `ProfileTab.tsx`)

- [ ] **Step 1: Check where GSTIN/PAN are rendered**

```bash
grep -n "gstNumber\|panNumber\|GSTIN\|PAN" /Users/mvaghela/Documents/MyProjects/pakka-app/src/features/settings/components/ProfileTab.tsx | head -10
```

- [ ] **Step 2: Rewrite `BusinessTab.tsx`**

Replace the entire file content with the following (preserving all existing functionality, adding country/currency and conditional bank sections):

```tsx
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Building2, CreditCard, Smartphone, Check, Loader2, Landmark, Upload, X, QrCode, Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProfile, useUpdateProfile, useUploadUpiQr } from '../hooks/useProfile'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { COUNTRY_DEFAULTS, getCountryDefaults } from '@/lib/countryDefaults'

// Full country list for the dropdown
const ALL_COUNTRIES = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SG', name: 'Singapore' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'LK', name: 'Sri Lanka' },
]

const CURRENCIES = [
  { code: 'INR', name: 'INR — Indian Rupee' },
  { code: 'USD', name: 'USD — US Dollar' },
  { code: 'GBP', name: 'GBP — British Pound' },
  { code: 'EUR', name: 'EUR — Euro' },
  { code: 'AUD', name: 'AUD — Australian Dollar' },
  { code: 'CAD', name: 'CAD — Canadian Dollar' },
  { code: 'AED', name: 'AED — UAE Dirham' },
  { code: 'SGD', name: 'SGD — Singapore Dollar' },
  { code: 'NZD', name: 'NZD — New Zealand Dollar' },
  { code: 'ZAR', name: 'ZAR — South African Rand' },
  { code: 'NGN', name: 'NGN — Nigerian Naira' },
  { code: 'KES', name: 'KES — Kenyan Shilling' },
  { code: 'PKR', name: 'PKR — Pakistani Rupee' },
  { code: 'BDT', name: 'BDT — Bangladeshi Taka' },
  { code: 'LKR', name: 'LKR — Sri Lankan Rupee' },
]

const businessSchema = z.object({
  country:           z.string().optional(),
  currency:          z.string().optional(),
  taxLabel:          z.string().optional(),
  bankName:          z.string().optional(),
  bankAccountName:   z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfsc:          z.string().optional(),
  upiId:             z.string().optional(),
  ibanNumber:        z.string().optional(),
  swiftCode:         z.string().optional(),
  routingNumber:     z.string().optional(),
})

type BusinessForm = z.infer<typeof businessSchema>

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

export default function BusinessTab() {
  const { data: profile, isLoading } = useProfile()
  const { mutateAsync: updateProfile, isPending: saving } = useUpdateProfile()
  const { mutateAsync: uploadQr, isPending: uploadingQr } = useUploadUpiQr()
  const [saved, setSaved] = useState(false)
  const [qrPreview, setQrPreview] = useState<string | null>(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm<BusinessForm>({
    resolver: zodResolver(businessSchema),
  })

  const selectedCountry = watch('country') ?? 'IN'
  const defaults = getCountryDefaults(selectedCountry)
  const bankFields = defaults.bankFields
  const isIndia = selectedCountry === 'IN'

  // Auto-fill currency + taxLabel when country changes
  function handleCountryChange(code: string) {
    setValue('country', code, { shouldDirty: true })
    const d = getCountryDefaults(code)
    setValue('currency', d.currency, { shouldDirty: true })
    if (!profile?.taxLabel) setValue('taxLabel', d.taxLabel, { shouldDirty: true })
  }

  useEffect(() => {
    if (profile) {
      reset({
        country:           profile.country           ?? 'IN',
        currency:          profile.currency          ?? 'INR',
        taxLabel:          profile.taxLabel          ?? '',
        bankName:          profile.bankName          ?? '',
        bankAccountName:   profile.bankAccountName   ?? '',
        bankAccountNumber: profile.bankAccountNumber ?? '',
        bankIfsc:          profile.bankIfsc          ?? '',
        upiId:             profile.upiId             ?? '',
        ibanNumber:        profile.ibanNumber        ?? '',
        swiftCode:         profile.swiftCode         ?? '',
        routingNumber:     profile.routingNumber     ?? '',
      })
      if (profile.upiQrUrl && !qrPreview) setQrPreview(profile.upiQrUrl)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, reset])

  const onSubmit = async (values: BusinessForm) => {
    await updateProfile({
      country:           values.country           || null,
      currency:          values.currency          || null,
      taxLabel:          values.taxLabel          || null,
      bankName:          values.bankName          || null,
      bankAccountName:   values.bankAccountName   || null,
      bankAccountNumber: values.bankAccountNumber || null,
      bankIfsc:          isIndia ? (values.bankIfsc || null) : null,
      upiId:             isIndia ? (values.upiId   || null) : null,
      ibanNumber:        !isIndia && bankFields === 'iban'    ? (values.ibanNumber    || null) : null,
      swiftCode:         !isIndia && bankFields === 'iban'    ? (values.swiftCode     || null) : null,
      routingNumber:     !isIndia && bankFields === 'routing' ? (values.routingNumber || null) : null,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    reset(values)
  }

  async function handleQrUpload(file: File) {
    const url = await uploadQr(file)
    setQrPreview(url)
    await updateProfile({ upiQrUrl: url })
  }

  async function handleQrRemove() {
    setQrPreview(null)
    await updateProfile({ upiQrUrl: null })
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="card-glass p-6 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Country & Currency */}
      <div className="card-glass p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
          <Globe size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
          <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Country & Currency</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Country">
            <select
              className="form-input w-full"
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
            >
              {ALL_COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Currency">
            <select {...register('currency')} className="form-input w-full">
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </Field>
        </div>

        {!isIndia && (
          <Field label="Tax Label" hint="e.g. VAT, Sales Tax, GST — shown on invoices">
            <input
              {...register('taxLabel')}
              placeholder={defaults.taxLabel}
              className="form-input max-w-sm"
            />
          </Field>
        )}

        <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">
          Changing country updates your tax label and bank field layout. Existing invoice data is not affected.
        </p>
      </div>

      {/* Bank details — India */}
      {isIndia && (
        <>
          <div className="card-glass p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
              <Landmark size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
              <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Bank Account</h3>
              <span className="ml-auto text-[11px] text-[#98A2B3] dark:text-[#545C74]">Appears on invoices</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Bank Name" error={errors.bankName?.message}>
                <input {...register('bankName')} placeholder="HDFC Bank" className="form-input w-full" />
              </Field>
              <Field label="Account Holder Name" error={errors.bankAccountName?.message}>
                <input {...register('bankAccountName')} placeholder="Maharshi Vaghela" className="form-input w-full" />
              </Field>
              <Field label="Account Number" error={errors.bankAccountNumber?.message}>
                <input {...register('bankAccountNumber')} placeholder="012345678901" className="form-input w-full font-mono text-[13px] tracking-widest" />
              </Field>
              <Field label="IFSC Code" error={errors.bankIfsc?.message} hint="e.g. HDFC0001234">
                <input
                  {...register('bankIfsc')}
                  placeholder="HDFC0001234"
                  className="form-input w-full font-mono text-[13px] tracking-wide uppercase"
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase()
                    register('bankIfsc').onChange(e)
                  }}
                />
              </Field>
            </div>
          </div>

          <div className="card-glass p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
              <Smartphone size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
              <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">UPI</h3>
              <span className="ml-auto text-[11px] text-[#98A2B3]">Shown as payment option on invoices</span>
            </div>
            <Field label="UPI ID" hint="e.g. yourname@okaxis" error={errors.upiId?.message}>
              <input {...register('upiId')} placeholder="yourname@okaxis" className="form-input max-w-sm" />
            </Field>
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
                UPI QR Code <span className="text-[11px] font-normal text-[#98A2B3]">(optional)</span>
              </label>
              {qrPreview ? (
                <div className="flex items-center gap-4">
                  <img src={qrPreview} alt="UPI QR" className="w-[88px] h-[88px] rounded-xl border border-[#EAECF0] dark:border-[#26283A] object-contain bg-white" />
                  <button type="button" onClick={handleQrRemove} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#D92D20] border border-[#FECDCA] hover:bg-[#FEF3F2] transition-colors">
                    <X size={12} strokeWidth={2.5} /> Remove
                  </button>
                </div>
              ) : (
                <label className={cn('flex items-center gap-3 w-fit px-4 py-2.5 rounded-xl border-2 border-dashed border-[#D0D5DD] dark:border-[#3A3C4A] cursor-pointer',
                  'hover:border-[#2563EB] hover:bg-[#EFF6FF] dark:hover:bg-[#1A1B23] transition-all',
                  uploadingQr && 'opacity-60 cursor-not-allowed pointer-events-none')}>
                  <input type="file" accept="image/*" className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleQrUpload(f) }} />
                  {uploadingQr ? <Loader2 size={14} className="animate-spin text-[#2563EB]" /> : <QrCode size={14} className="text-[#667085]" />}
                  <span className="text-[12.5px] font-medium text-[#667085]">{uploadingQr ? 'Uploading…' : 'Upload QR image'}</span>
                  <Upload size={12} className="text-[#98A2B3]" />
                </label>
              )}
            </div>
          </div>
        </>
      )}

      {/* Bank details — IBAN (UK, EU, UAE, SG) */}
      {!isIndia && bankFields === 'iban' && (
        <div className="card-glass p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
            <Landmark size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
            <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Bank Account</h3>
            <span className="ml-auto text-[11px] text-[#98A2B3] dark:text-[#545C74]">Appears on invoices</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Account Holder Name" error={errors.bankAccountName?.message}>
              <input {...register('bankAccountName')} placeholder="John Smith" className="form-input w-full" />
            </Field>
            <Field label="IBAN" error={errors.ibanNumber?.message} hint="e.g. GB29NWBK60161331926819">
              <input {...register('ibanNumber')} placeholder="GB29NWBK60161331926819" className="form-input w-full font-mono text-[13px] tracking-widest uppercase" />
            </Field>
            <Field label="BIC / SWIFT Code" error={errors.swiftCode?.message} hint="e.g. NWBKGB2L">
              <input {...register('swiftCode')} placeholder="NWBKGB2L" className="form-input w-full font-mono text-[13px] tracking-wide uppercase" />
            </Field>
          </div>
        </div>
      )}

      {/* Bank details — Routing (US, CA) */}
      {!isIndia && bankFields === 'routing' && (
        <div className="card-glass p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
            <Landmark size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
            <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Bank Account</h3>
            <span className="ml-auto text-[11px] text-[#98A2B3] dark:text-[#545C74]">Appears on invoices</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Account Holder Name">
              <input {...register('bankAccountName')} placeholder="John Smith" className="form-input w-full" />
            </Field>
            <Field label="Bank Name">
              <input {...register('bankName')} placeholder="Chase Bank" className="form-input w-full" />
            </Field>
            <Field label="Account Number">
              <input {...register('bankAccountNumber')} placeholder="000123456789" className="form-input w-full font-mono text-[13px] tracking-widest" />
            </Field>
            <Field label="Routing Number" hint="9-digit ABA routing number">
              <input {...register('routingNumber')} placeholder="021000021" className="form-input w-full font-mono text-[13px] tracking-widest" />
            </Field>
          </div>
        </div>
      )}

      {/* Bank details — BSB (AU) */}
      {!isIndia && bankFields === 'bsb' && (
        <div className="card-glass p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
            <Landmark size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
            <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Bank Account</h3>
            <span className="ml-auto text-[11px] text-[#98A2B3] dark:text-[#545C74]">Appears on invoices</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Account Holder Name">
              <input {...register('bankAccountName')} placeholder="Jane Smith" className="form-input w-full" />
            </Field>
            <Field label="Bank Name">
              <input {...register('bankName')} placeholder="Commonwealth Bank" className="form-input w-full" />
            </Field>
            <Field label="Account Number">
              <input {...register('bankAccountNumber')} placeholder="12345678" className="form-input w-full font-mono text-[13px] tracking-widest" />
            </Field>
            <Field label="BSB Code" hint="e.g. 062-000">
              <input {...register('bankIfsc')} placeholder="062-000" className="form-input w-full font-mono text-[13px] tracking-wide" />
            </Field>
          </div>
        </div>
      )}

      {/* Bank details — Generic */}
      {!isIndia && bankFields === 'generic' && (
        <div className="card-glass p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
            <Landmark size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
            <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Bank Account</h3>
            <span className="ml-auto text-[11px] text-[#98A2B3] dark:text-[#545C74]">Appears on invoices</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Account Holder Name">
              <input {...register('bankAccountName')} placeholder="Your Name" className="form-input w-full" />
            </Field>
            <Field label="Bank Name">
              <input {...register('bankName')} placeholder="Your Bank" className="form-input w-full" />
            </Field>
            <Field label="Account Number">
              <input {...register('bankAccountNumber')} placeholder="0123456789" className="form-input w-full font-mono text-[13px] tracking-widest" />
            </Field>
          </div>
        </div>
      )}

      {/* Razorpay placeholder — India only */}
      {isIndia && (
        <div className="card-glass p-6">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] mb-4">
            <CreditCard size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
            <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Razorpay</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Online payment collection</p>
              <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">Accept card, UPI, and net banking payments directly on invoices.</p>
            </div>
            <button type="button" disabled className="px-4 py-2 text-[12px] font-semibold text-[#98A2B3] dark:text-[#545C74] bg-[#F2F4F7] dark:bg-[#21222D] rounded-lg cursor-not-allowed">
              Coming soon
            </button>
          </div>
        </div>
      )}

      <div className="card-glass p-4 flex items-start gap-3 bg-[#F8F9FC] dark:bg-[#1A1B23]">
        <Building2 size={15} className="text-[#667085] dark:text-[#8B92A8] mt-0.5 shrink-0" />
        <p className="text-[12px] text-[#667085] dark:text-[#8B92A8]">
          Bank account details are printed on every invoice you send. Keep them accurate so clients can pay you directly.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 py-2">
        {saved && (
          <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#027A48] dark:text-[#34D399]">
            <Check size={14} strokeWidth={2.5} /> Saved
          </span>
        )}
        <button type="submit" disabled={saving || !isDirty}
          className={cn('flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors',
            saving || !isDirty
              ? 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#98A2B3] dark:text-[#545C74] cursor-not-allowed'
              : 'bg-[#0D1117] dark:bg-[#6366F1] text-white hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5]')}>
          {saving && <Loader2 size={13} className="animate-spin" />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, error, hint, required, children }: {
  label: string; error?: string; hint?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint  && !error && <p className="text-[11px] text-[#98A2B3]">{hint}</p>}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/settings/components/BusinessTab.tsx
git commit -m "feat: add country/currency settings and conditional bank fields to BusinessTab"
```

---

## Task 7: Frontend — InvoiceEditor conditional tax fields

**Files:**
- Modify: `pakka-app/src/features/invoices/components/InvoiceEditor.tsx`

Currently the InvoiceEditor shows CGST/SGST/IGST, GSTIN fields, and HSN/SAC. For non-IN users these need to be hidden and replaced with a single generic tax line.

- [ ] **Step 1: Add workspace context to InvoiceEditor**

At the top of `InvoiceEditor.tsx`, add:

```tsx
import { useWorkspace } from '@/contexts/WorkspaceContext'
// Inside the component:
const { isIndia, taxLabel, taxRate } = useWorkspace()
```

- [ ] **Step 2: Set default gstRate from workspace taxRate for new invoices**

Find the default values for a new invoice (around line 71):

```tsx
lineItems: [{ description: '', qty: 1, rate: 0, gstRate: 18 }],
```

Change to:
```tsx
lineItems: [{ description: '', qty: 1, rate: 0, gstRate: taxRate }],
```

And the `append` call similarly:
```tsx
onClick={() => append({ description: '', qty: 1, rate: 0, gstRate: taxRate, hsnSac: profile?.defaultHsnSac ?? '' })}
```

- [ ] **Step 3: Wrap India-only table headers in `{isIndia && ...}`**

Find the table header that shows `HSN/SAC` and `GST %`:

```tsx
// Wrap these in {isIndia && ...}:
<span className="text-right flex items-center justify-end gap-1">GST % <FieldInfoPopover field="gstRate" /></span>
// and the HSN/SAC column header
```

- [ ] **Step 4: Wrap India-only line item cells**

In the line item rows, wrap the HSN/SAC input and GST rate input:

```tsx
{isIndia && (
  <input {...register(`lineItems.${idx}.hsnSac`)} ... />
)}
{isIndia && (
  <input {...register(`lineItems.${idx}.gstRate`, { valueAsNumber: true })} ... />
)}
```

For non-India: the line item tax uses the workspace `taxRate` and is not editable per-line (applied at invoice level).

- [ ] **Step 5: Wrap the GST summary block**

Find the section that shows `IGST` or `CGST + SGST` (around line 317):

```tsx
{!isExport && gstType !== 'EXEMPT' && (
  ...IGST / CGST+SGST display...
)}
```

Change to:
```tsx
{!isExport && gstType !== 'EXEMPT' && isIndia && (
  ...existing India GST display...
)}
{!isIndia && gstAmount > 0 && (
  <div className="flex justify-between text-[13px]">
    <span className="text-[#667085] dark:text-[#8B92A8]">{taxLabel} @ {taxRate}%</span>
    <span className="font-semibold text-[#344054] dark:text-[#C2C8D8]">{format(gstAmount)}</span>
  </div>
)}
```

Add `const { format } = useCurrency()` from the useCurrency hook.

- [ ] **Step 6: Wrap the GST type selector (India only)**

Find the `<select name="gstType">` dropdown (around line 394) and wrap it:

```tsx
{isIndia && (
  <div>
    <label className="form-label flex items-center gap-1">GST type <FieldInfoPopover field="gstType" /></label>
    <select name="gstType" ...>
      ...options...
    </select>
  </div>
)}
```

- [ ] **Step 7: Wrap GSTIN / LUT fields (India only)**

Find seller GSTIN, buyer GSTIN, and LUT fields and wrap each in `{isIndia && ...}`.

- [ ] **Step 8: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 9: Commit**

```bash
git add src/features/invoices/components/InvoiceEditor.tsx
git commit -m "feat: conditional India-only tax fields in InvoiceEditor"
```

---

## Task 8: Backend — country-aware invoice PDF generation

**Files:**
- Modify: `pakka-api/src/modules/invoices/invoices.service.ts`
- Modify: `pakka-app/src/lib/invoicePdf.ts`

- [ ] **Step 1: Check how invoicePdf.ts is called**

```bash
grep -n "generateInvoicePdf\|invoicePdf" /Users/mvaghela/Documents/MyProjects/pakka-app/src --include="*.ts" --include="*.tsx" -r | head -10
```

- [ ] **Step 2: Pass country context to `generateInvoicePdf`**

The PDF is generated client-side in `invoicePdf.ts`. Find where it's called (likely in the invoice view page or a download handler). Pass workspace values as additional params.

Open `pakka-app/src/lib/invoicePdf.ts`. Find the `InvoiceInput` interface and add:

```typescript
export interface InvoiceInput {
  // ... existing fields ...
  // Add at the end:
  country?:  string    // defaults to 'IN' if not provided
  taxLabel?: string    // defaults to 'GST'
  locale?:   string    // defaults to 'en-IN'
}
```

- [ ] **Step 3: Update `generateInvoicePdf` to be country-aware**

In `generateInvoicePdf`, add at the top of the function:

```typescript
const country  = input.country  ?? 'IN'
const taxLabel = input.taxLabel ?? 'GST'
const locale   = input.locale   ?? 'en-IN'
const isIndia  = country === 'IN'

// Replace fmtINR with a locale-aware formatter:
function fmt(amount: number): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: input.currency ?? 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}
```

- [ ] **Step 4: Replace fmtINR with fmt in the totals section**

Find all `fmtINR(...)` calls and replace with `fmt(...)`.

- [ ] **Step 5: Make the tax breakdown conditional**

In the totals section, find the CGST/SGST/IGST lines:

```typescript
if (totals.sameState) {
  totalLine(`CGST @ ${input.gstRate / 2}%`, `Rs. ${fmtINR(totals.cgstAmount)}`)
  totalLine(`SGST @ ${input.gstRate / 2}%`, `Rs. ${fmtINR(totals.sgstAmount)}`)
} else {
  totalLine(`IGST @ ${input.gstRate}%`, `Rs. ${fmtINR(totals.igstAmount)}`)
}
```

Replace with:

```typescript
if (isIndia) {
  if (totals.sameState) {
    totalLine(`CGST @ ${input.gstRate / 2}%`, fmt(totals.cgstAmount))
    totalLine(`SGST @ ${input.gstRate / 2}%`, fmt(totals.sgstAmount))
  } else {
    totalLine(`IGST @ ${input.gstRate}%`, fmt(totals.igstAmount))
  }
} else if (totals.total > totals.subtotal) {
  const taxAmt = totals.total - totals.subtotal
  const rate   = input.gstRate ?? 0
  totalLine(`${taxLabel} @ ${rate}%`, fmt(taxAmt))
}
```

- [ ] **Step 6: Remove "Amount in words: ... Rupees Only" for non-India**

Find the `inWords` / "Rupees Only" line:

```typescript
doc.text(`Amount in words: ${inWords(totals.total)} Rupees Only`, M, y)
```

Replace with:

```typescript
if (isIndia) {
  doc.text(`Amount in words: ${inWords(Math.round(totals.total))} Rupees Only`, M, y)
}
```

- [ ] **Step 7: Wire workspace values into the PDF call site**

Find where `generateInvoicePdf` is called (likely a download button handler). Add workspace values:

```tsx
const { country, currency, locale, taxLabel } = useWorkspace()
// ...
generateInvoicePdf({ ...invoiceData, country, currency, locale, taxLabel })
```

- [ ] **Step 8: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 9: Commit**

```bash
git add src/lib/invoicePdf.ts
git commit -m "feat: country-aware PDF generation — conditional tax breakdown, locale currency"
```

---

## Task 9: Frontend — country selection step in OnboardingWizard

**Files:**
- Modify: `pakka-app/src/features/onboarding/OnboardingWizard.tsx`

- [ ] **Step 1: Check current wizard steps structure**

```bash
grep -n "step\|Step\|STEP\|wizard\|stage\|screen" /Users/mvaghela/Documents/MyProjects/pakka-app/src/features/onboarding/OnboardingWizard.tsx | head -20
```

- [ ] **Step 2: Add country/currency to the wizard state**

Find where onboarding form state is defined. Add:

```tsx
const [country, setCountry] = useState('IN')
const [currency, setCurrency] = useState('INR')
```

- [ ] **Step 3: Add a country selection step**

Add a new step (insert before business details, after the first welcome screen if any). The step UI:

```tsx
// Country selection step
<div className="space-y-4">
  <div>
    <h2 className="text-[18px] font-bold text-[#101828] dark:text-[#ECEEF3]">Where is your business based?</h2>
    <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-1">This sets your currency and tax defaults.</p>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {ALL_COUNTRIES.map(c => (
      <button
        key={c.code}
        type="button"
        onClick={() => {
          setCountry(c.code)
          const d = getCountryDefaults(c.code)
          setCurrency(d.currency)
        }}
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
          country === c.code
            ? 'border-[#6366F1] bg-[#EEF2FF] dark:bg-[#1E2040] text-[#4338CA]'
            : 'border-[#EAECF0] dark:border-[#26283A] hover:border-[#C7D2FE]',
        )}
      >
        <span className="text-[13px] font-semibold">{c.name}</span>
        {country === c.code && <Check size={14} className="ml-auto text-[#6366F1]" strokeWidth={2.5} />}
      </button>
    ))}
  </div>
</div>
```

Use the same `ALL_COUNTRIES` list as BusinessTab (copy or import from a shared location).

- [ ] **Step 4: Save country/currency when wizard completes**

In the final wizard submit call (where `updateProfile` or similar is called), include:

```tsx
await updateProfile({
  // ... existing fields ...
  country,
  currency,
})
```

- [ ] **Step 5: Skip the step for existing users**

The OnboardingWizard is already guarded by `onboardingComplete`. Existing users with `onboardingComplete: true` never see it — no change needed.

- [ ] **Step 6: TypeScript check + commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -20
git add src/features/onboarding/OnboardingWizard.tsx
git commit -m "feat: add country selection step to onboarding wizard"
```

---

## Task 10: Backend — Stripe provider + payments endpoints

**Files:**
- Create: `pakka-api/src/modules/payments/stripe.provider.ts`
- Modify: `pakka-api/src/modules/payments/payments.service.ts`
- Modify: `pakka-api/src/modules/payments/payments.controller.ts`
- Modify: `pakka-api/src/modules/payments/payments.module.ts`
- Modify: `pakka-api/src/config/configuration.ts`

- [ ] **Step 1: Install Stripe SDK**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npm install stripe
npm install -D @types/stripe
```

- [ ] **Step 2: Add Stripe config keys**

Open `pakka-api/src/config/configuration.ts`. Add to the config object:

```typescript
stripe: {
  secretKey:        process.env.STRIPE_SECRET_KEY ?? '',
  webhookSecret:    process.env.STRIPE_WEBHOOK_SECRET ?? '',
  soloPriceId:      process.env.STRIPE_SOLO_PRICE_ID ?? '',
  studioPriceId:    process.env.STRIPE_STUDIO_PRICE_ID ?? '',
},
```

- [ ] **Step 3: Create `stripe.provider.ts`**

Create `pakka-api/src/modules/payments/stripe.provider.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'

@Injectable()
export class StripeProvider {
  private readonly logger = new Logger(StripeProvider.name)
  private readonly stripe: Stripe

  constructor(private readonly config: ConfigService) {
    this.stripe = new Stripe(config.get<string>('stripe.secretKey') ?? '', {
      apiVersion: '2025-05-28.basil',
    })
  }

  async createCheckoutSession(params: {
    userId:     string
    plan:       'SOLO' | 'STUDIO'
    email:      string
    successUrl: string
    cancelUrl:  string
  }): Promise<{ checkoutUrl: string; sessionId: string }> {
    const priceId = params.plan === 'SOLO'
      ? this.config.get<string>('stripe.soloPriceId')!
      : this.config.get<string>('stripe.studioPriceId')!

    const session = await this.stripe.checkout.sessions.create({
      mode:                'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: params.email,
      client_reference_id: params.userId,
      metadata: { userId: params.userId, plan: params.plan },
      success_url: params.successUrl,
      cancel_url:  params.cancelUrl,
    })

    return {
      checkoutUrl: session.url ?? '',
      sessionId:   session.id,
    }
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const secret = this.config.get<string>('stripe.webhookSecret') ?? ''
    return this.stripe.webhooks.constructEvent(payload, signature, secret)
  }
}
```

- [ ] **Step 4: Add Stripe methods to `payments.service.ts`**

Import `StripeProvider` and add two new methods to `PaymentsService`:

```typescript
// Add to constructor params:
private readonly stripeProvider: StripeProvider,

// Add new method:
async createStripeCheckout(userId: string, plan: 'SOLO' | 'STUDIO') {
  const user = await this.prisma.user.findUnique({
    where:  { id: userId },
    select: { email: true, name: true },
  })
  if (!user) throw new NotFoundException('User not found')

  const frontendUrl = this.config.get<string>('frontendUrl') ?? 'http://localhost:5173'
  const { checkoutUrl } = await this.stripeProvider.createCheckoutSession({
    userId,
    plan,
    email:      user.email,
    successUrl: `${frontendUrl}/billing/success`,
    cancelUrl:  `${frontendUrl}/billing`,
  })

  return { checkoutUrl }
}

async handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
  const event = this.stripeProvider.constructWebhookEvent(payload, signature)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const userId  = session.client_reference_id
    const plan    = session.metadata?.plan as 'SOLO' | 'STUDIO'

    if (userId && plan) {
      const planEnum = plan === 'SOLO' ? Plan.SOLO : Plan.STUDIO
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          plan:               planEnum,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          planExpiresAt:      null,
        },
      })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub    = event.data.object as any
    const userId = sub.metadata?.userId
    if (userId) {
      await this.prisma.user.update({
        where: { id: userId },
        data:  { plan: Plan.FREE, subscriptionStatus: SubscriptionStatus.CANCELLED },
      })
    }
  }
}
```

- [ ] **Step 5: Add Stripe endpoints to `payments.controller.ts`**

Add two new endpoints:

```typescript
// Import at top:
import { StripeProvider } from './stripe.provider'

// Add to constructor params:
private readonly stripeProvider: StripeProvider,

// New endpoints:
@Post('stripe/checkout')
@UseGuards(JwtAuthGuard)
createStripeCheckout(
  @CurrentUser() user: User,
  @Body() dto: CreateSubscriptionDto,
) {
  return this.payments.createStripeCheckout(user.id, dto.tier)
}

@Public()
@Post('stripe/webhook')
@HttpCode(200)
async stripeWebhook(
  @Req() req: Request & { rawBody?: Buffer },
  @Headers('stripe-signature') signature: string,
) {
  const payload = req.rawBody
  if (!payload || !signature) return { received: false }
  await this.payments.handleStripeWebhook(payload, signature)
  return { received: true }
}
```

- [ ] **Step 6: Register `StripeProvider` in `payments.module.ts`**

```typescript
// Add to providers array:
StripeProvider,
```

- [ ] **Step 7: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/modules/payments/stripe.provider.ts \
        src/modules/payments/payments.service.ts \
        src/modules/payments/payments.controller.ts \
        src/modules/payments/payments.module.ts \
        src/config/configuration.ts
git commit -m "feat: add Stripe checkout + webhook for international subscription billing"
```

---

## Task 11: Frontend — Stripe billing path in PlanCards

**Files:**
- Modify: `pakka-app/src/features/billing/components/PlanCards.tsx`
- Modify: `pakka-app/src/features/billing/hooks/useSubscription.ts`

- [ ] **Step 1: Add `useStripeCheckout` mutation to `useSubscription.ts`**

Open `pakka-app/src/features/billing/hooks/useSubscription.ts`. Add:

```typescript
export function useStripeCheckout() {
  return useMutation({
    mutationFn: async (tier: 'SOLO' | 'STUDIO') => {
      const { data } = await api.post<{ data: { checkoutUrl: string } }>('/payments/stripe/checkout', { tier })
      return data.data
    },
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl
    },
    onError: () => toast.error('Failed to start checkout. Please try again.'),
  })
}
```

- [ ] **Step 2: Update `PlanCards.tsx` to use Stripe for non-IN users**

Open `pakka-app/src/features/billing/components/PlanCards.tsx`. Add:

```tsx
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useStripeCheckout } from '../hooks/useSubscription'
import { useCurrency } from '@/hooks/useCurrency'

// Inside the component:
const { isIndia } = useWorkspace()
const { mutate: stripeCheckout, isPending: stripeLoading } = useStripeCheckout()
const { currency } = useCurrency()
```

- [ ] **Step 3: Conditionally show prices and CTA**

Find the Solo and Studio price display and button. Add a conditional:

```tsx
{/* Price display */}
{isIndia ? (
  <span className="text-[28px] font-extrabold">
    ₹{pricing?.solo.price ?? 299}
  </span>
) : (
  <span className="text-[28px] font-extrabold">
    {currency === 'GBP' ? '£3' : currency === 'EUR' ? '€4' : '$4'}
    <span className="text-[14px] font-medium text-[#98A2B3]">/mo</span>
  </span>
)}

{/* CTA button — India uses existing Cashfree flow, others use Stripe */}
{isIndia ? (
  <button onClick={() => handleCashfreeSubscribe('SOLO')} ...>
    Get Solo
  </button>
) : (
  <button
    onClick={() => stripeCheckout('SOLO')}
    disabled={stripeLoading}
    className="w-full py-2.5 rounded-xl text-[13px] font-bold bg-[#6366F1] text-white hover:bg-[#4F46E5] transition-colors disabled:opacity-60"
  >
    {stripeLoading ? 'Redirecting…' : 'Get Solo'}
  </button>
)}
```

Apply same pattern for Studio.

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/billing/components/PlanCards.tsx \
        src/features/billing/hooks/useSubscription.ts
git commit -m "feat: Stripe checkout path for non-IN users in PlanCards"
```

---

## Final verification

- [ ] **Verify India user sees zero change**
  - Sign in as Indian user → dashboard shows ₹ amounts → invoice editor shows CGST/SGST → Business Settings shows IFSC/UPI → PlanCards shows ₹299/₹699 → everything as before

- [ ] **Verify international user flow**
  - New signup → onboarding country step → select "United Kingdom" → currency auto-sets to GBP → Business Settings shows IBAN/SWIFT fields, no UPI → invoice editor shows "VAT" instead of GST, no CGST/SGST split → PlanCards shows £3/£9 → Stripe checkout

- [ ] **Full TypeScript check both repos**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api && npx tsc --noEmit
cd /Users/mvaghela/Documents/MyProjects/pakka-app && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Push both repos**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api && git push origin main
cd /Users/mvaghela/Documents/MyProjects/pakka-app && git push origin main
```
