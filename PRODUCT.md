# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary — equally weighted:**

1. **Solo Indian freelancer** — designer, developer, marketer, or consultant running a one-person client business. Their day: juggle 3–10 clients, send GST invoices, chase payments, and close new projects, often on a phone as much as a laptop.
2. **Small Indian agency / studio** — 2–15 person creative, dev, or consulting team. Multiple simultaneous clients, shared task boards, team members who each need access, and documents that need to go out under the agency's brand.

Both operate under Indian tax law (GST, HSN/SAC codes, TDS, LUT for exports) and use Indian payment rails (UPI, Razorpay, NEFT/IMPS bank transfers).

## Product Purpose

ClearWork is the end-to-end business toolkit for Indian freelancers and agencies: leads → proposals → e-signed contracts → GST invoices → UPI/Razorpay payments → client portal → time tracking → reports — the full client lifecycle without stitching external tools.

Success = a freelancer or studio can run their entire client business from a single tab, stay GST-compliant without an accountant for day-to-day work, and get paid faster.

## Positioning

The only all-in-one client-work platform that is genuinely built for Indian freelancers and agencies — not a Western tool adapted after the fact. GST invoicing, LUT/export, UPI/Razorpay payment collection, Indian bank account setup, HSN/SAC defaults by profession, and WhatsApp reminders are core features, not integrations.

A neighboring tool could offer "all-in-one" or "India support" separately; ClearWork is the only product that offers both from the ground up.

## Operating Context

- Users send invoices with GSTIN, HSN/SAC codes, and GST tax lines; some have LUT numbers for zero-rated exports to international clients.
- Payment collection is via UPI ID, Razorpay payment links, or bank transfer (NEFT/IMPS); Razorpay is the primary gateway.
- WhatsApp is the dominant communication channel for client reminders in the Indian market.
- Documents (proposals, contracts, invoices) must go out under the freelancer's or agency's own brand.
- Clients receive a portal where they can view/approve documents, sign contracts, and pay invoices without logging into ClearWork.
- Agencies have team members with role-based access; Studio plan enables white-labelling and custom domain for the portal.
- Work types in product: developer, designer, marketer, consultant, agency — with SAC code defaults per type.

## Capabilities and Constraints

**Confirmed features:**
- GST-compliant invoicing (GSTIN, HSN/SAC, tax lines, LUT/export, multi-currency on Studio)
- E-signed contracts (contract editor + e-sign flow)
- Proposals (editor + send)
- Lead management / CRM (pipeline, lead capture forms, lead detail)
- Client portal (white-label + custom domain on Studio)
- Project & task management (boards, task boards)
- Time tracking
- Expenses
- Calendar & meetings
- Automations / workflow builder
- Forms (intake, lead capture)
- Email templates
- AI features (scope confirmed; specifics TBD)
- WhatsApp reminders
- Reports & analytics
- Team workspace with roles/permissions (Studio)

**Plans:**
- Free: 2 active clients, 10 projects, 30 active leads, no team, 100 MB storage
- Pro: Unlimited clients & leads, unlimited projects, e-sign, client portal, 1 seat, 2 GB storage
- Studio: Everything in Pro, unlimited team, white-label docs & portal, custom domain, multi-currency invoicing, priority support

**Technical constraints:**
- React 19 + TypeScript + Vite; Tailwind v4; Supabase (auth + DB); React Query; Framer Motion; Razorpay (payments); PostHog (analytics); New Relic (monitoring); Trustpilot (reviews)
- PWA-capable (installable, service worker, offline-ready shell)
- Geist Variable + Plus Jakarta Sans as type stack
- Deployed on Vercel (`vercel.json` present)

## Brand Commitments

- **Name**: ClearWork (`getclearwork.in`). "pakka" is the internal repo codename only — no user-facing usage.
- **Voice**: practical, direct, Indian market-native; technical enough to be credible to developers and designers, plain enough for non-technical consultants.
- **Assets**: logo + favicon in SVG (dark/light via CSS media query); `apple-touch-icon-180x180.png`; `pwa-512x512.png`.

## Evidence on Hand

- Live product with full feature set in `/src/features/` and `/src/pages/app/`.
- Onboarding wizard covers: country, work type, GST setup, bank/UPI, first client, first document.
- Plan and billing data in `/src/features/billing/`.
- Trustpilot integration active (invitation API after key actions).
- New Relic SPA monitoring active.

**Absences:** No marketing copy, no testimonials, no case studies in the codebase. Future surfaces must not fabricate customer quotes or benchmark claims.

## Product Principles

1. **India-native first** — every workflow assumes Indian law, payment rails, and communication norms. Nothing is bolted on; nothing requires the user to know what a Western equivalent looks like.
2. **One tab, one business** — the product's value compounds when clients, money, documents, and time all live in one place. Features exist to eliminate the need for an external tool, not to complement one.
3. **Both the freelancer and the agency** — the product scales from a solo practitioner to a small team without a mode switch; plan tiers, not product versions, separate the experiences.
4. **Documents are the product's face** — invoices, proposals, and contracts that clients receive must look professional and match the freelancer's brand. The client's experience of ClearWork is the freelancer's credibility.
5. **Compliance without an accountant** — GST-correct defaults, HSN/SAC codes by profession, LUT/export handling, and tax summaries should let a solo freelancer stay compliant day-to-day without specialist help.

## Accessibility & Inclusion

No product-specific requirement established. Standard WCAG 2.1 AA applies as a baseline for a professional SaaS tool.
