---
title: Wire "Add with AI" and "Find Contacts" into ContactsPage
date: 2026-07-09
type: feat
origin: docs/brainstorms/2026-07-09-contacts-ai-and-finder-requirements.md
status: ready
---

## Problem

Two user-facing features from the old Leads page were not ported when the unified Contact entity replaced Leads: **Add with AI** (Gemini-assisted contact creation) and **Find Contacts** (deep-link to the external contact finder). This plan wires both into ContactsPage.

## Scope

**In:** ContactsPage header buttons, AI extraction modal for contacts (frontend only), stage selector in AI review panel.
**Out:** Changes to `leads.getclearwork.in`, backend endpoint changes, porting these buttons elsewhere. (see origin: `docs/brainstorms/2026-07-09-contacts-ai-and-finder-requirements.md`)

## Key Technical Decisions

1. **Backend endpoint reuse** — `POST /ai/extract-lead` returns identical fields to what a Contact needs (`name`, `email`, `phone`, `company`, `service`, `budget`, `source`, `notes`). `useExtractLead` is reused as-is; no new hook or backend change required.

2. **`AIModal` extension, not duplication** — `AIModal` already supports a `MODE_CONFIG` keyed by mode string. Adding `contact` to `AIModalMode` and `MODE_CONFIG` is 10 lines vs a full component duplicate.

3. **New `ContactReviewPanel`** — A `LeadReviewPanel` parallel that adds a stage selector (not `ContactStagePicker`, which is designed for editing an existing contact). All stages available for new contacts; default is `ENQUIRY`.

4. **`createContactSchema` extended with `stage`** — The backend `CreateContactDto` already accepts an optional `stage` field. The frontend schema just needs one added line. This is the correct layer to add it (not the `createContact` function directly).

5. **`openContactFinder` inlined into ContactsPage** — Identical logic to `openLeadFinder` in LeadsPage. No shared utility extracted; the pattern is simple enough to duplicate.

---

## Implementation Units

### U1 — Extend `createContactSchema` with optional `stage`

**Goal:** Allow the AI contact creation flow to pass a stage to the API.

**Files:**
- Modify: `src/features/contacts/schemas/contact.schema.ts`

**Approach:** Add `stage: z.enum(CONTACT_STAGES).optional()` to `createContactSchema`. Because `createContact` in `useContacts.ts` spreads `...input`, the field passes through automatically.

**Verification:** `CreateContactInput` type now includes `stage?: ContactStage`. TypeScript compile passes.

---

### U2 — Add `contact` mode config to `AIModal`

**Goal:** Enable `AIModal` to render with contact-appropriate copy when `mode="contact"`.

**Files:**
- Modify: `src/features/ai/components/AIModal.tsx`

**Approach:**
- Add `'contact'` to the `AIModalMode` union: `export type AIModalMode = 'lead' | 'proposal' | 'contact'`
- Add a `contact` entry to `MODE_CONFIG`:
  ```
  contact: {
    title:    'Extract Contact with AI',
    subtitle: 'Paste a conversation, email, or describe the contact',
    textPlaceholder: 'Paste a WhatsApp message, email, or describe the contact…\n\nExamples:\n• "Ritu runs a cafe, ritu@gmail.com, looking for website"\n• "Met Arjun at a conf, needs brand identity"\n• Forward an email introduction here',
    examples: [
      '"Runs a cafe, needs website, budget ~₹80k"',
      '"Need brand identity for startup"',
      '"Intro email from potential client"',
    ],
    showPricingContext: false,
  }
  ```

**Verification:** No TypeScript errors. `AIModal` renders with correct copy when `mode="contact"`.

---

### U3 — Create `ContactReviewPanel` component

**Goal:** A review panel for AI-extracted contact data that includes a stage selector.

**Files:**
- Create: `src/features/ai/components/ContactReviewPanel.tsx`

**Approach:** Mirror `LeadReviewPanel` with these changes:
- `EditableContact` type adds `stage: ContactStage` (defaulting to `'ENQUIRY'`)
- Budget field label → "Deal Value (₹)" (matching Contact field name)
- Source options → same `CONTACT_SOURCES` values already in the contacts schema
- Add a stage select row in the form grid (col-span-2 sm:col-span-1, alongside Source):
  - Label: "Stage"
  - `<select>` with all `CONTACT_STAGES` options, rendered using `STAGE_LABELS`
  - Default: `ENQUIRY`
- `onConfirm` callback signature: `(data: EditableContact) => void` where `EditableContact` includes `stage`
- Button text: "Create Contact" (not "Create Lead")
- Reuse `ConfidencePip`, `Field`, `inputCls`, and footer pattern unchanged from `LeadReviewPanel`
- Import: `CONTACT_STAGES`, `STAGE_LABELS` from `@/features/contacts/schemas/contact.schema`

**Verification:** Component renders with all 8 data fields + stage selector. Stage defaults to "Enquiry" and is changeable. "Create Contact" button disabled when name empty.

---

### U4 — Create `AIContactModal` orchestrator

**Goal:** 3-phase AI modal that extracts contact data and creates a Contact via `useCreateContact`.

**Files:**
- Create: `src/features/ai/components/AIContactModal.tsx`

**Approach:** Mirror `AILeadModal` exactly, with these substitutions:
- `useExtractLead` → same import (endpoint reused)
- `useCreateLead` → `useCreateContact` from `@/features/contacts/hooks/useContacts`
- Review component: `ContactReviewPanel` (U3) instead of `LeadReviewPanel`
- `AIModal mode="contact"` (U2) instead of `mode="lead"`
- `handleConfirm` maps `data.budget → dealValue` and passes `stage`:
  ```ts
  await createMutation.mutateAsync({
    name:      data.name,
    email:     data.email     || undefined,
    phone:     data.phone     || undefined,
    company:   data.company   || undefined,
    service:   data.service   || undefined,
    dealValue: data.budget    || undefined,
    source:    (data.source   || undefined) as ContactSource | undefined,
    notes:     data.notes     || undefined,
    stage:     data.stage,
  })
  ```
- Toast: `'Contact created from AI extraction'`

**Patterns to follow:** `src/features/ai/components/AILeadModal.tsx` — exact structural mirror.

**Verification:** Modal opens, extracts, shows review panel with stage picker, creates contact on confirm. Contact appears in ContactsPage list at the chosen stage.

---

### U5 — Wire "Add with AI" and "Find Contacts" into ContactsPage

**Goal:** Two new action buttons in the ContactsPage header; AI modal mounted conditionally.

**Files:**
- Modify: `src/pages/app/ContactsPage.tsx`

**Approach:**
1. Add imports: `useCallback` (already from 'react'), `Telescope`, `ExternalLink` from lucide-react; `supabase` from `@/lib/supabase`; `AIIcon` from `@/features/ai/components/AIIcon`; `AIContactModal` from `@/features/ai/components/AIContactModal`

2. Add state: `const [showAI, setShowAI] = useState(false)`

3. Add `openContactFinder` function (after existing `useRef` line):
   ```ts
   const openContactFinder = useCallback(async (e: React.MouseEvent<HTMLAnchorElement>) => {
     e.preventDefault()
     const { data: { session } } = await supabase.auth.getSession()
     const base = import.meta.env.VITE_LEADS_APP_URL ?? 'https://leads.getclearwork.in'
     const url = session
       ? `${base}?at=${encodeURIComponent(session.access_token)}&rt=${encodeURIComponent(session.refresh_token)}`
       : base
     window.open(url, '_blank', 'noopener,noreferrer')
   }, [])
   ```

4. In the header's button group (before the existing "Add Contact" button), add:
   ```tsx
   {/* Find Contacts */}
   <a
     href={import.meta.env.VITE_LEADS_APP_URL ?? 'https://leads.getclearwork.in'}
     onClick={openContactFinder}
     className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
   >
     <Telescope size={13} />
     Find Contacts
     <ExternalLink size={10} className="opacity-60" />
   </a>
   {/* Add with AI */}
   <button
     onClick={() => setShowAI(true)}
     title="Add with AI"
     className="flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-lg text-[13px] font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-sm hover:shadow-indigo-200 hover:shadow-md transition-all"
   >
     <AIIcon size={13} />
     <span className="hidden sm:inline">Add with AI</span>
   </button>
   ```

5. Mount `AIContactModal` near the bottom (alongside existing `AddContactModal`):
   ```tsx
   {showAI && <AIContactModal onClose={() => setShowAI(false)} />}
   ```

**Patterns to follow:** `src/pages/app/LeadsPage.tsx` — header button layout and `openLeadFinder` pattern.

**Verification:** Both buttons visible in header. "Find Contacts" opens correct URL in new tab. "Add with AI" opens AI modal, full flow completes, new contact visible in list.

---

## Sequencing

```
U1 ─────────────────────────────────────────────────────────► (schema)
U2 ─────────────────────────────────────────────────────────► (AIModal)
                  U3 (needs ContactStage from U1) ──────────► (ContactReviewPanel)
                              U4 (needs U2 + U3) ────────────► (AIContactModal)
                                          U5 (needs U4) ─────► (ContactsPage)
```

U1 and U2 are independent. U3 can start after U1. U4 needs U2 and U3. U5 needs U4.

Serial execution order: **U1 → U2 → U3 → U4 → U5**

---

## Test Scenarios

**U3 / U4 — AI contact creation (F1):**
- Paste contact text → click Extract → review panel shows pre-filled fields + stage selector defaulting to Enquiry
- User changes stage to "Proposal Sent" → confirms → contact created at PROPOSAL_SENT stage
- Low-confidence extraction → review panel still shows (editable), not blocked
- Empty name → "Create Contact" button disabled
- Confirm fails (API error) → toast error shown, modal stays open

**U5 — Find Contacts (F2):**
- "Find Contacts" click → new tab opens to `VITE_LEADS_APP_URL` with `at=` and `rt=` params
- No session → new tab opens to base URL without params
- ClearWork app URL does not change when "Find Contacts" is clicked
