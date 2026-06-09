import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { User, Building2, Bell, Puzzle, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import ProfileTab from '@/features/settings/components/ProfileTab'
import BusinessTab from '@/features/settings/components/BusinessTab'
import NotificationsTab from '@/features/notifications/components/NotificationsTab'
import IntegrationsTab from '@/features/settings/components/IntegrationsTab'
import PublicProfileTab from '@/features/settings/components/PublicProfileTab'

const TABS = [
  { key: 'profile',       label: 'Profile',        icon: User      },
  { key: 'business',      label: 'Business',       icon: Building2 },
  { key: 'public',        label: 'Public Profile', icon: Globe     },
  { key: 'notifications', label: 'Notifications',  icon: Bell      },
  { key: 'integrations',  label: 'Integrations',   icon: Puzzle    },
] as const

type TabKey = typeof TABS[number]['key']

export default function SettingsPage() {
  const { search }                    = useLocation()
  const [activeTab, setActiveTab]     = useState<TabKey>('profile')

  useEffect(() => {
    const tab = new URLSearchParams(search).get('tab') as TabKey | null
    if (tab && TABS.some(t => t.key === tab)) setActiveTab(tab)
  }, [search])

  return (
    <div className="max-w-[860px] space-y-5">

      <div>
        <h1 className="text-[22px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight">Settings</h1>
        <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-0.5">Manage your profile, business details, and integrations.</p>
      </div>

      <div className="flex gap-1 border-b border-[#EAECF0] dark:border-[#26283A] overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors',
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
      {activeTab === 'public'        && <PublicProfileTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'integrations'  && <IntegrationsTab />}

    </div>
  )
}
