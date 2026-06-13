# Client Inbox — Design Spec

**Goal:** A standalone inbox page where freelancers can message clients and clients can reply from their portal — a mail-style interface with per-client threads and smart ClearWork document linking.

**Architecture:** One thread per (freelancer, client) pair. Messages stored server-side, polled on the frontend (no WebSocket). Client replies via the existing token-based portal. Email notifications on both sides using the existing EmailService.

---

## Data Model

Two new Prisma models added to `pakka-api`.

### Thread
One per (userId, clientId) pair. Created automatically on first message sent.

```prisma
model Thread {
  id        String    @id @default(cuid())
  userId    String
  clientId  String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  client    Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  messages  Message[]

  @@unique([userId, clientId])
}
```

### Message
One per message in a thread. Carries an optional single document attachment (no separate join table needed — one message, at most one linked document).

```prisma
model Message {
  id             String      @id @default(cuid())
  threadId       String
  senderType     SenderType
  body           String
  attachmentType AttachmentType?
  attachmentId   String?
  readAt         DateTime?
  createdAt      DateTime    @default(now())

  thread         Thread      @relation(fields: [threadId], references: [id], onDelete: Cascade)
}

enum SenderType {
  FREELANCER
  CLIENT
}

enum AttachmentType {
  PROPOSAL
  INVOICE
  CONTRACT
}
```

---

## API — New `messages` module

### Freelancer endpoints (JWT auth via existing global guard)

| Method | Path | Description |
|---|---|---|
| `GET` | `/messages` | List all threads for the freelancer, each with the latest message and unread count. Sorted by latest message desc. |
| `GET` | `/messages/:clientId` | Full thread + all messages for one client. Creates the thread if none exists. |
| `POST` | `/messages/:clientId` | Send a message. Triggers email notification to client. |
| `PATCH` | `/messages/:clientId/read` | Mark all unread CLIENT messages in this thread as read (sets `readAt`). |
| `GET` | `/messages/unread-count` | Total unread count across all threads (for nav badge). |

**POST body:**
```ts
{
  body: string                        // required
  attachmentType?: 'PROPOSAL' | 'INVOICE' | 'CONTRACT'
  attachmentId?: string
}
```

Attachment validation: before saving, confirm the referenced entity exists, belongs to this freelancer, and is linked to this client. Throw `BadRequestException` if not.

### Portal endpoints (token auth via existing portal pattern)

| Method | Path | Description |
|---|---|---|
| `GET` | `/portal/:token/messages` | Get thread + all messages for the client. Creates thread if none exists. |
| `POST` | `/portal/:token/messages` | Client sends a reply. Triggers in-app + email notification to freelancer. |
| `PATCH` | `/portal/:token/messages/read` | Mark all unread FREELANCER messages in this thread as read. |

Portal POST body: `{ body: string }` — clients cannot attach documents.

---

## Notifications

### Freelancer sends → client notified
- `EmailService.send()` with new template key `message_received`
- Subject: `"New message from [businessName]"`
- Body: message text + optional document card (title, amount, status) + "Reply in your portal" button linking to `${portalUrl}#messages`

### Client replies → freelancer notified
1. `NotificationsService.create()` — type `MESSAGE_RECEIVED`, title `"[clientName] replied"`, url `/app/inbox?client=<clientId>`
2. `EmailService.send()` with new template key `client_message_received`
- Subject: `"[clientName] replied to your message"`
- Body: the client's message text + "View in inbox" button

### Read receipts
- Freelancer opens thread → `PATCH /messages/:clientId/read` fires → sets `readAt` on all unread CLIENT messages
- Client opens portal Messages tab → `PATCH /portal/:token/messages/read` fires → sets `readAt` on all unread FREELANCER messages
- "Read ✓✓" shown on sent messages when `readAt` is set

---

## Frontend — pakka-app

### New files

**`src/pages/app/InboxPage.tsx`**
- Route: `/app/inbox` (add to router)
- Optional query param: `?client=<clientId>` — deep-links into a specific thread (used by notification clicks)
- Left panel: thread list via `useThreads()` hook, sorted by latest message, unread dots + count
- Right panel: active thread messages + composer
- Polls active thread every **8 seconds** via `useQuery` `refetchInterval`
- Thread list polls every **30 seconds**

**`src/features/messages/hooks/useMessages.ts`**
New TanStack Query hooks:
- `useThreads()` — `GET /messages`
- `useThread(clientId)` — `GET /messages/:clientId`, `refetchInterval: 8000`
- `useSendMessage(clientId)` — `POST /messages/:clientId` mutation, invalidates thread + thread list on success
- `useMarkRead(clientId)` — `PATCH /messages/:clientId/read` mutation, fires on thread open
- `useUnreadCount()` — `GET /messages/unread-count`, `refetchInterval: 30000` — drives nav badge

**`src/features/messages/components/MessageComposer.tsx`**
- Textarea + toolbar
- "Attach proposal / invoice" button opens `DocumentPickerModal`
- Selected document shows as a preview card above the send button
- Send fires `useSendMessage`, clears input on success

**`src/features/messages/components/DocumentPickerModal.tsx`**
- Queries `GET /proposals?clientId=<id>`, `GET /invoices?clientId=<id>`, `GET /contracts?clientId=<id>`
- Groups results into three sections: Proposals / Invoices / Contracts
- Single-select; selected item passed back to composer

**`src/features/messages/components/DocumentCard.tsx`**
- Renders inline in thread for messages with an attachment
- Shows: entity type pill, title, amount (if proposal/invoice), status badge
- Clicking navigates to the document in the app (freelancer side) or scrolls to the relevant portal tab (client side)

### Client portal changes

**`src/pages/portal/ClientPortalPage.tsx`** (existing)
- Add a **Messages** tab alongside Proposals, Invoices, etc.
- Same thread view, simpler composer (text only, no attach)
- Polls every **10 seconds** via portal message hooks
- Fires `PATCH /portal/:token/messages/read` on tab open

### Nav badge

In the app shell / sidebar, the Inbox nav item shows a red dot badge when `useUnreadCount()` returns `> 0`. Badge disappears when count reaches 0 (after marking threads read).

---

## Email Templates to Add

| Key | Trigger | Recipients |
|---|---|---|
| `message_received` | Freelancer sends a message | Client (their email on file) |
| `client_message_received` | Client replies | Freelancer |

Both templates follow the existing layout system in `email-templates.ts`. Register them in `TEMPLATE_REGISTRY` in `template-vars.registry.ts` so they're editable via the Email Templates page.

---

## Scope — what's NOT included

- File/image uploads (out of scope; document linking covers the main use case)
- WebSocket real-time (polling is sufficient for mail-like UX)
- WhatsApp notifications (email covers both sides using existing infrastructure)
- Group threads / CC (one freelancer ↔ one client per thread only)
- Message deletion or editing

---

## Build order

1. Prisma migration — `Thread` + `Message` models + enums
2. `messages.module.ts` — freelancer CRUD endpoints
3. Portal endpoints — `GET/POST/PATCH /portal/:token/messages`
4. Two new email templates + register in template registry
5. Frontend hooks — `useMessages.ts`
6. `DocumentCard.tsx` + `DocumentPickerModal.tsx`
7. `MessageComposer.tsx`
8. `InboxPage.tsx` + route
9. Nav badge wiring
10. Portal Messages tab
