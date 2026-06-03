import { useRef } from 'react'
import { FileArchive, FileText, FileImage, File, Trash2, Upload, Loader2 } from 'lucide-react'
import { useAttachments, useUploadAttachment, useDeleteAttachment, humanSize } from '@/features/attachments/useAttachments'

function fileIcon(mimeType: string) {
  if (mimeType.startsWith('image/'))                                                    return <FileImage   size={15} className="text-[#667085] shrink-0" />
  if (mimeType === 'application/pdf')                                                   return <FileText    size={15} className="text-[#D92D20] shrink-0" />
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar'))
                                                                                        return <FileArchive size={15} className="text-[#F79009] shrink-0" />
  return <File size={15} className="text-[#667085] shrink-0" />
}

interface Props {
  projectId: string
}

export default function ProjectFilesPanel({ projectId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const parent   = { projectId }

  const { data: attachments = [], isLoading } = useAttachments(parent)
  const uploadMutation = useUploadAttachment(parent)
  const deleteMutation = useDeleteAttachment(parent)

  function handleFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach(f => uploadMutation.mutate(f))
  }

  function handleDelete(id: string, fileName: string) {
    if (!window.confirm(`Remove "${fileName}"? This cannot be undone.`)) return
    deleteMutation.mutate(id)
  }

  return (
    <div className="bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F2F4F7] dark:border-[#26283A]">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C5CAD6]">Project Files</h3>
          {attachments.length > 0 && (
            <span className="text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8] bg-[#F2F4F7] dark:bg-[#1A1B23] px-2 py-0.5 rounded-full">
              {attachments.length}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={18} className="animate-spin text-[#D0D5DD]" />
          </div>
        ) : attachments.length === 0 ? (
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] py-2">
            No files yet. Upload briefs, references, or any project-related documents here.
          </p>
        ) : (
          attachments.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#FAFAFA] dark:bg-[#1A1B23] border border-[#F2F4F7] dark:border-[#26283A]">
              {fileIcon(a.mimeType)}
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C5CAD6] truncate">{a.fileName}</p>
                <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">{humanSize(a.fileSize)}</p>
              </div>
              <button
                onClick={() => handleDelete(a.id, a.fileName)}
                disabled={deleteMutation.isPending}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-[#98A2B3] hover:text-[#D92D20] hover:bg-[#FEF3F2] dark:hover:bg-[#2A1A1A] transition-colors"
              >
                <Trash2 size={12} strokeWidth={2} />
              </button>
            </div>
          ))
        )}

        <input ref={inputRef} type="file" multiple className="sr-only" onChange={e => handleFiles(e.target.files)} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border-2 border-dashed border-[#D0D5DD] dark:border-[#3A3C4A] text-[12.5px] font-medium text-[#667085] dark:text-[#8B92A8] hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-[#EFF6FF] dark:hover:bg-[#13141A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadMutation.isPending
            ? <><Loader2 size={13} className="animate-spin" /> Uploading…</>
            : <><Upload size={13} /> Upload file</>
          }
        </button>
      </div>
    </div>
  )
}
