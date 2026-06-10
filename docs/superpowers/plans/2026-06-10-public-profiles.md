# Public Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `clearwork.in/u/[username]` — a shareable, unauthenticated public profile page for freelancers, with opt-in setup in Settings, verified stats auto-pulled nightly from ClearWork data, services/portfolio/skills management, and a branded contact form + WhatsApp CTA.

**Architecture:** New `public-profiles` NestJS module handles all API — one public read endpoint (`GET /public-profiles/:username`) + one enquiry submission endpoint (`POST /public-profiles/:username/enquire`) both `@Public()`, plus three authenticated management endpoints for the Settings tab. A `@Cron`-scheduled service recalculates stats nightly for all enabled profiles and caches them in new User columns. The frontend public page at `/u/:username` renders with no auth wrapper; the Settings tab is a new `public-profile` tab inside the existing `SettingsPage`.

**Tech Stack:** NestJS + Prisma (PostgreSQL), `@nestjs/schedule` (already in use), React + TanStack Query, Tailwind CSS, lucide-react, react-hook-form + zod

---

## File Map

**Backend — create:**
- `pakka-api/src/modules/public-profiles/public-profiles.module.ts`
- `pakka-api/src/modules/public-profiles/public-profiles.controller.ts`
- `pakka-api/src/modules/public-profiles/public-profiles.service.ts`
- `pakka-api/src/modules/public-profiles/public-profiles.scheduler.ts`
- `pakka-api/src/modules/public-profiles/dto/update-public-profile.dto.ts`
- `pakka-api/src/modules/public-profiles/dto/submit-enquiry.dto.ts`

**Backend — modify:**
- `pakka-api/prisma/schema.prisma` — add fields to User + new model PublicProfileEnquiry
- `pakka-api/src/app.module.ts` — import PublicProfilesModule

**Frontend — create:**
- `pakka-app/src/pages/public/PublicProfilePage.tsx`
- `pakka-app/src/features/public-profiles/hooks/usePublicProfile.ts` (public read + enquiry mutation)
- `pakka-app/src/features/public-profiles/hooks/useMyPublicProfile.ts` (auth — settings CRUD)
- `pakka-app/src/features/public-profiles/components/ProfileHero.tsx`
- `pakka-app/src/features/public-profiles/components/ProfileSidebar.tsx`
- `pakka-app/src/features/public-profiles/components/ProfileMain.tsx`
- `pakka-app/src/features/public-profiles/components/ContactModal.tsx`
- `pakka-app/src/features/settings/components/PublicProfileTab.tsx`

**Frontend — modify:**
- `pakka-app/src/router/index.tsx` — add `/u/:username` route
- `pakka-app/src/pages/app/SettingsPage.tsx` — add Public Profile tab

---

## Task 1: Prisma Schema — Add Public Profile Fields

**Files:**
- Modify: `pakka-api/prisma/schema.prisma`

- [ ] **Step 1: Add fields to User model and new PublicProfileEnquiry model**

Open `pakka-api/prisma/schema.prisma`. After `createdAt DateTime @default(now())` inside the User model (before `updatedAt`), add:

```prisma
  // Public Profile
  publicUsername          String?   @unique
  publicProfileEnabled    Boolean   @default(false)
  publicUsernameChanged   Boolean   @default(false)
  publicBio               String?
  publicCity              String?
  publicWhatsapp          String?
  publicLanguages         String[]  @default([])
  publicSkills            String[]  @default([])
  publicServices          Json      @default("[]")
  publicPortfolio         Json      @default("[]")
  publicAccentColor       String    @default("indigo")
  // Cached stats (recalculated nightly)
  statsProjectsCompleted  Int       @default(0)
  statsTotalEarned        Decimal   @default(0) @db.Decimal(14, 2)
  statsRepeatClientPct    Int       @default(0)
  statsAcceptanceRate     Int       @default(0)
  statsAvgResponseHrs     Int       @default(0)
  statsLastCalculatedAt   DateTime?
  profileEnquiries        PublicProfileEnquiry[]
```

At the end of the schema file, before the last closing brace, add:

```prisma
model PublicProfileEnquiry {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  senderName    String
  senderPhone   String?
  senderEmail   String?
  budget        String?
  serviceNeeded String?
  brief         String?
  createdAt     DateTime @default(now())

  @@map("public_profile_enquiries")
}
```

- [ ] **Step 2: Generate and run migration**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma migrate dev --name add_public_profiles
```

Expected: migration file created and applied, Prisma client regenerated.

- [ ] **Step 3: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add public profile fields and enquiries model"
```

---

## Task 2: Backend DTOs

**Files:**
- Create: `pakka-api/src/modules/public-profiles/dto/update-public-profile.dto.ts`
- Create: `pakka-api/src/modules/public-profiles/dto/submit-enquiry.dto.ts`

- [ ] **Step 1: Create UpdatePublicProfileDto**

```typescript
// pakka-api/src/modules/public-profiles/dto/update-public-profile.dto.ts
import { IsString, IsBoolean, IsOptional, IsArray, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePublicProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  publicProfileEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Username may only contain lowercase letters, numbers, and hyphens' })
  @MaxLength(40)
  publicUsername?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  publicBio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  publicCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  publicWhatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  publicLanguages?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  publicSkills?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  publicServices?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  publicPortfolio?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  publicAccentColor?: string;
}
```

- [ ] **Step 2: Create SubmitEnquiryDto**

```typescript
// pakka-api/src/modules/public-profiles/dto/submit-enquiry.dto.ts
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitEnquiryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  senderName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  senderPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  senderEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  budget?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serviceNeeded?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  brief?: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/public-profiles/
git commit -m "feat(public-profiles): add DTOs"
```

---

## Task 3: Backend Service

**Files:**
- Create: `pakka-api/src/modules/public-profiles/public-profiles.service.ts`

- [ ] **Step 1: Write the service**

```typescript
// pakka-api/src/modules/public-profiles/public-profiles.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePublicProfileDto } from './dto/update-public-profile.dto';
import { SubmitEnquiryDto } from './dto/submit-enquiry.dto';

function generateUsername(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 30);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}-${suffix}`;
}

@Injectable()
export class PublicProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        publicUsername: true,
        publicProfileEnabled: true,
        publicUsernameChanged: true,
        publicBio: true,
        publicCity: true,
        publicWhatsapp: true,
        publicLanguages: true,
        publicSkills: true,
        publicServices: true,
        publicPortfolio: true,
        publicAccentColor: true,
        statsProjectsCompleted: true,
        statsTotalEarned: true,
        statsRepeatClientPct: true,
        statsAcceptanceRate: true,
        statsAvgResponseHrs: true,
        statsLastCalculatedAt: true,
        name: true,
        businessName: true,
        logoUrl: true,
        createdAt: true,
      },
    });
  }

  async updateMyProfile(userId: string, dto: UpdatePublicProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { publicUsername: true, publicUsernameChanged: true, name: true },
    });
    if (!user) throw new NotFoundException('User not found');

    // Handle enabling for first time — auto-generate username
    let usernameToSet = user.publicUsername;
    if (dto.publicProfileEnabled && !user.publicUsername && !dto.publicUsername) {
      let candidate = generateUsername(user.businessName ?? user.name ?? 'freelancer');
      // Ensure uniqueness
      while (await this.prisma.user.count({ where: { publicUsername: candidate } })) {
        candidate = generateUsername(user.name ?? 'freelancer');
      }
      usernameToSet = candidate;
    }

    // Handle explicit username change — only allowed once
    if (dto.publicUsername && dto.publicUsername !== user.publicUsername) {
      if (user.publicUsernameChanged) {
        throw new BadRequestException('Username can only be changed once');
      }
      const exists = await this.prisma.user.count({ where: { publicUsername: dto.publicUsername, id: { not: userId } } });
      if (exists) throw new ConflictException('Username already taken');
      usernameToSet = dto.publicUsername;
    }

    const data: Record<string, unknown> = { ...dto };
    if (usernameToSet !== user.publicUsername) {
      data.publicUsername = usernameToSet;
      if (user.publicUsername) data.publicUsernameChanged = true; // mark changed if they had one before
    }
    delete data.publicUsername; // handled above
    if (usernameToSet) data.publicUsername = usernameToSet;

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        publicUsername: true,
        publicProfileEnabled: true,
        publicUsernameChanged: true,
        publicBio: true,
        publicCity: true,
        publicWhatsapp: true,
        publicLanguages: true,
        publicSkills: true,
        publicServices: true,
        publicPortfolio: true,
        publicAccentColor: true,
      },
    });
  }

  async getPublicProfile(username: string) {
    const user = await this.prisma.user.findFirst({
      where: { publicUsername: username, publicProfileEnabled: true },
      select: {
        name: true,
        businessName: true,
        logoUrl: true,
        createdAt: true,
        publicBio: true,
        publicCity: true,
        publicWhatsapp: true,
        publicLanguages: true,
        publicSkills: true,
        publicServices: true,
        publicPortfolio: true,
        publicAccentColor: true,
        statsProjectsCompleted: true,
        statsTotalEarned: true,
        statsRepeatClientPct: true,
        statsAcceptanceRate: true,
        statsAvgResponseHrs: true,
        statsLastCalculatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('Profile not found');
    return { username, ...user };
  }

  async submitEnquiry(username: string, dto: SubmitEnquiryDto) {
    const user = await this.prisma.user.findFirst({
      where: { publicUsername: username, publicProfileEnabled: true },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Profile not found');

    return this.prisma.publicProfileEnquiry.create({
      data: { userId: user.id, ...dto },
    });
  }

  // Called nightly by scheduler — recalculates stats for all enabled profiles
  async recalculateStats() {
    const users = await this.prisma.user.findMany({
      where: { publicProfileEnabled: true },
      select: { id: true },
    });

    for (const { id } of users) {
      await this.recalculateUserStats(id);
    }
  }

  async recalculateUserStats(userId: string) {
    const [
      projectsCompleted,
      totalEarned,
      allClients,
      repeatClients,
      totalProposals,
      acceptedProposals,
      respondedLeads,
    ] = await Promise.all([
      this.prisma.project.count({ where: { userId, status: 'COMPLETED' } }),
      this.prisma.invoice.aggregate({
        where: { userId, status: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.project.groupBy({
        by: ['clientId'],
        where: { userId, status: 'COMPLETED', clientId: { not: null } },
        _count: true,
      }),
      this.prisma.project.groupBy({
        by: ['clientId'],
        where: { userId, status: 'COMPLETED', clientId: { not: null } },
        _count: { _all: true },
        having: { clientId: { _count: { gte: 2 } } },
      }),
      this.prisma.proposal.count({
        where: { userId, status: { in: ['SENT', 'OPENED', 'ACCEPTED', 'DECLINED', 'EXPIRED'] } },
      }),
      this.prisma.proposal.count({ where: { userId, status: 'ACCEPTED' } }),
      this.prisma.lead.findMany({
        where: { userId, isDeleted: false, stage: { not: 'ENQUIRY' } },
        select: { createdAt: true, updatedAt: true },
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalClientsWithProject = allClients.length;
    const repeatClientCount = repeatClients.length;
    const repeatPct = totalClientsWithProject > 0
      ? Math.round((repeatClientCount / totalClientsWithProject) * 100)
      : 0;

    const acceptancePct = totalProposals > 0
      ? Math.round((acceptedProposals / totalProposals) * 100)
      : 0;

    let avgResponseHrs = 0;
    if (respondedLeads.length > 0) {
      const hours = respondedLeads.map(l =>
        (l.updatedAt.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60)
      );
      avgResponseHrs = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        statsProjectsCompleted: projectsCompleted,
        statsTotalEarned: Number(totalEarned._sum.total ?? 0),
        statsRepeatClientPct: repeatPct,
        statsAcceptanceRate: acceptancePct,
        statsAvgResponseHrs: avgResponseHrs,
        statsLastCalculatedAt: new Date(),
      },
    });
  }
}
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/public-profiles/public-profiles.service.ts
git commit -m "feat(public-profiles): service with profile CRUD and stats calculation"
```

---

## Task 4: Backend Scheduler + Controller + Module

**Files:**
- Create: `pakka-api/src/modules/public-profiles/public-profiles.scheduler.ts`
- Create: `pakka-api/src/modules/public-profiles/public-profiles.controller.ts`
- Create: `pakka-api/src/modules/public-profiles/public-profiles.module.ts`
- Modify: `pakka-api/src/app.module.ts`

- [ ] **Step 1: Create scheduler**

```typescript
// pakka-api/src/modules/public-profiles/public-profiles.scheduler.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PublicProfilesService } from './public-profiles.service';

@Injectable()
export class PublicProfilesScheduler {
  constructor(private readonly service: PublicProfilesService) {}

  // 2am UTC daily
  @Cron('0 2 * * *')
  async recalculateAllStats() {
    await this.service.recalculateStats();
  }
}
```

- [ ] **Step 2: Create controller**

```typescript
// pakka-api/src/modules/public-profiles/public-profiles.controller.ts
import { Controller, Get, Patch, Post, Param, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PublicProfilesService } from './public-profiles.service';
import { UpdatePublicProfileDto } from './dto/update-public-profile.dto';
import { SubmitEnquiryDto } from './dto/submit-enquiry.dto';

@ApiTags('public-profiles')
@Controller('public-profiles')
export class PublicProfilesController {
  constructor(private readonly service: PublicProfilesService) {}

  // ── Authenticated ──────────────────────────────────────────────────────────

  @Get('me')
  getMyProfile(@CurrentUser() user: { id: string }) {
    return this.service.getMyProfile(user.id);
  }

  @Patch('me')
  updateMyProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePublicProfileDto,
  ) {
    return this.service.updateMyProfile(user.id, dto);
  }

  @Post('me/recalculate')
  recalculateMyStats(@CurrentUser() user: { id: string }) {
    return this.service.recalculateUserStats(user.id);
  }

  // ── Public (no auth) ───────────────────────────────────────────────────────

  @Public()
  @Get(':username')
  getPublicProfile(@Param('username') username: string) {
    return this.service.getPublicProfile(username);
  }

  @Public()
  @Post(':username/enquire')
  submitEnquiry(
    @Param('username') username: string,
    @Body() dto: SubmitEnquiryDto,
  ) {
    return this.service.submitEnquiry(username, dto);
  }
}
```

- [ ] **Step 3: Create module**

```typescript
// pakka-api/src/modules/public-profiles/public-profiles.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PublicProfilesController } from './public-profiles.controller';
import { PublicProfilesService } from './public-profiles.service';
import { PublicProfilesScheduler } from './public-profiles.scheduler';

@Module({
  imports: [PrismaModule],
  controllers: [PublicProfilesController],
  providers: [PublicProfilesService, PublicProfilesScheduler],
})
export class PublicProfilesModule {}
```

- [ ] **Step 4: Register in app.module.ts**

In `pakka-api/src/app.module.ts`, add the import at top:

```typescript
import { PublicProfilesModule } from './modules/public-profiles/public-profiles.module';
```

Add `PublicProfilesModule,` to the `imports` array (after `CalendarModule,`).

- [ ] **Step 5: Full compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Manual smoke test**

```bash
# Start the API (in a separate terminal)
npm run start:dev

# Test public endpoint returns 404 for unknown username
curl http://localhost:3000/public-profiles/nobody123
# Expected: {"statusCode":404,"message":"Profile not found"}
```

- [ ] **Step 7: Commit**

```bash
git add src/modules/public-profiles/ src/app.module.ts
git commit -m "feat(public-profiles): controller, scheduler, module, register in app"
```

---

## Task 5: Frontend Types + Hooks

**Files:**
- Create: `pakka-app/src/features/public-profiles/hooks/usePublicProfile.ts`
- Create: `pakka-app/src/features/public-profiles/hooks/useMyPublicProfile.ts`

- [ ] **Step 1: Create public-side hook (unauthenticated)**

This uses a raw axios instance (same pattern as `InvoiceViewPage.tsx`) — no auth token.

```typescript
// pakka-app/src/features/public-profiles/hooks/usePublicProfile.ts
import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  headers: { 'Content-Type': 'application/json' },
})

export interface PublicService {
  id: string
  icon: string
  name: string
  description: string
  tags: string[]
  priceFrom: number
  deliveryDays: string
}

export interface PublicPortfolioItem {
  id: string
  title: string
  category: string
  outcome: string
  tags: string[]
  thumbnailUrl: string | null
  liveUrl: string | null
}

export interface PublicProfileData {
  username: string
  name: string
  businessName: string | null
  logoUrl: string | null
  createdAt: string
  publicBio: string | null
  publicCity: string | null
  publicWhatsapp: string | null
  publicLanguages: string[]
  publicSkills: string[]
  publicServices: PublicService[]
  publicPortfolio: PublicPortfolioItem[]
  publicAccentColor: string
  statsProjectsCompleted: number
  statsTotalEarned: number
  statsRepeatClientPct: number
  statsAcceptanceRate: number
  statsAvgResponseHrs: number
  statsLastCalculatedAt: string | null
}

export function usePublicProfile(username: string) {
  return useQuery({
    queryKey: ['public-profile', username],
    queryFn: async () => {
      const { data } = await publicApi.get<{ data: PublicProfileData }>(`/public-profiles/${username}`)
      return data.data
    },
    retry: false,
  })
}

export interface SubmitEnquiryPayload {
  senderName: string
  senderPhone?: string
  senderEmail?: string
  budget?: string
  serviceNeeded?: string
  brief?: string
}

export function useSubmitEnquiry(username: string) {
  return useMutation({
    mutationFn: async (payload: SubmitEnquiryPayload) => {
      const { data } = await publicApi.post(`/public-profiles/${username}/enquire`, payload)
      return data.data
    },
  })
}
```

- [ ] **Step 2: Create settings-side hook (authenticated)**

```typescript
// pakka-app/src/features/public-profiles/hooks/useMyPublicProfile.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { PublicService, PublicPortfolioItem } from './usePublicProfile'

export interface MyPublicProfile {
  publicUsername: string | null
  publicProfileEnabled: boolean
  publicUsernameChanged: boolean
  publicBio: string | null
  publicCity: string | null
  publicWhatsapp: string | null
  publicLanguages: string[]
  publicSkills: string[]
  publicServices: PublicService[]
  publicPortfolio: PublicPortfolioItem[]
  publicAccentColor: string
  statsProjectsCompleted: number
  statsTotalEarned: number
  statsRepeatClientPct: number
  statsAcceptanceRate: number
  statsAvgResponseHrs: number
  statsLastCalculatedAt: string | null
  name: string
  businessName: string | null
  logoUrl: string | null
  createdAt: string
}

export function useMyPublicProfile() {
  return useQuery({
    queryKey: ['my-public-profile'],
    queryFn: async () => {
      const { data } = await api.get<{ data: MyPublicProfile }>('/public-profiles/me')
      return data.data
    },
    staleTime: 2 * 60_000,
  })
}

export function useUpdateMyPublicProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<MyPublicProfile> & { publicUsername?: string }) => {
      const { data } = await api.patch<{ data: MyPublicProfile }>('/public-profiles/me', payload)
      return data.data
    },
    onSuccess: (updated) => {
      qc.setQueryData(['my-public-profile'], updated)
      toast.success('Profile saved')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useRecalculateMyStats() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/public-profiles/me/recalculate')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-public-profile'] })
      toast.success('Stats refreshed')
    },
  })
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/public-profiles/
git commit -m "feat(public-profiles): frontend hooks for public read and settings CRUD"
```

---

## Task 6: ProfileHero Component

**Files:**
- Create: `pakka-app/src/features/public-profiles/components/ProfileHero.tsx`

- [ ] **Step 1: Write the component**

```tsx
// pakka-app/src/features/public-profiles/components/ProfileHero.tsx
import { MessageCircle } from 'lucide-react'
import type { PublicProfileData } from '../hooks/usePublicProfile'

interface Props {
  profile: PublicProfileData
  onContact: () => void
}

function formatEarned(amount: number): string {
  if (amount >= 10_00_000) return `₹${(amount / 10_00_000).toFixed(1)}Cr+`
  if (amount >= 1_00_000) return `₹${Math.floor(amount / 1_00_000)}L+`
  if (amount >= 1_000) return `₹${Math.floor(amount / 1_000)}k+`
  return `₹${amount}`
}

export default function ProfileHero({ profile, onContact }: Props) {
  const displayName = profile.businessName ?? profile.name
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })

  return (
    <div className="bg-white border-b border-[#EAECF0]">
      {/* Cover banner */}
      <div className="h-[72px] bg-gradient-to-r from-[#4338CA] via-[#6366F1] to-[#818CF8]" />

      <div className="px-5 pb-5">
        {/* Avatar row */}
        <div className="flex items-end justify-between -mt-6 mb-3">
          <div className="w-[52px] h-[52px] rounded-full border-[3px] border-white shadow-sm bg-[#EEF2FF] flex items-center justify-center overflow-hidden shrink-0">
            {profile.logoUrl ? (
              <img src={profile.logoUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[18px] font-bold text-[#6366F1]">{initials}</span>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={onContact}
              className="bg-[#6366F1] text-white text-[11px] font-bold px-4 py-2 rounded-lg hover:bg-[#4F46E5] transition-colors"
            >
              Get in touch
            </button>
            {profile.publicWhatsapp && (
              <a
                href={`https://wa.me/${profile.publicWhatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-[#16A34A] p-2 rounded-lg border-[1.5px] border-[#86EFAC] hover:bg-[#F0FDF4] transition-colors flex items-center justify-center"
                aria-label="Chat on WhatsApp"
              >
                <MessageCircle size={14} />
              </a>
            )}
          </div>
        </div>

        {/* Name + title */}
        <div className="text-[15px] font-bold text-[#101828] mb-0.5">{displayName}</div>
        <div className="text-[11px] text-[#667085] mb-2">
          {profile.publicBio
            ? profile.publicBio.split('.')[0]
            : 'Freelancer on ClearWork'}
          {profile.publicCity && ` · ${profile.publicCity}`}
        </div>

        {/* Bio */}
        {profile.publicBio && (
          <p className="text-[10px] text-[#475569] leading-relaxed mb-3 max-w-md">{profile.publicBio}</p>
        )}

        {/* Stats row */}
        <div className="flex gap-5">
          <div>
            <div className="text-[15px] font-extrabold text-[#101828]">{profile.statsProjectsCompleted}</div>
            <div className="text-[9px] text-[#98A2B3]">Projects</div>
          </div>
          {profile.statsTotalEarned > 0 && (
            <div>
              <div className="text-[15px] font-extrabold text-[#101828]">{formatEarned(profile.statsTotalEarned)}</div>
              <div className="text-[9px] text-[#98A2B3]">Earned</div>
            </div>
          )}
          {profile.statsRepeatClientPct > 0 && (
            <div>
              <div className="text-[15px] font-extrabold text-[#101828]">{profile.statsRepeatClientPct}%</div>
              <div className="text-[9px] text-[#98A2B3]">Repeat clients</div>
            </div>
          )}
          {profile.statsAcceptanceRate > 0 && (
            <div>
              <div className="text-[15px] font-extrabold text-[#101828]">{profile.statsAcceptanceRate}%</div>
              <div className="text-[9px] text-[#98A2B3]">Acceptance rate</div>
            </div>
          )}
          <div>
            <div className="text-[15px] font-extrabold text-[#101828]">{memberSince}</div>
            <div className="text-[9px] text-[#98A2B3]">Member since</div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/public-profiles/components/ProfileHero.tsx
git commit -m "feat(public-profiles): ProfileHero component"
```

---

## Task 7: ProfileSidebar Component

**Files:**
- Create: `pakka-app/src/features/public-profiles/components/ProfileSidebar.tsx`

- [ ] **Step 1: Write the component**

```tsx
// pakka-app/src/features/public-profiles/components/ProfileSidebar.tsx
import * as Icons from 'lucide-react'
import { Clock, MessageCircle, CheckCircle2 } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import type { PublicProfileData } from '../hooks/usePublicProfile'

function ServiceIcon({ name, size = 14 }: { name: string; size?: number }) {
  const Icon = (Icons as Record<string, React.ComponentType<LucideProps>>)[name]
  return Icon ? <Icon size={size} className="text-[#6366F1]" /> : <Icons.Briefcase size={size} className="text-[#6366F1]" />
}

interface Props {
  profile: PublicProfileData
  onContact: () => void
}

function formatPrice(amount: number): string {
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)}L`
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}k`
  return `₹${amount}`
}

export default function ProfileSidebar({ profile, onContact }: Props) {
  const responseLabel = profile.statsAvgResponseHrs < 2
    ? '< 2 hrs'
    : profile.statsAvgResponseHrs < 24
    ? `~${profile.statsAvgResponseHrs} hrs`
    : `~${Math.round(profile.statsAvgResponseHrs / 24)} days`

  return (
    <div className="flex flex-col gap-3">

      {/* Services */}
      {profile.publicServices.length > 0 && (
        <div className="bg-white rounded-xl border border-[#EAECF0] overflow-hidden">
          <div className="px-3 py-2 border-b border-[#F2F4F7] text-[9px] font-bold text-[#344054] tracking-wide uppercase">Services</div>
          <div className="p-3 flex flex-col gap-3">
            {profile.publicServices.map((svc, i) => (
              <div key={svc.id} className={i > 0 ? 'border-t border-[#F2F4F7] pt-3' : ''}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-[22px] h-[22px] rounded-md bg-[#EEF2FF] flex items-center justify-center">
                    <ServiceIcon name={svc.icon} size={12} />
                  </div>
                  <div className="text-[10px] font-bold text-[#101828]">{svc.name}</div>
                </div>
                <div className="text-[9px] text-[#667085] leading-relaxed mb-2">{svc.description}</div>
                {svc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {svc.tags.map(tag => (
                      <span key={tag} className="bg-[#F2F4F7] text-[#667085] px-1.5 py-0.5 rounded-md text-[8px]">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[8px] text-[#98A2B3]">From</div>
                    <div className="text-[11px] font-extrabold text-[#101828]">{formatPrice(svc.priceFrom)}</div>
                  </div>
                  <div className="flex items-center gap-1 text-[8px] text-[#667085]"><Clock size={8} />{svc.deliveryDays}d</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified Stats */}
      <div className="bg-white rounded-xl border border-[#EAECF0] overflow-hidden">
        <div className="px-3 py-2 border-b border-[#F2F4F7] flex items-center justify-between">
          <div className="text-[9px] font-bold text-[#344054] tracking-wide uppercase">Verified Stats</div>
          <div className="flex items-center gap-1 text-[7px] text-[#6366F1] font-semibold bg-[#EEF2FF] px-1.5 py-0.5 rounded-md"><CheckCircle2 size={8} />ClearWork</div>
        </div>
        <div className="grid grid-cols-2">
          <div className="p-2.5 border-r border-b border-[#F2F4F7]">
            <div className="text-[14px] font-extrabold text-[#101828]">{profile.statsProjectsCompleted}</div>
            <div className="text-[8px] text-[#667085] mt-0.5">Projects done</div>
          </div>
          <div className="p-2.5 border-b border-[#F2F4F7]">
            <div className="text-[14px] font-extrabold text-[#101828]">
              {profile.statsTotalEarned > 0
                ? (profile.statsTotalEarned >= 1_00_000
                  ? `₹${Math.floor(profile.statsTotalEarned / 1_00_000)}L+`
                  : `₹${Math.floor(profile.statsTotalEarned / 1_000)}k+`)
                : '—'}
            </div>
            <div className="text-[8px] text-[#667085] mt-0.5">Total earned</div>
          </div>
          <div className="p-2.5 border-r border-[#F2F4F7]">
            <div className="text-[14px] font-extrabold text-[#101828]">
              {profile.statsRepeatClientPct > 0 ? `${profile.statsRepeatClientPct}%` : '—'}
            </div>
            <div className="text-[8px] text-[#667085] mt-0.5">Repeat clients</div>
          </div>
          <div className="p-2.5">
            <div className="text-[14px] font-extrabold text-[#101828]">
              {profile.statsAvgResponseHrs > 0 ? responseLabel : '—'}
            </div>
            <div className="text-[8px] text-[#667085] mt-0.5">Avg response</div>
          </div>
        </div>
      </div>

      {/* Skills */}
      {profile.publicSkills.length > 0 && (
        <div className="bg-white rounded-xl border border-[#EAECF0] p-3">
          <div className="text-[9px] font-bold text-[#344054] tracking-wide uppercase mb-2">Skills</div>
          <div className="flex flex-wrap gap-1.5">
            {profile.publicSkills.map(skill => (
              <span key={skill} className="bg-[#EEF2FF] text-[#6366F1] px-2 py-0.5 rounded-lg text-[8px] font-semibold">{skill}</span>
            ))}
          </div>
        </div>
      )}

      {/* Contact CTA */}
      <div className="bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] rounded-xl border border-[#C7D2FE] p-3">
        <div className="text-[10px] font-bold text-[#4338CA] mb-1">
          Work with {(profile.businessName ?? profile.name).split(' ')[0]}
        </div>
        {profile.statsAvgResponseHrs > 0 && (
          <div className="text-[8px] text-[#6366F1] mb-2">Usually responds in {responseLabel}</div>
        )}
        <button
          onClick={onContact}
          className="w-full bg-[#6366F1] text-white text-[10px] font-bold py-2 rounded-lg mb-2 hover:bg-[#4F46E5] transition-colors"
        >
          Get in touch →
        </button>
        <div className="flex items-center gap-1.5 mb-2">
          <div className="flex-1 h-px bg-[#C7D2FE]" />
          <div className="text-[7px] text-[#818CF8]">or</div>
          <div className="flex-1 h-px bg-[#C7D2FE]" />
        </div>
        {profile.publicWhatsapp ? (
          <a
            href={`https://wa.me/${profile.publicWhatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-1.5 bg-white text-[#16A34A] text-[9px] font-semibold py-1.5 rounded-lg border-[1.5px] border-[#86EFAC] hover:bg-[#F0FDF4] transition-colors"
          >
            <MessageCircle size={12} />Chat on WhatsApp
          </a>
        ) : (
          <button
            onClick={onContact}
            className="w-full bg-white text-[#667085] text-[9px] font-semibold py-1.5 rounded-lg border border-[#EAECF0]"
          >
            Send a message
          </button>
        )}
      </div>

    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/public-profiles/components/ProfileSidebar.tsx
git commit -m "feat(public-profiles): ProfileSidebar component"
```

---

## Task 8: ProfileMain Component

**Files:**
- Create: `pakka-app/src/features/public-profiles/components/ProfileMain.tsx`

- [ ] **Step 1: Write the component**

```tsx
// pakka-app/src/features/public-profiles/components/ProfileMain.tsx
import { MapPin, Calendar, Globe, ExternalLink } from 'lucide-react'
import type { PublicProfileData, PublicPortfolioItem } from '../hooks/usePublicProfile'

interface Props {
  profile: PublicProfileData
}

function PortfolioCard({ item }: { item: PublicPortfolioItem }) {
  return (
    <div className="bg-white rounded-xl border border-[#EAECF0] overflow-hidden">
      {/* Thumbnail */}
      <div className="h-[64px] bg-gradient-to-br from-[#EEF2FF] to-[#C7D2FE] relative flex items-center justify-center">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[#6366F1] text-[9px] font-semibold">Project Screenshot</span>
        )}
        <div className="absolute top-1.5 right-2 bg-white text-[#344054] text-[7px] font-semibold px-1.5 py-0.5 rounded border border-[#EAECF0]">
          {item.category}
        </div>
      </div>
      <div className="p-2.5">
        <div className="text-[10px] font-bold text-[#101828] mb-1">{item.title}</div>
        {item.outcome && (
          <div className="text-[8.5px] text-[#667085] leading-relaxed mb-1.5">{item.outcome}</div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {item.tags.slice(0, 2).map(tag => (
              <span key={tag} className="bg-[#EEF2FF] text-[#6366F1] px-1.5 py-0.5 rounded-md text-[7.5px] font-semibold">{tag}</span>
            ))}
          </div>
          {item.liveUrl && (
            <a
              href={item.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[8px] text-[#6366F1] font-semibold hover:underline"
            >
              View →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProfileMain({ profile }: Props) {
  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })

  return (
    <div className="flex flex-col gap-3">

      {/* About */}
      {(profile.publicBio || profile.publicCity) && (
        <div className="bg-white rounded-xl border border-[#EAECF0] p-3">
          <div className="text-[9px] font-bold text-[#344054] tracking-wide uppercase mb-2">About</div>
          {profile.publicBio && (
            <p className="text-[10px] text-[#344054] leading-[1.7]">{profile.publicBio}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {profile.publicCity && (
              <span className="flex items-center gap-1 bg-[#F2F4F7] text-[#344054] px-2 py-0.5 rounded-md text-[8px]"><MapPin size={8} />{profile.publicCity}</span>
            )}
            <span className="flex items-center gap-1 bg-[#F2F4F7] text-[#344054] px-2 py-0.5 rounded-md text-[8px]"><Calendar size={8} />{memberSince}</span>
            {profile.publicLanguages.length > 0 && (
              <span className="flex items-center gap-1 bg-[#F2F4F7] text-[#344054] px-2 py-0.5 rounded-md text-[8px]">
                <Globe size={8} />{profile.publicLanguages.join(' · ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Portfolio */}
      {profile.publicPortfolio.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[9px] font-bold text-[#344054] tracking-wide uppercase">Portfolio</div>
            {profile.publicPortfolio.length > 3 && (
              <div className="text-[9px] text-[#6366F1] font-semibold">
                {profile.publicPortfolio.length} projects
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {profile.publicPortfolio.slice(0, 6).map(item => (
              <PortfolioCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/public-profiles/components/ProfileMain.tsx
git commit -m "feat(public-profiles): ProfileMain component with About and Portfolio"
```

---

## Task 9: ContactModal Component

**Files:**
- Create: `pakka-app/src/features/public-profiles/components/ContactModal.tsx`

- [ ] **Step 1: Write the component**

```tsx
// pakka-app/src/features/public-profiles/components/ContactModal.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSubmitEnquiry } from '../hooks/usePublicProfile'
import type { PublicProfileData } from '../hooks/usePublicProfile'

const schema = z.object({
  senderName:   z.string().min(1, 'Name is required').max(100),
  senderPhone:  z.string().optional(),
  senderEmail:  z.string().email('Invalid email').optional().or(z.literal('')),
  budget:       z.string().optional(),
  serviceNeeded: z.string().optional(),
  brief:        z.string().max(500).optional(),
})

type FormValues = z.infer<typeof schema>

const BUDGETS = ['< ₹10k', '₹10k–25k', '₹25k–50k', '₹50k–1L', '₹1L+']

interface Props {
  profile: PublicProfileData
  open: boolean
  onClose: () => void
}

export default function ContactModal({ profile, open, onClose }: Props) {
  const [submitted, setSubmitted] = useState(false)
  const { mutateAsync, isPending } = useSubmitEnquiry(profile.username)
  const displayName = (profile.businessName ?? profile.name).split(' ')[0]
  const avgResponse = profile.statsAvgResponseHrs < 2
    ? '< 2 hrs'
    : profile.statsAvgResponseHrs < 24
    ? `~${profile.statsAvgResponseHrs} hrs`
    : '~1 day'

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormValues) => {
    await mutateAsync({
      senderName: values.senderName,
      senderPhone: values.senderPhone || undefined,
      senderEmail: values.senderEmail || undefined,
      budget: values.budget || undefined,
      serviceNeeded: values.serviceNeeded || undefined,
      brief: values.brief || undefined,
    })
    setSubmitted(true)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#101828] px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[13px] font-bold text-white">Let's work together</div>
              <div className="text-[10px] text-[#94A3B8] mt-0.5">Tell {displayName} about your project</div>
            </div>
            <button onClick={onClose} className="text-[#64748B] hover:text-white transition-colors mt-0.5">
              <X size={16} />
            </button>
          </div>
        </div>

        {submitted ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F0FDF4] flex items-center justify-center">
              <CheckCircle2 size={24} className="text-[#16A34A]" />
            </div>
            <div className="text-[14px] font-bold text-[#101828]">Message sent!</div>
            <div className="text-[12px] text-[#667085]">
              {displayName} usually responds in {avgResponse}. You'll hear back soon.
            </div>
            <button onClick={onClose} className="mt-2 bg-[#6366F1] text-white px-5 py-2 rounded-lg text-[13px] font-semibold">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-[#344054] mb-1">Your name *</label>
                <input
                  {...register('senderName')}
                  placeholder="Ravi Patel"
                  className={cn('w-full border rounded-lg px-3 py-2 text-[12px] text-[#101828] outline-none focus:border-[#6366F1]', errors.senderName ? 'border-red-400' : 'border-[#D0D5DD]')}
                />
                {errors.senderName && <p className="text-[10px] text-red-500 mt-0.5">{errors.senderName.message}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#344054] mb-1">Budget</label>
                <select
                  {...register('budget')}
                  className="w-full border border-[#D0D5DD] rounded-lg px-3 py-2 text-[12px] text-[#101828] outline-none focus:border-[#6366F1] bg-white"
                >
                  <option value="">Select…</option>
                  {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#344054] mb-1">Service needed</label>
                <select
                  {...register('serviceNeeded')}
                  className="w-full border border-[#D0D5DD] rounded-lg px-3 py-2 text-[12px] text-[#101828] outline-none focus:border-[#6366F1] bg-white"
                >
                  <option value="">Select…</option>
                  {profile.publicServices.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#344054] mb-1">Project brief</label>
              <textarea
                {...register('brief')}
                rows={3}
                placeholder="Describe what you need…"
                className="w-full border border-[#D0D5DD] rounded-lg px-3 py-2 text-[12px] text-[#101828] outline-none focus:border-[#6366F1] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#6366F1] text-white py-2.5 rounded-lg text-[13px] font-bold hover:bg-[#4F46E5] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? 'Sending…' : 'Send enquiry →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/public-profiles/components/ContactModal.tsx
git commit -m "feat(public-profiles): ContactModal with rich form and success state"
```

---

## Task 10: PublicProfilePage + Router

**Files:**
- Create: `pakka-app/src/pages/public/PublicProfilePage.tsx`
- Modify: `pakka-app/src/router/index.tsx`

- [ ] **Step 1: Create the public profile page**

```tsx
// pakka-app/src/pages/public/PublicProfilePage.tsx
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { usePublicProfile } from '@/features/public-profiles/hooks/usePublicProfile'
import ProfileHero from '@/features/public-profiles/components/ProfileHero'
import ProfileSidebar from '@/features/public-profiles/components/ProfileSidebar'
import ProfileMain from '@/features/public-profiles/components/ProfileMain'
import ContactModal from '@/features/public-profiles/components/ContactModal'

function NotFound() {
  return (
    <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-[#F2F4F7] flex items-center justify-center mx-auto mb-2">
          <Search size={28} className="text-[#98A2B3]" />
        </div>
        <div className="text-[18px] font-bold text-[#101828] mb-1">Profile not found</div>
        <div className="text-[13px] text-[#667085]">This profile may have been disabled or the link is incorrect.</div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-[#F4F6FB]">
      {/* Nav skeleton */}
      <div className="bg-white border-b border-[#EAECF0] h-[44px]" />
      {/* Hero skeleton */}
      <div className="bg-white border-b border-[#EAECF0]">
        <div className="h-[72px] bg-[#E0E7FF]" />
        <div className="px-5 pb-5 pt-4 space-y-2">
          <div className="w-32 h-4 bg-[#F2F4F7] rounded animate-pulse" />
          <div className="w-48 h-3 bg-[#F2F4F7] rounded animate-pulse" />
          <div className="flex gap-4 mt-3">
            {[1, 2, 3].map(i => <div key={i} className="w-12 h-8 bg-[#F2F4F7] rounded animate-pulse" />)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { data: profile, isLoading, isError } = usePublicProfile(username ?? '')
  const [contactOpen, setContactOpen] = useState(false)

  if (isLoading) return <Skeleton />
  if (isError || !profile) return <NotFound />

  return (
    <div className="min-h-screen bg-[#F4F6FB]">

      {/* Top nav */}
      <div className="bg-white border-b border-[#EAECF0] px-5 py-2.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#6366F1] rounded-md flex items-center justify-center text-white text-[10px] font-bold">C</div>
          <span className="text-[11px] font-bold text-[#101828]">ClearWork</span>
        </div>
        <div className="text-[9px] text-[#667085] bg-[#F9FAFB] px-2.5 py-1 rounded-full border border-[#EAECF0]">
          clearwork.in/u/{username}
        </div>
      </div>

      {/* Hero */}
      <ProfileHero profile={profile} onContact={() => setContactOpen(true)} />

      {/* Body */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Desktop: sidebar + main */}
        <div className="hidden md:grid md:grid-cols-[200px_1fr] gap-4">
          <ProfileSidebar profile={profile} onContact={() => setContactOpen(true)} />
          <ProfileMain profile={profile} />
        </div>
        {/* Mobile: stacked (main first, sidebar below) */}
        <div className="flex flex-col gap-3 md:hidden">
          <ProfileMain profile={profile} />
          <ProfileSidebar profile={profile} onContact={() => setContactOpen(true)} />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-[#EAECF0] px-5 py-3 flex items-center justify-between mt-4">
        <div className="text-[8px] text-[#98A2B3]">
          Powered by <span className="text-[#6366F1] font-semibold">ClearWork</span> · Stats auto-verified
        </div>
        <div className="text-[8px] text-[#98A2B3]">Report profile</div>
      </div>

      {/* Contact modal */}
      <ContactModal
        profile={profile}
        open={contactOpen}
        onClose={() => setContactOpen(false)}
      />

    </div>
  )
}
```

- [ ] **Step 2: Add route to router**

In `pakka-app/src/router/index.tsx`, after the `/portal/:token` route block (before the `ProtectedRoute` block), add:

```tsx
  // ── Public freelancer profile (no auth required) ────────────────────────────
  {
    path: '/u/:username',
    lazy: async () => {
      const { default: Component } = await import('@/pages/public/PublicProfilePage')
      return { Component }
    },
  },
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/public/PublicProfilePage.tsx src/router/index.tsx
git commit -m "feat(public-profiles): PublicProfilePage and /u/:username route"
```

---

## Task 11: PublicProfileTab in Settings

**Files:**
- Create: `pakka-app/src/features/settings/components/PublicProfileTab.tsx`
- Modify: `pakka-app/src/pages/app/SettingsPage.tsx`

- [ ] **Step 1: Write the settings tab**

```tsx
// pakka-app/src/features/settings/components/PublicProfileTab.tsx
import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Globe, Plus, Trash2, RefreshCw, ExternalLink, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useMyPublicProfile,
  useUpdateMyPublicProfile,
  useRecalculateMyStats,
} from '@/features/public-profiles/hooks/useMyPublicProfile'

const serviceSchema = z.object({
  id:           z.string(),
  icon:         z.string().default('🎨'),
  name:         z.string().min(1),
  description:  z.string().default(''),
  tags:         z.array(z.string()).default([]),
  priceFrom:    z.coerce.number().min(0).default(0),
  deliveryDays: z.string().default('7–14'),
})

const schema = z.object({
  publicProfileEnabled: z.boolean(),
  publicUsername:       z.string().optional(),
  publicBio:            z.string().max(500).optional(),
  publicCity:           z.string().max(100).optional(),
  publicWhatsapp:       z.string().optional(),
  publicSkills:         z.string(), // comma-separated for easy input
  publicLanguages:      z.string(), // comma-separated
  publicServices:       z.array(serviceSchema),
})

type FormValues = z.infer<typeof schema>

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

function Field({ label, hint, error, required, children }: {
  label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-[#98A2B3]">{hint}</p>}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

export default function PublicProfileTab() {
  const { data: profile, isLoading } = useMyPublicProfile()
  const { mutateAsync: save, isPending: saving } = useUpdateMyPublicProfile()
  const { mutateAsync: recalc, isPending: recalculating } = useRecalculateMyStats()
  const [copied, setCopied] = useState(false)

  const { register, handleSubmit, reset, control, watch, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { publicServices: [] },
  })

  const { fields: serviceFields, append: addService, remove: removeService } = useFieldArray({
    control,
    name: 'publicServices',
  })

  useEffect(() => {
    if (!profile) return
    reset({
      publicProfileEnabled: profile.publicProfileEnabled,
      publicUsername:       profile.publicUsername ?? '',
      publicBio:            profile.publicBio ?? '',
      publicCity:           profile.publicCity ?? '',
      publicWhatsapp:       profile.publicWhatsapp ?? '',
      publicSkills:         profile.publicSkills.join(', '),
      publicLanguages:      profile.publicLanguages.join(', '),
      publicServices:       profile.publicServices,
    })
  }, [profile, reset])

  const enabled = watch('publicProfileEnabled')
  const username = watch('publicUsername') ?? profile?.publicUsername ?? ''
  const profileUrl = `https://clearwork.in/u/${username}`

  const onSubmit = async (values: FormValues) => {
    await save({
      publicProfileEnabled: values.publicProfileEnabled,
      publicUsername:       values.publicUsername || undefined,
      publicBio:            values.publicBio || undefined,
      publicCity:           values.publicCity || undefined,
      publicWhatsapp:       values.publicWhatsapp || undefined,
      publicSkills:         values.publicSkills.split(',').map(s => s.trim()).filter(Boolean),
      publicLanguages:      values.publicLanguages.split(',').map(s => s.trim()).filter(Boolean),
      publicServices:       values.publicServices,
    })
    reset(values)
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(profileUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="card-glass p-6 space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Enable toggle */}
      <div className="card-glass p-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A] mb-4">
          <Globe size={14} className="text-[#6366F1]" strokeWidth={2} />
          <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Public Profile</h3>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3]">Enable public profile</p>
            <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
              Clients can find and contact you at your public profile link.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" {...register('publicProfileEnabled')} className="sr-only peer" />
            <div className="w-10 h-5 bg-[#D0D5DD] peer-focus:outline-none rounded-full peer peer-checked:bg-[#6366F1] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
          </label>
        </div>

        {/* Profile URL */}
        {enabled && profile?.publicUsername && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-[#F9FAFB] dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A]">
            <span className="text-[12px] text-[#6366F1] font-mono flex-1 truncate">{profileUrl}</span>
            <button type="button" onClick={copyUrl} className="shrink-0 text-[#667085] hover:text-[#344054] transition-colors">
              {copied ? <Check size={14} className="text-[#16A34A]" /> : <Copy size={14} />}
            </button>
            <a href={`/u/${username}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[#667085] hover:text-[#344054] transition-colors">
              <ExternalLink size={14} />
            </a>
          </div>
        )}

        {/* Username (only shown if profile enabled and username changeable) */}
        {enabled && (
          <div className="mt-4">
            <Field
              label="Username"
              hint={profile?.publicUsernameChanged ? 'Username cannot be changed again.' : 'Lowercase letters, numbers, hyphens only. Can be changed once.'}
            >
              <div className="flex items-center border border-[#D0D5DD] dark:border-[#3D4258] rounded-lg overflow-hidden focus-within:border-[#6366F1]">
                <span className="px-3 py-2 bg-[#F9FAFB] dark:bg-[#1A1B23] text-[12px] text-[#667085] border-r border-[#D0D5DD] dark:border-[#3D4258] shrink-0">clearwork.in/u/</span>
                <input
                  {...register('publicUsername')}
                  disabled={!!profile?.publicUsernameChanged}
                  placeholder="your-name"
                  className="flex-1 px-3 py-2 text-[12px] text-[#101828] dark:text-[#ECEEF3] outline-none bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </Field>
          </div>
        )}
      </div>

      {/* Profile details (only if enabled) */}
      {enabled && (
        <>
          {/* Bio + location */}
          <div className="card-glass p-6 space-y-4">
            <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Profile Details</h3>
            <Field label="Bio" hint="Max 500 characters. Shown below your name.">
              <textarea
                {...register('publicBio')}
                rows={3}
                placeholder="Helping startups and agencies build products that look premium and convert better."
                className="w-full border border-[#D0D5DD] dark:border-[#3D4258] rounded-lg px-3 py-2 text-[12px] text-[#101828] dark:text-[#ECEEF3] outline-none focus:border-[#6366F1] resize-none bg-transparent"
              />
              {errors.publicBio && <p className="text-[11px] text-red-500">{errors.publicBio.message}</p>}
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="City" hint="e.g. Ahmedabad, Gujarat">
                <input {...register('publicCity')} placeholder="Ahmedabad" className="form-input w-full" />
              </Field>
              <Field label="WhatsApp number" hint="Include country code, e.g. 919876543210">
                <input {...register('publicWhatsapp')} placeholder="919876543210" className="form-input w-full" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Skills" hint="Comma-separated: Figma, Branding, React">
                <input {...register('publicSkills')} placeholder="Figma, Branding, UI/UX" className="form-input w-full" />
              </Field>
              <Field label="Languages" hint="Comma-separated: English, Hindi">
                <input {...register('publicLanguages')} placeholder="English, Hindi, Gujarati" className="form-input w-full" />
              </Field>
            </div>
          </div>

          {/* Services */}
          <div className="card-glass p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Services</h3>
              <button
                type="button"
                onClick={() => addService({ id: crypto.randomUUID(), icon: 'Palette', name: '', description: '', tags: [], priceFrom: 0, deliveryDays: '7–14' })}
                disabled={serviceFields.length >= 5}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6366F1] hover:text-[#4F46E5] disabled:opacity-40"
              >
                <Plus size={13} />Add service
              </button>
            </div>

            {serviceFields.length === 0 && (
              <p className="text-[12px] text-[#98A2B3] text-center py-4">No services yet. Add one to show clients what you offer.</p>
            )}

            <div className="space-y-4">
              {serviceFields.map((field, index) => (
                <div key={field.id} className="border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Service {index + 1}</span>
                    <button type="button" onClick={() => removeService(index)} className="text-[#D92D20] hover:text-red-700">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="grid grid-cols-[1fr_2fr] gap-2">
                    <Field label="Icon name" hint="e.g. Palette, Code, Camera">
                      <input {...register(`publicServices.${index}.icon`)} placeholder="Palette" className="form-input w-full" />
                    </Field>
                    <Field label="Service name">
                      <input {...register(`publicServices.${index}.name`)} placeholder="UI/UX Design" className="form-input w-full" />
                    </Field>
                  </div>
                  <input {...register(`publicServices.${index}.description`)} placeholder="Short description" className="form-input w-full" />
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Price from (₹)">
                      <input type="number" {...register(`publicServices.${index}.priceFrom`)} placeholder="15000" className="form-input w-full" />
                    </Field>
                    <Field label="Delivery (days)">
                      <input {...register(`publicServices.${index}.deliveryDays`)} placeholder="7–14" className="form-input w-full" />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verified Stats */}
          <div className="card-glass p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Verified Stats</h3>
              <button
                type="button"
                onClick={() => recalc()}
                disabled={recalculating}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-[#667085] hover:text-[#344054]"
              >
                <RefreshCw size={12} className={cn(recalculating && 'animate-spin')} />
                Refresh stats
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Projects completed', value: profile?.statsProjectsCompleted ?? 0 },
                { label: 'Total earned (₹)', value: profile?.statsTotalEarned ?? 0, format: (v: number) => v >= 1_00_000 ? `₹${Math.floor(v/1_00_000)}L+` : `₹${Math.floor(v/1_000)}k+` },
                { label: 'Repeat clients', value: profile?.statsRepeatClientPct ?? 0, format: (v: number) => `${v}%` },
                { label: 'Acceptance rate', value: profile?.statsAcceptanceRate ?? 0, format: (v: number) => `${v}%` },
              ].map(stat => (
                <div key={stat.label} className="bg-[#F9FAFB] dark:bg-[#13141A] rounded-xl p-3 border border-[#EAECF0] dark:border-[#26283A]">
                  <div className="text-[16px] font-extrabold text-[#101828] dark:text-[#ECEEF3]">
                    {stat.format ? stat.format(stat.value) : stat.value}
                  </div>
                  <div className="text-[10px] text-[#667085] dark:text-[#8B92A8] mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {profile?.statsLastCalculatedAt && (
              <p className="text-[11px] text-[#98A2B3] mt-3">
                Last updated {new Date(profile.statsLastCalculatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </>
      )}

      {/* Save bar */}
      <div className="flex items-center justify-end gap-3 py-2">
        <button
          type="submit"
          disabled={saving || !isDirty}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors',
            saving || !isDirty
              ? 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#98A2B3] cursor-not-allowed'
              : 'bg-[#0D1117] dark:bg-[#6366F1] text-white hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5]',
          )}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Add the tab to SettingsPage**

In `pakka-app/src/pages/app/SettingsPage.tsx`:

1. Add import at the top:
```tsx
import { Globe } from 'lucide-react'
import PublicProfileTab from '@/features/settings/components/PublicProfileTab'
```

2. Change the `TABS` const to:
```tsx
const TABS = [
  { key: 'profile',        label: 'Profile',        icon: User      },
  { key: 'business',       label: 'Business',        icon: Building2 },
  { key: 'public-profile', label: 'Public Profile',  icon: Globe     },
  { key: 'notifications',  label: 'Notifications',   icon: Bell      },
  { key: 'integrations',   label: 'Integrations',    icon: Puzzle    },
] as const
```

3. Add the render below the existing tabs:
```tsx
{activeTab === 'public-profile' && <PublicProfileTab />}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/settings/components/PublicProfileTab.tsx src/pages/app/SettingsPage.tsx
git commit -m "feat(public-profiles): PublicProfileTab in Settings with services, stats, enable toggle"
```

---

## Task 12: End-to-End Verification

- [ ] **Step 1: Run API dev server**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npm run start:dev
```

- [ ] **Step 2: Enable profile via Settings**

1. Open app at `http://localhost:5173`
2. Go to Settings → Public Profile
3. Toggle "Enable public profile" → ON
4. Fill in bio, city, WhatsApp, add one service
5. Click "Save changes"
6. Expected: toast "Profile saved", username appears in URL bar e.g. `clearwork.in/u/maharshi-vaghela-1234`

- [ ] **Step 3: View public profile**

1. Navigate to `http://localhost:5173/u/[your-username]`
2. Expected: profile page renders with hero, sidebar (services, stats, skills, CTA), main (about, portfolio)
3. No auth cookie required — open in incognito to verify

- [ ] **Step 4: Test contact form**

1. Click "Get in touch" → modal opens
2. Fill name + brief → submit
3. Expected: success state with checkmark and "Message sent!"
4. In API logs: `POST /public-profiles/[username]/enquire` 201

- [ ] **Step 5: Test recalculate stats**

```bash
# Trigger manually (you added a /me/recalculate endpoint)
curl -X POST http://localhost:3000/public-profiles/me/recalculate \
  -H "Authorization: Bearer [your-jwt-token]"
# Expected: 201 with no body (stats updated in DB)
```

Then reload Settings → Public Profile → stats card shows updated numbers.

- [ ] **Step 6: Test username uniqueness**

1. Try saving a taken username in Settings
2. Expected: toast "Username already taken"

- [ ] **Step 7: Test unknown profile 404**

1. Navigate to `http://localhost:5173/u/this-username-does-not-exist`
2. Expected: "Profile not found" page renders (not a browser error)

- [ ] **Step 8: Final TypeScript check both repos**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api && npx tsc --noEmit
cd /Users/mvaghela/Documents/MyProjects/pakka-app && npx tsc --noEmit
```

Expected: zero errors in both.

- [ ] **Step 9: Final commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add -A && git commit -m "feat(public-profiles): complete — schema, module, scheduler, controller"

cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add -A && git commit -m "feat(public-profiles): complete — page, sidebar, hero, contact modal, settings tab"
```
