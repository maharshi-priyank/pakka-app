export interface Attachment {
  id:           string
  fileName:     string
  fileSize:     number
  mimeType:     string
  fileUrl:      string | null  // null = locked (payment gate active, invoice not yet paid)
  createdAt:    string
}

export interface PortalAttachment extends Attachment {
  parentLabel: string | null
}

export type AttachmentParent =
  | { projectId:  string }
  | { proposalId: string }
  | { invoiceId:  string }
  | { clientId:   string }
