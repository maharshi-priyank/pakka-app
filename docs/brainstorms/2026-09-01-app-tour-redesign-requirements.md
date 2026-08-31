---
title: App Tour Redesign
status: draft
date: 2026-09-01
type: feature
actors: [new_user]
---

# App Tour Redesign

## Problem Frame

ClearWork's app has grown to 16 navigation sections, but the feature-discovery tour has never auto-fired for a single user. `startIfFirstVisit` is defined in `src/hooks/useOnboardingTour.ts` but is never called. The only access point is "Replay tour" in Settings → Profile. Additionally, two of the existing tour steps reference DOM anchors (`#tour-leads`, `#tour-clients`) that don't exist, meaning the tour would break even if it did fire.

New users complete the OnboardingWizard (business setup) and land in the app with no guidance on what the 16 sections are or how they connect. The goal of this redesign is **feature discovery** — every new desktop user should leave their first session knowing where to find the tools available to them.

---

## Actors

**A1 — New desktop user:** Has just completed the OnboardingWizard and navigated away from the WelcomeModal for the first time. `clearwork_tour_v1_seen` is absent from their localStorage.

**A2 — Returning user:** Has seen the tour (flag set). Can replay via Settings → Profile. Tour does not auto-fire again.

**A3 — Mobile user:** Out of scope. Receives wizard + OnboardingChecklist only. Tour is suppressed on screens narrower than the `lg` breakpoint (1024px).

---

## Key Flows

### F1 — Auto-start after wizard (happy path)

1. New user completes OnboardingWizard → API sets `onboardingComplete: true`
2. WelcomeModal renders (existing behaviour — unchanged)
3. User clicks any WelcomeModal action → navigates to their chosen page (proposals/new, invoices/new, contracts/new, or /dashboard)
4. On that page load, on desktop (≥ 1024px): AppShell checks `clearwork_tour_v1_seen` is absent → fires `startIfFirstVisit` with a short delay (800ms) so the page settles first
5. Tour starts with the core highlights sequence (see F2)
6. On tour destroy: `clearwork_tour_v1_seen = 'true'` is written to localStorage

### F2 — Core highlights tour (7 stops + outro)

Steps, in order:

| Stop | Anchor | Title |
|---|---|---|
| 0 | (no anchor — full overlay) | Welcome intro card |
| 1 | `#tour-dashboard` | Dashboard — your business at a glance |
| 2 | `#tour-leads` | Leads — track everyone in your pipeline |
| 3 | `#tour-contacts` | Contacts — clients you've worked with |
| 4 | `#tour-proposals` | Proposals — send and track your pitch |
| 5 | `#tour-contracts` | Contracts — e-sign in minutes |
| 6 | `#tour-invoices` | Invoices — GST-ready, UPI-linked |
| 7 | (no anchor — full overlay) | Outro: "That's the core — want to see everything?" |

The outro slide (stop 7) has two CTAs:
- **"Explore all features"** → continues into the extended tour (F3)
- **"I'm ready, let's go"** → dismisses tour, writes localStorage flag

### F3 — Extended "Explore all features" tour (9 more stops)

Triggered only if user clicks "Explore all features" on the outro slide. Continues the same driver.js session:

| Stop | Anchor | Section |
|---|---|---|
| 8 | `#tour-projects` | Projects |
| 9 | `#tour-tasks` | Tasks |
| 10 | `#tour-inbox` | Inbox |
| 11 | `#tour-timelog` | Time Log |
| 12 | `#tour-expenses` | Expenses |
| 13 | `#tour-reports` | Reports |
| 14 | `#tour-calendar` | Calendar |
| 15 | `#tour-forms` | Forms |
| 16 | `#tour-automations` | Automations |
| 17 | (no anchor) | Final outro: "You know the whole app. Welcome aboard." |

Final outro has a single CTA: **"Let's go"** → dismisses.

### F4 — Skip / close at any time

User can click × or press Escape at any stop. Tour closes. `clearwork_tour_v1_seen` is written. Tour does not re-fire.

### F5 — Replay via Settings

Existing behaviour retained. `resetTour` clears the localStorage flag and calls `startTour`. No changes required.

---

## Acceptance Examples

**AE1 — New user on desktop sees tour after wizard:**
After completing the wizard and clicking "Go to Dashboard" in WelcomeModal, within ~800ms on /dashboard a driver.js popover appears on the intro card. Stepping through shows all 7 core stops with working element highlights. Outro offers "Explore all" and "I'm ready."

**AE2 — New user on mobile does not see tour:**
Same new user on a 390px iPhone viewport. Wizard and WelcomeModal appear normally. No tour fires. OnboardingChecklist on the dashboard appears as normal.

**AE3 — Broken anchors are fixed:**
Stop 2 (#tour-leads) and stop 3 (#tour-contacts) highlight the correct nav items. No driver.js errors about missing elements. All 16 extended-tour anchors resolve to valid DOM elements.

**AE4 — Skip sets flag:**
User clicks × on stop 3. Tour closes immediately. `clearwork_tour_v1_seen = 'true'` exists in localStorage. Refreshing the page does not re-fire the tour.

**AE5 — Explore-more path works:**
User reaches the outro (stop 7) and clicks "Explore all features." Tour continues from stop 8 (Projects) through to the final outro at stop 17. All anchors resolve.

**AE6 — Returning user not interrupted:**
User with `clearwork_tour_v1_seen = 'true'` in localStorage navigates to any page. Tour does not fire. Settings → Profile still shows "Replay tour" button.

---

## Scope Boundaries

### In scope
- Redesigning `src/hooks/useOnboardingTour.ts` — new step list (F2 + F3), two-chapter structure with "Explore all" branch
- Wiring `startIfFirstVisit` call from AppShell (desktop-only guard)
- Adding missing `tourId` props to all 12 nav items in `src/components/layout/navItems.ts` (leads, contacts, projects, tasks, inbox, timelog, expenses, reports, billing, calendar, forms, automations)
- Removing the two broken steps (#tour-leads pointing to no element, #tour-clients not a valid selector)
- Driver.js custom popover styling (`clearwork-tour-popover`) — update for current design system (indigo primary, Inter font, clean cards)
- Suppressing the tour on mobile (< 1024px) in the trigger logic

### Deferred for later
- Personalised tour by work type (wizard already captures this; can be wired later)
- DB-backed `tourCompleted` flag (localStorage is acceptable for now)
- Mobile tour experience
- Per-section contextual first-visit tooltips on individual feature pages

### Outside this product's identity
- Replacing the OnboardingWizard or WelcomeModal
- Replacing the OnboardingChecklist on the dashboard (it's complementary and remains)
- Integrating an external onboarding service (Appcues, Intercom tours, etc.)

---

## Dependencies and Assumptions

- driver.js ^1.4.0 is installed and used. No library change needed.
- `profile.onboardingComplete` is the canonical "wizard done" signal. The tour trigger reads localStorage, not this flag — no backend changes required.
- The tour fires from AppShell or a shared location so it can run regardless of which page the user lands on after the WelcomeModal.
- Sidebar nav items are always visible on desktop (lg+) regardless of which page is active — driver.js can highlight them from any route.
- `src/components/layout/navItems.ts` is the single source of truth for nav items; adding `tourId` there is the right place (the Sidebar already uses it to set `id` on NavLink elements — confirmed in dossier).

---

## Outstanding Questions

- **OQ1** — Should the OnboardingChecklist (dashboard widget) be hidden or removed once the tour has been seen? Right now it shows until `stats.hasAnyActivity === true`. Keeping both is redundant for users who've done the tour. Could check `clearwork_tour_v1_seen` as an additional hide condition.

- **OQ2** — The WelcomeModal CTA "Go to Dashboard" navigates to `/dashboard`. But WelcomeModal also offers "Send a proposal" → `/proposals/new`, etc. Does the tour behave identically regardless of which WelcomeModal CTA the user picks? (Answer: yes, because the tour highlights sidebar items which are always visible — but worth confirming during implementation.)

- **OQ3** — Should the tour step copy (title + description text) be localised or kept English-only for now? Currently all app copy is in English.
