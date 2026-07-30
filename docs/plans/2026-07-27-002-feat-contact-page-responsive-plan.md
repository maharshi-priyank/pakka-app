---
title: "feat: Contact page responsive layout (mobile + tablet)"
type: feat
date: 2026-07-27
status: draft
---

# feat: Contact page responsive layout (mobile + tablet)

## Summary

The Contact detail page uses a fixed 264 px left panel beside a flex-1 right area. On a 375 px phone that panel consumes ~70 % of the screen, leaving ~111 px for the project/messages content — entirely unusable. The app shell already hides the global sidebar below `lg` and shows the BottomNav, but `ContactPage.tsx` has zero responsive handling. This plan makes the page usable at every viewport without changing any backend or routing.

---

## Problem Frame

| Viewport | Current behaviour | Target behaviour |
|---|---|---|
| Mobile < 768 px | 264 px profile panel + ~111 px content — broken | Single-column: compact profile strip + collapsible details above tabs |
| Tablet 768–1023 px | 264 px panel in 768 px screen — cramped (34 %) | 200 px panel + flex-1 content |
| Desktop ≥ 1024 px | 264 px panel — correct | No change |

---

## Requirements

- R1: Profile panel visible and usable on tablet (md+), hidden on mobile.
- R2: All profile data (email, phone, service, deal value, source, follow-up, notes, portal link) accessible on mobile via a collapsible details section.
- R3: Tab bar (Projects / Messages / Meetings) scrollable horizontally; no wrapping; touch targets ≥ 44 px.
- R4: Project accordion header meets 48 px minimum touch target; document rows readable on narrow screens.
- R5: Loading skeleton matches the responsive layout at each breakpoint.
- R6: Dark mode correct throughout.
- R7: No visual regressions on desktop.

---

## Key Technical Decisions

**KTD-1 — Breakpoint for panel collapse: `md` (768 px)**
`lg` (1024 px) is already the sidebar/BottomNav breakpoint in AppShell. Using `md` for the panel keeps the responsive cascade simple: panel hidden on phones, narrowed on tablets, full on desktop — three clean tiers.

**KTD-2 — Mobile profile: collapsible section, not a new "Info" tab**
Adding a fourth tab changes navigation semantics and hides contact details behind an extra click. A collapsible strip below the header (always visible summary, expand for full details) gives instant access on mobile without altering the tab structure that already works on desktop.

**KTD-3 — Expand/collapse via `max-height` CSS transition, not unmount**
`max-h-0 overflow-hidden → max-h-[600px]` with `transition-all duration-200` gives a smooth reveal without layout jank. Unmounting would lose scroll position in the details section.

**KTD-4 — Tablet panel width: 200 px (`md:w-[200px]`)**
200 px at 768 px viewport = 26 % — comfortable two-panel split. At 1024 px+ the panel widens to the existing 264 px.

---

## High-Level Technical Design

```
Mobile (< md = 768 px)
┌──────────────────────────────────────────────┐
│ ← [K] Kalapi  [Proposal Sent ▼]  [Edit] [⋯] │  sticky header (unchanged)
├──────────────────────────────────────────────┤
│ ✉ kalapi@… · ☎ +91 972…  [▼ Details]        │  MobileProfileStrip (md:hidden)
│ ─ expanded ──────────────────────────────── │
│   Email / Phone / Service / Deal / Source /  │
│   Follow-up / Notes / Portal                 │
├──────────────────────────────────────────────┤
│ [Projects 2] [Messages] [Meetings 1]  ─────→ │  overflow-x-auto tab bar
├──────────────────────────────────────────────┤
│  tab content (full width, scrollable)        │
└──────────────────────────────────────────────┘

Tablet (md–lg = 768–1023 px)
┌──────────────────────────────────────────────┐
│ sticky header                                 │
├──────────────┬───────────────────────────────┤
│ 200 px aside │  flex-1 tabs + content        │
│  (profile)   │                               │
└──────────────┴───────────────────────────────┘

Desktop (≥ lg = 1024 px)   ← unchanged
┌──────────────┬───────────────────────────────┐
│ 264 px aside │  flex-1 tabs + content        │
└──────────────┴───────────────────────────────┘
```

---

## Implementation Units

### U1. Responsive aside + layout shell

**Goal:** Make the profile `<aside>` and its loading-skeleton counterpart responsive.

**Requirements:** R1, R5, R7

**Dependencies:** none

**Files:**
- `src/pages/app/ContactPage.tsx`

**Approach:**
- `<aside>` classes: change `w-[264px] shrink-0` → `hidden md:flex md:w-[200px] lg:w-[264px] shrink-0`
- The `flex flex-col` and all other aside classes remain.
- Loading skeleton aside (lines ~138–147): apply the same `hidden md:flex md:w-[200px] lg:w-[264px]` swap.
- The `<div className="flex flex-1 overflow-hidden">` wrapper needs no change — `flex-1` right panel already expands to fill.
- On mobile the body area becomes a single full-width column (just the flex-1 right div).

**Patterns to follow:** AppShell uses `hidden lg:block` for the desktop sidebar — same pattern, different breakpoint.

**Test scenarios:**
- At 375 px viewport: aside is `display: none`; right panel takes full width.
- At 768 px viewport: aside visible at ~200 px; right panel fills remaining space.
- At 1024 px+ viewport: aside at 264 px; no change to desktop appearance.
- Loading skeleton renders correct widths at all three breakpoints.

**Verification:** Resize browser DevTools to 375, 768, and 1280 px; aside shows/hides/resizes correctly; no horizontal overflow at any size.

---

### U2. Mobile profile strip (`MobileProfileStrip`)

**Goal:** Give mobile users access to all contact info through a compact always-visible summary row and a collapsible full-details section. Visible only below `md`.

**Requirements:** R2, R6

**Dependencies:** U1

**Files:**
- `src/pages/app/ContactPage.tsx` (add `MobileProfileStrip` as an inline function component near `TabButton`)

**Approach:**
- Render `<MobileProfileStrip />` immediately above the tab bar inside the main column, wrapped in `<div className="md:hidden">`.
- Component receives all the same `contact`, `palette`, `portalCopied`, `handleCopyPortal`, `isOverdueFollowUp` props already available in scope.
- **Summary row** (always visible): small avatar pill (w-7 h-7 rounded-full, same palette), name in 13px font, followed by the two most useful quick-access fields — email as a `mailto:` tap link and phone as a `tel:` tap link (icon + truncated value). End of row: `<button>Details <ChevronDown /></button>`.
- **Expanded panel** (`useState<boolean>(false)` local to MobileProfileStrip): `max-h-0 overflow-hidden → max-h-[600px]` toggle on Details button click, `transition-all duration-200 ease-in-out`. Inside: reuse the same `FieldRow` component calls already in the aside (email, phone, service, deal value, source, follow-up, notes, portal link). Two divider `h-px` lines between field groups mirror the desktop aside groups.
- Summary row: `px-4 py-2.5 bg-white dark:bg-[#13141A] border-b border-[#F2F4F7] dark:border-[#26283A] flex items-center gap-2.5`.
- Expanded section: `px-4 pb-3 bg-white dark:bg-[#13141A] border-b border-[#F2F4F7] dark:border-[#26283A] space-y-3`.
- ChevronDown rotates 180° when open: `transition-transform duration-200`.

**Patterns to follow:** The aside profile card in ContactPage for field ordering and FieldRow usage. The collapsible pattern mirrors the project accordion's open/close state.

**Test scenarios:**
- Strip only renders below `md` (md:hidden wrapper).
- Summary row shows avatar, name, email tap, phone tap, and "Details" button.
- Tapping "Details" expands the full details section smoothly (not a jarring snap).
- Tapping again collapses it.
- All tappable values (email, phone, portal copy) are functional.
- Overdue follow-up shows red text and icon same as desktop aside.
- Dark mode colors correct throughout the strip.
- If contact has no phone/email/etc., those rows are absent (same null-check logic as aside).

**Verification:** On a real 375 px viewport (DevTools mobile emulation), every field of the aside is reachable in the expanded strip; the "Details" toggle animates; email and phone links launch native handlers.

---

### U3. Tab bar horizontal scroll + touch targets

**Goal:** Prevent tab text from wrapping on narrow screens; ensure each tab button is tappable.

**Requirements:** R3

**Dependencies:** U1

**Files:**
- `src/pages/app/ContactPage.tsx` (tab bar div + `TabButton`)

**Approach:**
- Tab bar container `<div className="flex items-end gap-0.5 px-4 pt-1 ...">`:  add `overflow-x-auto scrollbar-none` — tabs scroll horizontally if they overflow.
- `TabButton` component: add `shrink-0` on the button so tabs don't compress. Current height is implicitly set by padding; ensure `min-h-[44px]` is set (or `py-3` which already gives ~44 px total including text — verify and add `min-h-[44px]` if needed).
- Tab content scroll area (`<div className="flex-1 overflow-y-auto">`): add `pb-safe` or `pb-4` padding on mobile so the last item isn't hidden behind BottomNav. AppShell already adds `pb-[76px]` to the outer `<main>` — verify this is inherited; if ContactPage's `overflow-hidden` clips it, add `pb-0 md:pb-0` and rely on AppShell's padding.

**Patterns to follow:** BottomNav `PRIMARY_TABS` uses `flex-1` per tab; for horizontal-overflow cases use `shrink-0` instead.

**Test scenarios:**
- At 375 px with all three tabs: no wrapping, tabs scroll horizontally if needed.
- Each tab button tappable area ≥ 44 px tall.
- Active tab underline indicator visible after horizontal scroll.
- Tab bar does not overlap BottomNav content.

**Verification:** In DevTools mobile emulation, switch between all three tabs; no layout shift; bottom content not clipped by BottomNav.

---

### U4. `ContactProjectAccordion` mobile touch targets

**Goal:** Make accordion headers and document action rows usable on touch screens.

**Requirements:** R4

**Dependencies:** U1

**Files:**
- `src/features/contacts/components/ContactProjectAccordion.tsx`

**Approach:**
- Accordion header `<button>`: change `py-3.5` to `py-3 min-h-[48px]` — ensures 48 px touch target on mobile without changing desktop appearance (48 px ≈ 3.5 + label height already, explicit min-h makes it explicit).
- Document rows inside the expanded area: each document row is a `<button>` or `<div>` with `px-4 py-2`. Add `min-h-[40px]` and `flex items-center` to ensure consistent touch target.
- Quick-add buttons row (`+ Proposal + Contract + Invoice`): wrap in `flex flex-wrap gap-2` so they stack gracefully on very narrow viewports instead of overflowing. Currently they are `flex gap-2` — adding `flex-wrap` is the only change.
- The external link icon at the top-right of the accordion header (`<a href=... ><ExternalLink /></a>`): add `p-2 -mr-2` to increase tap area to ≥ 40 px without changing visible size.

**Patterns to follow:** Existing button classes in ContactProjectAccordion for color/hover tokens.

**Test scenarios:**
- Accordion header min height ≥ 48 px on mobile (use DevTools element inspector).
- Tapping anywhere in the header row opens/closes the accordion (no dead zone).
- Quick-add buttons wrap to two rows on 320 px screen without overflow.
- External link tap area is comfortably tappable (not just the 15 px icon).

**Verification:** On mobile emulation: open/close accordion; tap each quick-add button; no horizontal overflow of the accordion card.

---

### U5. Loading skeleton responsive

**Goal:** The loading skeleton renders the correct single-column layout on mobile, two-narrow-column on tablet, two-full-column on desktop.

**Requirements:** R5

**Dependencies:** U1

**Files:**
- `src/pages/app/ContactPage.tsx` (loading branch, lines ~129–170)

**Approach:**
- The skeleton aside currently has `w-[264px] shrink-0` — apply same responsive classes as U1: `hidden md:flex md:w-[200px] lg:w-[264px] shrink-0`.
- The skeleton right panel (`flex-1`) needs no change.
- Add a mobile skeleton strip placeholder (`md:hidden`): a simple `<div>` with `h-[52px] bg-[#F9FAFB] dark:bg-[#1A1B23] animate-pulse border-b ...` matching the height of the MobileProfileStrip summary row. No detailed field skeletons needed — the strip is short enough that the actual data loads fast.

**Patterns to follow:** Existing skeleton shimmer classes (`animate-pulse`, `bg-[#F2F4F7]`) already in the loading branch.

**Test scenarios:**
- At 375 px: skeleton shows no left panel; shows the strip placeholder + tab bar placeholder.
- At 768 px: skeleton shows 200 px left panel shimmer.
- At 1024 px+: skeleton shows 264 px left panel shimmer (identical to current).

**Verification:** Throttle network to Slow 3G in DevTools; resize across breakpoints during load; skeleton matches the real layout at each size.

---

## Scope Boundaries

**In scope:**
- `ContactPage.tsx` responsive layout + MobileProfileStrip
- `ContactProjectAccordion.tsx` touch targets
- Loading skeleton responsive

**Deferred to Follow-Up Work:**
- Swipe gestures to navigate between tabs on mobile
- Messages tab: pinning `ReplyComposer` to bottom with keyboard-aware `visualViewport` resize handling (separate, non-trivial)
- Meetings tab responsive layout (currently just a list — lower risk)
- ContactStagePicker dropdown positioning on mobile (no reported issue yet)
- Pull-to-refresh on the projects/messages lists

**Out of scope:**
- Backend or API changes
- New routes or navigation structure
- Any desktop layout changes (desktop must be pixel-identical before and after)

---

## Risks & Dependencies

| Risk | Likelihood | Mitigation |
|---|---|---|
| `overflow-hidden` on ContactPage root clips BottomNav padding from AppShell | Medium | Verify `pb-[76px]` from AppShell reaches tab content; add explicit mobile padding on the scroll container if clipped |
| `max-height` transition on MobileProfileStrip feels slow when content is tall | Low | Cap at `max-h-[600px]`; if still sluggish, reduce to `max-h-[480px]` (notes field can wrap) |
| Tablet 200 px panel too narrow for long email addresses in FieldRow | Low | FieldRow already uses `break-all` on email `<a>` tag; no change needed |
| Dark mode color mismatch in new MobileProfileStrip | Low | Copy exact token values from the desktop aside; no new colors introduced |
