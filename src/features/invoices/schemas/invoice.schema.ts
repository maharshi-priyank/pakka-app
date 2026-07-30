import { z } from 'zod'

export const INVOICE_STATUS     = ['DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'] as const
export const GST_TYPES          = ['CGST_SGST', 'IGST', 'EXEMPT'] as const
export const RECURRENCE_CYCLES  = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'WEEKLY'] as const
export type  RecurrenceCycle    = typeof RECURRENCE_CYCLES[number]

export const RECURRENCE_CYCLE_LABELS: Record<RecurrenceCycle, string> = {
  MONTHLY:   'Monthly',
  QUARTERLY: 'Quarterly (every 3 months)',
  YEARLY:    'Yearly',
  WEEKLY:    'Weekly',
}

export type InvoiceStatus = typeof INVOICE_STATUS[number]
export type GstType       = typeof GST_TYPES[number]

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT:     'Draft',
  SENT:      'Sent',
  VIEWED:    'Viewed',
  PARTIAL:   'Partial',
  PAID:      'Paid',
  OVERDUE:   'Overdue',
  CANCELLED: 'Cancelled',
}

export const STATUS_BADGE_CLASS: Record<InvoiceStatus, string> = {
  DRAFT:     'bg-[#F2F4F7] text-[#667085] font-semibold rounded-full px-2 py-0.5',
  SENT:      'bg-[#EFF6FF] text-[#2563EB] font-semibold rounded-full px-2 py-0.5',
  VIEWED:    'bg-[#F4F3FF] text-[#5925DC] font-semibold rounded-full px-2 py-0.5',
  PARTIAL:   'bg-[#FFFAEB] text-[#B54708] font-semibold rounded-full px-2 py-0.5',
  PAID:      'bg-[#ECFDF3] text-[#027A48] font-semibold rounded-full px-2 py-0.5',
  OVERDUE:   'bg-[#FEF3F2] text-[#D92D20] font-semibold rounded-full px-2 py-0.5',
  CANCELLED: 'bg-[#F9FAFB] text-[#98A2B3] font-semibold rounded-full px-2 py-0.5',
}

export const lineItemSchema = z.object({
  description: z.string().min(1, 'Description required'),
  qty:         z.number({ message: 'Required' }).min(0),
  rate:        z.number({ message: 'Required' }).min(0),
  gstRate:     z.number().min(0).max(28),
  hsnSac:      z.string().optional(),
})

export const invoiceFormSchema = z.object({
  title:              z.string().optional(),
  contactId:          z.string().optional(),
  contractId:         z.string().optional(),
  lineItems:          z.array(lineItemSchema).min(1, 'Add at least one line item'),
  gstType:            z.enum(GST_TYPES),
  tdsRate:            z.number().min(0).max(30).optional(),
  dueDate:            z.string().optional(),
  notes:              z.string().optional(),
  isRecurring:        z.boolean().optional(),
  recurrenceCycle:    z.enum(RECURRENCE_CYCLES).optional(),
  recurrenceDay:      z.number().int().min(1).max(28).optional(),
  recurrenceEndDate:  z.string().optional(),
  currency:           z.string(),
  lutNumber:          z.string().optional(),
})

export type LineItem        = z.infer<typeof lineItemSchema>
export type InvoiceFormData = z.infer<typeof invoiceFormSchema>

export interface InvoiceClient {
  id: string; name: string; company: string | null; email: string | null
}
export interface InvoiceContact {
  id: string; name: string; company: string | null
}
export interface InvoiceContract {
  id: string; title: string
}

export interface Invoice {
  id:                 string
  userId:             string
  contractId:         string | null
  contactId:          string | null
  clientId:           string | null
  contact?:           InvoiceContact | null
  invoiceNumber:      string
  status:             InvoiceStatus
  lineItems:          LineItem[]
  subtotal:           number
  gstAmount:          number
  total:              number
  gstType:            GstType
  tdsRate:            number | null
  tdsDeducted:        number
  amountPaid:         number
  dueDate:            string | null
  paidAt:             string | null
  remindersSent:      number
  isRecurring:        boolean
  recurrenceCycle:    RecurrenceCycle | null
  recurrenceDay:      number | null
  recurrenceEndDate:  string | null
  recurrenceNextDate: string | null
  parentInvoiceId:    string | null
  createdAt:          string
  updatedAt:          string
  client:             InvoiceClient | null
  contract:           InvoiceContract | null
  projectId:          string | null
  project:            { id: string; name: string } | null
  currency:           string | null
  lutNumber:          string | null
}

export interface InvoiceListResponse {
  items: Invoice[]
  total: number
  page:  number
  limit: number
}
