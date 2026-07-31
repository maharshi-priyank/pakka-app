// ─── Generic template-library shape ────────────────────────────────────────
// Shared across Contract templates, Invoice templates (and future entities).
// Entity-specific fields (e.g. Contract's `content.clauses`, Invoice's
// `content.notes`, Proposal's `totalAmount`) live on each entity's own
// extended type — this interface only covers what the shared library UI
// shell (TemplateLibraryCard / TemplatePickerShell / SaveAsTemplateModal)
// needs to know about.

export interface LibraryTemplate {
  id:          string
  name:        string
  description: string | null
  category:    string | null
  isSystem:    boolean
  isDefault:   boolean
  usageCount:  number
  createdAt:   string
  updatedAt:   string
}
