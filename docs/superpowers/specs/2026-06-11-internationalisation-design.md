# Internationalisation (i18n) Design — ClearWork

**Date:** 2026-06-11
**Status:** Approved

---

## Goal

Unblock 2–3 international users who want to use ClearWork today, with minimal platform changes. A single "country + currency" workspace setting cascades through all India-specific surfaces — formatting, tax, bank fields, PDFs, and billing. India remains the default; existing Indian users see zero change.

## Approach

Country-first defaults. Selecting a country auto-fills: currency, tax label, default tax rate, bank field layout, and number locale. The user can override currency independently. All India-specific logic is preserved exactly as-is and activated only when `country === 'IN'`.

**Supported launch countries (8):** IN, US, GB, AU, CA, AE, SG + generic EU fallback. Any country not in the list falls back to `generic` bank fields and freetext tax label.

---

## Section 1 — Data Model

### `Profile` table — 4 new fields

```prisma
country       String?   // ISO 3166-1 alpha-2, null treated as 'IN' by API
currency      String?   // ISO 4217, null treated as 'INR' by API
taxLabel      String?   // null = use country default (e.g. 'GST', 'VAT'); stored when user overrides
ibanNumber    String?   // IBAN for UK/EU/UAE/SG users
swiftCode     String?   // BIC/SWIFT code
routingNumber String?   // US/CA routing number
```

**Existing fields kept as-is:**
- `gstNumber` — reused as generic "Tax ID / VAT Number" for non-IN (just relabelled)
- `panNumber` — India-only, hidden for non-IN
- `bankAccountNumber`, `bankIfsc`, `upiId` — India-only fields, shown only when `country === 'IN'`
- `bankAccountName` — universal, always shown

**Invoice schema:** no changes. `gstAmount`, `gstRate`, `gstType` fields remain. For non-IN users `gstType` is stored as `IGST` (single line) — only the PDF label changes.

**`currency` field on `Invoice` model** (already exists, defaults to `'INR'`) — populated from workspace `currency` at invoice creation time.

---

## Section 2 — Country Defaults Config

Single static file used by both frontend (context) and backend (PDF generation + API defaults).

**File:** `pakka-app/src/lib/countryDefaults.ts`

```ts
export type BankFieldType = 'india' | 'iban' | 'routing' | 'bsb' | 'generic'

export interface CountryDefaults {
  currency:   string
  taxLabel:   string
  taxRate:    number        // default %, user can override per invoice
  bankFields: BankFieldType
  locale:     string        // Intl.NumberFormat locale
  dateFormat: string        // display hint only
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

export function getCountryDefaults(country: string): CountryDefaults {
  return COUNTRY_DEFAULTS[country] ?? GENERIC_DEFAULTS
}
```

A mirrored version lives in `pakka-api/src/lib/countryDefaults.ts` (identical, TypeScript) for use in PDF generation and API response defaults.

---

## Section 3 — Workspace Context & Currency Formatting

### WorkspaceContext

**File:** `pakka-app/src/contexts/WorkspaceContext.tsx`

```ts
interface WorkspaceSettings {
  country:  string   // 'IN' default
  currency: string   // 'INR' default
  locale:   string   // 'en-IN' default
  taxLabel: string   // 'GST' default
  taxRate:  number   // 18 default
  bankFields: BankFieldType
}
```

Loaded once at app boot from `useProfile()`. Stored in React context. A `useWorkspace()` hook provides access everywhere.

**Indian users:** `country` is `null` in DB → API returns `'IN'` → context defaults to current behaviour. Zero change.

### `formatCurrency` update

`pakka-app/src/lib/utils.ts` — signature change:

```ts
// Before (hardcoded)
export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

// After (locale-aware)
export function formatCurrency(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}
```

All existing call sites pass `currency` and `locale` from `useWorkspace()`. For Indian users these values are `'INR'` and `'en-IN'` — identical output to today.

A convenience wrapper `useCurrency()` hook returns `format(amount)` bound to workspace values, so most components only need one-line changes.

---

## Section 4 — Tax System

### Invoice Editor

`InvoiceEditor.tsx` — conditional rendering based on `country`:

```tsx
const { country, taxLabel } = useWorkspace()
const isIndia = country === 'IN'
```

- **India:** existing CGST/SGST/IGST split, GSTIN fields, HSN/SAC — all unchanged
- **Non-India:** single tax line labelled with `taxLabel` (e.g. "VAT"), freetext rate input (0–100%), no state split, no GSTIN/HSN fields

Tax rate on the invoice is always stored in `gstRate`. Tax amount in `gstAmount`. For non-IN, `gstType` is stored as `IGST` (effectively means "single line").

### Business Settings

`BusinessTab.tsx`:
- GSTIN field → shows for `IN` only; for others, `gstNumber` field is relabelled "Tax ID / VAT Number"
- PAN Number field → shows for `IN` only; hidden for all other countries
- Tax label in settings (freetext) → shows for non-IN only, pre-filled from country default, user can override (e.g. change "VAT" to "BTW" for Netherlands)

### Invoice PDF

`invoicePdf.ts`:
- Receives `country`, `taxLabel`, `currency`, `locale` as parameters from the API (read from user profile at generation time)
- For `IN`: existing CGST/SGST split rendering — unchanged
- For others: single tax row `{taxLabel} @ {rate}%` with amount in correct currency
- "Amount in words" line: India → existing `inWords()` + "Rupees Only"; others → omitted entirely (not standard in most countries)

---

## Section 5 — Bank & Payment Fields

### Bank field sets by `bankFields` type

| Type | Fields shown |
|------|-------------|
| `india` | Account Holder Name, Account Number, IFSC Code, UPI ID |
| `iban` | Account Holder Name, IBAN, BIC / SWIFT Code |
| `routing` | Account Holder Name, Account Number, Routing Number |
| `bsb` | Account Holder Name, Account Number, BSB Code (stored in `bankIfsc` field) |
| `generic` | Account Holder Name, Account Number, Bank Name |

### Changes

**`BusinessTab.tsx`:** bank section becomes a `switch(bankFields)` that renders the appropriate field group. India block is identical to today.

**`invoicePdf.ts`:** payment details section renders the correct fields based on `bankFields` type passed from API.

**`PortalInvoiceCard.tsx`:** same conditional — international clients see bank details that make sense to them.

**No data loss:** Indian fields (`bankIfsc`, `upiId`) are not removed from schema. Non-Indian fields (`ibanNumber`, `swiftCode`, `routingNumber`) are new nullable additions. Each country only writes to its own fields.

---

## Section 6 — Onboarding & Settings UI

### Onboarding Wizard

New step added early in the wizard flow (before business details):

- **Prompt:** "Where is your business based?"
- **Input:** Searchable country dropdown (all countries, not limited to 8)
- **Behaviour:** selecting a country auto-fills currency on the next step; user can change currency independently
- **Default:** India pre-selected → existing Indian users see no change to their onboarding experience

### Business Settings — "Country & Currency" section

New section at the top of the Business tab (above business name):

```
Country          [India ▾]          (searchable dropdown)
Currency         [INR — Indian Rupee ▾]   (overridable)
```

Info note below: *"Changing country updates your tax label and bank payment field layout. Existing invoice data is not affected."*

Saving triggers profile update → `WorkspaceContext` re-reads profile → all downstream UI updates automatically.

**Existing users with no `country` in DB:** API returns `'IN'`, onboarding step is skipped (they're already set up), Business Settings shows "India" pre-selected.

---

## Section 7 — Subscription Billing (Stripe)

### Routing logic

```
user.country === 'IN'  →  existing Cashfree flow (zero changes)
user.country !== 'IN'  →  Stripe Checkout (new)
```

### Backend

**New file:** `pakka-api/src/modules/payments/stripe.provider.ts`
- `createCheckoutSession(userId, plan: 'SOLO' | 'STUDIO')` → creates Stripe Checkout session, returns URL
- Plan price IDs stored in env: `STRIPE_SOLO_PRICE_ID`, `STRIPE_STUDIO_PRICE_ID`

**Modified:** `payments.service.ts` — new `createStripeCheckout()` method; `payments.controller.ts` — new `POST /payments/stripe/checkout` endpoint

**New webhook:** `POST /payments/stripe/webhook`
- Handles `checkout.session.completed` → sets `plan` + `planExpiresAt` on profile (same fields Cashfree updates)
- Handles `customer.subscription.deleted` → resets plan to `FREE`

**New env vars required:**
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SOLO_PRICE_ID=price_...
STRIPE_STUDIO_PRICE_ID=price_...
```

### Frontend

**`PlanCards.tsx`:**
- When `country !== 'IN'`: prices fetched from `GET /payments/pricing` (new endpoint returning country-aware prices in correct currency)
- "Get Solo" / "Get Studio" buttons call `POST /payments/stripe/checkout` → redirect to Stripe hosted page
- Success redirect: `GET /billing?success=true` — existing success toast handles this

**Stripe setup (manual, before deploy):**
1. Create Stripe account
2. Create 2 products: Solo ($4/mo) and Studio ($9/mo) — or equivalent GBP/EUR pricing
3. Add price IDs to env
4. Register webhook endpoint in Stripe dashboard

---

## Files Changed Summary

### Backend (`pakka-api`)
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `country`, `ibanNumber`, `swiftCode`, `routingNumber` to `Profile` |
| `src/lib/countryDefaults.ts` | **New** — country defaults config |
| `src/modules/users/dto/upsert-user.dto.ts` | Add `country`, `taxLabel`, `ibanNumber`, `swiftCode`, `routingNumber` fields |
| `src/modules/users/users.service.ts` | Pass new fields through; default `null` country to `'IN'` in responses |
| `src/modules/invoices/invoices.service.ts` | Set `currency` from user profile at invoice creation |
| `src/modules/payments/stripe.provider.ts` | **New** — Stripe checkout + webhook logic |
| `src/modules/payments/payments.service.ts` | Add `createStripeCheckout()` |
| `src/modules/payments/payments.controller.ts` | Add `POST /payments/stripe/checkout` + webhook endpoint |

### Frontend (`pakka-app`)
| File | Change |
|------|--------|
| `src/lib/countryDefaults.ts` | **New** — country defaults config |
| `src/lib/utils.ts` | `formatCurrency` accepts `currency` + `locale` params |
| `src/contexts/WorkspaceContext.tsx` | **New** — workspace settings context |
| `src/hooks/useCurrency.ts` | **New** — convenience `format(amount)` hook bound to workspace |
| `src/features/settings/components/BusinessTab.tsx` | Country/currency section; conditional bank fields; conditional GSTIN/PAN |
| `src/features/onboarding/OnboardingWizard.tsx` | Add country selection step |
| `src/features/invoices/components/InvoiceEditor.tsx` | Conditional tax fields (India vs generic) |
| `src/features/billing/components/PlanCards.tsx` | Stripe path for non-IN users |
| `src/features/billing/hooks/useSubscription.ts` | Handle Stripe checkout redirect |
| `src/lib/invoicePdf.ts` | Accept country/taxLabel/currency/locale params; conditional PDF sections |
| `src/pages/public/PortalInvoiceCard.tsx` | Conditional bank field display |
| All components calling `formatCurrency` | Pass currency + locale from `useWorkspace()` |

---

## What Does NOT Change

- All India (GST/CGST/SGST/IGST) logic — fully preserved, activated by `country === 'IN'`
- Cashfree subscription flow — unchanged for Indian users
- Existing invoice, proposal, contract data — no migration
- `inWords()` function — kept, used only for Indian invoices
- Landing page tools (GST calculator, TDS, etc.) — out of scope

---

## Verification Checklist

1. Indian user signs up → country defaults to IN → everything works exactly as today
2. US user signs up → selects United States → currency shows USD, tax label "Sales Tax", bank shows Account + Routing Number
3. UK user creates invoice → PDF shows "VAT @ 20%", GBP amounts, IBAN in payment details, no "Rupees Only" line
4. Existing Indian user opens Business Settings → sees "India" pre-selected, all existing fields intact
5. International user clicks "Get Solo" → redirected to Stripe Checkout → payment succeeds → plan updated to SOLO
6. Indian user clicks "Get Solo" → Cashfree flow unchanged
7. `formatCurrency(100000, 'USD', 'en-US')` → `$100,000` (not `$1,00,000`)
