import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useProposalTemplate, useUpdateTemplate } from '@/features/proposals/hooks/useProposalTemplates'
import ProposalEditor from '@/features/proposals/components/ProposalEditor'
import { toast } from 'sonner'

export default function TemplateEditorPage() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const updateMut  = useUpdateTemplate()

  const { data: template, isLoading } = useProposalTemplate(id ?? null)

  function handleSaveTemplate(content: object, name: string, totalAmount: number) {
    if (!id) return
    updateMut.mutate(
      { id, content, name, totalAmount },
      {
        onSuccess: () => {
          toast.success('Template saved')
          navigate('/app/proposals', { state: { tab: 'templates' } })
        },
      },
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[14px] text-[#667085]">Template not found.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-h-[calc(100vh-136px)] lg:max-h-none max-w-full -mx-4 -my-4 lg:-mx-6 lg:-my-6">
      {/* Breadcrumb bar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] shrink-0">
        <button
          onClick={() => navigate('/app/proposals', { state: { tab: 'templates' } })}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#667085] dark:text-[#8B92A8] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
        </button>
        <Link
          to="/app/proposals"
          state={{ tab: 'templates' }}
          className="text-[12px] text-[#98A2B3] dark:text-[#545C74] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
        >
          Proposals
        </Link>
        <span className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258]">/</span>
        <Link
          to="/app/proposals"
          state={{ tab: 'templates' }}
          className="text-[12px] text-[#98A2B3] dark:text-[#545C74] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
        >
          Templates
        </Link>
        <span className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258]">/</span>
        <span className="text-[12px] font-medium text-[#344054] dark:text-[#C2C8D8]">
          {template.name}
        </span>
      </div>

      <ProposalEditor
        defaultTemplate={template}
        templateMode={{ id: template.id, name: template.name }}
        onSaveTemplate={handleSaveTemplate}
        onDiscard={() => navigate('/app/proposals', { state: { tab: 'templates' } })}
      />
    </div>
  )
}
