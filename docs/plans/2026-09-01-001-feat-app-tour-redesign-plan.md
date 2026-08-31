---
title: App Tour Redesign
date: 2026-09-01
type: feat
status: ready
origin: docs/brainstorms/2026-09-01-app-tour-redesign-requirements.md
---

# App Tour Redesign

## Problem Frame

The feature-discovery tour has never auto-fired. `startIfFirstVisit` is defined in `src/hooks/useOnboardingTour.ts` but is never called anywhere. Two tour steps reference broken DOM anchors (`#tour-leads`, `#tour-clients`). New users completing the OnboardingWizard receive no guided orientation to the app's 16 sections.

This plan wires the tour to auto-start for new desktop users after they dismiss the WelcomeModal, fixes all broken anchors, adds a two-chapter core + extended structure with an "Explore all features" branch, and restricts the tour to desktop (≥ 1024px).

---

## Requirements Trace

| Req | Origin | Covered By |
|-----|--------|-----------|
| Auto-start after wizard for new desktop users | F1 (origin) | U3 |
| Core 7-stop highlights tour | F2 (origin) | U2 |
| Extended 9-stop "Explore all features" branch | F3 (origin) | U2 |
| Skip/close writes localStorage flag | F4 (origin) | U2 |
| Replay via Settings retained | F5 (origin) | No change needed |
| All 16 nav items have valid `tourId` | AE3 (origin) | U1 |
| Mobile suppression (< 1024px) | AE2 (origin) | U3 |
| Tour does not re-fire for returning users | AE6 (origin) | U3 |

---

## Key Technical Decisions

**D1 — sessionStorage flag, not profile field**
The trigger mechanism uses `sessionStorage.setItem('clearwork_post_onboard', '1')` set in WelcomeModal's `onAction` callback. AppShell clears it and fires the tour once on the first route change after wizard completion. No backend changes needed; localStorage guards against repeat fires.

**D2 — "Explore all features" via HTML-injected button**
driver.js 1.x does not support two-button popovers natively. The outro step's `description` field injects a secondary button via HTML. `window._cwStartExtended` is set as a closure reference to `startExtendedTour` inside the hook and cleared on `onDestroyed`. This is a known driver.js 1.x pattern.

**D3 — Desktop-only guard in trigger, not in hook**
The `window.innerWidth >= 1024` guard lives in the AppShell trigger, not in the hook itself. `resetTour` in Settings → Profile remains callable unconditionally (the user explicitly requested it).

**D4 — Single `TOUR_KEY` covers both chapters**
`clearwork_tour_v1_seen` is written on `onDestroyed` regardless of whether the user took the core or extended path. No separate key for extended tour completion.

**D5 — CSS class stays `pakka-tour-popover`**
`src/index.css` already defines styles under `.pakka-tour-popover`. The hook's `popoverClass` must use this existing name (not `clearwork-tour-popover` from prior draft notes). Update the comment-only reference in the hook to match.

---

## Implementation Units

### U1 — Add missing tourIds to navItems

**Goal:** Every nav item has a valid `tourId` so driver.js can highlight it from any page.

**Files:**
- Modify: `src/components/layout/navItems.ts`

**Approach:**
Add `tourId` to the 12 nav items currently missing it. Four items already have values (dashboard, proposals, contracts, invoices) — leave those unchanged.

| id | tourId to add |
|----|--------------|
| contacts | `tour-contacts` |
| leads | `tour-leads` |
| projects | `tour-projects` |
| tasks | `tour-tasks` |
| inbox | `tour-inbox` |
| time | `tour-timelog` |
| expenses | `tour-expenses` |
| billing | `tour-billing` |
| reports | `tour-reports` |
| calendar | `tour-calendar` |
| forms | `tour-forms` |
| automations | `tour-automations` |

**Patterns to follow:** Existing `tourId` values in the same file — copy the pattern exactly.

**Verification:** All 16 `ALL_NAV_ITEMS` entries have a non-empty `tourId`. No TypeScript errors. Sidebar still renders correctly (tourId is optional in the NavItem interface, but all should be populated after this unit).

**Test scenarios:**
- TS1: Each of the 12 items receives the correct `tour-*` id matching the table above
- TS2: The four existing tourIds (dashboard, proposals, contracts, invoices) are unchanged
- TS3: TypeScript compiles without error (`npm run build` or `tsc --noEmit`)

---

### U2 — Rewrite useOnboardingTour hook

**Goal:** Replace the broken 8-step tour with a correct two-chapter structure. Fix broken anchors. Add "Explore all features" branch via HTML-injected button. Update popover class reference comment.

**Files:**
- Modify: `src/hooks/useOnboardingTour.ts`

**Approach:**

Rewrite the hook body. Keep the same exports: `{ startTour, startIfFirstVisit, resetTour }`. Add a new internal `startExtendedTour` (not exported — only referenced via `window._cwStartExtended`).

**Core tour steps (startTour / chapter 1):**

| # | element | title | description |
|---|---------|-------|-------------|
| 0 | none (overlay) | "Welcome to ClearWork" | Brief intro: "Let's show you where everything lives. Takes about 90 seconds." |
| 1 | `#tour-dashboard` | "Dashboard" | "Your business at a glance — revenue, activity, and what needs attention." |
| 2 | `#tour-leads` | "Leads" | "Track every prospect in your pipeline before they become a client." |
| 3 | `#tour-contacts` | "Contacts" | "Everyone you've worked with — clients, collaborators, and vendors." |
| 4 | `#tour-proposals` | "Proposals" | "Send polished proposals and track opens, views, and acceptances." |
| 5 | `#tour-contracts` | "Contracts" | "E-sign agreements in minutes. No PDFs, no chasing." |
| 6 | `#tour-invoices` | "Invoices" | "GST-ready invoices with UPI payment links built in." |
| 7 | none (overlay) | "That's the core" | Outro with "Explore all features" secondary button (see D2). Primary CTA: "I'm ready, let's go" (dismisses). |

**Outro step implementation:**
```
description: `
  <p>You now know where the essentials live.</p>
  <div style="margin-top:12px">
    <button id="cw-tour-explore" style="...indigo secondary button styles...">
      Explore all features →
    </button>
  </div>
`,
onNextClick: () => { driverObj.destroy() }
```
After `driver()` is created but before `driverObj.drive()` is called, set:
```typescript
window._cwStartExtended = startExtendedTour
```
In `onDestroyed`, clear it: `delete window._cwStartExtended`.

Add a `click` listener on `#cw-tour-explore` inside the `onHighlighted` callback for step 7, or attach it after DOM paint via `setTimeout(..., 0)` in `onHighlighted`.

**Extended tour steps (startExtendedTour / chapter 2):**

| # | element | title |
|---|---------|-------|
| 8 | `#tour-projects` | "Projects" |
| 9 | `#tour-tasks` | "Tasks" |
| 10 | `#tour-inbox` | "Inbox" |
| 11 | `#tour-timelog` | "Time Log" |
| 12 | `#tour-expenses` | "Expenses" |
| 13 | `#tour-reports` | "Reports" |
| 14 | `#tour-calendar` | "Calendar" |
| 15 | `#tour-forms` | "Forms" |
| 16 | `#tour-automations` | "Automations" |
| 17 | none (overlay) | "You know the whole app" — final outro, single "Let's go" CTA |

Both `driverObj.onDestroyed` callbacks must write `localStorage.setItem(TOUR_KEY, 'true')` and `delete window._cwStartExtended`.

`startIfFirstVisit`: if `localStorage.getItem(TOUR_KEY)` is falsy, call `setTimeout(startTour, 800)`. (This is unchanged from original logic — AppShell calls this.)

`resetTour`: remove TOUR_KEY from localStorage, then call `startTour()`. (Unchanged.)

**Popover class:** `popoverClass: 'pakka-tour-popover'` — matches `src/index.css` existing rules.

**Patterns to follow:** Existing driver.js usage in the file. `src/index.css` lines 394–460 for the existing popover styles.

**Verification:** No driver.js console warnings about missing elements when tour runs. Both chapters proceed without errors. `clearwork_tour_v1_seen` is written after either chapter completes or is dismissed. `window._cwStartExtended` is undefined after tour ends.

**Test scenarios:**
- TS1: `startTour()` runs 8 core steps (0–7) without errors
- TS2: Clicking "Explore all features" button on step 7 triggers `startExtendedTour()` and shows step 8 (Projects)
- TS3: Extended tour runs steps 8–17 without errors
- TS4: Pressing Escape on any step closes tour and sets localStorage flag
- TS5: After `startTour` completes or is closed, `window._cwStartExtended` is `undefined`
- TS6: `startIfFirstVisit` does nothing when `TOUR_KEY` is present in localStorage
- TS7: `resetTour` clears the flag and re-fires `startTour`

---

### U3 — Wire post-wizard auto-trigger in AppShell + WelcomeModal

**Goal:** New desktop users see the tour automatically ~800ms after navigating away from the WelcomeModal for the first time. Returning users are never interrupted.

**Files:**
- Modify: `src/features/onboarding/OnboardingWizard.tsx` (WelcomeModal `onAction` callback)
- Modify: `src/components/layout/AppShell.tsx` (useEffect + useOnboardingTour wiring)

**Approach:**

**In OnboardingWizard.tsx — WelcomeModal `onAction`:**
Before the `navigate(dest)` call, insert:
```typescript
sessionStorage.setItem('clearwork_post_onboard', '1')
```
This applies to all four CTAs (proposals, invoices, contracts, dashboard).

**In AppShell.tsx:**
1. Import `useOnboardingTour` and destructure `startIfFirstVisit`.
2. Add a `useEffect` that depends on `[pathname, startIfFirstVisit]`:
```typescript
useEffect(() => {
  const flag = sessionStorage.getItem('clearwork_post_onboard')
  if (!flag) return
  sessionStorage.removeItem('clearwork_post_onboard')
  if (window.innerWidth < 1024) return
  startIfFirstVisit()
}, [pathname, startIfFirstVisit])
```
The effect fires on every route change. The sessionStorage flag ensures it only acts once (the first navigation after wizard). `startIfFirstVisit` internally guards against re-fires via localStorage.

**Patterns to follow:**
- Existing `useEffect` + `useLocation` usage in AppShell.tsx
- `useProfile` import pattern already in AppShell

**Verification:**
- New user (no localStorage flag, no sessionStorage flag) completes wizard → clicks WelcomeModal CTA → lands on page → tour fires after ~800ms
- Returning user (localStorage flag set) loads any page → tour does not fire
- Mobile user (viewport < 1024px) completes wizard → tour does not fire
- Refreshing after wizard (sessionStorage cleared by browser) → tour does not re-fire (localStorage guards it)

**Test scenarios:**
- TS1: `sessionStorage.getItem('clearwork_post_onboard')` is set after any WelcomeModal CTA is clicked
- TS2: AppShell useEffect clears the sessionStorage flag on first pathname change
- TS3: `startIfFirstVisit` is called exactly once after the flag is detected (desktop, no TOUR_KEY)
- TS4: On viewport < 1024px, `startIfFirstVisit` is NOT called even when the flag is present
- TS5: If `TOUR_KEY` already exists in localStorage, `startIfFirstVisit` is a no-op (guarded inside the hook)
- TS6: Closing the browser tab and re-opening (sessionStorage reset) → flag is gone → tour does not re-fire (localStorage flag still set)

---

## Risks and Dependencies

| Risk | Mitigation |
|------|-----------|
| `window._cwStartExtended` pollutes global namespace | Use TypeScript declaration merge or cast to `(window as any)` — already a pattern in driver.js community for this workaround. Clear it on `onDestroyed`. |
| Sidebar nav items not mounted when AppShell useEffect fires | `startIfFirstVisit` has an 800ms `setTimeout` — nav items are always rendered on desktop before that delay. If a race is observed during testing, increase to 1200ms. |
| driver.js element not found error if sidebar collapses | Sidebar is always expanded on desktop. No collapsible sidebar exists at lg+ breakpoint. Not a risk. |
| "Explore all features" button click handler timing | Use `onHighlighted` callback for step 7 to attach the listener, not a static DOM query. Alternatively `setTimeout(..., 0)` inside `onHighlighted`. |

---

## Sequencing

U1 → U2 → U3. U1 must complete before U2 (step anchors must exist). U2 must complete before U3 (AppShell calls the hook). All three units are in the same package; no backend coordination needed.

---

## Scope Boundaries

**In scope:** navItems tourId additions, hook rewrite (core + extended steps, broken anchor fixes, "Explore all" branch), AppShell auto-trigger wiring, WelcomeModal sessionStorage flag, mobile suppression.

**Out of scope (deferred per origin doc):** personalised tour by work type, DB-backed `tourCompleted`, mobile tour, per-section contextual tooltips, OnboardingWizard or WelcomeModal replacement.

**OQ1 from origin (deferred):** Whether to hide the OnboardingChecklist once the tour is seen. Not addressed in this plan — leave for a follow-up once the tour is validated in production.
