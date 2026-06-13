# Client Inbox — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone client inbox where freelancers message clients (with rich compose modal + document linking) and clients reply from the portal.

**Architecture:** NestJS `messages` module with Thread/Message Prisma models. Freelancer endpoints use JWT (global guard, no decorator needed). Portal message endpoints use token-based auth via `@Public()` decorator. Frontend: TanStack Query v5 polling, Tiptap rich text in compose modal, plain textarea for inline replies. Client portal gets a new Messages tab.

**Tech Stack:** NestJS + Prisma + PostgreSQL (API), React + Vite + TanStack Query v5 + Tailwind v4 + Tiptap (App)

---

## File Map

**API — new files:**
- `prisma/migrations/20260613000000_add_messages/migration.sql` — Thread + Message tables + emailSignature column
- `src/modules/messages/messages.module.ts`
- `src/modules/messages/messages.controller.ts`
- `src/modules/messages/messages.service.ts`
- `src/modules/messages/dto/send-message.dto.ts`

**API — modified files:**
- `prisma/schema.prisma` — Thread, Message models, SenderType/AttachmentType enums, emailSignature on User
- `src/modules/portal/portal.controller.ts` — add portal message endpoints
- `src/modules/portal/portal.service.ts` — add portal message methods
- `src/modules/automations/templates/template.variables.ts` — add MessageTemplateVars interface
- `src/modules/automations/templates/email-templates.ts` — add 2 new template functions
- `src/modules/email-templates/template-vars.registry.ts` — register 2 new template keys
- `src/app.module.ts` — import MessagesModule

**Frontend — new files:**
- `src/pages/app/InboxPage.tsx`
- `src/features/messages/hooks/useMessages.ts`
- `src/features/messages/components/ThreadList.tsx`
- `src/features/messages/components/ThreadView.tsx`
- `src/features/messages/components/MessageBubble.tsx`
- `src/features/messages/components/DocumentCard.tsx`
- `src/features/messages/components/DocumentPickerModal.tsx`
- `src/features/messages/components/ComposeModal.tsx`
- `src/features/messages/components/ReplyComposer.tsx`

**Frontend — modified files:**
- `src/router/index.tsx` — add `/inbox` route
- `src/components/layout/Sidebar.tsx` — add Inbox nav item with unread badge
- `src/pages/portal/ClientPortalPage.tsx` (or equivalent portal file) — add Messages tab

---

## Task 1: Prisma migration — Thread + Message models

**Files:**
- Create: `pakka-api/prisma/migrations/20260613000000_add_messages/migration.sql`
- Modify: `pakka-api/prisma/schema.prisma`

- [ ] **Step 1: Write the migration SQL**

Create `pakka-api/prisma/migrations/20260613000000_add_messages/migration.sql`:

```sql
-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('FREELANCER', 'CLIENT');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('PROPOSAL', 'INVOICE', 'CONTRACT');

-- CreateTable
CREATE TABLE "threads" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "clientId"  TEXT NOT NULL,
    "subject"   TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id"             TEXT NOT NULL,
    "threadId"       TEXT NOT NULL,
    "senderType"     "SenderType" NOT NULL,
    "body"           TEXT NOT NULL,
    "attachmentType" "AttachmentType",
    "attachmentId"   TEXT,
    "readAt"         TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "threads_userId_clientId_key" ON "threads"("userId", "clientId");

-- CreateIndex
CREATE INDEX "messages_threadId_idx" ON "messages"("threadId");

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "threads" ADD CONSTRAINT "threads_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages" ADD CONSTRAINT "messages_threadId_fkey"
  FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add email signature to User
ALTER TABLE "users" ADD COLUMN "emailSignature" TEXT;
```

- [ ] **Step 2: Apply the migration**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma db execute --file prisma/migrations/20260613000000_add_messages/migration.sql
npx prisma migrate resolve --applied 20260613000000_add_messages
```

Expected: no errors. If enum already exists error — check schema already has them and skip.

- [ ] **Step 3: Update schema.prisma**

Add these enums and models to `pakka-api/prisma/schema.prisma` (append before the last closing brace, after the existing models):

```prisma
enum SenderType {
  FREELANCER
  CLIENT
}

enum AttachmentType {
  PROPOSAL
  INVOICE
  CONTRACT
}

model Thread {
  id        String    @id @default(cuid())
  userId    String
  clientId  String
  subject   String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  user      User      @relation(fields: [userId],   references: [id], onDelete: Cascade)
  client    Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  messages  Message[]

  @@unique([userId, clientId])
  @@map("threads")
}

model Message {
  id             String          @id @default(cuid())
  threadId       String
  senderType     SenderType
  body           String
  attachmentType AttachmentType?
  attachmentId   String?
  readAt         DateTime?
  createdAt      DateTime        @default(now())

  thread Thread @relation(fields: [threadId], references: [id], onDelete: Cascade)

  @@index([threadId])
  @@map("messages")
}
```

Also add `emailSignature String?` to the `User` model block, and add `threads Thread[]` to the `User` and `Client` models.

- [ ] **Step 4: Regenerate Prisma client**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 5: Verify types compile**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors (or only pre-existing unrelated errors).

- [ ] **Step 6: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(messages): add Thread + Message models, emailSignature on User"
```

---

## Task 2: MessagesService

**Files:**
- Create: `pakka-api/src/modules/messages/messages.service.ts`
- Create: `pakka-api/src/modules/messages/dto/send-message.dto.ts`

- [ ] **Step 1: Create the DTO**

Create `pakka-api/src/modules/messages/dto/send-message.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from 'class-validator'

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50_000)
  body: string

  @IsOptional()
  @IsString()
  subject?: string

  @IsOptional()
  @IsIn(['PROPOSAL', 'INVOICE', 'CONTRACT'])
  attachmentType?: 'PROPOSAL' | 'INVOICE' | 'CONTRACT'

  @IsOptional()
  @IsString()
  attachmentId?: string
}
```

- [ ] **Step 2: Create MessagesService**

Create `pakka-api/src/modules/messages/messages.service.ts`:

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { EmailService } from '../automations/email.service'
import { layout } from '../automations/templates/email-templates'
import type { SendMessageDto } from './dto/send-message.dto'

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma:         PrismaService,
    private readonly notifications:  NotificationsService,
    private readonly emailService:   EmailService,
  ) {}

  /** Get or create the thread for this (userId, clientId) pair */
  private async getOrCreateThread(userId: string, clientId: string, subject?: string) {
    const existing = await this.prisma.thread.findUnique({
      where: { userId_clientId: { userId, clientId } },
    })
    if (existing) return existing
    const client = await this.prisma.client.findFirst({ where: { id: clientId, userId } })
    if (!client) throw new NotFoundException('Client not found')
    return this.prisma.thread.create({
      data: { userId, clientId, subject: subject ?? null },
    })
  }

  /** List all threads with latest message + unread count */
  async listThreads(userId: string) {
    const threads = await this.prisma.thread.findMany({
      where:   { userId },
      include: {
        client:   { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    })
    const unreadCounts = await Promise.all(
      threads.map(t =>
        this.prisma.message.count({
          where: { threadId: t.id, senderType: 'CLIENT', readAt: null },
        })
      )
    )
    return threads.map((t, i) => ({
      id:           t.id,
      subject:      t.subject,
      client:       t.client,
      latestMessage: t.messages[0] ?? null,
      unreadCount:  unreadCounts[i],
      updatedAt:    t.updatedAt,
    }))
  }

  /** Get thread + all messages for a client — creates thread if needed */
  async getThread(userId: string, clientId: string) {
    const thread = await this.getOrCreateThread(userId, clientId)
    const messages = await this.prisma.message.findMany({
      where:   { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
    })
    const client = await this.prisma.client.findFirst({
      where:  { id: clientId, userId },
      select: { id: true, name: true, email: true },
    })
    return { thread, messages, client }
  }

  /** Freelancer sends a message → email the client */
  async sendMessage(userId: string, clientId: string, dto: SendMessageDto) {
    // Validate attachment belongs to this freelancer + client
    if (dto.attachmentType && dto.attachmentId) {
      await this.validateAttachment(userId, clientId, dto.attachmentType, dto.attachmentId)
    }

    const thread = await this.getOrCreateThread(userId, clientId, dto.subject)

    // Update thread subject on first message or explicit override
    if (dto.subject && !thread.subject) {
      await this.prisma.thread.update({ where: { id: thread.id }, data: { subject: dto.subject } })
    }
    await this.prisma.thread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } })

    const message = await this.prisma.message.create({
      data: {
        threadId:       thread.id,
        senderType:     'FREELANCER',
        body:           dto.body,
        attachmentType: dto.attachmentType ?? null,
        attachmentId:   dto.attachmentId   ?? null,
      },
    })

    // Email the client
    const user   = await this.prisma.user.findUnique({ where: { id: userId } })
    const client = await this.prisma.client.findUnique({ where: { id: clientId } })
    if (client?.email && user) {
      const portalUrl = `${process.env.PORTAL_BASE_URL ?? 'https://app.getclearwork.in/portal'}/${client.portalToken}#messages`
      const subject   = thread.subject ?? `New message from ${user.businessName ?? user.name}`
      const html      = layout(
        `<p style="margin:0 0 16px;font-size:15px;color:#374151;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
           Hi ${client.name},
         </p>
         <p style="margin:0 0 16px;font-size:15px;color:#374151;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
           ${user.businessName ?? user.name} sent you a message:
         </p>
         <blockquote style="margin:0 0 20px;padding:12px 16px;border-left:3px solid #6366F1;background:#F5F3FF;border-radius:0 8px 8px 0;font-size:14px;color:#374151;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
           ${dto.body}
         </blockquote>
         <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
           <tr>
             <td style="border-radius:8px;background:#4F46E5;">
               <a href="${portalUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">
                 Reply in your portal
               </a>
             </td>
           </tr>
         </table>`,
        user.businessName ?? user.name,
        subject,
      )
      void this.emailService.send({
        userId,
        to:           client.email,
        subject,
        html,
        templateKey:  'message_received',
        entityId:     message.id,
        entityType:   'message',
      }).catch(() => { /* non-blocking */ })
    }

    return message
  }

  /** Mark all CLIENT messages in this thread as read */
  async markRead(userId: string, clientId: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { userId_clientId: { userId, clientId } },
    })
    if (!thread) return
    await this.prisma.message.updateMany({
      where: { threadId: thread.id, senderType: 'CLIENT', readAt: null },
      data:  { readAt: new Date() },
    })
  }

  /** Total unread count across all threads (for nav badge) */
  async getUnreadCount(userId: string): Promise<number> {
    const threads = await this.prisma.thread.findMany({
      where:  { userId },
      select: { id: true },
    })
    if (!threads.length) return 0
    return this.prisma.message.count({
      where: {
        threadId:   { in: threads.map(t => t.id) },
        senderType: 'CLIENT',
        readAt:     null,
      },
    })
  }

  // ── Portal (client side) ─────────────────────────────────────────────────────

  /** Client reads their thread (creates if needed) */
  async getThreadByToken(token: string) {
    const client = await this.prisma.client.findUnique({ where: { portalToken: token } })
    if (!client) throw new NotFoundException('Portal link invalid')
    const thread = await this.getOrCreateThread(client.userId, client.id)
    const messages = await this.prisma.message.findMany({
      where:   { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
    })
    const user = await this.prisma.user.findUnique({
      where:  { id: client.userId },
      select: { businessName: true, name: true, emailSignature: true },
    })
    return { thread, messages, businessName: user?.businessName ?? user?.name ?? 'Your service provider' }
  }

  /** Client sends a reply → in-app + email notification to freelancer */
  async sendReply(token: string, body: string) {
    const client = await this.prisma.client.findUnique({ where: { portalToken: token } })
    if (!client) throw new NotFoundException('Portal link invalid')
    const thread = await this.getOrCreateThread(client.userId, client.id)
    await this.prisma.thread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } })

    const message = await this.prisma.message.create({
      data: { threadId: thread.id, senderType: 'CLIENT', body },
    })

    // In-app notification for the freelancer
    void this.notifications.create({
      userId:     client.userId,
      type:       'MESSAGE_RECEIVED',
      title:      `${client.name} replied`,
      body:       body.replace(/<[^>]*>/g, '').slice(0, 120),
      entityId:   message.id,
      entityType: 'message',
      url:        `/app/inbox?client=${client.id}`,
    }).catch(() => {})

    // Email the freelancer
    const user = await this.prisma.user.findUnique({ where: { id: client.userId } })
    if (user?.email) {
      const inboxUrl = `https://app.getclearwork.in/app/inbox?client=${client.id}`
      const subject  = `${client.name} replied to your message`
      const html     = layout(
        `<p style="margin:0 0 16px;font-size:15px;color:#374151;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
           Hi ${user.name},
         </p>
         <p style="margin:0 0 16px;font-size:15px;color:#374151;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
           <strong>${client.name}</strong> replied to your message:
         </p>
         <blockquote style="margin:0 0 20px;padding:12px 16px;border-left:3px solid #6366F1;background:#F5F3FF;border-radius:0 8px 8px 0;font-size:14px;color:#374151;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
           ${body}
         </blockquote>
         <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
           <tr>
             <td style="border-radius:8px;background:#4F46E5;">
               <a href="${inboxUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">
                 View in inbox
               </a>
             </td>
           </tr>
         </table>`,
        user.businessName ?? user.name,
        subject,
      )
      void this.emailService.send({
        userId:     client.userId,
        to:         user.email,
        subject,
        html,
        templateKey: 'client_message_received',
        entityId:    message.id,
        entityType:  'message',
      }).catch(() => {})
    }

    return message
  }

  /** Mark all FREELANCER messages in this thread as read (called when client opens portal) */
  async markReadByToken(token: string) {
    const client = await this.prisma.client.findUnique({ where: { portalToken: token } })
    if (!client) return
    const thread = await this.prisma.thread.findUnique({
      where: { userId_clientId: { userId: client.userId, clientId: client.id } },
    })
    if (!thread) return
    await this.prisma.message.updateMany({
      where: { threadId: thread.id, senderType: 'FREELANCER', readAt: null },
      data:  { readAt: new Date() },
    })
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async validateAttachment(
    userId: string, clientId: string,
    type: 'PROPOSAL' | 'INVOICE' | 'CONTRACT', id: string,
  ) {
    if (type === 'PROPOSAL') {
      const p = await this.prisma.proposal.findFirst({ where: { id, userId, clientId } })
      if (!p) throw new BadRequestException('Proposal not found for this client')
    } else if (type === 'INVOICE') {
      const i = await this.prisma.invoice.findFirst({ where: { id, userId, clientId } })
      if (!i) throw new BadRequestException('Invoice not found for this client')
    } else if (type === 'CONTRACT') {
      const c = await this.prisma.contract.findFirst({ where: { id, userId, clientId } })
      if (!c) throw new BadRequestException('Contract not found for this client')
    }
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero new errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/messages/
git commit -m "feat(messages): add MessagesService with thread/message CRUD + notifications"
```

---

## Task 3: MessagesController + MessagesModule

**Files:**
- Create: `pakka-api/src/modules/messages/messages.controller.ts`
- Create: `pakka-api/src/modules/messages/messages.module.ts`
- Modify: `pakka-api/src/app.module.ts`

- [ ] **Step 1: Create MessagesController**

Create `pakka-api/src/modules/messages/messages.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Param, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { User } from '@prisma/client'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { effectiveUserId } from '../users/effective-user-id'
import { MessagesService } from './messages.service'
import { SendMessageDto } from './dto/send-message.dto'

@ApiTags('messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  listThreads(@CurrentUser() user: User) {
    return this.messagesService.listThreads(effectiveUserId(user))
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: User) {
    const count = await this.messagesService.getUnreadCount(effectiveUserId(user))
    return { count }
  }

  @Get(':clientId')
  getThread(@CurrentUser() user: User, @Param('clientId') clientId: string) {
    return this.messagesService.getThread(effectiveUserId(user), clientId)
  }

  @Post(':clientId')
  sendMessage(
    @CurrentUser() user: User,
    @Param('clientId') clientId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(effectiveUserId(user), clientId, dto)
  }

  @Patch(':clientId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@CurrentUser() user: User, @Param('clientId') clientId: string) {
    return this.messagesService.markRead(effectiveUserId(user), clientId)
  }
}
```

- [ ] **Step 2: Create MessagesModule**

Create `pakka-api/src/modules/messages/messages.module.ts`:

```typescript
import { Module } from '@nestjs/common'
import { MessagesController } from './messages.controller'
import { MessagesService } from './messages.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { AutomationsModule } from '../automations/automations.module'

@Module({
  imports:     [PrismaModule, NotificationsModule, AutomationsModule],
  controllers: [MessagesController],
  providers:   [MessagesService],
  exports:     [MessagesService],
})
export class MessagesModule {}
```

- [ ] **Step 3: Register MessagesModule in app.module.ts**

In `pakka-api/src/app.module.ts`, add the import at the top:
```typescript
import { MessagesModule } from './modules/messages/messages.module';
```
And add `MessagesModule` to the `imports` array after `TeamModule`.

- [ ] **Step 4: Compile check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero new errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/messages/ src/app.module.ts
git commit -m "feat(messages): add MessagesController + MessagesModule, register in AppModule"
```

---

## Task 4: Portal message endpoints

**Files:**
- Modify: `pakka-api/src/modules/portal/portal.controller.ts`
- Modify: `pakka-api/src/modules/portal/portal.service.ts` (imports only)
- Modify: `pakka-api/src/modules/portal/portal.module.ts`

- [ ] **Step 1: Add portal endpoints to portal.controller.ts**

In `pakka-api/src/modules/portal/portal.controller.ts`, add these imports at the top:
```typescript
import { Body, HttpCode, HttpStatus } from '@nestjs/common'
import { MessagesService } from '../messages/messages.service'
```

Update the constructor to inject MessagesService:
```typescript
constructor(
  private readonly portalService:   PortalService,
  private readonly messagesService: MessagesService,
) {}
```

Add these three endpoints to the class:
```typescript
@Public()
@Get(':token/messages')
getMessages(@Param('token') token: string) {
  return this.messagesService.getThreadByToken(token)
}

@Public()
@Post(':token/messages')
sendReply(@Param('token') token: string, @Body() body: { body: string }) {
  if (!body?.body?.trim()) throw new Error('Message body required')
  return this.messagesService.sendReply(token, body.body)
}

@Public()
@Patch(':token/messages/read')
@HttpCode(HttpStatus.NO_CONTENT)
markRead(@Param('token') token: string) {
  return this.messagesService.markReadByToken(token)
}
```

- [ ] **Step 2: Update PortalModule to import MessagesModule**

In `pakka-api/src/modules/portal/portal.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { PortalController } from './portal.controller'
import { PortalService } from './portal.service'
import { MessagesModule } from '../messages/messages.module'

@Module({
  imports:     [MessagesModule],
  controllers: [PortalController],
  providers:   [PortalService],
})
export class PortalModule {}
```

- [ ] **Step 3: Compile check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero new errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/portal/
git commit -m "feat(messages): add portal message endpoints (get/send/read) via token auth"
```

---

## Task 5: Email template registry entries

**Files:**
- Modify: `pakka-api/src/modules/email-templates/template-vars.registry.ts`

The actual template rendering is inline in MessagesService (Task 2) using the `layout()` function directly — no new entries needed in `EMAIL_TEMPLATES`. We only need to register the template keys so they appear (read-only) in the Email Templates settings page.

- [ ] **Step 1: Add entries to TEMPLATE_REGISTRY**

In `pakka-api/src/modules/email-templates/template-vars.registry.ts`, append to the `TEMPLATE_REGISTRY` array before the closing `]`:

```typescript
  // ── Messages ────────────────────────────────────────────────────────────────
  {
    key:         'message_received',
    label:       'New Message to Client',
    category:    'lead' as const,   // closest existing category
    description: 'Sent to the client when you send them a message.',
    vars: [
      { name: 'clientName',    description: 'Client full name',      sample: 'Ritu Sharma'    },
      { name: 'businessName',  description: 'Your business name',    sample: 'Studio Rao'     },
      { name: 'messageBody',   description: 'The message text',      sample: 'Hi, proposal ready...' },
      { name: 'portalUrl',     description: 'Link to client portal', sample: 'https://...'    },
    ],
  },
  {
    key:         'client_message_received',
    label:       'Client Replied to Message',
    category:    'lead' as const,
    description: 'Sent to you when a client replies to your message.',
    vars: [
      { name: 'clientName',   description: 'Client full name',   sample: 'Ritu Sharma'         },
      { name: 'messageBody',  description: 'The reply text',     sample: 'Sounds great!'        },
      { name: 'inboxUrl',     description: 'Link to your inbox', sample: 'https://...'          },
    ],
  },
```

- [ ] **Step 2: Compile check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero new errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/email-templates/template-vars.registry.ts
git commit -m "feat(messages): register message_received + client_message_received template keys"
```

---

## Task 6: Frontend — install Tiptap + useMessages hooks

**Files:**
- Modify: `pakka-app/package.json` (via npm install)
- Create: `pakka-app/src/features/messages/hooks/useMessages.ts`

- [ ] **Step 1: Install Tiptap**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-underline @tiptap/extension-placeholder
```

Expected: packages added to node_modules, no peer dep errors.

- [ ] **Step 2: Create useMessages.ts**

Create `pakka-app/src/features/messages/hooks/useMessages.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ThreadSummary {
  id:           string
  subject:      string | null
  client:       { id: string; name: string; email: string }
  latestMessage: { id: string; senderType: 'FREELANCER' | 'CLIENT'; body: string; createdAt: string } | null
  unreadCount:  number
  updatedAt:    string
}

export interface Message {
  id:             string
  threadId:       string
  senderType:     'FREELANCER' | 'CLIENT'
  body:           string
  attachmentType: 'PROPOSAL' | 'INVOICE' | 'CONTRACT' | null
  attachmentId:   string | null
  readAt:         string | null
  createdAt:      string
}

export interface ThreadDetail {
  thread:   { id: string; subject: string | null }
  messages: Message[]
  client:   { id: string; name: string; email: string } | null
}

export function useThreads() {
  return useQuery<ThreadSummary[]>({
    queryKey:        ['messages', 'threads'],
    queryFn:         () => api.get('/messages').then(r => r.data.data),
    refetchInterval: 30_000,
    staleTime:       10_000,
  })
}

export function useThread(clientId: string | null) {
  return useQuery<ThreadDetail>({
    queryKey:        ['messages', 'thread', clientId],
    queryFn:         () => api.get(`/messages/${clientId}`).then(r => r.data.data),
    enabled:         !!clientId,
    refetchInterval: 8_000,
    staleTime:       4_000,
  })
}

export function useMessageUnreadCount() {
  return useQuery<number>({
    queryKey:        ['messages', 'unread-count'],
    queryFn:         () => api.get<{ data: { count: number } }>('/messages/unread-count').then(r => r.data.data.count),
    refetchInterval: 30_000,
    staleTime:       15_000,
  })
}

export function useSendMessage(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { body: string; subject?: string; attachmentType?: string; attachmentId?: string }) =>
      api.post(`/messages/${clientId}`, dto).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', 'thread', clientId] })
      qc.invalidateQueries({ queryKey: ['messages', 'threads'] })
      qc.invalidateQueries({ queryKey: ['messages', 'unread-count'] })
    },
  })
}

export function useMarkThreadRead(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch(`/messages/${clientId}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', 'threads'] })
      qc.invalidateQueries({ queryKey: ['messages', 'unread-count'] })
    },
  })
}

// ── Portal hooks (token-based, no JWT) ──────────────────────────────────────

export function usePortalThread(token: string) {
  return useQuery<{ thread: { id: string; subject: string | null }; messages: Message[]; businessName: string }>({
    queryKey:        ['portal', 'messages', token],
    queryFn:         () => api.get(`/portal/${token}/messages`).then(r => r.data.data),
    refetchInterval: 10_000,
    staleTime:       5_000,
  })
}

export function useSendPortalReply(token: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => api.post(`/portal/${token}/messages`, { body }).then(r => r.data.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['portal', 'messages', token] }),
  })
}

export function useMarkPortalRead(token: string) {
  return useMutation({
    mutationFn: () => api.patch(`/portal/${token}/messages/read`),
  })
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | grep "useMessages" | head -10
```

Expected: no errors relating to useMessages.ts.

- [ ] **Step 4: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/features/messages/hooks/ package.json package-lock.json
git commit -m "feat(messages): install Tiptap, add useMessages TanStack Query hooks"
```

---

## Task 7: DocumentCard + DocumentPickerModal

**Files:**
- Create: `pakka-app/src/features/messages/components/DocumentCard.tsx`
- Create: `pakka-app/src/features/messages/components/DocumentPickerModal.tsx`

- [ ] **Step 1: Create DocumentCard**

Create `pakka-app/src/features/messages/components/DocumentCard.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import { FileText, Receipt, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'

type AttachmentType = 'PROPOSAL' | 'INVOICE' | 'CONTRACT'

interface Props {
  type:     AttachmentType
  entityId: string
  title:    string
  amount?:  string
  status?:  string
  isPortal?: boolean   // portal view — no navigate
}

const CONFIG: Record<AttachmentType, { icon: React.ElementType; color: string; bg: string; label: string; path: string }> = {
  PROPOSAL: { icon: FileText, color: 'text-indigo-600',  bg: 'bg-indigo-50',  label: 'Proposal', path: '/app/proposals' },
  INVOICE:  { icon: Receipt,  color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Invoice',  path: '/app/invoices'  },
  CONTRACT: { icon: PenLine,  color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Contract', path: '/app/contracts' },
}

export function DocumentCard({ type, entityId, title, amount, status, isPortal = false }: Props) {
  const navigate = useNavigate()
  const { icon: Icon, color, bg, label, path } = CONFIG[type]

  return (
    <div
      onClick={() => { if (!isPortal) navigate(`${path}/${entityId}`) }}
      className={cn(
        'max-w-[260px] border border-gray-200 rounded-xl overflow-hidden bg-white',
        'hover:border-indigo-300 hover:shadow-md transition-all duration-150',
        !isPortal && 'cursor-pointer',
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-100">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', bg)}>
          <Icon size={14} className={color} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-[12px] font-semibold text-gray-900 truncate">{title}</p>
        </div>
      </div>
      {(amount || status) && (
        <div className="flex items-center justify-between px-3 py-2">
          {amount && <span className="text-[13px] font-bold text-gray-900">{amount}</span>}
          {status && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
              {status}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create DocumentPickerModal**

Create `pakka-app/src/features/messages/components/DocumentPickerModal.tsx`:

```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { FileText, Receipt, PenLine, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type AttachmentType = 'PROPOSAL' | 'INVOICE' | 'CONTRACT'

interface PickedDoc {
  type:    AttachmentType
  id:      string
  title:   string
  amount?: string
  status?: string
}

interface Props {
  clientId: string
  onPick:   (doc: PickedDoc) => void
  onClose:  () => void
}

interface DocItem { id: string; title?: string; invoiceNumber?: string; totalAmount?: number; total?: number; status: string }

export function DocumentPickerModal({ clientId, onPick, onClose }: Props) {
  const [tab, setTab] = useState<AttachmentType>('PROPOSAL')

  const proposals = useQuery<DocItem[]>({
    queryKey: ['picker', 'proposals', clientId],
    queryFn:  () => api.get(`/proposals?clientId=${clientId}`).then(r => r.data.data),
    enabled:  tab === 'PROPOSAL',
  })
  const invoices = useQuery<DocItem[]>({
    queryKey: ['picker', 'invoices', clientId],
    queryFn:  () => api.get(`/invoices?clientId=${clientId}`).then(r => r.data.data),
    enabled:  tab === 'INVOICE',
  })
  const contracts = useQuery<DocItem[]>({
    queryKey: ['picker', 'contracts', clientId],
    queryFn:  () => api.get(`/contracts?clientId=${clientId}`).then(r => r.data.data),
    enabled:  tab === 'CONTRACT',
  })

  const items: DocItem[] = tab === 'PROPOSAL' ? (proposals.data ?? [])
    : tab === 'INVOICE' ? (invoices.data ?? [])
    : (contracts.data ?? [])

  const TABS: { id: AttachmentType; label: string; icon: React.ElementType }[] = [
    { id: 'PROPOSAL', label: 'Proposals', icon: FileText },
    { id: 'INVOICE',  label: 'Invoices',  icon: Receipt  },
    { id: 'CONTRACT', label: 'Contracts', icon: PenLine  },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-[14px] font-bold text-gray-900">Attach a document</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={15} className="text-gray-400" />
          </button>
        </div>
        <div className="flex border-b border-gray-100">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors',
                tab === t.id ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600',
              )}
            >
              <t.icon size={12} />
              {t.label}
            </button>
          ))}
        </div>
        <div className="max-h-60 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="text-center text-[12px] text-gray-400 py-6">No {tab.toLowerCase()}s for this client</p>
          ) : items.map(item => {
            const title  = item.title ?? item.invoiceNumber ?? 'Untitled'
            const amount = item.totalAmount != null ? `₹${item.totalAmount.toLocaleString('en-IN')}`
              : item.total != null ? `₹${item.total.toLocaleString('en-IN')}` : undefined
            return (
              <button
                key={item.id}
                onClick={() => { onPick({ type: tab, id: item.id, title, amount, status: item.status }); onClose() }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <p className="text-[13px] font-semibold text-gray-900">{title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{item.status} {amount ? `· ${amount}` : ''}</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/features/messages/components/DocumentCard.tsx src/features/messages/components/DocumentPickerModal.tsx
git commit -m "feat(messages): add DocumentCard and DocumentPickerModal components"
```

---

## Task 8: ComposeModal (rich text, floating)

**Files:**
- Create: `pakka-app/src/features/messages/components/ComposeModal.tsx`

- [ ] **Step 1: Create ComposeModal**

Create `pakka-app/src/features/messages/components/ComposeModal.tsx`:

```tsx
import { useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { X, Minus, Maximize2, Bold, Italic, Underline as UnderlineIcon, Link2, List, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DocumentCard } from './DocumentCard'
import { DocumentPickerModal } from './DocumentPickerModal'
import { useSendMessage } from '../hooks/useMessages'

interface Client { id: string; name: string; email: string }
interface PickedDoc { type: 'PROPOSAL' | 'INVOICE' | 'CONTRACT'; id: string; title: string; amount?: string; status?: string }

interface Props {
  initialClient?: Client
  onClose:        () => void
}

export function ComposeModal({ initialClient, onClose }: Props) {
  const [minimised,    setMinimised]    = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(initialClient ?? null)
  const [subject,      setSubject]      = useState('')
  const [attachment,   setAttachment]   = useState<PickedDoc | null>(null)
  const [showPicker,   setShowPicker]   = useState(false)
  const [clientSearch, setClientSearch] = useState(initialClient?.name ?? '')

  const clients = useQuery<Client[]>({
    queryKey: ['clients-search', clientSearch],
    queryFn:  () => api.get(`/clients?search=${encodeURIComponent(clientSearch)}&limit=8`).then(r => r.data.data),
    enabled:  clientSearch.length > 0 && !selectedClient,
    staleTime: 10_000,
  })

  const signature = useQuery<{ emailSignature: string | null }>({
    queryKey: ['user-signature'],
    queryFn:  () => api.get('/users/me').then(r => r.data.data),
    staleTime: 60_000,
  })

  const sendMessage = useSendMessage(selectedClient?.id ?? '')

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write your message...' }),
    ],
    content: signature.data?.emailSignature
      ? `<p></p><p></p><p>${signature.data.emailSignature}</p>`
      : '',
  })

  const handleSend = useCallback(async () => {
    if (!selectedClient || !editor) return
    const html = editor.getHTML()
    if (editor.isEmpty) return
    await sendMessage.mutateAsync({
      body:           html,
      subject:        subject || undefined,
      attachmentType: attachment?.type,
      attachmentId:   attachment?.id,
    })
    onClose()
  }, [selectedClient, editor, subject, attachment, sendMessage, onClose])

  const toolbar = [
    { icon: Bold,          action: () => editor?.chain().focus().toggleBold().run(),      active: editor?.isActive('bold')      },
    { icon: Italic,        action: () => editor?.chain().focus().toggleItalic().run(),    active: editor?.isActive('italic')    },
    { icon: UnderlineIcon, action: () => editor?.chain().focus().toggleUnderline().run(), active: editor?.isActive('underline') },
    { icon: List,          action: () => editor?.chain().focus().toggleBulletList().run(),active: editor?.isActive('bulletList') },
  ]

  return (
    <>
      <div className={cn(
        'fixed bottom-4 right-4 z-50 w-[480px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col',
        minimised ? 'h-12' : 'h-[540px]',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 rounded-t-2xl shrink-0">
          <span className="text-[13px] font-semibold text-white">New Message</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setMinimised(v => !v)} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white">
              <Minus size={13} />
            </button>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white">
              <X size={13} />
            </button>
          </div>
        </div>

        {!minimised && (
          <>
            {/* To: field */}
            <div className="relative border-b border-gray-100 px-4 py-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-gray-400 shrink-0">To:</span>
                {selectedClient ? (
                  <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[12px] font-medium">
                    {selectedClient.name}
                    <button onClick={() => { setSelectedClient(null); setClientSearch('') }}>
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <input
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    placeholder="Search client..."
                    className="flex-1 text-[13px] outline-none placeholder-gray-300"
                  />
                )}
              </div>
              {clients.data && clients.data.length > 0 && !selectedClient && (
                <div className="absolute left-0 right-0 top-full bg-white border border-gray-200 rounded-xl shadow-lg z-10 mt-1 mx-2 overflow-hidden">
                  {clients.data.map(c => (
                    <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(c.name) }}
                      className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 transition-colors">
                      <span className="font-medium text-gray-900">{c.name}</span>
                      <span className="text-gray-400 ml-2 text-[11px]">{c.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subject */}
            <div className="border-b border-gray-100 px-4 py-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-gray-400 shrink-0">Subject:</span>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="(optional)"
                  className="flex-1 text-[13px] outline-none placeholder-gray-300"
                />
              </div>
            </div>

            {/* Attachment preview */}
            {attachment && (
              <div className="px-4 pt-2 shrink-0">
                <div className="relative inline-block">
                  <DocumentCard type={attachment.type} entityId={attachment.id} title={attachment.title} amount={attachment.amount} status={attachment.status} isPortal />
                  <button onClick={() => setAttachment(null)} className="absolute -top-1 -right-1 w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center">
                    <X size={9} className="text-white" />
                  </button>
                </div>
              </div>
            )}

            {/* Editor body */}
            <div className="flex-1 overflow-y-auto px-4 py-2 cursor-text" onClick={() => editor?.commands.focus()}>
              <EditorContent editor={editor} className="prose prose-sm max-w-none text-[13px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-300 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0" />
            </div>

            {/* Toolbar */}
            <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-1 shrink-0">
              {toolbar.map((t, i) => (
                <button key={i} onMouseDown={e => { e.preventDefault(); t.action() }}
                  className={cn('p-1.5 rounded-lg transition-colors', t.active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700')}>
                  <t.icon size={13} />
                </button>
              ))}
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button onClick={() => setShowPicker(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                <Paperclip size={12} />
                Attach
              </button>
              <button
                onClick={handleSend}
                disabled={!selectedClient || sendMessage.isPending || !editor || editor.isEmpty}
                className="ml-auto px-4 py-1.5 bg-indigo-600 text-white text-[12px] font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {sendMessage.isPending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>

      {showPicker && selectedClient && (
        <DocumentPickerModal
          clientId={selectedClient.id}
          onPick={doc => setAttachment(doc)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | grep "ComposeModal" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/messages/components/ComposeModal.tsx
git commit -m "feat(messages): add ComposeModal with Tiptap rich text, To/Subject fields, signature pre-fill"
```

---

## Task 9: MessageBubble + ReplyComposer + ThreadView + ThreadList

**Files:**
- Create: `pakka-app/src/features/messages/components/MessageBubble.tsx`
- Create: `pakka-app/src/features/messages/components/ReplyComposer.tsx`
- Create: `pakka-app/src/features/messages/components/ThreadView.tsx`
- Create: `pakka-app/src/features/messages/components/ThreadList.tsx`

- [ ] **Step 1: Create MessageBubble**

Create `pakka-app/src/features/messages/components/MessageBubble.tsx`:

```tsx
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { DocumentCard } from './DocumentCard'
import type { Message } from '../hooks/useMessages'

interface Props {
  message:   Message
  isPortal?: boolean
  clientName?: string
}

export function MessageBubble({ message, isPortal = false, clientName }: Props) {
  const isSent = isPortal
    ? message.senderType === 'CLIENT'
    : message.senderType === 'FREELANCER'

  const timeAgo = formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })

  return (
    <div className={cn('flex flex-col gap-1', isSent ? 'items-end' : 'items-start')}>
      <span className="text-[10px] text-gray-400 px-1">
        {isSent ? 'You' : (clientName ?? 'Client')} · {timeAgo}
      </span>

      {message.attachmentType && message.attachmentId ? (
        <DocumentCard
          type={message.attachmentType}
          entityId={message.attachmentId}
          title="Attached document"
          isPortal={isPortal}
        />
      ) : (
        <div className={cn(
          'max-w-[72%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed',
          isSent
            ? 'bg-indigo-600 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md',
        )}>
          <div
            className={cn('prose prose-sm max-w-none', isSent && '[&_*]:text-white')}
            dangerouslySetInnerHTML={{ __html: message.body }}
          />
        </div>
      )}

      {isSent && message.readAt && (
        <span className="text-[9px] text-gray-400 px-1">Read ✓✓</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create ReplyComposer**

Create `pakka-app/src/features/messages/components/ReplyComposer.tsx`:

```tsx
import { useState, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onSend:    (body: string) => Promise<void>
  isPending: boolean
  placeholder?: string
}

export function ReplyComposer({ onSend, isPending, placeholder = 'Reply…' }: Props) {
  const [text, setText] = useState('')
  const ref  = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || isPending) return
    await onSend(`<p>${trimmed.replace(/\n/g, '</p><p>')}</p>`)
    setText('')
    ref.current?.focus()
  }, [text, isPending, onSend])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="border-t border-gray-100 p-3 bg-gray-50/50">
      <div className={cn(
        'flex items-end gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2',
        'focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-50 transition-all',
      )}>
        <textarea
          ref={ref}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          rows={2}
          className="flex-1 resize-none text-[13px] outline-none placeholder-gray-300 bg-transparent leading-relaxed"
        />
        <button
          onClick={() => void handleSend()}
          disabled={!text.trim() || isPending}
          className="mb-0.5 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Send size={13} />
        </button>
      </div>
      <p className="text-[10px] text-gray-300 mt-1.5 pl-1">⌘+Enter to send</p>
    </div>
  )
}
```

- [ ] **Step 3: Create ThreadView**

Create `pakka-app/src/features/messages/components/ThreadView.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useThread, useSendMessage, useMarkThreadRead } from '../hooks/useMessages'
import { MessageBubble } from './MessageBubble'
import { ReplyComposer } from './ReplyComposer'

interface Props {
  clientId: string
}

export function ThreadView({ clientId }: Props) {
  const navigate   = useNavigate()
  const bottomRef  = useRef<HTMLDivElement>(null)
  const { data, isLoading } = useThread(clientId)
  const sendMessage = useSendMessage(clientId)
  const markRead    = useMarkThreadRead(clientId)

  // Mark read on open
  useEffect(() => {
    markRead.mutate()
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages.length])

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-[13px] text-gray-400">Loading…</p></div>
  }

  if (!data) return null

  const { thread, messages, client } = data

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 shrink-0">
        <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center text-white text-[13px] font-bold shrink-0">
          {client?.name?.slice(0, 2).toUpperCase() ?? '??'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-gray-900 truncate">{client?.name}</p>
          <p className="text-[11px] text-gray-400">{client?.email}</p>
        </div>
        <button
          onClick={() => navigate(`/app/clients/${clientId}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <ExternalLink size={11} />
          View client
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {thread.subject && (
          <p className="text-center text-[11px] text-gray-400 bg-gray-50 rounded-full px-3 py-1 self-center">
            {thread.subject}
          </p>
        )}
        {messages.length === 0 && (
          <p className="text-center text-[13px] text-gray-400 mt-8">No messages yet. Send the first one!</p>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} clientName={client?.name} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply composer */}
      <ReplyComposer
        isPending={sendMessage.isPending}
        placeholder={`Reply to ${client?.name ?? 'client'}…`}
        onSend={async body => { await sendMessage.mutateAsync({ body }) }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Create ThreadList**

Create `pakka-app/src/features/messages/components/ThreadList.tsx`:

```tsx
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { useThreads } from '../hooks/useMessages'

interface Props {
  activeClientId: string | null
  onSelect:       (clientId: string) => void
}

export function ThreadList({ activeClientId, onSelect }: Props) {
  const { data: threads = [], isLoading } = useThreads()

  return (
    <div className="flex flex-col h-full">
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[12px] text-gray-400">Loading…</p>
        </div>
      )}
      {!isLoading && threads.length === 0 && (
        <div className="flex-1 flex items-center justify-center px-4 text-center">
          <p className="text-[12px] text-gray-400 leading-relaxed">No messages yet.<br />Start a conversation with a client.</p>
        </div>
      )}
      {threads.map(t => {
        const isActive = t.client.id === activeClientId
        const preview  = t.latestMessage?.body.replace(/<[^>]*>/g, '').slice(0, 60) ?? ''
        const timeAgo  = t.latestMessage ? formatDistanceToNow(new Date(t.latestMessage.createdAt), { addSuffix: false }) : ''

        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.client.id)}
            className={cn(
              'flex items-start gap-3 px-4 py-3 border-b border-gray-50 text-left transition-colors',
              isActive ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50',
            )}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-0.5">
              {t.client.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-1">
                <span className={cn('text-[12px] font-semibold truncate', isActive ? 'text-indigo-700' : 'text-gray-900')}>
                  {t.client.name}
                </span>
                <span className="text-[10px] text-gray-400 shrink-0">{timeAgo}</span>
              </div>
              <p className={cn('text-[11px] mt-0.5 truncate', t.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400')}>
                {preview}
              </p>
            </div>
            {t.unreadCount > 0 && (
              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
            )}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | grep -E "MessageBubble|ReplyComposer|ThreadView|ThreadList" | head -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/messages/components/
git commit -m "feat(messages): add MessageBubble, ReplyComposer, ThreadView, ThreadList components"
```

---

## Task 10: InboxPage + route + sidebar nav badge

**Files:**
- Create: `pakka-app/src/pages/app/InboxPage.tsx`
- Modify: `pakka-app/src/router/index.tsx`
- Modify: `pakka-app/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create InboxPage**

Create `pakka-app/src/pages/app/InboxPage.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MessageSquare, Plus } from 'lucide-react'
import { ThreadList } from '@/features/messages/components/ThreadList'
import { ThreadView } from '@/features/messages/components/ThreadView'
import { ComposeModal } from '@/features/messages/components/ComposeModal'
import { useMessageUnreadCount } from '@/features/messages/hooks/useMessages'

export default function InboxPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showCompose,   setShowCompose]  = useState(false)
  const activeClientId = searchParams.get('client')

  // Prefetch unread count
  useMessageUnreadCount()

  const handleSelect = (clientId: string) => {
    setSearchParams({ client: clientId })
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Left — thread list */}
      <div className="w-64 shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="px-4 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-[15px] font-bold text-gray-900">Inbox</h1>
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 text-white text-[12px] font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={12} />
              New
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ThreadList activeClientId={activeClientId} onSelect={handleSelect} />
        </div>
      </div>

      {/* Right — thread view */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeClientId ? (
          <ThreadView clientId={activeClientId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
              <MessageSquare size={20} className="text-gray-400" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-gray-700">Select a conversation</p>
              <p className="text-[12px] text-gray-400 mt-1">Or start a new message with a client</p>
            </div>
          </div>
        )}
      </div>

      {showCompose && (
        <ComposeModal onClose={() => setShowCompose(false)} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add route to router/index.tsx**

In `pakka-app/src/router/index.tsx`, find the block with the other app routes (around the `/dashboard` route) and add:

```typescript
{
  path: 'inbox',
  lazy: async () => {
    const { default: Component } = await import('@/pages/app/InboxPage')
    return { Component }
  },
},
```

- [ ] **Step 3: Add Inbox to Sidebar with unread badge**

In `pakka-app/src/components/layout/Sidebar.tsx`:

1. Add `MessageSquare` to the lucide imports at the top.

2. Add `inbox` to the `ALL_NAV_ITEMS` array (after `tasks`):
```typescript
{ id: 'inbox', icon: MessageSquare, label: 'Inbox', href: '/inbox', tourId: undefined },
```

3. Add `'inbox'` to the first section in `SECTIONS` (the group without a label):
```typescript
{ label: null, ids: ['dashboard', 'leads', 'clients', 'projects', 'tasks', 'inbox'] },
```

4. Import and use the unread count. Add this near the top of the `Sidebar` component function body:
```typescript
import { useMessageUnreadCount } from '@/features/messages/hooks/useMessages'
// inside component:
const { data: inboxUnread = 0 } = useMessageUnreadCount()
```

5. In the nav item render loop, after the label, add a conditional badge for the inbox item:
Find the JSX that renders each nav item label (something like `{item.label}`) and update it so the inbox item shows a badge. The existing render loop renders label as text. Add this after the label span:

```tsx
{item.id === 'inbox' && inboxUnread > 0 && (
  <span className="ml-auto text-[10px] font-bold bg-indigo-600 text-white rounded-full px-1.5 py-0.5 leading-none">
    {inboxUnread > 9 ? '9+' : inboxUnread}
  </span>
)}
```

- [ ] **Step 4: TypeScript + build check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero new errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/app/InboxPage.tsx src/router/index.tsx src/components/layout/Sidebar.tsx
git commit -m "feat(messages): add InboxPage, /inbox route, Sidebar nav item with unread badge"
```

---

## Task 11: Portal Messages tab

**Files:**
- Modify: find the client portal page (check `src/pages/portal/` or portal component path)

- [ ] **Step 1: Find the portal page file**

```bash
find /Users/mvaghela/Documents/MyProjects/pakka-app/src -name "*.tsx" | xargs grep -l "portalToken\|portal.*token\|getPortalData" 2>/dev/null | head -5
```

Note the file path — it is the client portal page.

- [ ] **Step 2: Add Messages tab**

In the found portal page:

1. Add imports at the top:
```typescript
import { usePortalThread, useSendPortalReply, useMarkPortalRead } from '@/features/messages/hooks/useMessages'
import { MessageBubble } from '@/features/messages/components/MessageBubble'
import { ReplyComposer } from '@/features/messages/components/ReplyComposer'
import { MessageSquare } from 'lucide-react'
```

2. Find where the tabs (Proposals, Invoices, Contracts etc.) are defined and add a Messages tab entry.

3. Add the Messages tab content panel — find the switch/condition rendering tab content and add a case for messages:

```tsx
{activeTab === 'messages' && (
  <PortalMessagesPanel token={token} businessName={businessName} />
)}
```

4. Create the `PortalMessagesPanel` component inline at the bottom of the file (or as a separate file `src/features/messages/components/PortalMessagesPanel.tsx`):

```tsx
function PortalMessagesPanel({ token, businessName }: { token: string; businessName: string }) {
  const { data, isLoading }  = usePortalThread(token)
  const sendReply = useSendPortalReply(token)
  const markRead  = useMarkPortalRead(token)

  useEffect(() => { markRead.mutate() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [data?.messages.length])

  if (isLoading) return <div className="py-8 text-center text-sm text-gray-400">Loading messages…</div>

  const messages = data?.messages ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 min-h-[200px]">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">No messages yet from {businessName}.</p>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} isPortal clientName={businessName} />
        ))}
        <div ref={bottomRef} />
      </div>
      <ReplyComposer
        isPending={sendReply.isPending}
        placeholder={`Message ${businessName}…`}
        onSend={async body => { await sendReply.mutateAsync(body) }}
      />
    </div>
  )
}
```

Note: `useEffect` and `useRef` need to be imported in the portal page if not already.

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero new errors.

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat(messages): add Messages tab to client portal with two-way threading"
```

---

## Task 12: Final API compile + date-fns check

**Files:**
- `pakka-app/package.json` — verify date-fns is installed (used in MessageBubble/ThreadList)

- [ ] **Step 1: Check date-fns is installed**

```bash
grep "date-fns" /Users/mvaghela/Documents/MyProjects/pakka-app/package.json
```

If not present, install it:
```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npm install date-fns
```

- [ ] **Step 2: Full API compile check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero new errors.

- [ ] **Step 3: Full frontend compile check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero new errors.

- [ ] **Step 4: Final commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add package.json package-lock.json 2>/dev/null; git diff --staged --quiet || git commit -m "chore(messages): add date-fns if missing"
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git log --oneline -6
```

Expected: 6 commits from this feature visible in log.
