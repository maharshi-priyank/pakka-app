import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import AppShell from '@/components/layout/AppShell'

function ProtectedRoute() {
  const { session, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function PublicRoute() {
  const { session, isLoading } = useAuthStore()

  if (isLoading) return null
  if (session) return <Navigate to="/app/dashboard" replace />

  return <Outlet />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/app/dashboard" replace />,
  },
  {
    element: <PublicRoute />,
    children: [
      {
        path: '/login',
        lazy: async () => {
          const { default: Component } = await import('@/pages/auth/LoginPage')
          return { Component }
        },
      },
      {
        path: '/signup',
        lazy: async () => {
          const { default: Component } = await import('@/pages/auth/SignupPage')
          return { Component }
        },
      },
    ],
  },
  // ── Public proposal view (no auth required) ────────────────────────────────
  {
    path: '/p/:slug',
    lazy: async () => {
      const { default: Component } = await import('@/pages/public/ProposalViewPage')
      return { Component }
    },
  },
  // ── Public contract signing (no auth required) ─────────────────────────────
  {
    path: '/sign/:id',
    lazy: async () => {
      const { default: Component } = await import('@/pages/public/ContractSignPage')
      return { Component }
    },
  },
  // ── Public invoice view (no auth required) ─────────────────────────────────
  {
    path: '/invoice/:id',
    lazy: async () => {
      const { default: Component } = await import('@/pages/public/InvoiceViewPage')
      return { Component }
    },
  },
  // ── Client portal (no auth required) ───────────────────────────────────────
  {
    path: '/portal/:token',
    lazy: async () => {
      const { default: Component } = await import('@/pages/public/ClientPortalPage')
      return { Component }
    },
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/app/dashboard',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/DashboardPage')
              return { Component }
            },
          },
          {
            path: '/app/leads',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/LeadsPage')
              return { Component }
            },
          },
          {
            path: '/app/proposals',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ProposalsPage')
              return { Component }
            },
          },
          {
            path: '/app/proposals/new',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ProposalEditorPage')
              return { Component }
            },
          },
          {
            path: '/app/proposals/:id',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ProposalEditorPage')
              return { Component }
            },
          },
          {
            path: '/app/contracts',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ContractsPage')
              return { Component }
            },
          },
          {
            path: '/app/contracts/new',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ContractEditorPage')
              return { Component }
            },
          },
          {
            path: '/app/contracts/:id',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ContractEditorPage')
              return { Component }
            },
          },
          {
            path: '/app/invoices',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/InvoicesPage')
              return { Component }
            },
          },
          {
            path: '/app/invoices/new',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/InvoiceEditorPage')
              return { Component }
            },
          },
          {
            path: '/app/invoices/:id',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/InvoiceEditorPage')
              return { Component }
            },
          },
          {
            path: '/app/clients',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ClientsPage')
              return { Component }
            },
          },
          {
            path: '/app/clients/:id',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ClientPage')
              return { Component }
            },
          },
          {
            path: '/app/meetings',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/MeetingsPage')
              return { Component }
            },
          },
          {
            path: '/app/settings',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/SettingsPage')
              return { Component }
            },
          },
        ],
      },
    ],
  },
])
