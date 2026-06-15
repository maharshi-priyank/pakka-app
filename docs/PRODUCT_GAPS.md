# ClearWork — Unaddressed Freelancer Pain Points

> Manual, stressful client-business processes not yet solved by the app.
> Current feature set: Leads, Clients, Projects, Tasks, Inbox, Proposals, Contracts, Invoices, Reports, Calendar, Forms, Automations, Team (RBAC).

---

## Priority 1 — Daily friction

### Time tracking → auto-billing
Freelancers log hours in spreadsheets, then manually calculate and create invoices.
- Built-in timer (start/stop per project/task)
- Auto-populate invoice line items from tracked time
- Filter by project/date range when generating invoice
- TimePage exists in the app — the bridge to billing is the missing piece

### Recurring / retainer billing
Monthly retainer clients = same invoice recreated every month manually.
- Auto-recurring invoices on a schedule (weekly / monthly / quarterly)
- Auto-send on generation day
- Supports 5–10+ retainer clients without manual work

### Deliverable review & feedback rounds
After contract is signed, feedback on designs/copy/videos arrives via WhatsApp, email, and scattered Google Docs.
- Share a deliverable link (file or embed)
- Client leaves structured feedback (annotated or written)
- Track revision count and approval status
- "Approved" gate before moving to next phase
- Eliminates scope-creep disputes ("you never told me to change that")

---

## Priority 2 — Weekly friction

### Change orders (scope creep)
"Can you just add one small thing?" — no formal flow to capture, price, and get written approval.
- Change request form (triggered by client or freelancer)
- Mini-proposal: description + price + deadline delta
- Client approves → auto-appended to contract
- Reuses the existing proposal/contract infrastructure

### Project kickoff & client onboarding
After a contract is signed, freelancers manually email asking for brand assets, credentials, logins, questionnaire answers.
- Post-contract-sign trigger → launches onboarding checklist
- Shareable link with file upload + questionnaire
- Integrates with existing intake Forms feature
- Milestone: "Onboarding complete" before project kicks off

### Time → Invoice gap (bridge)
TimePage exists but converting logged hours to invoice line items is still manual.
- "Create invoice from tracked time" action on project
- Filter: date range, billable/non-billable toggle
- Auto-fills line items with descriptions from task names

### TDS certificate tracking (India-specific)
Indian clients deduct TDS (10%) and are required to provide Form 16A quarterly. Freelancers chase clients for months before ITR filing.
- Log TDS deductions per client per quarter
- Track whether certificate has been received
- Deadline alerts before ITR filing season (July / October / January)
- No Indian competitor does this well — significant differentiation

---

## Priority 3 — Nice-to-have

### Automated proposal follow-up sequences
After sending a proposal, if the client goes cold, follow-ups are sent manually.
- Built-in drip: Day 2 / Day 5 / Day 10 follow-ups
- One-click enable per proposal
- Ties into existing Automations infrastructure

### Testimonial collection post-project
After marking a project complete, no automated ask for a review or testimonial.
- Trigger: Project marked "Delivered"
- Sends request to client → lands on branded collection page
- Testimonial stored on public profile

### Expense tracking against projects
Reimbursable expenses (software, travel, subcontractors) logged manually outside the app.
- Add expense to a project (description, amount, receipt upload)
- Mark as client-billable or internal
- Include billable expenses on invoice as a line item
- Project profitability view: revenue - expenses

### Built-in scheduling / booking
Clients wanting to schedule a call go through email back-and-forth.
- Availability calendar (syncs with Calendar feature)
- Shareable booking link (like Calendly, built in)
- Auto-creates Calendar event on booking

---

## Build order recommendation

| # | Feature | Effort | Impact | Why first |
|---|---------|--------|--------|-----------|
| 1 | Recurring invoices | S | High | Universal pain, reuses Invoice infrastructure |
| 2 | Change orders | S | High | Reuses Proposal/Contract system, 80% already built |
| 3 | Client onboarding flow | M | High | Reuses Forms, triggered from contract sign event |
| 4 | Deliverable review | L | Very high | Biggest differentiator, new surface |
| 5 | TDS tracker | S | High (India) | No competitor, India-specific moat |
| 6 | Time tracking + invoice bridge | M | High | TimePage already exists |
