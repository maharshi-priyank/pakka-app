import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { generateInitials } from '@/lib/utils'
import { LogOut } from 'lucide-react'

export default function Topbar() {
  const { user } = useAuthStore()

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-end px-6 gap-3">
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <LogOut size={15} />
        Sign out
      </button>

      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
        {generateInitials(user?.user_metadata?.name ?? user?.email ?? 'U')}
      </div>
    </header>
  )
}
