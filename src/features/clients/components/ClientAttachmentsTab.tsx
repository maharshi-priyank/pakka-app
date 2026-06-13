import { useRef, useState } from 'react'
import { FileArchive, FileText, FileImage, File, Trash2, Upload, Loader2, Paperclip } from 'lucide-react'
import { useAttachments, useUploadAttachment, useDeleteAttachment, useLinkCanvaDesign, humanSize } from '@/features/attachments/useAttachments'
import { useProfile } from '@/features/settings/hooks/useProfile'
import CanvaPickerModal from '@/components/CanvaPickerModal'
import { ConfirmModal } from '@/components/ConfirmModal'
import canvaSvg from '@/assets/canva.svg'

function fileIcon(mimeType: string) {
  if (mimeType === 'application/x-canva')  return <img src={canvaSvg} alt="Canva" className="w-4 h-4 rounded shrink-0" />
  if (mimeType.startsWith('image/'))       return <FileImage   size={14} className="text-[#667085] shrink-0" />
  if (mimeType === 'application/pdf')      return <FileText    size={14} className="text-[#D92D20] shrink-0" />
  if (/zip|tar|rar/.test(mimeType))        return <FileArchive size={14} className="text-[#F79009] shrink-0" />
  return <File size={14} className="text-[#667085] shrink-0" />
}

interface Props { clientId: string }

export default function ClientAttachmentsTab({ clientId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showCanvaPicker, setShowCanvaPicker] = useState(false)
  const [deleteTarget,    setDeleteTarget]    = useState<string | null>(null)
  const parent = { clientId }

  const { data: attachments = [], isLoading } = useAttachments(parent)
  const uploadMutation    = useUploadAttachment(parent)
  const deleteMutation    = useDeleteAttachment(parent)
  const linkCanvaDesign   = useLinkCanvaDesign(parent)
  const { data: profile } = useProfile()

  function handleFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach(f => uploadMutation.mutate(f))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Drop zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-[#D0D5DD] dark:border-[#333649] rounded-xl px-6 py-8 flex flex-col items-center gap-2 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors"
      >
        {uploadMutation.isPending ? (
          <Loader2 size={20} className="animate-spin text-indigo-400" />
        ) : (
          <Upload size={18} className="text-[#98A2B3] dark:text-[#545C74]" />
        )}
        <p className="text-[12.5px] font-medium text-[#667085] dark:text-[#8B92A8]">
          {uploadMutation.isPending ? 'Uploading…' : 'Drop files here or click to browse'}
        </p>
        <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">PDFs, images, docs — any format</p>
      </div>
      <input ref={inputRef} type="file" multiple className="sr-only" onChange={e => handleFiles(e.target.files)} />

      {/* Add from Canva */}
      {profile?.canvaConnected && (
        <button
          type="button"
          onClick={() => setShowCanvaPicker(true)}
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border-2 border-dashed border-[#D0D5DD] dark:border-[#3A3C4A] text-[12.5px] font-medium text-[#667085] dark:text-[#8B92A8] hover:border-[#7B2FBE] hover:text-[#7B2FBE] hover:bg-[#F3EEFF] dark:hover:bg-[#1A1228] transition-all"
        >
          <img src={canvaSvg} alt="Canva" className="w-4 h-4 rounded" />
          Add from Canva
        </button>
      )}

      {/* File list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={18} className="animate-spin text-[#D0D5DD]" />
        </div>
      ) : attachments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Paperclip size={20} className="text-[#D0D5DD] dark:text-[#3A3D52]" />
          <p className="text-[12.5px] text-[#98A2B3] dark:text-[#545C74]">No attachments yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {attachments.map(a => (
            <div key={a.id} className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A]">
              {fileIcon(a.mimeType)}
              <div className="flex-1 min-w-0">
                {a.mimeType === 'application/x-canva' && a.fileUrl ? (
                  <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-[12.5px] font-semibold text-[#6366F1] hover:underline truncate block">{a.fileName}</a>
                ) : (
                  <a href={a.fileUrl ?? '#'} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C5CAD6] hover:text-indigo-600 dark:hover:text-indigo-400 truncate block transition-colors">
                    {a.fileName}
                  </a>
                )}
                <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">{a.mimeType === 'application/x-canva' ? 'Canva design' : humanSize(a.fileSize)}</p>
              </div>
              <button
                onClick={() => setDeleteTarget(a.id)}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-[#D0D5DD] hover:text-[#D92D20] hover:bg-[#FEF3F2] dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={12} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showCanvaPicker && (
        <CanvaPickerModal
          onClose={() => setShowCanvaPicker(false)}
          isPicking={linkCanvaDesign.isPending}
          onSelect={(design) => linkCanvaDesign.mutate(design, { onSuccess: () => setShowCanvaPicker(false) })}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget)
          setDeleteTarget(null)
        }}
        title="Delete attachment?"
        description="This file will be permanently deleted. This cannot be undone."
        confirmLabel="Delete File"
        variant="delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
