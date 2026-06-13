import { useState, useCallback, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { X, Minus, Bold, Italic, Underline as UnderlineIcon, List, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DocumentCard } from './DocumentCard'
import { DocumentPickerModal, type PickedDoc } from './DocumentPickerModal'
import { useSendMessage } from '../hooks/useMessages'

interface Client { id: string; name: string; email: string }

interface Props {
  initialClient?: Client
  onClose:        () => void
}

interface UserMe { emailSignature: string | null }

export function ComposeModal({ initialClient, onClose }: Props) {
  const [minimised,      setMinimised]      = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(initialClient ?? null)
  const [subject,        setSubject]        = useState('')
  const [attachment,     setAttachment]     = useState<PickedDoc | null>(null)
  const [showPicker,     setShowPicker]     = useState(false)
  const [clientSearch,    setClientSearch]    = useState(initialClient?.name ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(initialClient?.name ?? '')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(clientSearch), 400)
    return () => clearTimeout(t)
  }, [clientSearch])

  const { data: clientResults } = useQuery<Client[]>({
    queryKey:  ['clients-search', debouncedSearch],
    queryFn:   () => api.get(`/clients?search=${encodeURIComponent(debouncedSearch)}&limit=8`).then(r => r.data.data.clients),
    enabled:   debouncedSearch.length > 1 && !selectedClient,
    staleTime: 10_000,
  })

  const { data: me } = useQuery<UserMe>({
    queryKey:  ['user-me'],
    queryFn:   () => api.get('/users/me').then(r => r.data.data),
    staleTime: 60_000,
  })

  const sendMessage = useSendMessage(selectedClient?.id ?? '')

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write your message…' }),
    ],
    content: me?.emailSignature
      ? `<p></p><p></p><p>${me.emailSignature}</p>`
      : '',
  })

  const handleSend = useCallback(async () => {
    if (!selectedClient || !editor || editor.isEmpty) return
    await sendMessage.mutateAsync({
      body:           editor.getHTML(),
      subject:        subject || undefined,
      attachmentType: attachment?.type,
      attachmentId:   attachment?.id,
    })
    onClose()
  }, [selectedClient, editor, subject, attachment, sendMessage, onClose])

  const toolbar = [
    { icon: Bold,          action: () => editor?.chain().focus().toggleBold().run(),       active: editor?.isActive('bold')       },
    { icon: Italic,        action: () => editor?.chain().focus().toggleItalic().run(),     active: editor?.isActive('italic')     },
    { icon: UnderlineIcon, action: () => editor?.chain().focus().toggleUnderline().run(),  active: editor?.isActive('underline')  },
    { icon: List,          action: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive('bulletList') },
  ]

  return (
    <>
      <div className={cn(
        'fixed bottom-4 right-4 z-50 w-[480px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col anim-compose-in',
        minimised ? 'h-12' : 'h-[540px]',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 rounded-t-2xl shrink-0">
          <span className="text-[13px] font-semibold text-white">New Message</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimised(v => !v)}
              className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <Minus size={13} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {!minimised && (
          <>
            {/* To: */}
            <div className="relative border-b border-gray-100 px-4 py-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-gray-400 shrink-0">To:</span>
                {selectedClient ? (
                  <div className="flex items-center gap-1.5 bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-[12px] font-medium">
                    {selectedClient.name}
                    <button onClick={() => { setSelectedClient(null); setClientSearch('') }}>
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <input
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    placeholder="Search client…"
                    className="flex-1 text-[13px] outline-none placeholder-gray-300"
                  />
                )}
              </div>
              {clientResults && clientResults.length > 0 && !selectedClient && (
                <div className="absolute left-0 right-0 top-full bg-white border border-gray-200 rounded-xl shadow-lg z-10 mt-1 mx-2 overflow-hidden">
                  {clientResults.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedClient(c); setClientSearch(c.name) }}
                      className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900">{c.name}</span>
                      <span className="text-gray-400 ml-2 text-[11px]">{c.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subject */}
            <div className="border-b border-gray-100 px-4 py-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-gray-400 shrink-0">Subject:</span>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="(optional)"
                  className="flex-1 text-[13px] outline-none placeholder-gray-300"
                />
              </div>
            </div>

            {/* Attachment preview */}
            {attachment && (
              <div className="px-4 pt-2 shrink-0">
                <div className="relative inline-block">
                  <DocumentCard
                    type={attachment.type}
                    entityId={attachment.id}
                    title={attachment.title}
                    amount={attachment.amount}
                    status={attachment.status}
                    isPortal
                  />
                  <button
                    onClick={() => setAttachment(null)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center"
                  >
                    <X size={9} className="text-white" />
                  </button>
                </div>
              </div>
            )}

            {/* Editor */}
            <div
              className="flex-1 overflow-y-auto px-4 py-2 cursor-text"
              onClick={() => editor?.commands.focus()}
            >
              <EditorContent
                editor={editor}
                className="prose prose-sm max-w-none text-[13px] [&_.tiptap]:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-300 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
              />
            </div>

            {/* Toolbar */}
            <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-1 shrink-0">
              {toolbar.map((t, i) => (
                <button
                  key={i}
                  onMouseDown={e => { e.preventDefault(); t.action() }}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    t.active
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700',
                  )}
                >
                  <t.icon size={13} />
                </button>
              ))}
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button
                onClick={() => setShowPicker(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <Paperclip size={12} />
                Attach
              </button>
              <button
                onClick={() => void handleSend()}
                disabled={!selectedClient || sendMessage.isPending || !editor || editor.isEmpty}
                className="ml-auto px-4 py-1.5 bg-[#0D1117] text-white text-[12px] font-semibold rounded-lg hover:bg-[#1a1d2e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {sendMessage.isPending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>

      {showPicker && selectedClient && (
        <DocumentPickerModal
          clientId={selectedClient.id}
          onPick={doc => setAttachment(doc)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}
