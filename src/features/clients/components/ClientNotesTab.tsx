import NotesPanel from '@/components/NotesPanel'
import { useClientNotes, useCreateClientNote, useDeleteClientNote } from '../hooks/useClientNotes'

interface Props { clientId: string }

export default function ClientNotesTab({ clientId }: Props) {
  const { data: notes = [], isLoading } = useClientNotes(clientId)
  const createMutation = useCreateClientNote(clientId)
  const deleteMutation = useDeleteClientNote(clientId)

  return (
    <NotesPanel
      notes={notes}
      isLoading={isLoading}
      isSubmitting={createMutation.isPending}
      onAdd={content => createMutation.mutate(content)}
      onDelete={id => deleteMutation.mutate(id)}
    />
  )
}
