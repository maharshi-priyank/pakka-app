# Subscription & Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up end-to-end Cashfree Subscriptions billing so users can upgrade from Free to Solo/Studio, have their plan enforced, manage billing from Settings, and receive founding-member pricing based on time windows.

**Architecture:** Cashfree Subscriptions provides 6 hosted plan IDs (2 tiers × 3 pricing windows). The backend resolves which plan ID to assign at checkout time using a DB-stored `BillingConfig`. Webhooks activate/deactivate plans idempotently via a `BillingEvent` log. A single `effectivePlan()` helper centralises plan enforcement across all services.

**Tech Stack:** NestJS + Prisma + PostgreSQL (API) · React + Vite + TanStack Query + Tailwind (App) · Cashfree Subscriptions API · axios (HTTP client in frontend)

---

## File Map

### API (`pakka-api`)
| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` |
| Modify | `src/config/configuration.ts` |
| Create | `src/modules/users/effective-plan.ts` |
| Modify | `src/modules/users/users.service.ts` (redeemPromo) |
| Modify | `src/modules/proposals/proposals.service.ts` |
| Modify | `src/modules/leads/leads.service.ts` |
| Create | `src/modules/payments/payment-provider.interface.ts` |
| Create | `src/modules/payments/cashfree.provider.ts` |
| Create | `src/modules/payments/plan-resolution.service.ts` |
| Create | `src/modules/payments/payments.service.ts` |
| Create | `src/modules/payments/payments.controller.ts` |
| Create | `src/modules/payments/payments.module.ts` |
| Create | `src/modules/payments/dto/create-subscription.dto.ts` |
| Create | `src/modules/payments/dto/webhook-event.dto.ts` |
| Modify | `src/app.module.ts` |

### App (`pakka-app`)
| Action | File |
|--------|------|
| Modify | `src/features/settings/hooks/useProfile.ts` |
| Create | `src/features/billing/hooks/useCurrentPricing.ts` |
| Create | `src/features/billing/hooks/useSubscription.ts` |
| Modify | `src/components/UpgradeModal.tsx` |
| Create | `src/features/billing/components/BillingTab.tsx` |
| Create | `src/features/billing/components/PlanStatusCard.tsx` |
| Create | `src/features/billing/components/UpgradePlanCards.tsx` |
| Create | `src/features/billing/components/PromoCodeInput.tsx` |
| Create | `src/features/billing/components/CancelSubscriptionModal.tsx` |
| Modify | `src/pages/app/SettingsPage.tsx` |
| Create | `src/pages/app/BillingSuccessPage.tsx` |
| Create | `src/pages/app/BillingCancelPage.tsx` |
| Modify | `src/router/index.tsx` |

### Landing (`pakka-landing`)
| Action | File |
|--------|------|
| Modify | `src/components/PricingSection.tsx` |

---

## Task 1: Environment Variables

**Files:**
- Modify: `pakka-api/.env` (local)
- Modify: `pakka-api/src/config/configuration.ts`

- [ ] **Step 1: Add Cashfree vars to `.env`**

Open `pakka-api/.env` and add:
```
CASHFREE_APP_ID=your_cashfree_app_id_here
CASHFREE_SECRET_KEY=your_cashfree_secret_key_here
CASHFREE_ENVIRONMENT=sandbox
CASHFREE_WEBHOOK_SECRET=your_cashfree_webhook_secret_here
APP_FRONTEND_URL=http://localhost:5173
```

> Get App ID + Secret Key from Cashfree Dashboard → Subscriptions → API Keys.
> Get Webhook Secret from Cashfree Dashboard → Subscriptions → Webhooks (set webhook URL to `https://your-api.com/api/v1/payments/webhook`).
> For local dev, use `sandbox` environment. Change to `production` before go-live.

- [ ] **Step 2: Register vars in configuration.ts**

In `pakka-api/src/config/configuration.ts`, add to the `validationSchema` Joi object:

```typescript
CASHFREE_APP_ID:         Joi.string().required(),
CASHFREE_SECRET_KEY:     Joi.string().required(),
CASHFREE_ENVIRONMENT:    Joi.string().valid('sandbox', 'production').default('sandbox'),
CASHFREE_WEBHOOK_SECRET: Joi.string().required(),
APP_FRONTEND_URL:        Joi.string().default('http://localhost:5173'),
```

Then in the `configuration()` function (the `return {}` block), add:
```typescript
cashfree: {
  appId:           process.env.CASHFREE_APP_ID,
  secretKey:       process.env.CASHFREE_SECRET_KEY,
  environment:     process.env.CASHFREE_ENVIRONMENT ?? 'sandbox',
  webhookSecret:   process.env.CASHFREE_WEBHOOK_SECRET,
},
frontendUrl: process.env.APP_FRONTEND_URL ?? 'http://localhost:5173',
```

- [ ] **Step 3: Verify config loads**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx ts-node -e "import('./src/config/configuration').then(m => console.log(JSON.stringify(m.configuration().cashfree, null, 2)))"
```

Expected: prints `{ appId: '...', secretKey: '...', environment: 'sandbox', webhookSecret: '...' }`

- [ ] **Step 4: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add src/config/configuration.ts
git commit -m "feat(billing): add Cashfree env var configuration"
```

---

## Task 2: Prisma Schema Migration

**Files:**
- Modify: `pakka-api/prisma/schema.prisma`

- [ ] **Step 1: Add `SubscriptionStatus` enum and `DiscountType` enum**

In `schema.prisma`, after the existing `Plan` enum, add:

```prisma
enum SubscriptionStatus {
  NONE
  ACTIVE
  PAST_DUE
  CANCELLED
  PAUSED
}

enum DiscountType {
  FULL_ACCESS
  PERCENTAGE
}
```

- [ ] **Step 2: Add subscription fields to User model**

In the `User` model, after the `planExpiresAt` field (line 21), add:

```prisma
cashfreeSubscriptionId  String?
cashfreePlanId          String?
subscriptionStatus      SubscriptionStatus @default(NONE)
billingAnchorDate       DateTime?
```

- [ ] **Step 3: Add BillingConfig model**

After the `PromoRedemption` model, add:

```prisma
model BillingConfig {
  id                    String   @id @default("singleton")
  foundingPeriodEnds    DateTime
  earlyAccessPeriodEnds DateTime

  @@map("billing_configs")
}
```

- [ ] **Step 4: Add BillingEvent model**

After `BillingConfig`, add:

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

- [ ] **Step 5: Extend PromoCode model**

Replace the existing `PromoCode` model with:

```prisma
model PromoCode {
  id             String        @id @default(cuid())
  code           String        @unique
  plan           Plan
  discountType   DiscountType  @default(FULL_ACCESS)
  durationMonths Int?
  maxRedemptions Int?
  isActive       Boolean       @default(true)
  createdAt      DateTime      @default(now())
  redemptions    PromoRedemption[]

  @@map("promo_codes")
}
```

- [ ] **Step 6: Generate and run migration**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma migrate dev --name add_subscription_billing
```

Expected: `✔ Generated Prisma Client` and migration applied successfully.

- [ ] **Step 7: Seed BillingConfig singleton**

```bash
npx prisma db seed
```

If no seed script exists, run this one-off command:

```bash
npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.billingConfig.upsert({
  where: { id: 'singleton' },
  create: {
    id: 'singleton',
    foundingPeriodEnds: new Date('2026-08-31T23:59:59Z'),
    earlyAccessPeriodEnds: new Date('2026-12-31T23:59:59Z'),
  },
  update: {},
}).then(() => { console.log('BillingConfig seeded'); process.exit(0); });
"
```

Expected: `BillingConfig seeded`

- [ ] **Step 8: Commit**

```bash
git add prisma/
git commit -m "feat(billing): add subscription fields, BillingConfig, BillingEvent, extend PromoCode"
```

---

## Task 3: `effectivePlan` Helper + Update Services

**Files:**
- Create: `pakka-api/src/modules/users/effective-plan.ts`
- Modify: `pakka-api/src/modules/proposals/proposals.service.ts`
- Modify: `pakka-api/src/modules/leads/leads.service.ts`

- [ ] **Step 1: Create `effective-plan.ts`**

Create `pakka-api/src/modules/users/effective-plan.ts`:

```typescript
import { Plan, SubscriptionStatus } from '@prisma/client';

interface UserPlanFields {
  plan:               Plan;
  planExpiresAt:      Date | null;
  subscriptionStatus: SubscriptionStatus;
}

export function effectivePlan(user: UserPlanFields): Plan {
  if (user.subscriptionStatus === SubscriptionStatus.ACTIVE) return user.plan;
  if (user.planExpiresAt && user.planExpiresAt > new Date()) return user.plan;
  return Plan.FREE;
}
```

- [ ] **Step 2: Update `proposals.service.ts` to use the helper**

In `proposals.service.ts`, find the `create` method. Replace lines 51–57 (the inline effectivePlan block):

```typescript
// OLD — remove these lines:
const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { plan: true, planExpiresAt: true } });
const effectivePlan = (user?.planExpiresAt && user.planExpiresAt < new Date()) ? 'FREE' : user?.plan;
if (effectivePlan === 'FREE') {
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
  const count = await this.prisma.proposal.count({ where: { userId, createdAt: { gte: start } } });
  if (count >= 3) throw new HttpException({ message: 'Free plan: 3 proposals/month limit reached.', code: 'PLAN_LIMIT' }, 402);
}
```

Replace with:

```typescript
const user = await this.prisma.user.findUnique({
  where: { id: userId },
  select: { plan: true, planExpiresAt: true, subscriptionStatus: true },
});
if (!user) throw new NotFoundException('User not found');
if (effectivePlan(user) === Plan.FREE) {
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
  const count = await this.prisma.proposal.count({ where: { userId, createdAt: { gte: start } } });
  if (count >= 3) throw new HttpException({ message: 'Free plan: 3 proposals/month limit reached.', code: 'PLAN_LIMIT' }, 402);
}
```

Add the import at the top of `proposals.service.ts`:

```typescript
import { Plan } from '@prisma/client';
import { effectivePlan } from '../users/effective-plan';
```

- [ ] **Step 3: Update `leads.service.ts` to use the helper**

In `leads.service.ts` `create` method, replace lines 20–25:

```typescript
// OLD — remove these lines:
const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { plan: true, planExpiresAt: true } });
const effectivePlan = (user?.planExpiresAt && user.planExpiresAt < new Date()) ? 'FREE' : user?.plan;
if (effectivePlan === 'FREE') {
  const count = await this.prisma.lead.count({ where: { userId, isDeleted: false, stage: { notIn: ['WON', 'LOST'] } } });
  if (count >= 3) throw new HttpException({ message: 'Free plan: 3 active leads limit reached.', code: 'PLAN_LIMIT' }, 402);
}
```

Replace with:

```typescript
const user = await this.prisma.user.findUnique({
  where: { id: userId },
  select: { plan: true, planExpiresAt: true, subscriptionStatus: true },
});
if (!user) throw new NotFoundException('User not found');
if (effectivePlan(user) === Plan.FREE) {
  const count = await this.prisma.lead.count({ where: { userId, isDeleted: false, stage: { notIn: ['WON', 'LOST'] } } });
  if (count >= 3) throw new HttpException({ message: 'Free plan: 3 active leads limit reached.', code: 'PLAN_LIMIT' }, 402);
}
```

Add imports at top of `leads.service.ts`:

```typescript
import { Plan } from '@prisma/client';
import { effectivePlan } from '../users/effective-plan';
```

- [ ] **Step 4: Compile check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/users/effective-plan.ts src/modules/proposals/proposals.service.ts src/modules/leads/leads.service.ts
git commit -m "feat(billing): centralise effectivePlan helper, update proposals and leads services"
```

---

## Task 4: Update `redeemPromo` for Extended PromoCode

**Files:**
- Modify: `pakka-api/src/modules/users/users.service.ts`

The existing `redeemPromo` method hardcodes 30-day expiry and ignores `durationMonths`, `maxRedemptions`, and `discountType`. Update it.

- [ ] **Step 1: Replace `redeemPromo` in `users.service.ts`**

Find the `redeemPromo` method (lines 177–195) and replace entirely:

```typescript
async redeemPromo(userId: string, code: string) {
  const promo = await this.prisma.promoCode.findUnique({
    where: { code },
    include: { _count: { select: { redemptions: true } } },
  });

  if (!promo || !promo.isActive) {
    throw new NotFoundException('Invalid or expired promo code');
  }

  if (promo.maxRedemptions !== null && promo._count.redemptions >= promo.maxRedemptions) {
    throw new BadRequestException('This promo code has reached its maximum number of uses');
  }

  const existing = await this.prisma.promoRedemption.findUnique({
    where: { codeId_userId: { codeId: promo.id, userId } },
  });
  if (existing) throw new BadRequestException('You have already used this promo code');

  // Calculate expiry: null durationMonths = permanent (no expiry)
  let planExpiresAt: Date | null = null;
  if (promo.durationMonths !== null) {
    planExpiresAt = new Date();
    planExpiresAt.setMonth(planExpiresAt.getMonth() + promo.durationMonths);
  }

  await this.prisma.$transaction([
    this.prisma.promoRedemption.create({ data: { codeId: promo.id, userId } }),
    this.prisma.user.update({
      where: { id: userId },
      data: { plan: promo.plan, planExpiresAt },
    }),
  ]);

  return { plan: promo.plan, expiresAt: planExpiresAt };
}
```

- [ ] **Step 2: Compile check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/users/users.service.ts
git commit -m "feat(billing): update redeemPromo to support permanent access and maxRedemptions"
```

---

## Task 5: Payment Provider Interface + Cashfree Implementation

**Files:**
- Create: `pakka-api/src/modules/payments/payment-provider.interface.ts`
- Create: `pakka-api/src/modules/payments/cashfree.provider.ts`

- [ ] **Step 1: Create `payment-provider.interface.ts`**

```typescript
export interface CreateSubscriptionParams {
  userId:     string;
  userEmail:  string;
  userName:   string;
  planId:     string;
  returnUrl:  string;
  cancelUrl:  string;
}

export interface SubscriptionState {
  subscriptionId: string;
  status:         string;
  planId:         string;
  nextBillingAt:  Date | null;
}

export interface PaymentProvider {
  createSubscription(params: CreateSubscriptionParams): Promise<{ checkoutUrl: string; subscriptionId: string }>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  getSubscription(subscriptionId: string): Promise<SubscriptionState>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
```

- [ ] **Step 2: Create `cashfree.provider.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { PaymentProvider, CreateSubscriptionParams, SubscriptionState } from './payment-provider.interface';

@Injectable()
export class CashfreeProvider implements PaymentProvider {
  private readonly logger = new Logger(CashfreeProvider.name);
  private readonly baseUrl: string;
  private readonly appId: string;
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    const env = config.get<string>('cashfree.environment') ?? 'sandbox';
    this.baseUrl     = env === 'production'
      ? 'https://api.cashfree.com/api/v2'
      : 'https://sandbox.cashfree.com/api/v2';
    this.appId       = config.get<string>('cashfree.appId') ?? '';
    this.secretKey   = config.get<string>('cashfree.secretKey') ?? '';
    this.webhookSecret = config.get<string>('cashfree.webhookSecret') ?? '';
  }

  private get headers() {
    return {
      'x-client-id':     this.appId,
      'x-client-secret': this.secretKey,
      'x-api-version':   '2023-08-01',
      'Content-Type':    'application/json',
    };
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<{ checkoutUrl: string; subscriptionId: string }> {
    const subReferenceId = `sub_${params.userId}_${Date.now()}`;

    const body = {
      subscription_id:        subReferenceId,
      plan_id:                params.planId,
      customer_details: {
        customer_id:    params.userId,
        customer_email: params.userEmail,
        customer_name:  params.userName,
      },
      return_url:  params.returnUrl,
      cancel_url:  params.cancelUrl,
      auth_amount: 1,
    };

    const { data } = await axios.post(`${this.baseUrl}/subscriptions`, body, { headers: this.headers });

    return {
      checkoutUrl:    data.data?.payment_link ?? data.payment_link,
      subscriptionId: subReferenceId,
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await axios.patch(
      `${this.baseUrl}/subscriptions/${subscriptionId}`,
      { status: 'CANCELLED' },
      { headers: this.headers },
    );
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionState> {
    const { data } = await axios.get(`${this.baseUrl}/subscriptions/${subscriptionId}`, { headers: this.headers });
    const sub = data.data ?? data;
    return {
      subscriptionId: sub.subscription_id,
      status:         sub.status,
      planId:         sub.plan_id,
      nextBillingAt:  sub.next_payment_time ? new Date(sub.next_payment_time) : null,
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('base64');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}
```

- [ ] **Step 3: Compile check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/payments/payment-provider.interface.ts src/modules/payments/cashfree.provider.ts
git commit -m "feat(billing): add PaymentProvider interface and CashfreeProvider implementation"
```

---

## Task 6: PlanResolutionService

**Files:**
- Create: `pakka-api/src/modules/payments/plan-resolution.service.ts`

- [ ] **Step 1: Create `plan-resolution.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type PlanTier = 'SOLO' | 'STUDIO';

const PLAN_IDS: Record<PlanTier, Record<'founding' | 'earlyaccess' | 'regular', string>> = {
  SOLO: {
    founding:    'plan_solo_founding',
    earlyaccess: 'plan_solo_earlyaccess',
    regular:     'plan_solo_regular',
  },
  STUDIO: {
    founding:    'plan_studio_founding',
    earlyaccess: 'plan_studio_earlyaccess',
    regular:     'plan_studio_regular',
  },
};

const PRICES: Record<PlanTier, Record<'founding' | 'earlyaccess' | 'regular', number>> = {
  SOLO:   { founding: 149, earlyaccess: 199, regular: 299 },
  STUDIO: { founding: 349, earlyaccess: 499, regular: 699 },
};

@Injectable()
export class PlanResolutionService {
  constructor(private readonly prisma: PrismaService) {}

  private async getWindow(now: Date): Promise<'founding' | 'earlyaccess' | 'regular'> {
    const config = await this.prisma.billingConfig.findUnique({ where: { id: 'singleton' } });
    if (!config) return 'regular';
    if (now <= config.foundingPeriodEnds) return 'founding';
    if (now <= config.earlyAccessPeriodEnds) return 'earlyaccess';
    return 'regular';
  }

  async resolvePlanId(tier: PlanTier, now = new Date()): Promise<string> {
    const window = await this.getWindow(now);
    return PLAN_IDS[tier][window];
  }

  async getCurrentPricing(now = new Date()) {
    const config = await this.prisma.billingConfig.findUnique({ where: { id: 'singleton' } });
    const window = await this.getWindow(now);
    return {
      window,
      windowEnds: window === 'founding'
        ? config?.foundingPeriodEnds
        : window === 'earlyaccess'
          ? config?.earlyAccessPeriodEnds
          : null,
      solo:   { planId: PLAN_IDS.SOLO[window],   price: PRICES.SOLO[window]   },
      studio: { planId: PLAN_IDS.STUDIO[window], price: PRICES.STUDIO[window] },
    };
  }
}
```

- [ ] **Step 2: Compile check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/payments/plan-resolution.service.ts
git commit -m "feat(billing): add PlanResolutionService for time-based Cashfree plan ID lookup"
```

---

## Task 7: DTOs

**Files:**
- Create: `pakka-api/src/modules/payments/dto/create-subscription.dto.ts`
- Create: `pakka-api/src/modules/payments/dto/webhook-event.dto.ts`

- [ ] **Step 1: Create `create-subscription.dto.ts`**

```typescript
import { IsEnum } from 'class-validator';
import { PlanTier } from '../plan-resolution.service';

export class CreateSubscriptionDto {
  @IsEnum(['SOLO', 'STUDIO'])
  tier: PlanTier;
}
```

- [ ] **Step 2: Create `webhook-event.dto.ts`**

```typescript
// Raw Cashfree webhook payload — not validated via class-validator
// (webhook body is verified by HMAC signature in the controller)
export interface CashfreeWebhookEvent {
  type:          string;
  data: {
    subscription: {
      subscription_id:   string;
      plan_id:           string;
      status:            string;
      customer_details?: { customer_id?: string };
      next_payment_time?: string;
    };
    payment?: {
      cf_payment_id: string;
    };
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/payments/dto/
git commit -m "feat(billing): add CreateSubscriptionDto and webhook event type"
```

---

## Task 8: PaymentsService

**Files:**
- Create: `pakka-api/src/modules/payments/payments.service.ts`

- [ ] **Step 1: Create `payments.service.ts`**

```typescript
import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentProvider, PAYMENT_PROVIDER } from './payment-provider.interface';
import { PlanResolutionService, PlanTier } from './plan-resolution.service';
import { CashfreeWebhookEvent } from './dto/webhook-event.dto';
import { Plan, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma:      PrismaService,
    private readonly config:      ConfigService,
    @Inject(PAYMENT_PROVIDER)
    private readonly provider:    PaymentProvider,
    private readonly resolution:  PlanResolutionService,
  ) {}

  async createSubscription(userId: string, tier: PlanTier) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where:  { id: userId },
      select: { subscriptionStatus: true, email: true, name: true },
    });

    if (user.subscriptionStatus === SubscriptionStatus.ACTIVE) {
      throw new BadRequestException({ message: 'You already have an active subscription.', code: 'SUBSCRIPTION_ALREADY_ACTIVE' });
    }

    const planId      = await this.resolution.resolvePlanId(tier);
    const frontendUrl = this.config.get<string>('frontendUrl') ?? 'http://localhost:5173';

    const { checkoutUrl, subscriptionId } = await this.provider.createSubscription({
      userId,
      userEmail: user.email,
      userName:  user.name,
      planId,
      returnUrl: `${frontendUrl}/billing/success?ref=${subscriptionId}`,
      cancelUrl: `${frontendUrl}/billing/cancelled`,
    });

    return { checkoutUrl };
  }

  async getSubscription(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where:  { id: userId },
      select: {
        plan: true, subscriptionStatus: true, cashfreePlanId: true,
        cashfreeSubscriptionId: true, billingAnchorDate: true,
      },
    });
    return user;
  }

  async cancelSubscription(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where:  { id: userId },
      select: { cashfreeSubscriptionId: true, subscriptionStatus: true },
    });

    if (!user.cashfreeSubscriptionId || user.subscriptionStatus !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('No active subscription to cancel');
    }

    await this.provider.cancelSubscription(user.cashfreeSubscriptionId);
    await this.prisma.user.update({
      where: { id: userId },
      data:  { subscriptionStatus: SubscriptionStatus.CANCELLED },
    });
  }

  async getCurrentPricing() {
    return this.resolution.getCurrentPricing();
  }

  async handleWebhook(rawBody: string, signature: string, event: CashfreeWebhookEvent) {
    if (!this.provider.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn('Invalid Cashfree webhook signature');
      return;
    }

    const sub       = event.data?.subscription;
    const userId    = sub?.customer_details?.customer_id ?? null;
    const cashfreeRef = `${event.type}_${sub?.subscription_id}_${event.data?.payment?.cf_payment_id ?? sub?.subscription_id}`;

    // Idempotency — skip if already processed
    const alreadyProcessed = await this.prisma.billingEvent.findUnique({ where: { cashfreeRef } });
    if (alreadyProcessed) return;

    await this.prisma.billingEvent.create({
      data: { eventType: event.type, cashfreeRef, userId, payload: event as object },
    });

    const handlers: Record<string, () => Promise<void>> = {
      'SUBSCRIPTION_ACTIVATED':       () => this.handleActivated(userId, sub),
      'SUBSCRIPTION_PAYMENT_SUCCESS': () => this.handlePaymentSuccess(userId, sub),
      'SUBSCRIPTION_PAYMENT_FAILED':  () => this.handlePaymentFailed(userId),
      'SUBSCRIPTION_CANCELLED':       () => this.handleCancelled(userId),
      'SUBSCRIPTION_PAUSED':          () => this.handlePaused(userId),
    };

    const handler = handlers[event.type];
    if (handler) await handler();
    else this.logger.log(`Unhandled Cashfree event: ${event.type}`);
  }

  private async handleActivated(userId: string | null, sub: CashfreeWebhookEvent['data']['subscription']) {
    if (!userId) return;
    const tier = sub.plan_id.includes('studio') ? Plan.STUDIO : Plan.SOLO;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan:                   tier,
        subscriptionStatus:     SubscriptionStatus.ACTIVE,
        cashfreeSubscriptionId: sub.subscription_id,
        cashfreePlanId:         sub.plan_id,
        billingAnchorDate:      sub.next_payment_time ? new Date(sub.next_payment_time) : null,
        planExpiresAt:          null,
      },
    });
  }

  private async handlePaymentSuccess(userId: string | null, sub: CashfreeWebhookEvent['data']['subscription']) {
    if (!userId) return;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        billingAnchorDate:  sub.next_payment_time ? new Date(sub.next_payment_time) : null,
      },
    });
  }

  private async handlePaymentFailed(userId: string | null) {
    if (!userId) return;
    await this.prisma.user.update({
      where: { id: userId },
      data:  { subscriptionStatus: SubscriptionStatus.PAST_DUE },
    });
  }

  private async handleCancelled(userId: string | null) {
    if (!userId) return;
    await this.prisma.user.update({
      where: { id: userId },
      data:  { subscriptionStatus: SubscriptionStatus.CANCELLED, plan: Plan.FREE },
    });
  }

  private async handlePaused(userId: string | null) {
    if (!userId) return;
    await this.prisma.user.update({
      where: { id: userId },
      data:  { subscriptionStatus: SubscriptionStatus.PAUSED },
    });
  }
}
```

- [ ] **Step 2: Compile check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/payments/payments.service.ts
git commit -m "feat(billing): add PaymentsService with subscription CRUD and webhook handler registry"
```

---

## Task 9: PaymentsController + PaymentsModule + Wire into AppModule

**Files:**
- Create: `pakka-api/src/modules/payments/payments.controller.ts`
- Create: `pakka-api/src/modules/payments/payments.module.ts`
- Modify: `pakka-api/src/app.module.ts`

- [ ] **Step 1: Create `payments.controller.ts`**

```typescript
import {
  Controller, Post, Get, Delete, Body, Req, RawBodyRequest, Headers, HttpCode
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayloadOnly } from '../../common/decorators/jwt-payload-only.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { User } from '@prisma/client';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('create-subscription')
  createSubscription(@CurrentUser() user: User, @Body() dto: CreateSubscriptionDto) {
    return this.payments.createSubscription(user.id, dto.tier);
  }

  @Get('subscription')
  getSubscription(@CurrentUser() user: User) {
    return this.payments.getSubscription(user.id);
  }

  @Delete('subscription')
  @HttpCode(204)
  cancelSubscription(@CurrentUser() user: User) {
    return this.payments.cancelSubscription(user.id);
  }

  @Get('current-pricing')
  getCurrentPricing() {
    return this.payments.getCurrentPricing();
  }

  @Post('webhook')
  @Public()
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-webhook-signature') signature: string,
    @Body() event: any,
  ) {
    const rawBody = (req.rawBody ?? Buffer.from(JSON.stringify(event))).toString('utf8');
    await this.payments.handleWebhook(rawBody, signature ?? '', event);
    return { received: true };
  }
}
```

> **Note:** `@Public()` decorator skips JWT guard for webhook endpoint. Check that `Public` decorator exists at `src/common/decorators/public.decorator.ts`. If it doesn't exist, create it:
> ```typescript
> import { SetMetadata } from '@nestjs/common';
> export const IS_PUBLIC_KEY = 'isPublic';
> export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
> ```
> Then ensure the JWT guard checks `Reflector.getAllAndOverride(IS_PUBLIC_KEY, ...)` — this pattern is likely already there for the portal/public routes.

- [ ] **Step 2: Check if `@Public()` decorator exists**

```bash
find /Users/mvaghela/Documents/MyProjects/pakka-api/src/common -name "public.decorator.ts" | head -3
grep -r "IS_PUBLIC\|isPublic" /Users/mvaghela/Documents/MyProjects/pakka-api/src --include="*.ts" | head -5
```

If it exists, no action needed. If not, create it as described in Step 1's note.

- [ ] **Step 3: Enable raw body parsing for webhook endpoint**

In `pakka-api/src/main.ts`, find the `express.json` line and update it to capture rawBody:

```typescript
// REPLACE this:
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// WITH this:
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

- [ ] **Step 4: Create `payments.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PlanResolutionService } from './plan-resolution.service';
import { CashfreeProvider } from './cashfree.provider';
import { PAYMENT_PROVIDER } from './payment-provider.interface';

@Module({
  imports:     [PrismaModule],
  controllers: [PaymentsController],
  providers:   [
    PaymentsService,
    PlanResolutionService,
    { provide: PAYMENT_PROVIDER, useClass: CashfreeProvider },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
```

- [ ] **Step 5: Register PaymentsModule in `app.module.ts`**

Add to imports in `app.module.ts`:

```typescript
import { PaymentsModule } from './modules/payments/payments.module';
```

And add `PaymentsModule` to the `imports` array.

- [ ] **Step 6: Compile check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Smoke test — start API and check endpoint exists**

```bash
npm run start:dev &
sleep 5
curl -s http://localhost:3000/api/v1/payments/current-pricing | head -c 200
```

Expected: JSON response with `window`, `solo`, `studio` fields (no auth needed for this endpoint).

Kill the dev server after test: `kill %1`

- [ ] **Step 8: Commit**

```bash
git add src/modules/payments/payments.controller.ts src/modules/payments/payments.module.ts src/app.module.ts src/main.ts
git commit -m "feat(billing): wire PaymentsController, PaymentsModule, register in AppModule"
```

---

## Task 10: Frontend — Update UserProfile Type + Billing Hooks

**Files:**
- Modify: `pakka-app/src/features/settings/hooks/useProfile.ts`
- Create: `pakka-app/src/features/billing/hooks/useCurrentPricing.ts`
- Create: `pakka-app/src/features/billing/hooks/useSubscription.ts`

- [ ] **Step 1: Update `UserProfile` type in `useProfile.ts`**

Add these fields to the `UserProfile` interface (after `planExpiresAt`):

```typescript
cashfreeSubscriptionId: string | null
cashfreePlanId:         string | null
subscriptionStatus:     'NONE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'PAUSED'
billingAnchorDate:      string | null
```

- [ ] **Step 2: Create `src/features/billing/hooks/useCurrentPricing.ts`**

First create the directory:
```bash
mkdir -p /Users/mvaghela/Documents/MyProjects/pakka-app/src/features/billing/hooks
mkdir -p /Users/mvaghela/Documents/MyProjects/pakka-app/src/features/billing/components
```

Then create the file:

```typescript
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface PricingWindow {
  window:     'founding' | 'earlyaccess' | 'regular'
  windowEnds: string | null
  solo:   { planId: string; price: number }
  studio: { planId: string; price: number }
}

export function useCurrentPricing() {
  return useQuery<PricingWindow>({
    queryKey:  ['billing', 'current-pricing'],
    queryFn:   async () => {
      const { data } = await api.get<{ data: PricingWindow }>('/payments/current-pricing')
      return data.data
    },
    staleTime: 10 * 60_000,
  })
}
```

- [ ] **Step 3: Create `src/features/billing/hooks/useSubscription.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export interface SubscriptionState {
  plan:                   'FREE' | 'SOLO' | 'STUDIO'
  subscriptionStatus:     'NONE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'PAUSED'
  cashfreePlanId:         string | null
  cashfreeSubscriptionId: string | null
  billingAnchorDate:      string | null
}

export function useSubscriptionStatus() {
  return useQuery<SubscriptionState>({
    queryKey: ['billing', 'subscription'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: SubscriptionState }>('/payments/subscription')
      return data.data
    },
    staleTime: 30_000,
  })
}

export function useCreateSubscription() {
  return useMutation({
    mutationFn: async (tier: 'SOLO' | 'STUDIO') => {
      const { data } = await api.post<{ data: { checkoutUrl: string } }>('/payments/create-subscription', { tier })
      return data.data
    },
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCancelSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete('/payments/subscription')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Subscription cancelled. Access continues until your billing period ends.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/features/settings/hooks/useProfile.ts src/features/billing/
git commit -m "feat(billing): add UserProfile subscription fields, useCurrentPricing, useSubscription hooks"
```

---

## Task 11: Update UpgradeModal

**Files:**
- Modify: `pakka-app/src/components/UpgradeModal.tsx`

Replace the static prices and "Join waitlist" CTA with live pricing and real checkout.

- [ ] **Step 1: Rewrite `UpgradeModal.tsx`**

```typescript
import { X, Check, Zap, Sparkles } from 'lucide-react'
import { useUiStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { useCurrentPricing } from '@/features/billing/hooks/useCurrentPricing'
import { useCreateSubscription } from '@/features/billing/hooks/useSubscription'

const FREE_FEATURES = [
  '3 proposals / month',
  '3 active leads',
  '1 client',
  'ClearWork watermark on docs',
]
const SOLO_FEATURES = [
  'Unlimited proposals',
  'Unlimited leads',
  '10 clients',
  'No watermark',
  'E-sign contracts',
]
const STUDIO_FEATURES = [
  'Everything in Solo',
  'Unlimited clients',
  'Team members (soon)',
  'White-label docs',
  'Priority support',
]

const WINDOW_LABELS: Record<string, string> = {
  founding:    'Founding Member',
  earlyaccess: 'Early Access',
  regular:     '',
}

export default function UpgradeModal() {
  const { upgradeModal, closeUpgradeModal } = useUiStore()
  const { data: pricing, isLoading: pricingLoading } = useCurrentPricing()
  const createSub = useCreateSubscription()

  if (!upgradeModal.open) return null

  const windowLabel = pricing ? WINDOW_LABELS[pricing.window] : ''
  const soloPrice   = pricing?.solo.price   ?? 299
  const studioPrice = pricing?.studio.price ?? 699

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] anim-fade" onClick={closeUpgradeModal} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-[640px] glass-modal rounded-2xl pointer-events-auto anim-modal-in">

          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center">
                  <Zap size={14} className="text-[#6366F1]" strokeWidth={2.5} />
                </div>
                <h2 className="text-[16px] font-bold text-[#0D1117] dark:text-[#ECEEF3]">Upgrade your plan</h2>
              </div>
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8]">
                You've reached the <span className="font-semibold text-[#344054] dark:text-[#C2C8D8]">{upgradeModal.feature}</span> limit on the Free plan.
              </p>
            </div>
            <button onClick={closeUpgradeModal} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#98A2B3] hover:bg-[#F4F5F8] transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-3 gap-3 px-6 pb-4">
            {/* Free */}
            <div className="relative rounded-xl p-4 ring-1 bg-[#F4F5F8] dark:bg-[#21222D] ring-[#EAECF0] dark:ring-[#3D4258]">
              <p className="text-[13px] font-bold mb-0.5 text-[#667085]">Free</p>
              <p className="text-[20px] font-black text-[#0D1117] dark:text-[#ECEEF3] leading-none">₹0<span className="text-[11px] font-medium text-[#98A2B3] ml-0.5">forever</span></p>
              <ul className="mt-3 space-y-1.5">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-1.5 text-[11.5px] text-[#344054] dark:text-[#C2C8D8]">
                    <Check size={11} className="mt-0.5 shrink-0 text-[#667085]" strokeWidth={2.5} />{f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Solo */}
            <div className="relative rounded-xl p-4 ring-1 bg-[#EEF2FF] dark:bg-[#1E2040] ring-[#6366F1]/40">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-[#6366F1] text-white text-[10px] font-bold rounded-full">Popular</span>
              <p className="text-[13px] font-bold mb-0.5 text-[#6366F1]">Solo</p>
              <p className="text-[20px] font-black text-[#0D1117] dark:text-[#ECEEF3] leading-none tabular-nums">
                ₹{pricingLoading ? '—' : soloPrice}<span className="text-[11px] font-medium text-[#98A2B3] ml-0.5">/mo</span>
              </p>
              {windowLabel && <p className="text-[10px] text-[#6366F1] font-semibold mt-0.5">{windowLabel}</p>}
              <ul className="mt-3 space-y-1.5">
                {SOLO_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-1.5 text-[11.5px] text-[#344054] dark:text-[#C2C8D8]">
                    <Check size={11} className="mt-0.5 shrink-0 text-[#6366F1]" strokeWidth={2.5} />{f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Studio */}
            <div className="relative rounded-xl p-4 ring-1 bg-[#F5F3FF] dark:bg-[#1E1040] ring-[#7C3AED]/30">
              <p className="text-[13px] font-bold mb-0.5 text-[#7C3AED]">Studio</p>
              <p className="text-[20px] font-black text-[#0D1117] dark:text-[#ECEEF3] leading-none tabular-nums">
                ₹{pricingLoading ? '—' : studioPrice}<span className="text-[11px] font-medium text-[#98A2B3] ml-0.5">/mo</span>
              </p>
              {windowLabel && <p className="text-[10px] text-[#7C3AED] font-semibold mt-0.5">{windowLabel}</p>}
              <ul className="mt-3 space-y-1.5">
                {STUDIO_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-1.5 text-[11.5px] text-[#344054] dark:text-[#C2C8D8]">
                    <Check size={11} className="mt-0.5 shrink-0 text-[#7C3AED]" strokeWidth={2.5} />{f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTAs */}
          <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-2 border-t border-[#F1F3F8] dark:border-[#26283A]">
            <button
              onClick={() => { createSub.mutate('SOLO'); closeUpgradeModal(); }}
              disabled={createSub.isPending}
              className="btn-primary text-[13px] h-9 px-4"
            >
              {createSub.isPending ? 'Redirecting…' : `Upgrade to Solo — ₹${soloPrice}/mo`}
            </button>
            <button
              onClick={() => { createSub.mutate('STUDIO'); closeUpgradeModal(); }}
              disabled={createSub.isPending}
              className="text-[13px] h-9 px-4 rounded-lg border border-[#EAECF0] dark:border-[#26283A] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F4F5F8] dark:hover:bg-[#21222D] transition-colors font-semibold"
            >
              Studio — ₹{studioPrice}/mo
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/components/UpgradeModal.tsx
git commit -m "feat(billing): wire UpgradeModal to live pricing and Cashfree checkout"
```

---

## Task 12: BillingSuccessPage + BillingCancelPage + Routes

**Files:**
- Create: `pakka-app/src/pages/app/BillingSuccessPage.tsx`
- Create: `pakka-app/src/pages/app/BillingCancelPage.tsx`
- Modify: `pakka-app/src/router/index.tsx`

- [ ] **Step 1: Create `BillingSuccessPage.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { useSubscriptionStatus } from '@/features/billing/hooks/useSubscription'

export default function BillingSuccessPage() {
  const navigate = useNavigate()
  const [attempts, setAttempts]   = useState(0)
  const [timedOut, setTimedOut]   = useState(false)
  const { data: sub, refetch }    = useSubscriptionStatus()

  useEffect(() => {
    if (sub?.subscriptionStatus === 'ACTIVE') {
      setTimeout(() => navigate('/app/dashboard'), 1500)
      return
    }
    if (attempts >= 5) { setTimedOut(true); return }
    const t = setTimeout(() => { refetch(); setAttempts(a => a + 1); }, 2000)
    return () => clearTimeout(t)
  }, [sub, attempts, refetch, navigate])

  if (timedOut) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-[#EAECF0] p-8 max-w-sm w-full text-center">
          <AlertCircle size={40} className="mx-auto text-[#F79009] mb-4" />
          <h2 className="text-[18px] font-bold text-[#101828] mb-2">Taking a moment…</h2>
          <p className="text-[13px] text-[#667085] mb-4">Your payment was received. Your plan will activate in a minute. Try refreshing the app.</p>
          <button onClick={() => navigate('/app/dashboard')} className="btn-primary h-9 px-4 text-[13px]">Go to dashboard</button>
        </div>
      </div>
    )
  }

  if (sub?.subscriptionStatus === 'ACTIVE') {
    const planLabel = sub.plan === 'STUDIO' ? 'Studio' : 'Solo'
    return (
      <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-[#EAECF0] p-8 max-w-sm w-full text-center">
          <CheckCircle2 size={40} className="mx-auto text-[#17B26A] mb-4" />
          <h2 className="text-[18px] font-bold text-[#101828] mb-2">You're on {planLabel}!</h2>
          <p className="text-[13px] text-[#667085]">Redirecting to dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-8 max-w-sm w-full text-center">
        <Loader2 size={32} className="mx-auto text-[#6366F1] animate-spin mb-4" />
        <h2 className="text-[18px] font-bold text-[#101828] mb-2">Activating your plan…</h2>
        <p className="text-[13px] text-[#667085]">Confirming payment with Cashfree.</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `BillingCancelPage.tsx`**

```typescript
import { useNavigate } from 'react-router-dom'
import { XCircle } from 'lucide-react'

export default function BillingCancelPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-8 max-w-sm w-full text-center">
        <XCircle size={40} className="mx-auto text-[#D0D5DD] mb-4" />
        <h2 className="text-[18px] font-bold text-[#101828] mb-2">Payment cancelled</h2>
        <p className="text-[13px] text-[#667085] mb-6">No charge was made. You can upgrade any time from Settings.</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => navigate('/app/dashboard')} className="btn-secondary h-9 px-4 text-[13px]">Go to dashboard</button>
          <button onClick={() => navigate('/app/settings?tab=billing')} className="btn-primary h-9 px-4 text-[13px]">View plans</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add routes to `router/index.tsx`**

Find the section where public routes are defined (non-authenticated routes). Add two new routes alongside the existing public routes:

```typescript
{
  path: '/billing/success',
  lazy: async () => {
    const { default: Component } = await import('@/pages/app/BillingSuccessPage')
    return { Component }
  },
},
{
  path: '/billing/cancelled',
  lazy: async () => {
    const { default: Component } = await import('@/pages/app/BillingCancelPage')
    return { Component }
  },
},
```

> These are standalone pages (not nested inside the app shell layout) because the user lands here from Cashfree redirect — they may or may not be logged in.

- [ ] **Step 4: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/pages/app/BillingSuccessPage.tsx src/pages/app/BillingCancelPage.tsx src/router/index.tsx
git commit -m "feat(billing): add BillingSuccessPage, BillingCancelPage, and routes"
```

---

## Task 13: Billing Tab in Settings

**Files:**
- Create: `pakka-app/src/features/billing/components/PlanStatusCard.tsx`
- Create: `pakka-app/src/features/billing/components/UpgradePlanCards.tsx`
- Create: `pakka-app/src/features/billing/components/PromoCodeInput.tsx`
- Create: `pakka-app/src/features/billing/components/CancelSubscriptionModal.tsx`
- Create: `pakka-app/src/features/billing/components/BillingTab.tsx`
- Modify: `pakka-app/src/pages/app/SettingsPage.tsx`

- [ ] **Step 1: Create `PlanStatusCard.tsx`**

```typescript
import { CreditCard, Calendar, AlertTriangle } from 'lucide-react'
import type { SubscriptionState } from '@/features/billing/hooks/useSubscription'

interface Props { sub: SubscriptionState }

const PLAN_LABELS: Record<string, string>   = { FREE: 'Free', SOLO: 'Solo', STUDIO: 'Studio' }
const STATUS_LABELS: Record<string, string> = {
  ACTIVE:    'Active',
  PAST_DUE:  'Payment failed',
  CANCELLED: 'Cancelled',
  PAUSED:    'Paused',
  NONE:      '—',
}

const PLAN_PRICES: Record<string, string> = {
  plan_solo_founding:    '₹149/mo (Founding)',
  plan_solo_earlyaccess: '₹199/mo (Early Access)',
  plan_solo_regular:     '₹299/mo',
  plan_studio_founding:  '₹349/mo (Founding)',
  plan_studio_earlyaccess: '₹499/mo (Early Access)',
  plan_studio_regular:   '₹699/mo',
}

export default function PlanStatusCard({ sub }: Props) {
  const priceLabel = sub.cashfreePlanId ? (PLAN_PRICES[sub.cashfreePlanId] ?? '') : ''
  const nextBilling = sub.billingAnchorDate
    ? new Date(sub.billingAnchorDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="bg-white border border-[#EAECF0] rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0">
            <CreditCard size={16} className="text-[#6366F1]" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#101828]">{PLAN_LABELS[sub.plan] ?? sub.plan} Plan</p>
            {priceLabel && <p className="text-[12px] text-[#667085] mt-0.5">{priceLabel}</p>}
          </div>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
          sub.subscriptionStatus === 'ACTIVE'    ? 'bg-[#ECFDF3] text-[#067647]' :
          sub.subscriptionStatus === 'PAST_DUE'  ? 'bg-[#FFF4ED] text-[#B93815]' :
          'bg-[#F2F4F7] text-[#667085]'
        }`}>
          {STATUS_LABELS[sub.subscriptionStatus]}
        </span>
      </div>

      {sub.subscriptionStatus === 'PAST_DUE' && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-[#FFF4ED] border border-[#FDDCAB] rounded-lg">
          <AlertTriangle size={14} className="text-[#F79009] shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#B93815]">
            Payment failed — your plan will be downgraded if not resolved.{' '}
            <a href="https://payments.cashfree.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Update payment method</a>
          </p>
        </div>
      )}

      {nextBilling && sub.subscriptionStatus === 'ACTIVE' && (
        <div className="mt-4 flex items-center gap-2 text-[12px] text-[#667085]">
          <Calendar size={13} />
          Next billing: {nextBilling}
        </div>
      )}

      {sub.subscriptionStatus === 'CANCELLED' && nextBilling && (
        <p className="mt-4 text-[12px] text-[#667085]">Access continues until {nextBilling}.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `UpgradePlanCards.tsx`**

```typescript
import { Check } from 'lucide-react'
import { useCurrentPricing } from '@/features/billing/hooks/useCurrentPricing'
import { useCreateSubscription } from '@/features/billing/hooks/useSubscription'

const WINDOW_LABELS: Record<string, string> = {
  founding:    'Founding pricing',
  earlyaccess: 'Early Access pricing',
  regular:     '',
}

export default function UpgradePlanCards() {
  const { data: pricing, isLoading } = useCurrentPricing()
  const createSub = useCreateSubscription()

  const windowLabel = pricing ? WINDOW_LABELS[pricing.window] : ''

  if (isLoading) {
    return <div className="h-32 bg-[#F4F6FB] rounded-xl animate-pulse" />
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {(['SOLO', 'STUDIO'] as const).map((tier) => {
        const info  = tier === 'SOLO' ? pricing?.solo : pricing?.studio
        const price = info?.price ?? (tier === 'SOLO' ? 299 : 699)
        return (
          <div key={tier} className="bg-white border border-[#EAECF0] rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[14px] font-bold text-[#101828]">{tier === 'SOLO' ? 'Solo' : 'Studio'}</p>
                {windowLabel && <p className="text-[11px] text-[#6366F1] font-semibold">{windowLabel}</p>}
              </div>
              <p className="text-[22px] font-black text-[#101828] tabular-nums">
                ₹{price}<span className="text-[12px] font-medium text-[#98A2B3] ml-0.5">/mo</span>
              </p>
            </div>
            <button
              onClick={() => createSub.mutate(tier)}
              disabled={createSub.isPending}
              className="w-full btn-primary text-[13px] h-9"
            >
              {createSub.isPending ? 'Redirecting…' : `Upgrade to ${tier === 'SOLO' ? 'Solo' : 'Studio'}`}
            </button>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create `PromoCodeInput.tsx`**

```typescript
import { useState } from 'react'
import { Tag } from 'lucide-react'
import { useRedeemPromo } from '@/features/settings/hooks/useProfile'

export default function PromoCodeInput() {
  const [code, setCode]   = useState('')
  const redeem            = useRedeemPromo()

  const handleApply = () => {
    if (!code.trim()) return
    redeem.mutate(code.trim().toUpperCase(), {
      onSuccess: () => setCode(''),
    })
  }

  return (
    <div className="bg-white border border-[#EAECF0] rounded-xl p-5">
      <p className="text-[13px] font-semibold text-[#344054] mb-3 flex items-center gap-2">
        <Tag size={14} className="text-[#6366F1]" />
        Promo / Gift code
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Enter code"
          className="flex-1 h-9 px-3 rounded-lg border border-[#EAECF0] text-[13px] text-[#101828] bg-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
          onKeyDown={e => e.key === 'Enter' && handleApply()}
        />
        <button
          onClick={handleApply}
          disabled={redeem.isPending || !code.trim()}
          className="btn-primary h-9 px-4 text-[13px]"
        >
          {redeem.isPending ? '…' : 'Apply'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `CancelSubscriptionModal.tsx`**

```typescript
import { X, AlertTriangle } from 'lucide-react'
import { useCancelSubscription } from '@/features/billing/hooks/useSubscription'

interface Props { onClose: () => void }

export default function CancelSubscriptionModal({ onClose }: Props) {
  const cancel = useCancelSubscription()

  const handleConfirm = async () => {
    await cancel.mutateAsync()
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-xl p-6 max-w-sm w-full pointer-events-auto">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FFF4ED] flex items-center justify-center">
                <AlertTriangle size={14} className="text-[#F79009]" />
              </div>
              <h3 className="text-[15px] font-bold text-[#101828]">Cancel subscription</h3>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#98A2B3] hover:bg-[#F4F5F8]">
              <X size={14} />
            </button>
          </div>
          <p className="text-[13px] text-[#667085] mb-6">
            Your subscription will be cancelled. You'll retain access until the end of your current billing period, then be downgraded to the Free plan.
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 btn-secondary h-9 text-[13px]">Keep subscription</button>
            <button onClick={handleConfirm} disabled={cancel.isPending} className="flex-1 h-9 text-[13px] rounded-lg bg-[#D92D20] text-white font-semibold hover:bg-[#B42318] transition-colors">
              {cancel.isPending ? 'Cancelling…' : 'Yes, cancel'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 5: Create `BillingTab.tsx`**

```typescript
import { useState } from 'react'
import { useSubscriptionStatus } from '@/features/billing/hooks/useSubscription'
import PlanStatusCard from './PlanStatusCard'
import UpgradePlanCards from './UpgradePlanCards'
import PromoCodeInput from './PromoCodeInput'
import CancelSubscriptionModal from './CancelSubscriptionModal'

export default function BillingTab() {
  const { data: sub, isLoading } = useSubscriptionStatus()
  const [showCancel, setShowCancel] = useState(false)

  if (isLoading) {
    return <div className="space-y-3">
      {[1, 2].map(i => <div key={i} className="h-20 bg-[#F4F6FB] rounded-xl animate-pulse" />)}
    </div>
  }

  const isActive    = sub?.subscriptionStatus === 'ACTIVE'
  const isCancelled = sub?.subscriptionStatus === 'CANCELLED'
  const isPastDue   = sub?.subscriptionStatus === 'PAST_DUE'
  const showUpgrade = !isActive || isCancelled

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[16px] font-bold text-[#101828]">Billing</h2>
        <p className="text-[13px] text-[#667085] mt-0.5">Manage your subscription and plan.</p>
      </div>

      {sub && (isActive || isPastDue || isCancelled) && (
        <PlanStatusCard sub={sub} />
      )}

      {showUpgrade && <UpgradePlanCards />}

      {isActive && (
        <div className="bg-white border border-[#EAECF0] rounded-xl p-5">
          <p className="text-[13px] font-semibold text-[#344054] mb-3">Manage subscription</p>
          <button
            onClick={() => setShowCancel(true)}
            className="text-[13px] font-semibold text-[#D92D20] hover:text-[#B42318] transition-colors"
          >
            Cancel subscription
          </button>
        </div>
      )}

      <PromoCodeInput />

      {showCancel && <CancelSubscriptionModal onClose={() => setShowCancel(false)} />}
    </div>
  )
}
```

- [ ] **Step 6: Add Billing tab to `SettingsPage.tsx`**

In `SettingsPage.tsx`, add to the `TABS` array (after `integrations`):

```typescript
{ key: 'billing', label: 'Billing', icon: CreditCard },
```

Add the import at the top:

```typescript
import { User, Building2, Bell, Puzzle, Globe, CreditCard } from 'lucide-react'
```

Add the import for BillingTab:

```typescript
import BillingTab from '@/features/billing/components/BillingTab'
```

Update the `TabKey` type to `typeof TABS[number]['key']` (already inferred — no change needed).

Add the render at the bottom of the tab content block:

```typescript
{activeTab === 'billing' && <BillingTab />}
```

- [ ] **Step 7: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/features/billing/components/ src/pages/app/SettingsPage.tsx
git commit -m "feat(billing): add BillingTab with plan status, upgrade cards, promo code input, cancel flow"
```

---

## Task 14: Landing Page — Fix Prices + Update CTAs

**Files:**
- Modify: `pakka-landing/src/components/PricingSection.tsx`

- [ ] **Step 1: Fix prices in the `plans` array**

In `PricingSection.tsx`, find the `plans` array and update:

```typescript
// Solo plan — was: monthly: 699, annual: 6999
monthly: 299, annual: 2999,  // annual shown as "coming soon"
desc: 'For solo freelancers ready to grow.',

// Studio plan — was: monthly: 1799, annual: 17999
monthly: 699, annual: 6999,
desc: 'For agencies with 2–10 team members.',
```

- [ ] **Step 2: Update CTAs from "Join waitlist" to real actions**

In the `plans` array, update the Solo and Studio plan `cta` field:

```typescript
// Solo:
cta: 'Get started',
ctaHref: 'https://app.getclearwork.in/register',

// Studio:
cta: 'Get started',
ctaHref: 'https://app.getclearwork.in/register',
```

> If the plan object doesn't have a `ctaHref` field, add it and use it in the render section below.

- [ ] **Step 3: Add founding pricing badge**

In the `plans` array, add a `badge` field to Solo and Studio:

```typescript
// Solo:
badge: 'Founding — ₹149/mo until Aug 31',

// Studio:
badge: 'Founding — ₹349/mo until Aug 31',
```

Then in the JSX where each plan card is rendered, add the badge display:

```typescript
{plan.badge && (
  <p className="text-[11px] font-semibold text-indigo-600 mb-2">
    {plan.badge}
  </p>
)}
```

> Place this just before the price display in each plan card.

- [ ] **Step 4: Handle annual toggle gracefully**

Find the annual toggle (`setAnnual` state) in `PricingSection.tsx`. Update the toggle label for the annual option to include "(Coming soon)":

```typescript
// Find the annual toggle button/label and change it to:
<span>Annual <span className="text-xs text-gray-400">(coming soon)</span></span>
```

If annual is selected, still show monthly prices with a note:

```typescript
// In the price display, replace:
{annual ? plan.annual : plan.monthly}
// With:
{plan.monthly}
{annual && <span className="text-xs text-gray-400 block">Annual billing coming soon</span>}
```

- [ ] **Step 5: Update benchmarks table**

Find the `benchmarks` array and update the ClearWork Solo entry:

```typescript
{ name: 'ClearWork Solo', price: '₹299/mo', note: 'Full India workflow ✓', good: true },
```

- [ ] **Step 6: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-landing
git add src/components/PricingSection.tsx
git commit -m "feat(billing): fix landing page prices to ₹299/₹699, update CTAs, add founding badge"
```

---

## Task 15: Final Type Check + Smoke Test

- [ ] **Step 1: Type check API**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 2: Type check App**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Type check Landing**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-landing
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Manual smoke test**

1. Start API: `cd pakka-api && npm run start:dev`
2. `curl http://localhost:3000/api/v1/payments/current-pricing` — should return `{ window: "founding", solo: { price: 149 }, studio: { price: 349 } }`
3. Start App: `cd pakka-app && npm run dev`
4. Open `http://localhost:5173/app/settings?tab=billing` — Billing tab should render with UpgradePlanCards showing ₹149/₹349
5. Open `http://localhost:5173/billing/cancelled` — BillingCancelPage should render
6. Open `http://localhost:5173/billing/success` — BillingSuccessPage should render with spinner

- [ ] **Step 5: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api && git add -A && git commit -m "chore: final type check pass"
cd /Users/mvaghela/Documents/MyProjects/pakka-app && git add -A && git commit -m "chore: final type check pass"
```

---

## Cashfree Dashboard Checklist (manual — do before go-live)

Before switching to production mode, complete these steps in the Cashfree dashboard:

- [ ] Create 6 subscription plans with IDs exactly as listed in the File Map (all lowercase, no spaces)
- [ ] Set webhook URL: `https://api.getclearwork.in/api/v1/payments/webhook`
- [ ] Copy webhook secret into production `.env` as `CASHFREE_WEBHOOK_SECRET`
- [ ] Switch `CASHFREE_ENVIRONMENT=production` in production `.env`
- [ ] Test with a ₹1 sandbox subscription end-to-end before going live

---

## Creating Promo Codes for Relatives/Friends (one-off DB script)

Run this script whenever you want to create a free access code:

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.promoCode.create({
  data: {
    code: 'FAMILY_SOLO_01',   // change per person
    plan: 'SOLO',
    discountType: 'FULL_ACCESS',
    durationMonths: null,      // null = permanent
    maxRedemptions: 1,
    isActive: true,
  }
}).then(c => { console.log('Created:', c.code); process.exit(0); });
"
```

Share the code with the person. They apply it at `Settings → Billing → Promo / Gift code`.
