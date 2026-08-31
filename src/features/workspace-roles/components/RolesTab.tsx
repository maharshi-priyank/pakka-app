import { useState, useRef, useEffect } from 'react'
import {
  Plus, Trash2, Shield, Check, ChevronRight,
  Loader2, Users, Pencil, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspaceRoles } from '@/features/settings/hooks/useWorkspacePermissions'
import type { WorkspaceRole } from '@/features/settings/hooks/useWorkspacePermissions'
import PlanGate from '@/features/billing/components/PlanGate'
import {
  useCreateRole, useUpdateRole, useDeleteRole, useSetRolePermissions,
} from '../hooks/useRoleMutations'

// ─── Permission groups ────────────────────────────────────────────────────────

const PERMISSION_GROUPS: { label: string; perms: string[] }[] = [
  { label: 'Leads',        perms: ['VIEW_LEADS',       'MANAGE_LEADS'] },
  { label: 'Clients',      perms: ['VIEW_CLIENTS',     'MANAGE_CLIENTS'] },
  { label: 'Projects',     perms: ['VIEW_PROJECTS',    'MANAGE_PROJECTS'] },
  { label: 'Tasks',        perms: ['VIEW_TASKS',       'MANAGE_TASKS'] },
  { label: 'Proposals',    perms: ['VIEW_PROPOSALS',   'MANAGE_PROPOSALS',   'SEND_PROPOSALS'] },
  { label: 'Contracts',    perms: ['VIEW_CONTRACTS',   'MANAGE_CONTRACTS',   'SEND_CONTRACTS'] },
  { label: 'Invoices',     perms: ['VIEW_INVOICES',    'MANAGE_INVOICES',    'SEND_INVOICES', 'RECORD_PAYMENTS'] },
  { label: 'Inbox',        perms: ['VIEW_INBOX',       'SEND_MESSAGES'] },
  { label: 'Calendar',     perms: ['VIEW_CALENDAR',    'MANAGE_CALENDAR'] },
  { label: 'Forms',        perms: ['VIEW_FORMS',       'MANAGE_FORMS'] },
  { label: 'Automations',  perms: ['VIEW_AUTOMATIONS', 'MANAGE_AUTOMATIONS'] },
  { label: 'Reports',      perms: ['VIEW_REPORTS'] },
  { label: 'Workspace',    perms: ['MANAGE_WORKSPACE_SETTINGS', 'MANAGE_BILLING', 'MANAGE_MEMBERS', 'MANAGE_INTEGRATIONS'] },
]

function permLabel(perm: string): string {
  if (perm.startsWith('VIEW_'))            return 'View'
  if (perm.startsWith('MANAGE_'))          return 'Manage'
  if (perm.startsWith('SEND_'))            return 'Send'
  if (perm === 'RECORD_PAYMENTS')          return 'Record payments'
  return perm
}

// ─── Confirm delete dialog ────────────────────────────────────────────────────

function ConfirmDeleteModal({
  role,
  onConfirm,
  onCancel,
  deleting,
}: {
  role: WorkspaceRole
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1C1E2D] border border-[#E4E7EC] dark:border-[#2E3044] rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#FEF3F2] flex items-center justify-center shrink-0">
            <Trash2 size={16} className="text-[#D92D20]" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Delete "{role.name}"?</p>
            <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mt-1">
              This role will be permanently removed. Make sure no members are assigned to it first.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="h-8 px-3 rounded-lg border border-[#D0D5DD] dark:border-[#3A3C4E] text-[12.5px] font-medium text-[#344054] dark:text-[#C1C5D6] hover:bg-[#F9FAFB] dark:hover:bg-[#262838] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="h-8 px-3 rounded-lg bg-[#D92D20] hover:bg-[#B42318] text-white text-[12.5px] font-semibold flex items-center gap-1.5 disabled:opacity-60 transition-colors"
          >
            {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Delete role
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create role modal ────────────────────────────────────────────────────────

function CreateRoleModal({
  roles,
  onClose,
  onCreate,
  creating,
}: {
  roles: WorkspaceRole[]
  onClose: () => void
  onCreate: (dto: { name: string; copyFromRoleId?: string }) => void
  creating: boolean
}) {
  const [name, setName] = useState('')
  const [copyFrom, setCopyFrom] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onCreate({ name: name.trim(), copyFromRoleId: copyFrom || undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1C1E2D] border border-[#E4E7EC] dark:border-[#2E3044] rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">New role</p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#98A2B3] hover:bg-[#F2F4F7] dark:hover:bg-[#262838] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#344054] dark:text-[#C1C5D6] mb-1.5">
              Role name
            </label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Senior Designer"
              required
              className="w-full h-9 rounded-lg border border-[#D0D5DD] dark:border-[#3A3C4E] bg-white dark:bg-[#262838] text-[13px] text-[#101828] dark:text-[#ECEEF3] px-3 outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] placeholder:text-[#98A2B3]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#344054] dark:text-[#C1C5D6] mb-1.5">
              Copy permissions from (optional)
            </label>
            <select
              value={copyFrom}
              onChange={e => setCopyFrom(e.target.value)}
              className="w-full h-9 rounded-lg border border-[#D0D5DD] dark:border-[#3A3C4E] bg-white dark:bg-[#262838] text-[13px] text-[#101828] dark:text-[#ECEEF3] px-3 outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
            >
              <option value="">Start with no permissions</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-lg border border-[#D0D5DD] dark:border-[#3A3C4E] text-[12.5px] font-medium text-[#344054] dark:text-[#C1C5D6] hover:bg-[#F9FAFB] dark:hover:bg-[#262838] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="h-8 px-3 rounded-lg bg-[#6366F1] hover:bg-[#5558E8] text-white text-[12.5px] font-semibold flex items-center gap-1.5 disabled:opacity-60 transition-colors"
            >
              {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Create role
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Permission toggle ────────────────────────────────────────────────────────

function PermToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled: boolean
  onChange?: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[12px] font-medium transition-colors duration-150 select-none',
        checked
          ? disabled
            ? 'bg-[#EEF2FF] dark:bg-[#1E1C35] border-[#C7D7FD] dark:border-[#2D2A50] text-[#6366F1] cursor-default'
            : 'bg-[#EEF2FF] dark:bg-[#1E1C35] border-[#C7D7FD] dark:border-[#2D2A50] text-[#6366F1] hover:bg-[#E0E7FF] dark:hover:bg-[#24214A] cursor-pointer'
          : disabled
            ? 'bg-[#F9FAFB] dark:bg-[#1C1E2D] border-[#EAECF0] dark:border-[#2E3044] text-[#98A2B3] cursor-default'
            : 'bg-white dark:bg-[#262838] border-[#D0D5DD] dark:border-[#3A3C4E] text-[#667085] dark:text-[#8B92A8] hover:border-[#6366F1] hover:text-[#6366F1] cursor-pointer',
      )}
    >
      <div className={cn(
        'w-3.5 h-3.5 rounded flex items-center justify-center shrink-0',
        checked ? 'bg-[#6366F1]' : 'bg-[#EAECF0] dark:bg-[#2E3044]',
      )}>
        {checked && <Check size={8} strokeWidth={3} className="text-white" />}
      </div>
      {label}
    </button>
  )
}

// ─── Role detail panel ────────────────────────────────────────────────────────

function RoleDetail({
  role,
  onDelete,
}: {
  role: WorkspaceRole
  onDelete: (role: WorkspaceRole) => void
}) {
  const [editingName, setEditingName] = useState(false)
  const [nameValue,   setNameValue]   = useState(role.name)
  const nameRef = useRef<HTMLInputElement>(null)

  const { mutate: updateRole, isPending: updatingName } = useUpdateRole()
  const { mutate: setPerms,   isPending: settingPerms } = useSetRolePermissions()

  const activePerms = new Set((role.permissions ?? []).map(p => p.permission))

  useEffect(() => {
    setNameValue(role.name)
    setEditingName(false)
  }, [role.id, role.name])

  useEffect(() => {
    if (editingName) nameRef.current?.focus()
  }, [editingName])

  function saveName() {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === role.name) {
      setEditingName(false)
      setNameValue(role.name)
      return
    }
    updateRole({ id: role.id, name: trimmed }, { onSettled: () => setEditingName(false) })
  }

  function togglePerm(perm: string) {
    if (role.isSystem) return
    const next = new Set(activePerms)
    next.has(perm) ? next.delete(perm) : next.add(perm)
    setPerms({ id: role.id, permissions: Array.from(next) })
  }

  const isReadOnly = role.isSystem

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-[#F2F4F7] dark:border-[#26283A] flex items-start justify-between gap-3">
        <div className="min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                ref={nameRef}
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditingName(false); setNameValue(role.name) } }}
                onBlur={saveName}
                className="h-8 px-2 rounded-lg border border-[#6366F1] bg-white dark:bg-[#262838] text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3] outline-none ring-2 ring-[#6366F1]/20 w-48"
              />
              {updatingName && <Loader2 size={13} className="animate-spin text-[#6366F1]" />}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">{role.name}</h3>
              {!isReadOnly && (
                <button
                  onClick={() => setEditingName(true)}
                  className="p-1 rounded text-[#98A2B3] hover:text-[#6366F1] transition-colors"
                >
                  <Pencil size={12} />
                </button>
              )}
              {isReadOnly && (
                <span className="text-[10.5px] font-semibold text-[#667085] dark:text-[#8B92A8] bg-[#F2F4F7] dark:bg-[#26283A] px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                  System
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <Users size={11} className="text-[#98A2B3]" />
            <span className="text-[11.5px] text-[#98A2B3]">{role._count?.members ?? 0} member{(role._count?.members ?? 0) !== 1 ? 's' : ''}</span>
          </div>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => onDelete(role)}
            className="h-7 px-2.5 rounded-lg border border-[#EAECF0] dark:border-[#3A3C4E] text-[11.5px] font-medium text-[#667085] hover:text-[#D92D20] hover:border-[#FCA5A5] hover:bg-[#FEF3F2] flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Trash2 size={11} /> Delete role
          </button>
        )}
      </div>

      {/* Permissions */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {isReadOnly && (
          <p className="text-[12px] text-[#98A2B3] dark:text-[#5A5E78] bg-[#F9FAFB] dark:bg-[#1C1E2D] border border-[#EAECF0] dark:border-[#26283A] rounded-lg px-3 py-2">
            System roles cannot be edited. Their permissions are fixed.
          </p>
        )}
        {settingPerms && (
          <div className="flex items-center gap-1.5 text-[12px] text-[#6366F1]">
            <Loader2 size={12} className="animate-spin" /> Saving…
          </div>
        )}
        {PERMISSION_GROUPS.map(group => {
          const present = group.perms.filter(p => activePerms.has(p))
          return (
            <div key={group.label}>
              <p className="text-[11.5px] font-semibold text-[#344054] dark:text-[#C1C5D6] uppercase tracking-wide mb-2">
                {group.label}
                {isReadOnly && present.length === 0 && (
                  <span className="ml-2 normal-case text-[#D0D5DD] dark:text-[#3A3C4E] font-normal">no access</span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.perms.map(perm => (
                  <PermToggle
                    key={perm}
                    label={permLabel(perm)}
                    checked={activePerms.has(perm)}
                    disabled={isReadOnly}
                    onChange={() => togglePerm(perm)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

function RolesTabContent() {
  const { data: roles = [], isLoading } = useWorkspaceRoles()
  const { mutate: createRole, isPending: creating } = useCreateRole()
  const { mutate: deleteRole, isPending: deleting } = useDeleteRole()

  const systemRoles = roles.filter(r => r.isSystem)
  const customRoles = roles.filter(r => !r.isSystem)

  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [showCreate,     setShowCreate]      = useState(false)
  const [confirmDelete,  setConfirmDelete]   = useState<WorkspaceRole | null>(null)

  // Auto-select first role when data loads
  useEffect(() => {
    if (!selectedId && roles.length > 0) setSelectedId(roles[0].id)
  }, [roles, selectedId])

  const selectedRole = roles.find(r => r.id === selectedId) ?? null

  function handleCreate(dto: { name: string; copyFromRoleId?: string }) {
    createRole(dto, {
      onSuccess: (newRole: WorkspaceRole) => {
        setShowCreate(false)
        setSelectedId(newRole.id)
      },
    })
  }

  function handleDeleteConfirm() {
    if (!confirmDelete) return
    deleteRole(confirmDelete.id, {
      onSuccess: () => {
        setConfirmDelete(null)
        if (selectedId === confirmDelete.id) setSelectedId(roles[0]?.id ?? null)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-[#6366F1]" />
      </div>
    )
  }

  return (
    <>
      {showCreate && (
        <CreateRoleModal
          roles={roles}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          creating={creating}
        />
      )}
      {confirmDelete && (
        <ConfirmDeleteModal
          role={confirmDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(null)}
          deleting={deleting}
        />
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Roles &amp; permissions</h2>
            <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
              Control what each role can see and do across your workspace.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="h-8 px-3 rounded-lg bg-[#6366F1] hover:bg-[#5558E8] text-white text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus size={13} /> New role
          </button>
        </div>

        <div className="bg-white dark:bg-[#1C1E2D] border border-[#EAECF0] dark:border-[#26283A] rounded-xl flex overflow-hidden min-h-[520px]">
          {/* Role list sidebar */}
          <div className="w-52 shrink-0 border-r border-[#F2F4F7] dark:border-[#26283A] flex flex-col">
            {systemRoles.length > 0 && (
              <>
                <div className="px-3 pt-3 pb-1.5">
                  <p className="text-[10.5px] font-semibold text-[#98A2B3] dark:text-[#5A5E78] uppercase tracking-wide">System</p>
                </div>
                {systemRoles.map(role => (
                  <RoleListItem
                    key={role.id}
                    role={role}
                    selected={selectedId === role.id}
                    onSelect={() => setSelectedId(role.id)}
                  />
                ))}
              </>
            )}
            {customRoles.length > 0 && (
              <>
                <div className="px-3 pt-3 pb-1.5">
                  <p className="text-[10.5px] font-semibold text-[#98A2B3] dark:text-[#5A5E78] uppercase tracking-wide">Your roles</p>
                </div>
                {customRoles.map(role => (
                  <RoleListItem
                    key={role.id}
                    role={role}
                    selected={selectedId === role.id}
                    onSelect={() => setSelectedId(role.id)}
                  />
                ))}
              </>
            )}
            {customRoles.length === 0 && (
              <div className="px-3 py-2 text-[11.5px] text-[#D0D5DD] dark:text-[#3A3C4E]">
                No custom roles yet
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedRole ? (
            <RoleDetail role={selectedRole} onDelete={setConfirmDelete} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-[12.5px] text-[#98A2B3]">
              Select a role to view permissions
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function RolesTab() {
  return (
    <PlanGate
      requiredPlan="STUDIO"
      feature="Roles & permissions"
      description="Create custom roles and control exactly what each team member can access across your workspace."
      bullets={[
        'Create unlimited custom roles',
        'Toggle individual permissions per role',
        'Preset roles — Designer, Account Manager, Contractor',
        'Assign roles when inviting team members',
      ]}
    >
      <RolesTabContent />
    </PlanGate>
  )
}

function RoleListItem({
  role,
  selected,
  onSelect,
}: {
  role: WorkspaceRole
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors duration-100',
        selected
          ? 'bg-[#EEF2FF] dark:bg-[#1E1C35]'
          : 'hover:bg-[#F9FAFB] dark:hover:bg-[#1A1C2A]',
      )}
    >
      <div className={cn(
        'w-6 h-6 rounded-lg flex items-center justify-center shrink-0',
        selected ? 'bg-[#6366F1]' : 'bg-[#F2F4F7] dark:bg-[#2A2C3E]',
      )}>
        <Shield size={11} className={selected ? 'text-white' : 'text-[#98A2B3]'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-[12.5px] font-semibold truncate leading-tight',
          selected ? 'text-[#6366F1]' : 'text-[#344054] dark:text-[#C1C5D6]',
        )}>{role.name}</p>
        <p className="text-[11px] text-[#98A2B3] leading-tight">{role._count?.members ?? 0}m</p>
      </div>
      {selected && <ChevronRight size={12} className="text-[#6366F1] shrink-0" />}
    </button>
  )
}
