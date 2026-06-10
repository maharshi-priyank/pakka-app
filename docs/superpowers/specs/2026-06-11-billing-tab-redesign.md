# Billing Tab Redesign — Logic Fix + UI Overhaul

## Goal

Fix the bug where a paid user sees upgrade cards instead of their plan, and redesign the billing tab so all plans are always visible with the current plan clearly marked and CTAs contextual to the user's tier.

## Root Cause of the Bug

`BillingTab.tsx` uses:
```ts
const isPaid = subscription?.plan !== 'FREE' && subscription?.subscriptionStatus !== 'NONE'
```

This fails for two valid real-world states:
- **Webhook-activated users**: Cashfree calls the webhook after payment, setting both `plan` and `subscriptionStatus`. If the webhook was blocked (e.g., 401), `subscriptionStatus` stays `NONE` even though `plan` is set.
- **Promo-code users**: `redeemPromo` sets `plan: STUDIO` and `planExpiresAt` but leaves `subscriptionStatus: NONE` — these users have a valid paid plan with no Cashfree subscription.

**Fix**: Remove the `isPaid` gate entirely. Replace with a single unified `PlanCards` component that always renders, reads subscription state, and shows the correct per-card state.

---

## Architecture

### Files

| Action | File |
|--------|------|
| **Delete** | `src/features/billing/components/PlanStatusCard.tsx` |
| **Delete** | `src/features/billing/components/UpgradePlanCards.tsx` |
| **Create** | `src/features/billing/components/PlanCards.tsx` |
| **Modify** | `src/features/billing/components/BillingTab.tsx` |

`PromoCodeInput.tsx`, `CancelSubscriptionModal.tsx`, and all hooks are untouched.

---

## `PlanCards` Component

### Props

```ts
interface Props {
  subscription: SubscriptionState | undefined
  onCancel: () => void
}
```

### Plan card states

The component always renders two cards: Solo and Studio. Card appearance is driven by `currentPlan` and `subscriptionStatus`.

**Deriving `currentPlan`:**
```ts
const currentPlan = subscription?.plan ?? 'FREE'  // 'FREE' | 'SOLO' | 'STUDIO'
```

#### Card states by tier

| User plan | Solo card | Studio card |
|-----------|-----------|-------------|
| `FREE` | CTA: "Get Solo" (indigo) | CTA: "Get Studio" (purple) |
| `SOLO` | "Current Plan" — shows status details, no CTA button | CTA: "Upgrade to Studio" (purple) |
| `STUDIO` | Grayed out, no CTA | "Current Plan" — shows status details, no CTA button |

#### Status details shown inside the "Current Plan" card (where the button was)

| `subscriptionStatus` | Content |
|----------------------|---------|
| `ACTIVE` | Green dot + "Active" + "Next billing: [date]" + "Cancel plan" link |
| `PAST_DUE` | Amber warning: "Payment failed — update your payment method via Cashfree" |
| `CANCELLED` | "Cancelled — access continues until [date]" + "Re-subscribe" CTA |
| `PAUSED` | Indigo dot + "Paused" |
| `NONE` + `planExpiresAt` set | "Promo active — expires [date]" + "Subscribe to keep access" CTA (opens checkout) |
| `NONE` + no `planExpiresAt` | "Contact support to check your plan status" |

---

## Visual Design

### Layout

```
[Founding pricing banner — amber, if applicable]

┌────────────────────┐  ┌────────────────────┐
│  Solo              │  │  Studio            │
│  [state-driven]    │  │  [state-driven]    │
└────────────────────┘  └────────────────────┘

[Monthly billing · Cancel anytime · Secure via Cashfree]

[PromoCodeInput]
```

- Container: `max-w-2xl` (wider than current `max-w-xl` — gives cards more breathing room)
- Cards: `grid grid-cols-1 sm:grid-cols-2 gap-4`

### Current plan card treatment

- `ring-2 ring-[#6366F1]` border + `shadow-md shadow-[#6366F1]/10`
- "Current Plan" pill badge: `bg-[#EEF2FF] text-[#6366F1] text-[10px] font-bold px-2.5 py-0.5 rounded-full` — replaces the "Popular" badge
- Status area replaces the CTA button area, same height (~44px)

### Non-active higher-tier card (Solo when user is on Studio)

- `opacity-60` on the card
- Features list still visible (for reference)
- No CTA button — just the price, features, and a subtle "You're on a higher plan" line at the bottom in `text-[#98A2B3]`

### Non-active lower-tier card (free upgrade target)

Normal card appearance. CTA button full color. No badge.

### Founding pricing banner

No change. Stays as `bg-[#FFF8ED] border border-[#FEE3A3]` amber pill with `Star` icon.

### Type scale

| Element | Size / Weight |
|---------|---------------|
| Plan name (Solo / Studio) | `text-[14px] font-bold` |
| Price | `text-[26px] font-black tabular-nums` |
| /mo | `text-[12px] text-[#98A2B3]` |
| Strikethrough original price | `text-[11px] text-[#9CA3AF] line-through` |
| Feature items | `text-[12px]` with `Check` icon `size={11}` |
| Status text inside card | `text-[12px] text-[#667085]` |
| Cancel plan link | `text-[12px] text-[#667085] hover:text-[#D92D20]` |

### Colors

| Element | Color |
|---------|-------|
| Solo accent | `#6366F1` (indigo) |
| Studio accent | `#7C3AED` (violet) |
| "Current Plan" ring | `#6366F1` |
| Active status dot | `#17B26A` |
| Past-due warning bg | `#FFF8ED` border `#FEE3A3` |
| Cancelled / Paused text | `#667085` |

---

## `BillingTab` After Change

```tsx
export default function BillingTab() {
  const { data: subscription, isLoading } = useSubscriptionStatus()
  const [showCancel, setShowCancel] = useState(false)

  if (isLoading) { /* spinner */ }

  return (
    <div className="space-y-5 max-w-2xl">
      <div> {/* heading */} </div>
      <PlanCards subscription={subscription} onCancel={() => setShowCancel(true)} />
      <PromoCodeInput />
      {subscription && (
        <CancelSubscriptionModal
          open={showCancel}
          onClose={() => setShowCancel(false)}
        />
      )}
    </div>
  )
}
```

No `isPaid` check. `CancelSubscriptionModal` renders (hidden) whenever subscription data exists — the modal itself only shows when `open={true}`.

---

## Edge Cases

| Scenario | Handled by |
|----------|-----------|
| `subscription` is `undefined` (loading failed / first load) | Default to `FREE` display — upgrade CTAs visible, no status details |
| `subscriptionStatus: NONE` + `planExpiresAt` set | "Promo active" message + subscribe CTA |
| `subscriptionStatus: CANCELLED` + `planExpiresAt` set | "Access until [date]" + re-subscribe CTA |
| `subscriptionStatus: PAST_DUE` | Amber warning inside current plan card |
| User on STUDIO tries to "upgrade" — no Studio CTA visible | N/A — Studio card shows "Current Plan", no CTA rendered |

---

## What Is NOT Changing

- `PromoCodeInput.tsx` — untouched
- `CancelSubscriptionModal.tsx` — untouched
- All hooks in `useSubscription.ts` and `useCurrentPricing.ts` — untouched
- `BillingSuccessPage.tsx`, `BillingCancelPage.tsx` — untouched
- Dark mode support — maintained (all dark: variants carried over)
