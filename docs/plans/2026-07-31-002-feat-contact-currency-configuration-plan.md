---
title: "feat: Per-contact currency & country configuration"
type: feat
date: 2026-07-31
origin: docs/brainstorms/2026-07-31-contact-currency-configuration-requirements.md
---

# feat: Per-contact currency & country configuration

**Target repos:** this plan spans two repos — `pakka-api` (NestJS + Prisma backend) and `pakka-app` (React frontend). File paths are prefixed accordingly throughout.

## Summary

Currency and country move from a single global Workspace setting onto the Contact: set once, required at Contact creation, and inherited automatically by every Proposal, Contract, and Invoice created for that contact afterward — including the GST auto-derivation that determines whether tax fields apply. A new backend helper becomes the single place this inheritance happens (defaulting to the Contact's currency, falling back to the Workspace's when the Contact has none), replacing Invoice's existing ad-hoc version of the same logic and giving Proposal and Contract the equivalent for the first time. Nothing about already-created documents changes retroactively.

---

## Problem Frame

See origin doc's Problem Frame (see origin: `docs/brainstorms/2026-07-31-contact-currency-configuration-requirements.md`) for the full framing. Research surfaced one correction to how the origin doc characterized the existing GST logic: it is **not** currently a workspace-keyed backend behavior that this plan re-keys onto Contact. `invoices.service.ts`'s `isExport = currency !== 'INR'` check reads `dto.currency` — a value the *frontend* seeds from `useWorkspace()` — not `Workspace.currency` directly, and only Invoice has this check at all. Proposal and Contract have no currency field and no export/GST derivation whatsoever today. So this plan is building GST auto-derivation for Proposal and Contract from scratch (using Invoice's existing logic as the template), not migrating an existing per-workspace mechanism — the product behavior the origin doc describes (GST follows the contact) is unchanged, but the implementation is greenfield for two of the three document types.

---

## Requirements

Carried forward from the origin doc with the same R-IDs (see origin: `docs/brainstorms/2026-07-31-contact-currency-configuration-requirements.md`).

**Contact-Level Currency**

- R1. `Contact` gains `country` and `currency` fields, mirroring `Workspace.country` / `Workspace.currency` and the same 5-currency set already supported on `Invoice` (INR/USD/EUR/GBP/AED).
- R2. Creating a new Contact requires an explicit country + currency selection — the form does not submit with a silently-applied default.
- R3. Existing Contacts (created before this ships) read as the workspace's current country/currency until explicitly edited — no forced backfill, no migration prompt.

**Document Inheritance**

- R4. `Proposal` and `Contract` each gain a `currency` field, mirroring `Invoice.currency`.
- R5. Creating a new Proposal, Contract, or Invoice for a Contact automatically sets that document's currency to the Contact's currency at creation time — no manual re-selection required.
- R6. The Contact create/edit form's country/currency picker mirrors the existing Business Settings picker: a Country dropdown that auto-suggests a Currency via the same `getCountryDefaults()` logic, with Currency independently editable afterward.

**GST / Tax Behavior**

- R7. GST auto-derivation for a Proposal/Contract/Invoice — non-INR currency forcing `GstType.EXEMPT`, India-only fields (tax label, UPI/IFSC, CGST/SGST) hiding — keys off the linked Contact's currency. (Contact's `country` field feeds the Contact picker's currency auto-suggest, per R6, but is not itself an input to GST derivation — see KTD8.)
- R8. Any document flow with no linked Contact continues to use the Workspace's country/currency and GST behavior unchanged.

**Display**

- R9. Proposal, Contract, and Invoice display surfaces render amounts using the document's own currency symbol/format rather than assuming INR.

**Historical Data**

- R10. Changing a Contact's country/currency after creation does not modify any Proposal, Contract, or Invoice already created for that Contact.

---

## Key Technical Decisions

- **KTD1. A single shared helper resolves the effective currency for every document create call, and Invoice's existing inline logic moves onto it too.** New `resolveDocumentCurrency({ prisma, workspaceId, contactId, requestedCurrency })` in `pakka-api/src/modules/shared/` returns `{ currency, isExport }`. Resolution order: explicit `requestedCurrency` from the DTO (preserves today's ability to force a value) → the linked Contact's `currency` if `contactId` is set and the Contact has one (looked up scoped to `workspaceId` — `where: { id: contactId, workspaceId }` — so a mismatched or stale `contactId` can never resolve another workspace's Contact currency) → the Workspace's `currency` (fetched via `prisma.workspace.findUnique`) → `'INR'` as the final floor. `isExport = currency !== 'INR'`. This is the only place in the codebase that will do this lookup — Invoice's `create()` currently duplicates a two-line version of it inline; this plan replaces that inline copy with a call to the shared helper so all three document types share one implementation rather than three near-identical copies.
- **KTD2. Currency inheritance is enforced server-side, not just via frontend auto-fill.** The frontend still auto-suggests a document's currency from its linked Contact (mirroring the Country→Currency auto-suggest already in `BusinessTab.tsx`), but KTD1's helper runs inside each service's `create()` regardless of what the client sends. This is what makes R5 ("no manual reselection required") hold even if a future caller (a script, a different client, a bug) omits `currency` from the request — the guarantee lives in one place, not three.
- **KTD3. Document currency selects stay manually editable, not locked once a Contact is attached — and GST/`isExport` is authoritative off the document's own resolved currency, which can diverge from the Contact's after a manual edit.** The origin doc calls for currency living solely on the Contact with "no per-document override field." In practice, Invoice already has an editable currency `<select>` predating this feature, and removing or disabling it would regress standalone invoices that have no linked Contact — and Invoice already lets a manual edit decouple `isExport` from the Contact/Workspace default today, so this plan does not introduce a new inconsistency, only extends existing behavior to Proposal and Contract. This plan keeps each editor's currency field as a normal editable select, auto-filled from the linked Contact (same UX as Country auto-suggesting Currency today) rather than introducing a separate override toggle — the distinction the origin doc drew is preserved (there's no *new* override mechanism), but the pre-existing field remains changeable, and R7's "GST keys off the Contact" guarantee holds only up to the point of a manual override, same as it does for Invoice today.
- **KTD8. Contact's currency is constrained to the same 5-value set as every document type (INR/USD/EUR/GBP/AED), not the full 21-currency list `countryDefaults.ts` otherwise supports — and `country` is intentionally decorative for GST purposes.** `ALL_COUNTRIES` stays the source for the Country dropdown, but the Currency dropdown renders only the 5 values Proposal/Contract/Invoice can actually store — a Contact currency outside that set would be silently unusable by every downstream document. `CreateContactDto.currency` gets the same `@IsIn(['INR','USD','EUR','GBP','AED'])` constraint the document DTOs use, closing the gap where a direct API call could otherwise set an out-of-set Contact currency the frontend picker would never offer. `country`'s only two jobs in this feature are (1) driving the Currency auto-suggest in U3's picker and (2) the existing Workspace-level `taxLabel`/`bankFields` auto-suggest in `BusinessTab.tsx`, which this plan does not touch. GST/`isExport` derivation (KTD1, KTD4) reads only `currency`, never `country` — a Contact can have any of the 17 countries paired with any of the 5 currencies (e.g. an Australian client billed in USD), and GST behavior follows the currency alone, matching how Invoice already behaves today.
- **KTD4. GST auto-derivation for Proposal and Contract is server-side, authoritative, and durable past creation — not just a `create()`-time calculation.** `create()` on both services computes `gstType` the same way `invoices.service.ts:101-106` does today: `isExport ? GstType.EXEMPT : (dto.gstType ?? GstType.IGST)`. Unlike Invoice, Proposal and Contract have no top-level `gstType` column — it lives inside the `content` JSON blob. The two services' existing `update()` methods are not symmetric, and the plan's fix differs accordingly: Proposal's `update()` re-derives `gstType` from `dto.content?.gstType ?? existing.content.gstType ?? 'IGST'` with no currency check at all (`proposals.service.ts`); Contract's `update()` has **no** gstType handling whatsoever — it overwrites `content` verbatim with `dto.content` when present (`contracts.service.ts:175-189`) and has no `calcTotals`/line-items recompute of any kind (`totalAmount`/`gstAmount` are plain numbers, copied once at `createFromProposal()` time and never recalculated). Two consequences: (1) `create()` on both services must write the enforced `gstType` into the persisted `content` object, not just use it transiently for `calcTotals`; (2) `update()` on **both** services must merge the freshly-derived `gstType` into whatever `content` gets persisted — for Proposal this means overriding the existing `dto.content?.gstType ?? existing.content.gstType ?? 'IGST'` fallback chain with the currency-derived value; for Contract, since no such fallback chain exists today, it means adding a `gstType` key to `dto.content` before the verbatim overwrite, not adapting an existing recompute step. Skipping this on either service lets a non-INR Proposal/Contract silently regain taxable `content.gstType` on its very next edit. A client-submitted `gstType` is honored only when the resolved currency is INR, in both `create()` and `update()`. `gstType` is persisted rather than derived at read time because Invoice already stores it as a first-class column for the same reason (filtering/reporting on tax treatment) — Proposal/Contract's `content.gstType` follows that established precedent rather than introducing a second pattern. **`update()` re-derives `gstType` by calling U4's `resolveDocumentCurrency()` fresh — the same call `create()` makes — never by reading the document's own persisted `currency` column directly.** This matters concretely for every Proposal/Contract created before this feature ships: their `currency` column is `null` (KTD7, no backfill), so a naive `isExport = existingCurrency !== 'INR'` check against the persisted column would evaluate `true` for every one of them and silently flip a plain INR document to `GstType.EXEMPT` the moment it's edited. Calling the helper fresh (with the document's existing `contactId`) resolves through Contact → Workspace → `'INR'` correctly instead.
- **KTD5. `Contact.country` / `Contact.currency` are nullable with no database default.** Matches R3: an existing Contact with no value falls through KTD1's helper to the Workspace's *current* currency, computed at read time — not backfilled at migration time to a frozen snapshot. `AddContactModal`'s zod schema requires both fields on create (R2); `EditContactModal`'s schema (a `.partial()` of the create schema) does not, so existing Contacts can be left unset indefinitely.
- **KTD6. `Contract.currency` is set once, at Contract creation, and Invoice's `createFromContract()` reads it directly rather than re-deriving from the Contact — with a literal `'INR'` floor, never a fresh helper lookup.** Resolved from the origin doc's deferred question: an Invoice generated from a signed Contract uses the currency the Contract was actually signed in, not a fresh lookup of the Contact's currency at invoice-generation time — consistent with R10 (no retroactive changes) applied one hop downstream. Concretely: `currency: contract.currency ?? 'INR'` — a plain nullish-coalesce, not a call into KTD1's `resolveDocumentCurrency()` helper (calling the helper here would silently reintroduce the fresh-lookup behavior this KTD exists to rule out, and would also let a `contactId`-driven resolution override what the Contract actually says). The `?? 'INR'` floor exists only to satisfy Invoice's NOT-NULL `currency` column for Contracts created before U6 shipped (where `Contract.currency` is still `null`) — it is not a Contact/Workspace lookup. If the Contact's currency changes after the Contract was signed, contracts already signed and any Invoice generated from them are unaffected.
- **KTD7. No data migration or backfill script.** R3 explicitly rules out forced backfill, and R10 rules out retroactive changes to existing documents — so this feature needs no `prisma/scripts/*.ts` backfill, unlike the Phase B Contact migration. The two new nullable columns on Contact and the two nullable columns on Proposal/Contract simply start `NULL` for every pre-existing row and are filled in going forward by normal create/edit flows.

---

## Implementation Units

### U1. Schema migration — currency/country columns

**Goal:** Add the four new nullable columns this feature needs, with no other code changes.

**Requirements:** R1, R4

**Dependencies:** None

**Files:**
- `pakka-api/prisma/schema.prisma` (Contact model ~line 459, Proposal model ~line 503, Contract model ~line 570)
- `pakka-api/prisma/migrations/<timestamp>_add_contact_document_currency/migration.sql` (new)

**Approach:** Add `country String?` and `currency String?` to `Contact`; add `currency String?` to `Proposal` and `Contract` (no `@default`, unlike `Invoice.currency`'s `@default("INR")` — these are populated exclusively by U4/U5/U6's service-layer logic, and a DB-level default would let a row look "resolved" before any service ever touched it). Hand-write the migration SQL following the shape of `pakka-api/prisma/migrations/20260731_001_add_proposal_otp_fields/migration.sql` (a comment block citing R1/R4, then plain `ALTER TABLE ... ADD COLUMN` statements, one per table). Confirm the actual apply command with whoever owns deploys before running it — the repo's own conventions disagree with each other (`README.md` and `render.yaml` both use `npx prisma db push`, which ignores the migrations table entirely; `prisma.config.ts` is wired for `DIRECT_URL`-based CLI migrations instead). Do not assume a `pg.Pool` + `migrate resolve --applied` script is needed; none exists in this repo today.

**Patterns to follow:** `pakka-api/prisma/migrations/20260731_001_add_proposal_otp_fields/migration.sql`

**Test scenarios:**
- Test expectation: none — pure schema change, no behavior to test until U2–U7 consume the new columns.

**Verification:** `npx prisma generate` succeeds; the four new columns exist on the target database with the expected nullability; no existing row's data changes.

---

### U2. Contact backend — DTO, validation, TS types

**Goal:** Expose `country`/`currency` on the Contact API surface, required on create per R2.

**Requirements:** R2, R3 (R1's schema change is delivered by U1; this unit covers the DTO/validation/TS-type surface on top of it)

**Dependencies:** U1

**Files:**
- `pakka-api/src/modules/contacts/dto/create-contact.dto.ts`
- `pakka-api/src/modules/contacts/dto/update-contact.dto.ts`
- `pakka-app/src/features/contacts/schemas/contact.schema.ts` (lines 14-30, 67-90)

**Approach:** Add `country: string` to `CreateContactDto` as `@IsString()` with no `@IsOptional()` — the same required-field shape `name` already uses in this DTO. Add `currency: string` the same way but with `@IsIn(['INR','USD','EUR','GBP','AED'])` in place of a bare `@IsString()` (KTD8) — Contact's currency must be drawn from the same 5-value set every document type validates against, or an out-of-set Contact currency becomes silently unusable the moment a Proposal/Contract/Invoice tries to inherit it. `UpdateContactDto extends PartialType(CreateContactDto)` already makes both optional on update automatically; no separate change needed there. On the frontend, add both fields to `createContactSchema` as `z.string().min(1, '... is required')` (mirroring the existing `name` validation) — `currency` additionally constrained to the same 5-value enum, matching the backend. Leave `updateContactSchema = createContactSchema.partial()` as-is so edits can omit them. Add `country?: string` / `currency?: string` to the `Contact` TS interface (optional there, since existing contacts may have neither).

**Patterns to follow:** `name`'s required-field pattern in both the DTO and the zod schema (`pakka-app/src/features/contacts/schemas/contact.schema.ts:15`); `CreateInvoiceDto.currency`'s `@IsIn([...])` pattern (`create-invoice.dto.ts:45-48`).

**Test scenarios:**
- Happy path: `CreateContactDto` with `country: 'US'` and `currency: 'USD'` validates and creates successfully.
- Error path: `CreateContactDto` missing `country` or `currency` fails validation (`ValidationPipe`'s `forbidNonWhitelisted`/required-field behavior).
- Error path: `CreateContactDto` with `currency: 'AUD'` (outside the 5-value set) fails validation.
- Edge case: `UpdateContactDto` with neither field present still validates (fields stay optional on update, per KTD5).
- Covers AE1, AE2.

**Verification:** Creating a Contact via the API without `country`/`currency` returns a 400; creating one with both succeeds and the values persist; updating an existing Contact without touching either field leaves them unchanged.

---

### U3. Contact UI — Country + Currency picker

**Goal:** Let the freelancer set a Contact's country/currency at creation (forced) and edit it later (optional).

**Requirements:** R2, R6

**Dependencies:** U2

**Files:**
- `pakka-app/src/features/contacts/components/AddContactModal.tsx`
- `pakka-app/src/features/contacts/components/EditContactModal.tsx`

**Approach:** Add a Country + Currency row to both modals' form grids (same `grid-cols-2` layout as the existing Service/Deal-Value row in `AddContactModal.tsx`), reusing `ALL_COUNTRIES` and `getCountryDefaults()` from `pakka-app/src/lib/countryDefaults.ts` verbatim for the Country dropdown. The Currency dropdown does **not** reuse `ALL_CURRENCIES` (21 values) — render a fixed 5-option list matching the set every document type validates against (`INR`/`USD`/`EUR`/`GBP`/`AED`, the same list `InvoiceEditor.tsx`'s currency `<select>` already hardcodes), per KTD8. Wire a `handleCountryChange` the same way `BusinessTab.tsx:48-58` does: selecting a country calls `setValue('currency', getCountryDefaults(code).currency)` **only when that currency is in the 5-value set**; when `getCountryDefaults(code).currency` falls outside it (e.g. selecting Australia), clear Currency back to the placeholder — even if it was already populated from a prior country or a manual pick — rather than leaving a stale value in place that the new country's `handleCountryChange` call didn't actually set. Currency remains independently editable afterward via its own `<select>`. Unlike `BusinessTab`, do not pre-select India/INR as the first rendered option — set `defaultValues: { country: '', currency: '' }` and add an explicit disabled placeholder `<option value="">Select…</option>` as the first item in both `<select>` elements; without it, a native `<select>` auto-selects its first real option (India/INR) even if the freelancer never touches the dropdown, which would silently reproduce the exact default R2 forbids and would make the "required" validation error in the test scenarios below unreachable. `EditContactModal` prefills from `contact.country`/`contact.currency` when present (falling back to the same empty/placeholder state, not the workspace default, when absent — the UI does not need to resolve KTD5's fallback chain itself, since nothing downstream depends on what the edit form displays for an unset value).

**Patterns to follow:** `BusinessTab.tsx:48-58` (`handleCountryChange`), `AddContactModal.tsx`'s existing `grid-cols-2` field rows, `InvoiceEditor.tsx`'s 5-option currency `<select>` (lines 394-411) for the fixed currency list.

**Test scenarios:**
- Happy path: selecting "United States" in the Country dropdown auto-fills Currency to "USD"; submitting creates the Contact with both values.
- Happy path: after auto-fill, manually changing Currency to a different value (e.g. "EUR") and submitting persists the manual override, not the auto-suggested one.
- Edge case: selecting a country whose default currency is outside the 5-value set (e.g. Australia) leaves Currency unselected rather than auto-filling an unsupported value.
- Edge case: with Currency already populated (auto-filled or manually chosen) from a prior country, switching to a country whose default currency is outside the 5-value set clears Currency back to the placeholder rather than leaving the stale value in place.
- Error path: attempting to submit `AddContactModal` with no country/currency selected shows the "required" validation error and does not submit — verifies the placeholder option, not a real value, is selected by default.
- Edge case: `EditContactModal` opened on a Contact created before this feature (both fields `null`) shows an empty/placeholder state, not a defaulted one.
- Covers AE1.

**Verification:** Manual walkthrough of both modals in the browser confirms the required-on-create / optional-on-edit behavior and the auto-suggest-then-override flow.

---

### U4. Shared currency-resolution helper

**Goal:** One place that decides a document's effective currency and export/GST status, reused by Proposal, Contract, and Invoice.

**Requirements:** R5, R7, R8

**Dependencies:** U1

**Files:**
- `pakka-api/src/modules/shared/resolve-document-currency.ts` (new)
- `pakka-api/src/modules/shared/resolve-document-currency.spec.ts` (new)

**Approach:** `resolveDocumentCurrency({ prisma, workspaceId, contactId, requestedCurrency }): Promise<{ currency: string; isExport: boolean }>`. Resolution order (KTD1): `requestedCurrency` if present → linked Contact's `currency` if `contactId` is set and found with a non-null `currency` → Workspace's `currency` (looked up by `workspaceId`) → `'INR'`. `isExport = currency !== 'INR'`. Keep the function's Prisma calls minimal — a `contact.findUnique({ where: { id: contactId, workspaceId }, select: { currency: true } })` only when `contactId` is present and `requestedCurrency` is absent, and a `workspace.findUnique({ where: { id: workspaceId }, select: { currency: true } })` only when the Contact lookup didn't resolve a value — so the common case (client already sends `currency`) costs zero extra queries. The Contact lookup's `where` clause includes `workspaceId` alongside `id` (not `id` alone) so a `contactId` that belongs to a different workspace — a caller bug, a stale reference — returns no row and falls through to the Workspace/`'INR'` floor instead of silently resolving another workspace's Contact currency.

**Execution note:** Write this unit test-first — it's a pure function with a clear input/output contract and no UI dependency, and every one of Proposal/Contract/Invoice's `create()` methods will depend on its correctness.

**Patterns to follow:** `invoices.service.ts:101-106`'s existing `isExport`/`gstType` derivation (the logic this helper generalizes); the mocked-Prisma test style in `invoices.service.spec.ts` / `proposals.service.spec.ts`.

**Test scenarios:**
- Happy path: `requestedCurrency: 'USD'` present → returns `{ currency: 'USD', isExport: true }` regardless of `contactId`; no Prisma calls made.
- Happy path: no `requestedCurrency`, `contactId` set, Contact has `currency: 'EUR'` → returns `{ currency: 'EUR', isExport: true }`.
- Edge case: no `requestedCurrency`, `contactId` set, Contact has `currency: null` → falls through to Workspace lookup.
- Edge case: no `requestedCurrency`, no `contactId` → skips the Contact lookup entirely, goes straight to Workspace.
- Edge case: Workspace also has `currency: null` (never configured) → falls through to `'INR'`.
- Happy path: currency resolves to `'INR'` in any branch → `isExport: false`.
- Covers R5, R7, R8.

**Verification:** All test scenarios above pass; `invoices.service.ts`, `proposals.service.ts`, and `contracts.service.ts` (U5-U7) each call this helper rather than deriving `isExport`/`gstType` independently.

---

### U5. Proposal — currency field, GST derivation, editor UI

**Goal:** Proposal inherits currency and GST behavior from its linked Contact, matching Invoice's shape.

**Requirements:** R4, R5, R7, R9

**Dependencies:** U1, U4

**Files:**
- `pakka-api/src/modules/proposals/dto/create-proposal.dto.ts` (lines 99-111)
- `pakka-api/src/modules/proposals/proposals.service.ts` (`create()` lines 61-97, `update()`)
- `pakka-api/src/modules/proposals/proposals.service.spec.ts`
- `pakka-app/src/features/proposals/components/ProposalEditor.tsx` (`gstType` select ~line 377)
- `pakka-app/src/features/proposals/components/ProposalTable.tsx` (~line 133, hardcoded `₹`)
- `pakka-app/src/features/proposals/components/ProposalPreviewDrawer.tsx` (hardcoded `₹` amount rows)
- `pakka-app/src/features/proposals/schemas/proposal.schema.ts`
- `pakka-app/src/lib/currency-symbols.ts` (new — the shared `CURRENCY_SYMBOLS: Record<string, string>` map, keyed by the same 5 currency codes, reused verbatim by U6/U7)

**Approach:** Add `currency?: string` to `CreateProposalDto` with the same `@IsIn(['INR','USD','EUR','GBP','AED'])` constraint Invoice uses; add the matching `currency: z.enum([...]).optional()` field to `proposal.schema.ts`'s zod schema and TS type, mirroring how `create-invoice.dto.ts` and its frontend schema already pair up. In `proposals.service.ts create()`, call U4's `resolveDocumentCurrency()` with `dto.currency` as `requestedCurrency` and `dto.contactId`; persist the resolved `currency`, and write the derived `gstType` into `content.gstType` the same way Invoice does (KTD4) instead of the current unconditional `dto.content?.gstType ?? 'IGST'` — Proposal has no top-level `gstType` column, so the enforced value must land inside the persisted `content` JSON, not just feed a transient calculation. `update()` must call `resolveDocumentCurrency()` fresh (passing the Proposal's existing `contactId` and any `dto.currency` override) and override whatever `gstType` the existing `dto.content?.gstType ?? existing.content.gstType ?? 'IGST'` fallback chain would otherwise produce — **not** read the Proposal's own persisted `currency` column directly (KTD4): every Proposal created before this feature ships has `currency: null`, and a naive check against that column would evaluate every one of them as an export and silently flip a plain INR Proposal to `GstType.EXEMPT` on its next edit. **Out of scope, explicitly:** the two `currency: 'INR'` literals at `proposals.service.ts:359,399` are not display strings — they are the currency parameter for a live Razorpay deposit-order flow (`acceptBySlug()`'s `razorpay.orders.create()` call and its returned `depositOrder` payload for milestone-payment collection). Changing these to a Proposal's resolved non-INR currency would be a payments-integration change with unverified Razorpay merchant-account currency support, not an R9 display fix — leave both as `'INR'` unchanged; the deposit-payment flow keeps collecting in INR regardless of the Proposal's own currency until a separate effort verifies and scopes multi-currency payment collection (see Scope Boundaries). Fix the hardcoded `₹` in `ProposalTable.tsx` and `ProposalPreviewDrawer.tsx` to look up the symbol for the Proposal's own `currency` field via the new `CURRENCY_SYMBOLS` map — these are genuine display-only occurrences, unlike the Razorpay lines above. In `ProposalEditor.tsx`, add a currency `<select>` next to the existing `gstType` select (currently hardcoded to a ₹ icon with no currency concept at all — this is net-new UI, not an edit to existing currency logic), defaulting to the Workspace currency when no Contact is linked (mirroring `InvoiceEditor.tsx`'s own no-Contact fallback, per R8) and auto-filled from the linked Contact's currency when one is attached, following `InvoiceEditor.tsx`'s existing currency-select pattern (lines 394-411) as the template for the select itself only; wire a `useEffect` on `watch('contactId')` that calls `setValue('currency', contact.currency)` **only when `contact.currency` is non-null** — falling back to the Workspace currency when the linked Contact has none set (KTD5 allows this indefinitely) — when the selected contact changes mid-edit, so switching contacts in an already-open editor keeps the currency field (and the isExport-driven field visibility below) in sync rather than only setting it at initial mount, and never submits a `null` currency that would fail the DTO's `@IsIn` check. Compute `isExport` for this editor as `currency !== 'INR'` — matching KTD1/KTD4's backend definition exactly — **not** `InvoiceEditor.tsx`'s `isIndia && currency !== 'INR'` gate (`isIndia` comes from `useWorkspace()`, which neither `ProposalEditor.tsx` nor `ContractEditor.tsx` currently imports, and KTD8 already establishes that `country`/workspace-level India-ness plays no role in this plan's GST derivation). Hide the `gstType` select entirely when `isExport` is true (server-enforces `EXEMPT`, per KTD4) rather than showing a disabled/read-only version — Proposal has no LUT-equivalent field to show in its place, unlike Invoice, so this pass adds no replacement field, only a conditional hide.

**Patterns to follow:** `invoices.service.ts:101-146` (create() shape after adding currency), `InvoiceEditor.tsx:52,88-96,394-411` (editor currency-select + isExport UI).

**Test scenarios:**
- Happy path: creating a Proposal with a `contactId` whose Contact has `currency: 'USD'` and no `dto.currency` → persisted Proposal has `currency: 'USD'`, `content.gstType: 'EXEMPT'`.
- Happy path: creating a Proposal with `contactId` pointing to an INR Contact → `gstType` follows `dto.content?.gstType` (or defaults to `IGST`), unchanged from today's behavior.
- Edge case: creating a Proposal with no `contactId` at all → resolves via Workspace fallback (per U4), matching R8.
- Edge case: `update()` on an existing non-INR Proposal with no `gstType` change in the request still persists `EXEMPT` — it is not silently overwritten by a stale `content.gstType` value.
- Edge case: `update()` on a pre-existing Proposal with `currency: null` and a linked INR Contact does **not** flip `gstType` to `EXEMPT` — confirms `update()` re-resolves via U4's helper rather than reading the null persisted column.
- Regression: `acceptBySlug()`'s Razorpay deposit-order creation and its returned `depositOrder.currency` still hardcode `'INR'` for a non-INR Proposal — confirms the payments flow was deliberately left untouched, not silently broken by an unrelated currency change elsewhere in the file.
- Covers R4, R5, R7, R9.

**Verification:** New/updated tests in `proposals.service.spec.ts` pass; manually creating a Proposal for a USD Contact in the browser shows the USD currency selected and GST fields hidden in `ProposalEditor.tsx`.

---

### U6. Contract — currency field, GST derivation, editor UI, proposal carry-over

**Goal:** Contract inherits currency and GST behavior the same way Proposal does, and carries its currency forward when created from a signed Proposal.

**Requirements:** R4, R5, R7, R9

**Dependencies:** U1, U4

**Files:**
- `pakka-api/src/modules/contracts/dto/create-contract.dto.ts` (lines 60-71)
- `pakka-api/src/modules/contracts/contracts.service.ts` (`create()` lines 36-48, `update()`, `createFromProposal` ~line 92)
- `pakka-api/src/modules/contracts/contracts.service.spec.ts` (new — no existing spec file for this service)
- `pakka-app/src/features/contracts/components/ContractEditor.tsx` (`gstType` select ~line 391)
- `pakka-app/src/features/contracts/components/ContractTable.tsx` (~line 134, hardcoded `₹`)
- `pakka-app/src/features/contracts/components/ContractPreviewDrawer.tsx` (hardcoded `₹` amount rows)
- `pakka-app/src/features/contracts/schemas/contract.schema.ts` (add matching `currency` field, mirroring U5's `proposal.schema.ts` change)

**Approach:** Mirror U5's Proposal changes for the DTO, `create()`, editor, and display-parity work exactly: `currency?: string` on `CreateContractDto` with the same `@IsIn([...])` constraint (plus the matching zod field); `create()` calls U4's helper and derives `gstType` per KTD4, writing the enforced value into `content.gstType` (Contract, like Proposal, has no top-level `gstType` column). **`update()` does not mirror Proposal's** — Contract's current `update()` (`contracts.service.ts:175-189`) has no `gstType` handling at all; it overwrites `content` verbatim with `dto.content` when present, and Contract has no `calcTotals`/line-items recompute anywhere (`totalAmount`/`gstAmount` are plain numbers, copied once from the source Proposal). So this unit adds fresh enforcement rather than adapting an existing one: when `dto.content` is present, call `resolveDocumentCurrency()` (Contract's existing `contactId`, any `dto.currency` override) and merge the derived `gstType` into `dto.content` before the verbatim write — never read the Contract's own persisted `currency` column directly (same null-legacy-row hazard as U5 — every pre-existing Contract has `currency: null`). `createFromProposal()` carries the source Proposal's `currency` forward as `proposal.currency ?? 'INR'` — the same literal-floor treatment U7 gives `createFromContract()` (KTD6) — rather than a fresh Contact/Workspace lookup: pre-existing Proposals (created before U5 ships) have `currency: null` per KTD7, and the floor exists only to satisfy this constraint, not to re-derive from the Contact. Fix the hardcoded `₹` in `ContractTable.tsx` and `ContractPreviewDrawer.tsx` using the shared `CURRENCY_SYMBOLS` map introduced in U5. `ContractEditor.tsx` gets the same currency-select + isExport-driven field visibility as U5 — `isExport` computed as `currency !== 'INR'` (not `InvoiceEditor.tsx`'s `isIndia`-gated version; same reasoning as U5), `gstType` select hidden entirely when `isExport` is true, no LUT-equivalent replacement — the same Workspace-currency no-Contact default, and the same null-guarded `watch('contactId')` re-sync `useEffect` as `ProposalEditor.tsx`, using `InvoiceEditor.tsx` as the shared template for the select itself only. Since no spec file exists for `contracts.service.ts` today, this unit's test file is new — establish it using the same `Test.createTestingModule` / mocked-Prisma pattern as `invoices.service.spec.ts` and `proposals.service.spec.ts`, scoped to whatever `create()`/`update()`/`createFromProposal()` coverage this unit needs (not a full retroactive test suite for the rest of the service).

**Patterns to follow:** U5 (Proposal) for the DTO/service/editor shape; `proposals.service.spec.ts` / `invoices.service.spec.ts` for the new spec file's structure.

**Test scenarios:**
- Happy path: creating a Contract with a `contactId` whose Contact has `currency: 'GBP'` → persisted Contract has `currency: 'GBP'`, `content.gstType: 'EXEMPT'`.
- Happy path: `createFromProposal()` on a Proposal with `currency: 'EUR'` → the created Contract also has `currency: 'EUR'`, not a fresh Contact lookup.
- Edge case: `createFromProposal()` on a Proposal with `currency: null` (created before U5 shipped) → the created Contract has `currency: 'INR'` (the literal floor), confirming no fresh Contact/Workspace lookup runs — mirrors U7's equivalent `createFromContract()` test.
- Edge case: creating a Contract with no `contactId` → Workspace fallback, matching R8.
- Edge case: `update()` on an existing non-INR Contract with no `gstType` change in the request still persists `EXEMPT` — mirrors U5's equivalent Proposal test.
- Covers R4, R5, R7, R9.

**Verification:** New `contracts.service.spec.ts` passes; manually creating a Contract from a non-INR Proposal in the browser shows the same currency carried over.

---

### U7. Invoice — adopt shared helper, contract-currency carry-over

**Goal:** Invoice's existing currency/GST logic moves onto the shared helper, and Invoice generated from a signed Contract uses the Contract's own currency (KTD6).

**Requirements:** R5, R7, R9, R10

**Dependencies:** U4, U6

**Files:**
- `pakka-api/src/modules/invoices/invoices.service.ts` (`create()` lines 101-146, `createFromContract` 199-268)
- `pakka-api/src/modules/invoices/invoices.service.spec.ts`
- `pakka-app/src/features/invoices/components/InvoiceEditor.tsx` (currency default value ~lines 73, 81; `useWorkspace()` currency/isIndia reads ~lines 52, 88-96)
- `pakka-app/src/features/invoices/schemas/invoice.schema.ts` — no change needed; Invoice's zod schema already carries a `currency` field alongside the existing backend column
- `pakka-app/src/features/invoices/components/InvoiceTable.tsx` (~line 132, hardcoded `₹`)
- `pakka-app/src/features/invoices/components/InvoiceCard.tsx` (hardcoded `₹`)
- `pakka-app/src/features/invoices/components/InvoicePreviewDrawer.tsx` (~line 177, hardcoded `₹`)
- `pakka-app/src/features/invoices/components/RecordPaymentModal.tsx` (hardcoded `₹`)

**Approach:** Replace `create()`'s inline `const currency = dto.currency ?? 'INR'; const isExport = currency !== 'INR';` with a call to U4's `resolveDocumentCurrency()` — behavior is unchanged for existing callers that already send `currency` (the helper's first resolution step), and newly correct for the case of a `contactId`-linked Invoice created without an explicit currency. In `createFromContract()`, set the new Invoice's `currency` to `contract.currency ?? 'INR'` — a plain nullish-coalesce, **not** a call into `resolveDocumentCurrency()` (KTD6): the helper's job is inheriting from a live Contact/Workspace, and calling it here would silently reintroduce the fresh-lookup behavior KTD6 explicitly rules out. The `?? 'INR'` exists only to satisfy Invoice's NOT-NULL `currency` column for Contracts created before U6 shipped (where `Contract.currency` is still `null`) — those Invoices land on INR, not on a Contact/Workspace lookup, consistent with "use the Contract's currency as signed, nothing fresher." In `InvoiceEditor.tsx`, change the currency field's default value from `wsCurrency` (`useWorkspace().currency`) to the linked Contact's currency when one is attached, falling back to `wsCurrency` when there's no Contact or the linked Contact's `currency` is null — same auto-fill pattern as U5/U6, including the same null-guarded `watch('contactId')` re-sync `useEffect`, applied to the one editor that already has a currency select. Fix the hardcoded `₹` in `InvoiceTable.tsx`, `InvoiceCard.tsx`, `InvoicePreviewDrawer.tsx`, and `RecordPaymentModal.tsx` using the shared `CURRENCY_SYMBOLS` map introduced in U5 — Invoice already has a working `currency` column today, so these four components are display-parity fixes only, not new inheritance logic.

**Patterns to follow:** This unit's own current `create()` code is the pattern for U5/U6 rather than the reverse — no external pattern needed beyond U4's helper contract.

**Test scenarios:**
- Happy path: `create()` behavior for a request that already sends `currency` is unchanged (regression check against existing `invoices.service.spec.ts` coverage).
- Happy path: `create()` with a `contactId`-linked Contact whose `currency` is set and no explicit `dto.currency` → Invoice inherits the Contact's currency (previously would have defaulted to `'INR'` unconditionally).
- Happy path: `createFromContract()` on a Contract with `currency: 'USD'` → the generated Invoice has `currency: 'USD'`.
- Edge case: `createFromContract()` on a Contract with `currency: null` (created before U6 shipped) → the generated Invoice has `currency: 'INR'` (the literal floor), confirming no fresh Contact/Workspace lookup runs.
- Covers R5, R7, R9, R10.

**Verification:** Existing and new tests in `invoices.service.spec.ts` pass; manually generating an Invoice from a non-INR signed Contract in the browser shows the same currency.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|-----------|
| The repo's own migration-apply convention is internally inconsistent (`db push` vs. `DIRECT_URL`-based CLI migrations) — see U1 | Confirm the actual apply command with whoever owns deploys before running U1's migration against any shared database |
| `resolveDocumentCurrency()` (U4) becomes a single point of failure for three services' currency correctness | U4 is written test-first with the full resolution-order matrix covered before U5/U6/U7 consume it |
| No existing `contracts.service.spec.ts` — this plan's U6 is the first real test coverage for that service | Scope U6's new spec file to the currency/GST behavior this plan adds, not a retroactive full-service test suite |
| Contact's `currency`/`country` being nullable-with-no-default means every downstream currency lookup must handle `null` explicitly | U4's helper is the only place that needs to encode the fallback chain; U2/U3 don't need to replicate it |

---

## Scope Boundaries

- Per-document currency override as a distinct toggle mechanism — the origin doc's decision stands; KTD3 clarifies that the existing editable currency select is not that mechanism.
- A simplified binary Indian/International toggle — rejected in the origin doc in favor of the full Country + Currency picker.
- Mixed-currency line items within a single document — not requested, not addressed.
- Cross-currency reporting rollups — not addressed; revisit only if it becomes a real pain point.
- Retroactive relabeling or backfill of existing documents when a Contact's currency changes — explicitly rejected (R10); see KTD7 for why no migration script is needed.
- An `exchangeRate` field for Proposal/Contract — Invoice already has one; out of scope here.
- Multi-currency Razorpay deposit-order collection on Proposals — `acceptBySlug()`'s `razorpay.orders.create()` call and its `depositOrder` payload keep hardcoding `'INR'` regardless of the Proposal's own currency (see U5's Approach). Verifying and enabling non-INR order currencies on the connected Razorpay merchant account is a separate, payments-integration effort this plan does not take on.

### Deferred to Follow-Up Work

- A confirmation step when editing an existing Contact's country/currency (the origin doc left this as an open question; this plan treats it as a plain field edit with no added friction, consistent with how every other Contact field is edited today).

---

## Open Questions

None blocking — the origin doc's three deferred questions are resolved by KTD3 (per-document override), KTD4/U5/U6 (Proposal/Contract editor GST field suppression, built fresh rather than adapted from an existing conditional), and KTD6 (invoice-from-contract currency source).
