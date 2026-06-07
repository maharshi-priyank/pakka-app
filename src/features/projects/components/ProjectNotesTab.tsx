import { useState, useEffect } from 'react'
import { Loader2, Save } from 'lucide-react'
import NotesPanel from '@/components/NotesPanel'
import { useProjectNotes, useCreateProjectNote, useDeleteProjectNote } from '../hooks/useProjectNotes'
import { useUpdateProject } from '../hooks/useProjects'

interface Props {
  projectId:   string
  brief:       string | null
}

export default function ProjectNotesTab({ projectId, brief }: Props) {
  const [briefDraft, setBriefDraft] = useState(brief ?? '')
  const [briefDirty, setBriefDirty] = useState(false)

  const { data: notes = [], isLoading } = useProjectNotes(projectId)
  const createMutation = useCreateProjectNote(projectId)
  const deleteMutation = useDeleteProjectNote(projectId)
  const updateProject  = useUpdateProject()

  useEffect(() => {
    setBriefDraft(brief ?? '')
    setBriefDirty(false)
  }, [brief])

  function saveBrief() {
    updateProject.mutate(
      { id: projectId, description: briefDraft },
      { onSuccess: () => setBriefDirty(false) },
    )
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Brief section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[13px] font-bold text-[#0F172A] dark:text-[#ECEEF3]">Project Brief</h3>
            <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">Scope, goals, deliverables — anything the project is about</p>
          </div>
          {briefDirty && (
            <button
              onClick={saveBrief}
              disabled={updateProject.isPending}
              className="flex items-center gap-1.5 h-7 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-[12px] font-semibold rounded-lg transition-all active:scale-[0.97]"
            >
              {updateProject.isPending
                ? <Loader2 size={11} className="animate-spin" />
                : <Save size={11} />
              }
              Save
            </button>
          )}
        </div>
        <textarea
          value={briefDraft}
          onChange={e => { setBriefDraft(e.target.value); setBriefDirty(e.target.value !== (brief ?? '')) }}
          placeholder="Describe the project scope, goals, deliverables, or any important context…"
          rows={5}
          className="w-full resize-none px-4 py-3.5 text-[13px] text-[#0F172A] dark:text-[#ECEEF3] placeholder-[#B8C0CC] dark:placeholder-[#545C74] bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl outline-none focus:border-indigo-400 dark:focus:border-indigo-500 leading-relaxed transition-colors"
        />
      </div>

      {/* Notes section */}
      <div>
        <div className="mb-3">
          <h3 className="text-[13px] font-bold text-[#0F172A] dark:text-[#ECEEF3]">Notes</h3>
          <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">Quick notes, updates, or internal reminders</p>
        </div>
        <NotesPanel
          notes={notes}
          isLoading={isLoading}
          isSubmitting={createMutation.isPending}
          onAdd={content => createMutation.mutate(content)}
          onDelete={id => deleteMutation.mutate(id)}
        />
      </div>
    </div>
  )
}
