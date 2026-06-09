# ClearWork Public Profiles — Design Spec

**Date:** 2026-06-10
**Status:** Approved

---

## Overview

Public Profiles let freelancers and agencies on ClearWork share a shareable, verified portfolio page — `clearwork.in/u/[username]`. The goal is a portfolio link (not a marketplace). Clients land on it and decide to reach out directly. All credibility stats are auto-pulled from ClearWork data and cannot be manually edited.

---

## URL & Identity

- Public URL: `clearwork.in/u/[username]`
- Username is **auto-generated** from the freelancer's name on signup (e.g. `maharshi-vaghela`, `mv-design`, etc.)
- Username can be **changed once** — after that it is locked
- Profile is **opt-in** — disabled by default, enabled from Settings → Public Profile

---

## Page Layout

### Overall structure

- **Top nav bar** (white, `border-bottom: #EAECF0`) — ClearWork logo left, profile URL pill right
- **Hero section** (white card) — cover banner + avatar + name + bio + inline stats
- **Two-column body** — `#F4F6FB` background
  - **Left sidebar** (200px fixed) — Services, Verified Stats, Skills, Contact CTA
  - **Right main area** (flex-1) — About, Portfolio
- **Footer bar** (white) — "Powered by ClearWork · Stats auto-verified" + report link

### Design tokens (matches app)

| Token | Value |
|---|---|
| Page background | `#F4F6FB` |
| Card background | `#FFFFFF` |
| Card border | `#EAECF0` |
| Primary text | `#101828` |
| Secondary text | `#667085` |
| Muted text | `#98A2B3` |
| Section label text | `#344054` |
| Primary (indigo) | `#6366F1` |
| Primary light | `#EEF2FF` |
| Font | Inter |

---

## Hero Section

- **Cover banner**: 72px tall, indigo gradient (`#4338CA → #6366F1 → #818CF8`)
- **Avatar**: 52px circle, overlaps cover bottom edge by ~24px, `border: 3px solid white`, indigo initial on `#EEF2FF` background
- **Name**: 15px, `font-weight: 700`, `#101828`
- **Tagline**: 11px, `#667085` — role + city (e.g. "UI/UX Designer & Brand Strategist · Ahmedabad, Gujarat")
- **Bio**: 10px, `#475569`, max-width ~400px, 1.6 line-height — freelancer-written, max 200 chars
- **Inline stats row** (auto-pulled, not editable):
  - Projects completed
  - Total earned (₹, rounded to nearest lakh)
  - Repeat client %
  - Proposal acceptance rate %
- **Action buttons** (top-right, aligned to avatar row):
  - Primary: "Get in touch" — indigo filled
  - Secondary: WhatsApp icon — white with green border

---

## Left Sidebar Sections

### Services
- Section label: `SERVICES` (9px, `#344054`, letter-spacing)
- Each service card (separated by `border-top: #F2F4F7`):
  - Icon (22px, `#EEF2FF` bg) + service name (10px bold)
  - Short description (9px, `#667085`)
  - Deliverable tags (8px pills, `#F2F4F7` bg)
  - Price row: "From" label (8px muted) + price (11px bold `#101828`) + delivery time (8px `#667085`)
- Freelancer manages services from Settings → Public Profile → Services
- Max 5 services shown

### Verified Stats
- Section label: `VERIFIED STATS` + `✓ ClearWork` badge (indigo pill, top-right)
- **2×2 grid layout** — equal weight, no hierarchy:
  - Projects done
  - Total earned (₹)
  - Repeat clients (%)
  - Avg response time
- Numbers: 14–15px, `font-weight: 800`, `#101828`
- Labels: 8px, `#667085`
- Grid lines: `border: 1px solid #F2F4F7`
- All values auto-pulled from ClearWork — **read-only on profile**

### Skills
- Section label: `SKILLS`
- Pill tags: `#EEF2FF` background, `#6366F1` text, 8px bold
- Freelancer adds skills from Settings → Public Profile → Skills
- Max 10 skills shown

### Contact CTA
- Indigo gradient block (`#EEF2FF → #E0E7FF`, border `#C7D2FE`)
- Heading: "Work with [first name]" — 10px bold `#4338CA`
- Sub-label: "Usually responds in < X hrs" — pulled from Verified Stats response time
- Primary button: "Get in touch →" — full-width, indigo filled — opens contact form modal
- Divider with "or"
- WhatsApp button: white bg, green border (`#86EFAC`), "💬 Chat on WhatsApp" — links to `https://wa.me/[phone]`

---

## Right Main Area Sections

### About
- Section label: `ABOUT`
- Body text: 10px, `#344054`, 1.7 line-height
- Freelancer-written, max 500 chars
- Meta chips row below text:
  - 📍 City
  - 🗓 Member since [month year]
  - 🌐 Languages

### Portfolio
- Section label: `PORTFOLIO` + "View all N →" link (right-aligned, indigo)
- Default: show latest 3 projects
- **Story Cards** layout — each card:
  - Thumbnail image (56px tall, full-width) with category badge (top-right, white pill)
  - Title (10px bold)
  - Outcome sentence (8.5px, `#667085`, 1.5 line-height) — freelancer writes this, e.g. "Reduced onboarding drop-off by 40%"
  - Skill tags row + "View →" link (right-aligned)
- Freelancer links ClearWork projects to portfolio from Settings → Public Profile → Portfolio
- Max 12 projects total, paginated or "View all" link

---

## Contact Form Modal

Triggered by "Get in touch" button. Full-screen overlay on mobile, centered modal on desktop.

**Fields:**
- Name (required)
- Budget — dropdown: `< ₹10k`, `₹10k–25k`, `₹25k–50k`, `₹50k–1L`, `₹1L+`
- Service needed — dropdown pre-populated from freelancer's services
- Project brief — textarea, max 500 chars

**On submit:**
- Sends email notification to the freelancer
- Shows success state: "Message sent! [Name] usually responds in < X hrs"
- Lead is logged in ClearWork Leads module automatically (source: "Public Profile")

---

## Setup Flow

1. User goes to Settings → **Public Profile** tab (new tab, opt-in)
2. Toggle: "Enable public profile" — off by default
3. On enable: username is auto-generated and shown (editable once)
4. Sections to fill: Bio, Services, Skills, Portfolio projects, Languages, WhatsApp number
5. Preview button: opens profile URL in new tab
6. Share button: copies URL to clipboard

---

## Customisation (Phase 1)

- Pick from **3 accent colours**: Indigo (default), Emerald, Amber
- Cover banner gradient updates to match accent colour
- Section labels and links update to match
- No layout customisation in Phase 1

---

## What is NOT included (Phase 1)

- No marketplace / browse-all-freelancers directory
- No testimonials from outside ClearWork (only from ClearWork project history — Phase 2)
- No bold/agency theme — Minimal theme only (Phase 1)
- No custom domain (`name.com` → profile) — Phase 3
- No analytics dashboard showing profile views — Phase 2

---

## Data Sources

| Stat | Source |
|---|---|
| Projects completed | Count of projects with status `completed` |
| Total earned | Sum of `invoice.paidAmount` across all invoices |
| Repeat client % | Clients with > 1 completed project / total clients |
| Proposal acceptance rate | Accepted proposals / total sent |
| Avg response time | Median time between lead creation and first message |
| Member since | `user.createdAt` |

All stats recalculate nightly. Shown as-of date on profile ("Stats as of [date]").

---

## Routes

| Route | Notes |
|---|---|
| `clearwork.in/u/:username` | Public profile page — no auth required |
| `/settings/public-profile` | Setup + edit page — auth required |
| `/settings/public-profile/preview` | Live preview — auth required |
