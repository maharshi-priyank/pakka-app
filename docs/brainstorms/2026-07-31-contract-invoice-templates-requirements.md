---
date: 2026-07-31
topic: contract-invoice-templates
---

## Summary

Contract and Invoice get the same templating system Proposals already have — create, save-as-template, and pick from a library with a right-side preview, workspace-shared, each starting with one system default. One template per document type can be marked the automation default; the existing Proposal→Contract and Contract→Invoice automation applies that default's boilerplate while real scope, amounts, and payment schedule keep flowing from the source document. A new "re-apply template" action lets a member swap the template on an already-created Contract or Invoice while it's still editable.

## Problem Frame

Proposals already support templates, save-as-template, and a preview-driven picker. Contracts and Invoices have none of this — `createFromProposal()` and `createFromContract()` hardcode fixed clauses, payment-terms wording, and line-item shape on every automatically generated document. In practice, different services need different contract clauses, and branding/formatting needs vary by client — so the same hardcoded boilerplate gets manually rewritten after the fact, on every automation run, regardless of which client or service it was for.

## Key Decisions

- **Full template library, not a single editable default.** Contract and Invoice templates mirror Proposals exactly — multiple saved templates, categorized, picked via a preview-driven picker — rather than one fixed customizable block per document type. This gives real coverage for different services/clients, not just one shape.
- **One automation default per document type, no conditional logic.** Automation always uses a single default Contract template and a single default Invoice template. It does not choose between templates based on the contact, service, or any other condition. When the default is wrong for a specific case, the fix is the re-apply action below, not smarter automation.
- **Default is set from the template library, not from Automation settings.** A "Set as default" action lives directly on the template card in the Contract/Invoice template library, discoverable while browsing or creating templates — not buried in the Automations rule configuration.
- **No AI-import for Contract/Invoice templates.** Proposals let a user upload an existing PDF/DOCX and have AI parse it into a starting template. Contract/Invoice templates skip this for now — manual create and save-as-template only.
- **System-seeded starter template per type.** Each workspace ships with one default Contract template and one default Invoice template out of the box, so automation always has a sensible template even before a user creates their own.
- **Template application splits by whether the document already has real data.** Creating a brand-new Contract/Invoice from a template makes the full template content (including placeholder scope/line-item text) the starting point, same as Proposals today. Applying a template to a document that already carries real data — either because automation generated it from a source Proposal/Contract, or because a member re-applies a different template later — only replaces boilerplate (clauses, wording, terms); scope, deliverables, amounts, and payment schedule are left untouched.

## Actors

- A1. Workspace member — creates, edits, and deletes Contract/Invoice templates; sets or changes which template is the automation default per document type; re-applies a template to an existing document.
- A2. Automation engine — the existing `create.contract` / `create.invoice` automation actions that, on `proposal.accepted` / `contract.signed`, generate a document using the current default template for boilerplate content.

## Requirements

**Template library**

- R1. Workspace members can create, edit, and delete Contract templates and Invoice templates, workspace-shared like existing Proposal templates (category, usage tracking).
- R2. A member can save an existing Contract or Invoice as a new template.
- R3. Creating a new Contract or Invoice offers a template picker with a right-side preview of the selected template's content before applying it, mirroring the Proposal template picker.
- R4. Each workspace starts with one system-seeded default Contract template and one system-seeded default Invoice template.

**Automation default**

- R5. A member can mark exactly one Contract template and one Invoice template as the automation default, from the template library. Setting a new default replaces the previous one — only one default per document type at a time.
- R6. When `proposal.accepted` automation creates a Contract, and when `contract.signed` automation creates an Invoice, the generated document's boilerplate content (clauses, wording, terms) comes from the current default template.
- R7. Scope, deliverables, payment schedule, and amounts on an automation-generated Contract/Invoice continue to come from the source Proposal/Contract being converted, never from the template.

**Re-apply**

- R8. A member can re-apply a different template to an existing Contract or Invoice, as long as its status still allows editing (same edit-lock rules already enforced today, e.g. a signed Contract or a paid Invoice cannot be changed).
- R9. Re-applying a template replaces only boilerplate content; the document's existing scope, deliverables, amounts, payment schedule, and status are unchanged.

## Key Flows

- F1. Create or save a template
  - **Trigger:** A member opens the template library, or chooses "save as template" from an existing Contract/Invoice.
  - **Actors:** A1
  - **Steps:** Member fills in template content (or the current document's content is copied in); template is saved workspace-wide.
  - **Covers:** R1, R2

- F2. Set the automation default
  - **Trigger:** A member marks a template as default from the template library.
  - **Actors:** A1
  - **Steps:** Member selects "Set as default" on a Contract or Invoice template card; any previous default for that document type is unset.
  - **Covers:** R5

- F3. Automation-triggered creation
  - **Trigger:** `proposal.accepted` or `contract.signed` fires.
  - **Actors:** A2
  - **Steps:** Automation engine loads the current default template for the target document type, merges its boilerplate with the source Proposal/Contract's real scope/amounts/payment schedule, and creates the document.
  - **Covers:** R6, R7

- F4. Re-apply a template
  - **Trigger:** A member opens an existing, still-editable Contract or Invoice and picks a different template.
  - **Actors:** A1
  - **Steps:** Member selects a template from the picker; boilerplate content is replaced; scope/amounts/schedule/status are left as-is.
  - **Covers:** R8, R9

## Acceptance Examples

- AE1. **Covers R6, R7.** Given a default Contract template with custom "Payment Terms" wording, and an accepted Proposal with a 3-milestone payment schedule and a $5,000 total. When automation creates the Contract. Then the Contract's clauses use the default template's wording, while its scope, payment schedule, and amount match the Proposal's actual data.
- AE2. **Covers R8.** Given a Contract in SIGNED status. When a member attempts to re-apply a different template. Then the action is blocked, consistent with the existing edit-lock rule for signed contracts.
- AE3. **Covers R5.** Given Template A is currently the default Invoice template. When a member marks Template B as default. Then Template A is no longer the default, and automation uses Template B going forward.

## Scope Boundaries

- AI-powered template import (upload an existing file, auto-parse into a template) — Proposals have this; Contract/Invoice templates don't, for now.
- Automation choosing between multiple templates based on a condition (service, contact, tag) — only a single default per document type is supported.
- Retroactive changes to Contracts/Invoices already created before this ships.

## Dependencies / Assumptions

- Builds on the existing Proposal template pattern — workspace-scoped, categorized, system vs. user-created, usage-tracked — and its picker/preview UI (`pakka-app/src/features/proposals/components/TemplatePickerModal.tsx`, `SaveTemplateModal.tsx`; `pakka-api/src/modules/proposal-templates/`), generalized to Contract and Invoice rather than built from scratch.
- Builds on the existing automation extension point (`AutomationRule.actionConfig`, consumed by `pakka-api/src/modules/automations/automation.engine.ts`'s `create.contract` / `create.invoice` actions) rather than introducing a new workspace-settings model for the default.
- Assumes system-template edit/delete restrictions mirror whatever already applies to system Proposal templates.

## Outstanding Questions

**Deferred to Planning:**

- Should re-applying a template prompt a confirmation before overwriting boilerplate content a member may have already customized on that document?
- Exact field-level boundary between "boilerplate" and "derived from source" for Contract/Invoice content, to be confirmed against the current field lists in `createFromProposal()` / `createFromContract()`.
