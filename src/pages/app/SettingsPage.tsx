import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { User, Building2, Bell, Puzzle, Globe, MessageCircle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import ProfileTab from '@/features/settings/components/ProfileTab'
import BusinessTab from '@/features/settings/components/BusinessTab'
import NotificationsTab from '@/features/notifications/components/NotificationsTab'
import IntegrationsTab from '@/features/settings/components/IntegrationsTab'
import PublicProfileTab from '@/features/settings/components/PublicProfileTab'
import CommunicationTab from '@/features/settings/components/CommunicationTab'
import TeamTab from '@/features/team/components/TeamTab'
import { useWorkspacePermissions } from '@/features/settings/hooks/useWorkspacePermissions'
import { Permission } from '@/types/permissions'

const TAB_DEFS = [
  { key: 'profile'       as const, label: 'Profile',        icon: User,           permission: null },
  { key: 'business'      as const, label: 'Business',       icon: Building2,      permission: null },
  { key: 'public'        as const, label: 'Public Profile', icon: Globe,          permission: null },
  { key: 'notifications' as const, label: 'Notifications',  icon: Bell,           permission: null },
  { key: 'integrations'  as const, label: 'Integrations',   icon: Puzzle,         permission: Permission.MANAGE_INTEGRATIONS },
  { key: 'communication' as const, label: 'Communication',  icon: MessageCircle,  permission: null },
  { key: 'team'          as const, label: 'Team',           icon: Users,          permission: Permission.MANAGE_MEMBERS },
]

type TabKey = typeof TAB_DEFS[number]['key']

export default function SettingsPage() {
  const { search }                    = useLocation()
  const [activeTab, setActiveTab]     = useState<TabKey>('profile')

  const { hasPermission } = useWorkspacePermissions()
  const visibleTabs = TAB_DEFS.filter(t => !t.permission || hasPermission(t.permission))

  useEffect(() => {
    const tab = new URLSearchParams(search).get('tab') as TabKey | null
    if (tab && visibleTabs.some(t => t.key === tab)) setActiveTab(tab)
  }, [search])

  return (
    <div className="max-w-[860px] space-y-5">

      <div>
        <h1 className="text-[22px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight">Settings</h1>
        <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-0.5">Manage your profile, business details, and integrations.</p>
      </div>

      <div className="flex gap-1 border-b border-[#EAECF0] dark:border-[#26283A] overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
        {visibleTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === key
                ? 'border-[#6366F1] text-[#6366F1]'
                : 'border-transparent text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
            )}
          >
            <Icon size={14} strokeWidth={2.5} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'profile'       && <ProfileTab />}
      {activeTab === 'business'      && <BusinessTab />}
      {activeTab === 'public'         && <PublicProfileTab />}
      {activeTab === 'notifications'  && <NotificationsTab />}
      {activeTab === 'integrations'   && <IntegrationsTab />}
      {activeTab === 'communication'  && <CommunicationTab />}
      {activeTab === 'team'           && <TeamTab />}

    </div>
  )
}
