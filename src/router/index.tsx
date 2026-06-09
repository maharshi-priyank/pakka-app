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
  if (session) return <Navigate to="/dashboard" replace />

  return <Outlet />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
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
  // ── Intake form (no auth required) ────────────────────────────────────────
  {
    path: '/q/:token',
    lazy: async () => {
      const { default: Component } = await import('@/pages/public/IntakeFormPage')
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
  // ── Public freelancer profile (no auth required) ────────────────────────────
  {
    path: '/u/:username',
    lazy: async () => {
      const { default: Component } = await import('@/pages/public/PublicProfilePage')
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
            path: '/dashboard',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/DashboardPage')
              return { Component }
            },
          },
          {
            path: '/leads',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/LeadsPage')
              return { Component }
            },
          },
          {
            path: '/proposals',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ProposalsPage')
              return { Component }
            },
          },
          {
            path: '/proposals/new',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ProposalEditorPage')
              return { Component }
            },
          },
          {
            path: '/proposals/:id',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ProposalEditorPage')
              return { Component }
            },
          },
          {
            path: '/proposals/templates/:id/edit',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/TemplateEditorPage')
              return { Component }
            },
          },
          {
            path: '/contracts',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ContractsPage')
              return { Component }
            },
          },
          {
            path: '/contracts/new',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ContractEditorPage')
              return { Component }
            },
          },
          {
            path: '/contracts/:id',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ContractEditorPage')
              return { Component }
            },
          },
          {
            path: '/invoices',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/InvoicesPage')
              return { Component }
            },
          },
          {
            path: '/invoices/new',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/InvoiceEditorPage')
              return { Component }
            },
          },
          {
            path: '/invoices/:id',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/InvoiceEditorPage')
              return { Component }
            },
          },
          {
            path: '/clients',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ClientsPage')
              return { Component }
            },
          },
          {
            path: '/clients/:id',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ClientPage')
              return { Component }
            },
          },
          {
            path: '/calendar',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/CalendarPage')
              return { Component }
            },
          },
          {
            path: '/meetings',
            element: <Navigate to="/calendar" replace />,
          },
          {
            path: '/forms',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/FormsPage')
              return { Component }
            },
          },
          {
            path: '/forms/:id',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/FormBuilderPage')
              return { Component }
            },
          },
          {
            path: '/automations',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/AutomationsPage')
              return { Component }
            },
          },
          {
            path: '/automations/:id',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/WorkflowBuilderPage')
              return { Component }
            },
          },
          {
            path: '/reports',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ReportsPage')
              return { Component }
            },
          },
          {
            path: '/time',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/TimePage')
              return { Component }
            },
          },
          {
            path: '/expenses',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ExpensesPage')
              return { Component }
            },
          },
          {
            path: '/settings',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/SettingsPage')
              return { Component }
            },
          },
          {
            path: '/projects',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ProjectsPage')
              return { Component }
            },
          },
          {
            path: '/projects/:id',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ProjectPage')
              return { Component }
            },
          },
          {
            path: '/email-templates',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/EmailTemplatesPage')
              return { Component }
            },
          },
        ],
      },
    ],
  },
])
