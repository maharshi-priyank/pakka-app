import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useUiStore } from '@/store/uiStore'
import type {
  Contact, ContactsListResponse, ContactStage,
  CreateContactInput, UpdateContactInput,
} from '../schemas/contact.schema'

interface ContactsParams {
  page?:            number
  limit?:           number
  search?:          string
  stage?:           ContactStage
  includeArchived?: boolean
}

async function fetchContacts(params: ContactsParams = {}): Promise<ContactsListResponse> {
  const { data } = await api.get<{ data: ContactsListResponse }>('/contacts', { params })
  return data.data
}

async function fetchContact(id: string): Promise<Contact> {
  const { data } = await api.get<{ data: Contact }>(`/contacts/${id}`)
  return data.data
}

async function createContact(input: CreateContactInput): Promise<Contact> {
  const payload = {
    ...input,
    dealValue:  input.dealValue  ? Number(input.dealValue)  : undefined,
    email:      input.email      || undefined,
    phone:      input.phone      || undefined,
    company:    input.company    || undefined,
    service:    input.service    || undefined,
    notes:      input.notes      || undefined,
    followUpAt: input.followUpAt || undefined,
  }
  const { data } = await api.post<{ data: Contact }>('/contacts', payload)
  return data.data
}

async function updateContact(id: string, input: UpdateContactInput): Promise<Contact> {
  const payload = {
    ...input,
    dealValue:  input.dealValue  ? Number(input.dealValue)  : undefined,
    email:      input.email      || undefined,
    phone:      input.phone      || undefined,
    company:    input.company    || undefined,
    service:    input.service    || undefined,
    notes:      input.notes      || undefined,
    followUpAt: input.followUpAt || undefined,
  }
  const { data } = await api.patch<{ data: Contact }>(`/contacts/${id}`, payload)
  return data.data
}

async function updateContactStage(id: string, stage: ContactStage): Promise<Contact> {
  const { data } = await api.patch<{ data: Contact }>(`/contacts/${id}/stage`, { stage })
  return data.data
}

async function deleteContact(id: string): Promise<void> {
  await api.delete(`/contacts/${id}`)
}

// ─── Query hooks ─────────────────────────────────────────────────────────────

export const CONTACTS_QUERY_KEY = 'contacts'

export function useContacts(params: ContactsParams = {}) {
  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, params],
    queryFn:  () => fetchContacts(params),
    staleTime: 30_000,
  })
}

export function useContact(id: string | null) {
  return useQuery({
    queryKey: [CONTACTS_QUERY_KEY, id],
    queryFn:  () => fetchContact(id!),
    enabled:  !!id,
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

export function useCreateContact() {
  const qc = useQueryClient()
  const { openUpgradeModal } = useUiStore()
  return useMutation({
    mutationFn: createContact,
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] }); toast.success('Contact added') },
    onError: (err: Error & { code?: string }) => {
      if (err.code === 'PLAN_LIMIT') openUpgradeModal('contacts')
      else toast.error(err.message || 'Failed to add contact')
    },
  })
}

export function useUpdateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateContactInput & { id: string }) => updateContact(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] }); toast.success('Contact updated') },
    onError: (err: Error) => toast.error(err.message || 'Failed to update contact'),
  })
}

export function useUpdateContactStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: ContactStage }) => updateContactStage(id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] }),
    onError: (err: Error) => toast.error(err.message || 'Failed to update stage'),
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteContact,
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] }); toast.success('Contact deleted') },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete contact'),
  })
}

export function useArchiveContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/contacts/${id}/archive`).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] }),
    onError: (err: Error) => toast.error(err.message || 'Failed to archive contact'),
  })
}

export function useUnarchiveContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/contacts/${id}/unarchive`).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] }),
    onError: (err: Error) => toast.error(err.message || 'Failed to unarchive contact'),
  })
}
