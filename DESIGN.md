---
name: ClearWork
description: Business toolkit for Indian freelancers & agencies — the full client lifecycle on one platform.
colors:
  midnight-ink: "#0F172A"
  deep-slate: "#1E293B"
  mid-slate: "#52627A"
  light-slate: "#7A8BA5"
  command-violet: "#5F259F"
  command-violet-hover: "#4C1D7A"
  violet-tint: "#F3EAFB"
  command-violet-dark: "#B27FE0"
  command-blue: "#2563EB"
  command-blue-tint: "#EFF6FF"
  pro-gold: "#B45309"
  pro-gold-tint: "#FEF3C7"
  studio-teal: "#0F766E"
  studio-teal-tint: "#CCFBF1"
  canvas: "#F3F4F8"
  surface: "#FFFFFF"
  surface-2: "#F9FAFB"
  surface-3: "#F1F3F7"
  border-subtle: "#E4E7EC"
  border-medium: "#CDD1DA"
  status-success: "#12B76A"
  status-success-bg: "#ECFDF3"
  status-error: "#F04438"
  status-error-bg: "#FEF3F2"
  status-warning: "#F79009"
  status-warning-bg: "#FFFAEB"
typography:
  display:
    fontFamily: "'Roca Two', 'Plus Jakarta Sans', sans-serif"
    fontWeight: 700
    lineHeight: 0.97
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Geist Variable', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Geist Variable', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "'Geist Variable', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label-caps:
    fontFamily: "'Geist Variable', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0.06em"
  label-sm:
    fontFamily: "'Geist Variable', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "14px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.command-violet}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "38px"
  button-primary-hover:
    backgroundColor: "{colors.command-violet-hover}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "38px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.deep-slate}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "38px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  card-glass:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.midnight-ink}"
    rounded: "{rounded.md}"
    padding: "0 11px"
    height: "38px"
  input-focus:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.midnight-ink}"
    rounded: "{rounded.md}"
    padding: "0 11px"
    height: "38px"
  badge:
    rounded: "{rounded.xs}"
    padding: "3px 8px"
---

# Design System: ClearWork

## Overview

**Creative North Star: "The Money App for Your Business"**

ClearWork's interface takes its visual grammar from the payment apps this audience already opens twenty times a day — PhonePe, Google Pay, Paytm. Command Violet is a committed brand color, not a rare accent: it owns headers, hero bands, and primary actions, with confident white cards floating on it. This replaced the earlier restrained "near-black authority" system after a dedicated redesign round — the product now leads with warmth and momentum rather than austerity, while keeping the density a daily financial tool needs.

The system stays compact and dense — body text at 14px, most UI copy at 13–13.5px — designed for screens carrying real data loads (invoice lists, lead pipelines, time entries). Boldness and density are not in tension here: payment-app grammar is inherently content-dense, cards tile edge-to-edge with no wasted whitespace. Glass surfaces still appear only where they float above the canvas (modals, overlays, inputs on glass backgrounds). Motion is spring-resolved — a single easing curve (`cubic-bezier(0.16, 1, 0.3, 1)`) that feels snappy and physical, not mechanical.

Dual-mode is a first-class citizen. Command Violet holds the same role in both themes — the primary button, the interactive accent, the hero surface — shifting only in exact value (`#5F259F` light / `#B27FE0` dark) to hold contrast against its background. This retires the previous rule that made light and dark buttons different colors: violet's confidence is the point, and it should read as violet everywhere.

**Key Characteristics:**
- Command Violet (`#5F259F` light / `#B27FE0` dark) is the primary button, the interactive accent, and the color that owns hero bands and headers — the same identity in both modes
- Solid-color hero/header bands with white cards floating on them, not tucked inside bordered boxes
- Pro tier now signals with **gold** (`#B45309`), Studio tier with **teal** (`#0F766E`) — moved off the violet/indigo family entirely now that violet is the everyday brand color
- Command Blue (`#2563EB`) demoted to a secondary semantic color (e.g. "Sent" status) — no longer the interactive signal
- Glass via `backdrop-filter` only on floating layers; resting surfaces are flat with hairline shadows
- Spring easing throughout — interfaces snap into place, they don't ease
- Compact density: 14px body, 13–13.5px UI, 38px interactive element height, edge-to-edge tiling where the content allows it

## Colors

A cool-slate neutral stack, now anchored by Command Violet as the committed brand color, with two plan-tier accents (gold, teal) that live outside the violet family so they stay distinguishable from the everyday brand color.

### Primary
- **Command Violet** (`#5F259F` light / `#B27FE0` dark): The committed brand color — primary buttons, links, focus rings, active input borders, hero/header bands. This is not a rare accent; it's expected to cover real surface area (hero bands, header bars) as well as small interactive elements.
- **Midnight Ink** (`#0F172A`): The heaviest heading/text color. No longer the primary button background — that role moved to Command Violet in both modes.

### Secondary
- **Command Blue** (`#2563EB`): A secondary semantic color — currently used for "Sent" invoice/proposal status and similar in-progress states. Not the interactive signal anymore.
- **Pro Gold** (`#B45309` on `#FEF3C7`): Exclusively for Pro-tier plan cards, badges, and upgrade CTAs.
- **Studio Teal** (`#0F766E` on `#CCFBF1`): Exclusively for Studio-tier plan cards and premium feature callouts.

### Neutral
- **Deep Slate** (`#1E293B`): Primary body text and button hover state.
- **Mid Slate** (`#52627A`): Secondary descriptive text, subtitles, form helper text.
- **Light Slate** (`#7A8BA5`): Muted text, placeholders, disabled states.
- **Canvas** (`#F3F4F8`): App background — a very slightly blue-tinted off-white that gives surfaces lift without looking stark. Dark: `#0C0D10`.
- **Surface** (`#FFFFFF`): Cards, panels, sidebar. Dark: `#13141A`.
- **Surface-2** (`#F9FAFB`): Table header rows, hover backgrounds, secondary panels. Dark: `#1A1B23`.
- **Surface-3** (`#F1F3F7`): Tertiary fills, skeleton loaders. Dark: `#21222D`.
- **Border Subtle** (`#E4E7EC`): Default dividers and card borders. Dark: `#26283A`.
- **Border Medium** (`#CDD1DA`): Input borders and stronger separators. Dark: `#333649`.

### Status
- **Success Green** (`#12B76A` on `#ECFDF3`): Paid invoices, active plans, completed tasks.
- **Error Red** (`#F04438` on `#FEF3F2`): Overdue invoices, form errors, destructive states.
- **Warning Amber** (`#F79009` on `#FFFAEB`): Past-due, expiring, and caution states.

### Named Rules
**The Committed Violet Rule.** Command Violet is the brand's one confident color and is expected to cover real surface area — hero bands, header bars, primary buttons — not just small accents. This replaces the old "One Signal Rule," which held Command Blue to ≤15% of any screen; that restraint is gone by design.

**The Tier-Color Separation Rule.** Pro (gold) and Studio (teal) plan markers must stay outside the violet/blue family entirely, since violet is now the everyday brand color and would no longer read as a special tier signal if it doubled as one.

**The Unified Button Rule.** The primary button is Command Violet in both light and dark mode (replacing the old near-black-light / command-blue-dark split). One identity, two exact values for contrast.

**State-Is-a-Mark, Not Just a Hue.** Status (paid / sent / overdue / etc.) should carry a distinct icon or mark in addition to its color, not color alone — so the interface stays legible for color-blind users and in grayscale contexts. Adopted from evaluating this redesign's alternates.

## Typography

**Display Font:** Roca Two Bold (custom), Plus Jakarta Sans (fallback for web)
**Body / UI Font:** Geist Variable (loaded via @fontsource-variable/geist)
**Label / Mono:** Geist Variable (same family, distinct weight and case treatment)

**Character:** Geist Variable is the workhorse — neutral, highly legible at small sizes, and technically precise without feeling cold. Roca Two Bold appears only at the largest scale: page heroes, marketing moments, and onboarding headings where ClearWork needs personality rather than utility. The two fonts never share a line; the transition from display to UI type is always a jump in both size and family.

### Hierarchy
- **Display** (Roca Two 700 / Plus Jakarta Sans fallback, line-height 0.97, letter-spacing −0.02em): Hero headings, onboarding section titles, large marketing callouts. Never inside the app shell proper.
- **Metric-Hero** (Geist Variable 800, 40px, line-height 1, letter-spacing −0.01em): Exactly one per Operate surface — the single dominant figure a page leads with (e.g. the Dashboard's revenue-this-month hero). Still Geist, never Roca Two: this is emphasis by size and weight, not a shift into the brand display voice. If a page finds itself wanting a second Metric-Hero, that's a sign the page needs a clearer single focus, not a second use of the step.
- **Headline** (Geist Variable 600, 18px, line-height 1.3, −0.01em): Page-level titles within the app shell (e.g., "Invoices", "Dashboard").
- **Title** (Geist Variable 600, 15px, line-height 1.4): Section headings, modal titles, card header text.
- **Body** (Geist Variable 400, 14px, line-height 1.5): Default prose, descriptive text, the reading baseline.
- **UI** (Geist Variable 500–600, 13–13.5px, line-height 1.4): Buttons, nav labels, table cell content, form inputs — the primary interactive density layer.
- **Label-Caps** (Geist Variable 700, 11px, letter-spacing 0.06em, uppercase): Table column headers, section dividers in sidebar, metadata caps.
- **Label-SM** (Geist Variable 600, 12px): Form labels, badge text, inline metadata.

### Named Rules
**The Display Ceiling Rule.** Roca Two is the product's brand voice. It appears above the app shell (onboarding, marketing, empty states with personality). Inside the operating shell — sidebar, pages, modals — Geist Variable runs everything. Mixing them in the same content area reads as unfinished.

**The Compact-First Rule.** Default to 13–13.5px for interactive elements and 14px for body. Never size up "for readability" on a screen carrying data; density is a feature for daily users who need to see the full list.

## Layout

The app shell is a fixed left sidebar (232px wide) + fluid content area, with a top bar (56px mobile, 60px desktop). The sidebar is sticky and full-height; the content area scrolls independently. On mobile, the sidebar collapses to a drawer.

Content pages use a consistent internal model: a page header row (title + primary action button, right-aligned), then a toolbar row (filters, search, secondary actions), then the data surface (table or card grid). Page-level padding is 20–24px on desktop, 16px on mobile.

The dashboard is the exception: a drag-and-drop widget grid where cards span 1 or 2 columns. All other pages are single-column lists or detail views.

**Spacing rhythm:** 4px base unit. Most internal element spacing uses multiples of 4: 4, 8, 12, 16, 20, 24, 32. Inter-component gaps in the sidebar are 2px (nav items), 4px (section groups), 8–16px (sidebar sections). Card internal padding is 16–20px.

**Responsive breakpoints:** `lg` at 1024px is the primary breakpoint. Below it, sidebar hides to a drawer, topbar shows the mobile toggle, and multi-column grids collapse to single column.

**Container width:** Full-width within the content area on most pages. Modals have max-width constraints: standard modals at 480–560px, upgrade modal at 660px.

## Elevation & Depth

The system is architectural: surfaces are nearly flat at rest, and glass material communicates floating layers. Shadows are used sparingly and only to confirm that an element is above its parent — never for decoration.

**The two-tier depth model:**
1. **Resting surfaces** (cards, tables): Hairline shadow — `0 1px 4px rgba(16,24,40,0.05)` in light, `0 1px 4px rgba(0,0,0,0.25)` in dark. Just enough to lift the card off the canvas without drama.
2. **Floating surfaces** (modals, drawers, dropdowns, overlays): Glass material — `backdrop-filter: blur(N)` + semi-opaque white (light) or dark alpha (dark) background + `box-shadow` for outer lift. Blur intensity scales with stack height: inputs at 8px, tables at 16px, modals at 24px.

The sidebar active nav item uses a third micro-depth: an inset shadow `0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)` on a white pill background — communicating "selected" through material rather than a color fill.

### Shadow Vocabulary
- **Surface lift** (`0 1px 4px rgba(16,24,40,0.05)`): Cards, card-glass in light mode.
- **Modal lift** (`0 8px 40px rgba(16,24,40,0.08), 0 1px 4px rgba(16,24,40,0.04)`): Modals, slide-over panels.
- **Tour popover** (`0 8px 32px rgba(16,24,40,0.12)`): Driver.js tour popovers.
- **Active nav pill** (`0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)`): Selected sidebar item.
- **Button primary** (`0 1px 3px rgba(15,23,42,0.15)` light / `0 1px 3px rgba(37,99,235,0.3)` dark): Subtle base shadow on primary buttons; doubles on hover.

### Named Rules
**The Glass-Only-When-Floating Rule.** `backdrop-filter` blur appears exclusively on elements that float above the canvas. Cards on the page surface never use glass — they use a tinted background or a flat white. Glass at the base layer is a red flag.

## Shapes

ClearWork uses a graduated radius vocabulary where the corner size signals the element's interactive weight.

- **6px (xs):** Badges, status chips, inline labels — the smallest actionable/informational atoms.
- **8px (sm):** Sidebar navigation items (rounded-md), icon buttons in the topbar, small tooltips.
- **10px (md):** Buttons, form inputs, search fields, inline text inputs — the primary interaction layer. This is the most-used radius in the product.
- **14px (lg):** Cards, glass tables, tour popovers, most modals — panel-level containers.
- **16px (xl):** Upgrade modal and premium-tier plan cards — a slightly larger radius signals higher-stakes content.
- **9999px (full):** Avatars, unread count badges, scrollbar thumbs, and circular icon buttons.

**The Single Radius Per Element Rule.** Buttons are always 10px; cards are always 14px. Mixing radii within the same component family (e.g., a 12px button next to a 10px button) does not exist in this system. Consistency of radius is how hierarchy is legible at a glance.

## Components

### Buttons
Compact and purposeful — height 38px across all variants, with enough padding for icons.

- **Shape:** Gently rounded (10px)
- **Primary (light):** Near-black background (#0F172A), white text, 600 weight, 13.5px. Shadow `0 1px 3px rgba(15,23,42,0.15)`. Hover: #1E293B + shadow doubles.
- **Primary (dark):** Command-blue background (#2563EB), white text. Hover: #1D4ED8.
- **Focus-visible:** Indigo ring `0 0 0 4px rgba(99,102,241,0.2)` — consistent across all interactive elements.
- **Disabled:** 55% opacity, not-allowed cursor.
- **Secondary:** White background, border-medium border (#CDD1DA), deep-slate text. Hover: surface-2 background.
- **Destructive/Danger:** Used inline (text-only in red `#D92D20`), not a full button variant.

### Cards / Containers
Two card variants serve different depth needs.

- **`.card`:** White background, 14px radius, 1px border-subtle border, `0 1px 4px rgba(16,24,40,0.05)` shadow. Standard data container — the default for all list pages.
- **`.card-glass`:** Same radius and border but with `backdrop-filter: blur(16px)` when on a glass-capable background. Used on the dashboard for stat widgets. Hover: `shadow-lg` (more prominent lift).
- **Internal padding:** 16–20px standard; 24px for modals and upgrade cards.

### Inputs / Fields
- **Style:** White background, border-medium border (1px #CDD1DA), 10px radius, 38px height, 11px horizontal padding. Inset shadow `0 1px 2px rgba(16,24,40,0.04)`.
- **Focus:** Border shifts to command-violet (#5F259F), gains a 3px violet halo `0 0 0 3px rgba(95,37,159,0.12)`. Background stays white.
- **Glass input (`.glass-input`):** Used inside glass-surfaced areas. Semi-opaque white alpha background + `backdrop-filter: blur(8px)`. Focus ring shifts to command-violet at 10% opacity.
- **Error:** Text helper `#F04438`, 11.5px.
- **Select:** Custom chevron SVG injected via `background-image`; right padding accommodates it.
- **Form label:** 12px, 600, color deep-slate, 5px margin-bottom.

### Status Badges
The most recognisable data-layer pattern — appears on almost every list view.

- **Shape:** 6px radius, inline-flex, 3px/8px padding, 11.5px/600 weight, 0.01em letter-spacing.
- **Dot indicator:** A 5×5px circle `::before` pseudo-element in the badge's status color.
- **Variants:** success (green on #ECFDF3), error (red on #FEF3F2), warning (amber on #FFFAEB), neutral (surface-3 bg), violet (accent-bg, the brand/interactive variant), blue (#175CD3 on #EFF8FF, a secondary semantic status).
- **Rule:** Dot color = vivid status color. Text + background = a lower-contrast tint pair from the same hue family.

### Navigation (Sidebar)
Dense and icon-led — the persistent left rail at 232px.

- **Row height:** 32px (h-8), 8px horizontal padding, 4px gap between icon and label.
- **Icon size:** 15px, strokeWidth 1.75 (inactive) / 2.2 (active).
- **Inactive:** Transparent background, `#64748B` text, `#94A3B8` icon. Hover: `rgba(0,0,0,0.04)` background tint, `#1E293B` text.
- **Active:** Violet-tinted pill background (`#F3EAFB`), inset shadow `0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)`, command-violet (`#5F259F`) text and icon. The "card lifted above the rail" effect, now carrying the brand color instead of neutral ink.
- **Section labels:** 10.5px, medium, `#94A3B8`, not all-caps.
- **Unread badge:** 9.5px bold, dark fill (#1E293B light / white text), full-radius pill, min-width 16px.

### Data Table
The primary information surface on list pages.

- **Container:** `.glass-table` — `backdrop-filter: blur(16px)`, 85% white alpha background, 14px radius, `0 2px 16px rgba(16,24,40,0.05)`.
- **Header row:** Surface-2 background, 11px/700/uppercase/0.06em letter-spacing, `#7A8BA5` text, 1px border-subtle bottom.
- **Body rows:** 13.5px, deep-slate text, 13px vertical padding, 16px horizontal. Hover: surface-2 tint.
- **Last row:** No bottom border.

## Do's and Don'ts

### Do:
- **Do** use `command-violet` (#5F259F light / #B27FE0 dark) as the primary button in both modes. One brand identity, no material swap between themes.
- **Do** let command-violet cover real surface area — hero bands, header bars — not just tiny accents. It is a committed color, not a rare one.
- **Do** use `backdrop-filter` blur only on floating layers (modals, overlays, glass inputs). Scale blur to stack height: 8px input, 16px table, 24px modal.
- **Do** use 10px radius for all buttons and inputs. 14px for cards and containers. Never mix within the same component family.
- **Do** apply the spring easing `cubic-bezier(0.16, 1, 0.3, 1)` to all entrances — page transitions (0.22s), modals (0.28s), slide panels (0.3–0.32s).
- **Do** show Pro Gold (#B45309) and Studio Teal (#0F766E) only in billing, plan cards, and upgrade flows — kept out of the violet/blue family so they still read as a distinct tier signal.
- **Do** pair a status color with a distinct icon/mark (not color alone), so state reads correctly for color-blind users and in grayscale.
- **Do** use `.heading-display` (Roca Two, weight 500, line-height 0.97, −0.02em) only for hero/onboarding headings — never inside the operating shell.

### Don't:
- **Don't** put glass material on resting page-level cards. `backdrop-filter` is for floating elements only.
- **Don't** use gold or teal as a general accent outside plan/billing UI — they are tier markers, not general accent colors.
- **Don't** increase interactive element height above 38px or base font size above 14px for "better readability." Density is intentional for a daily-use operations tool.
- **Don't** add a border-radius other than the defined steps (6 / 8 / 10 / 14 / 16 / 9999px). There is no 12px in this system.
- **Don't** use multiple brand accent colors on the same component. A button is command-violet; gold/teal/blue stay confined to their own semantic roles.
- **Don't** use `ease-in-out` or `linear` for UI motion. The only approved easing is the spring `cubic-bezier(0.16, 1, 0.3, 1)` for entrances and `0.15s ease` for micro-state changes (color, opacity).
