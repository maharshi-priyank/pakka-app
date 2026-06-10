# Subscription & Billing System Design

**Date:** 2026-06-10
**Product:** ClearWork (pakka-*)
**Payment provider:** Cashfree Subscriptions
**Scope:** Landing page · Dashboard app · API backend

---

## Goal

Wire up end-to-end recurring billing for ClearWork so users can upgrade from Free to Solo or Studio, pay via Cashfree Subscriptions, and have their plan enforced across the app. Includes founding-member pricing windows, a promo code system for gifting free access, and a billing management UI inside the dashboard.

---

## Pricing

### Tiers

| Tier | Solo | Studio |
|------|------|--------|
| Free | ₹0 | — |
| Solo | ₹299/mo | — |
| Studio | — | ₹699/mo |

### Pricing windows (time-based)

| Window | Dates | Solo | Studio |
|--------|-------|------|--------|
| Founding | Now → Aug 31, 2026 | ₹149/mo | ₹349/mo |
| Early Access | Sep 1 → Dec 31, 2026 | ₹199/mo | ₹499/mo |
| General Availability | Jan 1, 2027+ | ₹299/mo | ₹699/mo |

Users who subscribe during a window are locked into that price permanently. Window dates are stored in `BillingConfig` (DB), not hardcoded.

### Monthly billing only

Annual billing is not implemented in this sprint.

---

## Cashfree Plan IDs

Create these 6 plans manually in the Cashfree Subscriptions dashboard before launch:

| Plan ID | Price | Description |
|---------|-------|-------------|
| `plan_solo_founding` | ₹149/mo | Solo — Founding |
| `plan_solo_earlyaccess` | ₹199/mo | Solo — Early Access |
| `plan_solo_regular` | ₹299/mo | Solo — Regular |
| `plan_studio_founding` | ₹349/mo | Studio — Founding |
| `plan_studio_earlyaccess` | ₹499/mo | Studio — Early Access |
| `plan_studio_regular` | ₹699/mo | Studio — Regular |

---

## Data Model

### Schema changes (`pakka-api/prisma/schema.prisma`)

#### Add to `User`

```prisma
cashfreeSubscriptionId  String?
cashfreePlanId          String?
subscriptionStatus      SubscriptionStatus @default(NONE)
billingAnchorDate       DateTime?
```

#### New enum

```prisma
enum SubscriptionStatus {
  NONE
  ACTIVE
  PAST_DUE
  CANCELLED
  PAUSED
}
```

#### New `BillingConfig` table (singleton row)

```prisma
model BillingConfig {
  id                    String   @id @default("singleton")
  foundingPeriodEnds    DateTime
  earlyAccessPeriodEnds DateTime
}
```

Seed with: `foundingPeriodEnds = 2026-08-31T23:59:59Z`, `earlyAccessPeriodEnds = 2026-12-31T23:59:59Z`.

#### New `BillingEvent` table (webhook idempotency log)

```prisma
model BillingEvent {
  id          String   @id @default(cuid())
  eventType   String
  cashfreeRef String   @unique
  userId      String?
  payload     Json
  processedAt DateTime @default(now())

  @@map("billing_events")
}
```

#### Extended `PromoCode`

```prisma
model PromoCode {
  id             String        @id @default(cuid())
  code           String        @unique
  plan           Plan
  discountType   DiscountType  @default(FULL_ACCESS)
  durationMonths Int?          // null = permanent
  maxRedemptions Int?          // null = unlimited
  isActive       Boolean       @default(true)
  createdAt      DateTime      @default(now())
  redemptions    PromoRedemption[]

  @@map("promo_codes")
}

enum DiscountType {
  FULL_ACCESS
  PERCENTAGE
}
```

`FULL_ACCESS` codes bypass Cashfree entirely — they set `User.plan` and `User.planExpiresAt` directly. `durationMonths: null` = permanent access (no expiry).

---

## Design Principles

### 1. Payment provider abstraction

All Cashfree logic lives behind a `PaymentProvider` interface. Switching providers requires writing a new class and changing one line in `payments.module.ts` — no business logic changes.

```typescript
interface PaymentProvider {
  createSubscription(params: CreateSubscriptionParams): Promise<{ checkoutUrl: string; subscriptionId: string }>
  cancelSubscription(subscriptionId: string): Promise<void>
  getSubscription(subscriptionId: string): Promise<SubscriptionState>
}
```

### 2. Plan resolution as a pluggable strategy

`PlanResolutionService` is the single place that maps (tier + current date) → Cashfree plan ID. Today it is time-based. It can be replaced with usage-based, geo-based, or A/B-tested logic with no changes to `PaymentsService`.

### 3. Webhook handler registry

Each Cashfree event type maps to a handler. Adding a new event type is adding one entry to the registry map — no switch statement sprawl.

### 4. All pricing config in DB

`BillingConfig` holds all dates. Extending a founding period = one DB update, no deploy.

### 5. Idempotent webhook processing

Every incoming webhook upserts a `BillingEvent` row using `cashfreeRef` as a unique key before processing. Duplicate webhooks (Cashfree retries) are silently dropped.

### 6. Centralised `effectivePlan` helper

Single function used by every service that enforces plan limits:

```typescript
function effectivePlan(user: User): Plan {
  if (user.subscriptionStatus === SubscriptionStatus.ACTIVE) return user.plan
  if (user.planExpiresAt && user.planExpiresAt > new Date()) return user.plan // promo codes
  return Plan.FREE
}
```

Lives in `src/modules/users/effective-plan.ts`. Proposals, leads, contracts, and any future feature import from here only.

---

## Backend Architecture

### Module: `pakka-api/src/modules/payments/`

```
payments.module.ts
payments.controller.ts
payments.service.ts
plan-resolution.service.ts       ← time-based plan ID lookup
cashfree.provider.ts              ← implements PaymentProvider
payment-provider.interface.ts
dto/
  create-subscription.dto.ts
  webhook-event.dto.ts
```

### Endpoints

#### `POST /payments/create-subscription` (JWT-authenticated)

1. Read `BillingConfig` → determine current pricing window
2. Call `PlanResolutionService.resolve(tier, now)` → Cashfree plan ID
3. Call `CashfreeProvider.createSubscription({ userId, planId, returnUrl, cancelUrl })`
4. Return `{ checkoutUrl }`

#### `POST /payments/webhook` (public — Cashfree HMAC signature verified)

Handles events:

| Event | Action |
|-------|--------|
| `SUBSCRIPTION_ACTIVATED` | Set `User.plan`, `subscriptionStatus = ACTIVE`, `cashfreeSubscriptionId`, `cashfreePlanId`, `billingAnchorDate` |
| `SUBSCRIPTION_PAYMENT_SUCCESS` | Update `billingAnchorDate` |
| `SUBSCRIPTION_PAYMENT_FAILED` | Set `subscriptionStatus = PAST_DUE` |
| `SUBSCRIPTION_CANCELLED` | Set `subscriptionStatus = CANCELLED`, downgrade to FREE |
| `SUBSCRIPTION_PAUSED` | Set `subscriptionStatus = PAUSED` |

All handlers check `BillingEvent` for idempotency before acting.

#### `GET /payments/subscription` (JWT-authenticated)

Returns current subscription state for billing UI: plan, status, price, next billing date, cashfreePlanId.

#### `GET /payments/current-pricing` (JWT-authenticated)

Returns the current window's prices so the frontend can display live prices in UpgradeModal without hardcoding.

```json
{
  "window": "founding",
  "windowEnds": "2026-08-31",
  "solo": { "planId": "plan_solo_founding", "price": 149 },
  "studio": { "planId": "plan_studio_founding", "price": 349 }
}
```

#### `DELETE /payments/subscription` (JWT-authenticated)

Calls `CashfreeProvider.cancelSubscription(user.cashfreeSubscriptionId)`. Sets `subscriptionStatus = CANCELLED`. Access continues until `billingAnchorDate`.

---

## Checkout Flow (App)

### Entry points

1. **UpgradeModal** — triggers on `PLAN_LIMIT` error from any API call
2. **Settings > Billing tab** — user proactively upgrades

Both use the same `useCreateSubscription` mutation.

### Flow

```
User hits plan limit
  → UpgradeModal opens
  → Calls GET /payments/current-pricing
  → Shows live price with founding badge (if window active)
  → User clicks "Subscribe to Solo — ₹149/mo"

POST /payments/create-subscription { tier: 'SOLO' }
  → Returns { checkoutUrl }

Frontend: window.location.href = checkoutUrl
  (Cashfree hosted checkout — PCI compliant)

User pays on Cashfree
  → Cashfree redirects to: app.getclearwork.in/billing/success?ref=xxx

BillingSuccessPage
  → Polls GET /payments/subscription every 2s (max 10s)
  → Waiting for webhook to set subscriptionStatus = ACTIVE
  → On active: redirect to /app/dashboard
  → Toast: "You're on Solo plan. Welcome, founding member!"
  → On timeout: show manual refresh prompt
```

### New frontend routes

| Route | Component |
|-------|-----------|
| `/billing/success` | `BillingSuccessPage` |
| `/billing/cancelled` | `BillingCancelPage` |

### New frontend files

```
src/pages/app/BillingSuccessPage.tsx
src/pages/app/BillingCancelPage.tsx
src/features/billing/
  hooks/useSubscription.ts           ← useCreateSubscription, useSubscriptionStatus, useCancelSubscription
  hooks/useCurrentPricing.ts         ← GET /payments/current-pricing
  components/BillingTab.tsx
  components/PlanStatusCard.tsx
  components/UpgradePlanCards.tsx    ← reused in UpgradeModal + BillingTab
  components/PromoCodeInput.tsx
  components/CancelSubscriptionModal.tsx
```

---

## Billing Management UI (Settings > Billing Tab)

### States

**Free plan**
- Plan badge: "Free"
- Feature limits summary
- `UpgradePlanCards` with live pricing and founding badge

**Active subscription**
- `PlanStatusCard`: plan name, price, pricing window label ("Founding Member"), next billing date
- Cancel button → `CancelSubscriptionModal` (confirmation required)
- `PromoCodeInput` for applying gifted codes

**Past due**
- Warning banner: "Payment failed — your plan will be downgraded unless payment is updated"
- Link to Cashfree customer portal for payment method update

**Cancelled**
- "Access ends on [billingAnchorDate]"
- Resubscribe CTA

### Promo code flow

1. User enters code → `POST /users/redeem-promo { code }`
2. Backend validates: active, not expired, under maxRedemptions
3. If `FULL_ACCESS`: set `User.plan = code.plan`, `planExpiresAt = null` (permanent) — no Cashfree call
4. Success: "Solo plan activated. No billing — this is a gifted access code."
5. Error messages: "Invalid code" / "Code already redeemed" / "Code has expired"

---

## Landing Page Updates (`pakka-landing`)

### Price corrections in `PricingSection.tsx`

- Solo: ₹299/mo (was ₹699/mo — wrong)
- Studio: ₹699/mo (was ₹1799/mo — wrong)
- Annual toggle: remove or mark "Coming soon — annual billing not yet available"

### CTA updates

- "Join waitlist" → "Get started free" → `https://app.getclearwork.in/register`
- Subtext under paid plan CTA while founding window active: "Founding pricing — ₹149/mo until Aug 31"
- This subtext is static in the landing page (acceptable — it's a marketing site, not dynamic)

---

## Promo Code Admin (manual, no UI needed yet)

Create codes directly via Prisma/DB seed or a one-off script:

```typescript
await prisma.promoCode.create({
  data: {
    code: 'FAMILY_SOLO',
    plan: 'SOLO',
    discountType: 'FULL_ACCESS',
    durationMonths: null,   // permanent
    maxRedemptions: 1,
    isActive: true,
  }
})
```

No admin UI needed at this stage. You generate codes via script, share them manually.

---

## Plan Limit Enforcement

All services that enforce plan limits must be updated to use `effectivePlan(user)`:

- `proposals.service.ts` — already has plan check, update to use helper
- `leads.service.ts` — already has plan check, update to use helper
- Any future feature service imports `effectivePlan` from `users/effective-plan.ts`

---

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `PLAN_LIMIT` | 402 | Feature limit reached on current plan |
| `SUBSCRIPTION_ALREADY_ACTIVE` | 409 | User already has active subscription |
| `INVALID_PROMO_CODE` | 400 | Code not found / inactive |
| `PROMO_CODE_EXHAUSTED` | 400 | Max redemptions reached |
| `PROMO_CODE_ALREADY_REDEEMED` | 400 | This user already redeemed this code |

---

## Security

- Cashfree webhook endpoint verified via HMAC-SHA256 signature on every request — reject if invalid
- `POST /payments/create-subscription` requires valid JWT — no anonymous subscriptions
- `DELETE /payments/subscription` confirms the subscription belongs to the authenticated user before cancelling
- Promo codes are single-use by user (checked via `PromoRedemption` table)

---

## Out of Scope (this sprint)

- Annual billing
- Team / workspace plans
- Cashfree customer portal deep integration (use hosted portal URL from Cashfree)
- Admin dashboard for billing management
- Invoice PDF generation
- Percentage-based promo codes at Cashfree checkout (DiscountType.PERCENTAGE is modelled but not implemented)
- Usage-based pricing

---

## Build Order

1. Prisma schema migrations (User fields, BillingConfig, BillingEvent, PromoCode extensions)
2. Seed `BillingConfig` with founding/early-access dates
3. `effective-plan.ts` helper + update proposals/leads services
4. `PaymentProvider` interface + `CashfreeProvider` implementation
5. `PlanResolutionService`
6. `PaymentsModule` — controller + service + all endpoints
7. Webhook handler registry
8. Frontend billing hooks (`useSubscription`, `useCurrentPricing`)
9. `BillingSuccessPage` + `BillingCancelPage` + routes
10. `UpgradePlanCards` component + wire into `UpgradeModal`
11. `BillingTab` + all sub-components in Settings
12. Landing page: price fix + CTA update
13. `tsc --noEmit` both repos — zero errors
