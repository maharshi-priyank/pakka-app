import { createBrowserRouter, Navigate, Outlet, useParams } from 'react-router-dom'

function RedirectClientsDetail() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/contacts/${id}`} replace />
}
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
  // ── Billing return pages (no auth shell, but user should be logged in) ───────
  {
    path: '/billing/success',
    lazy: async () => {
      const { default: Component } = await import('@/pages/app/BillingSuccessPage')
      return { Component }
    },
  },
  {
    path: '/billing/cancelled',
    lazy: async () => {
      const { default: Component } = await import('@/pages/app/BillingCancelPage')
      return { Component }
    },
  },
  // ── Accept team invite (public — handles both authed and unauthed states) ────
  {
    path: '/accept-invite',
    lazy: async () => {
      const { default: Component } = await import('@/pages/app/AcceptInvitePage')
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
            path: '/lead-capture',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/LeadCapturePage')
              return { Component }
            },
          },
          {
            path: '/contacts',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ContactsPage')
              return { Component }
            },
          },
          {
            path: '/contacts/:id',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ContactPage')
              return { Component }
            },
          },
          {
            path: '/pipeline',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/PipelinePage')
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
            element: <RedirectClientsDetail />,
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
            path: '/tasks',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/TasksPage')
              return { Component }
            },
          },
          {
            path: '/tasks/task-boards',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/TaskBoardsPage')
              return { Component }
            },
          },
          {
            path: '/tasks/task-boards/:boardId',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/TaskBoardsPage')
              return { Component }
            },
          },
          {
            path: '/tasks/task-boards/:boardId/:taskId',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/TaskBoardsPage')
              return { Component }
            },
          },
          {
            path: '/tasks/:taskId',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/TasksPage')
              return { Component }
            },
          },
          {
            path: '/inbox',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/InboxPage')
              return { Component }
            },
          },
          {
            path: '/projects/:id/tasks',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ProjectPage')
              return { Component }
            },
          },
          {
            path: '/projects/:id/tasks/task-boards',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ProjectPage')
              return { Component }
            },
          },
          {
            path: '/projects/:id/tasks/task-boards/:boardId',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ProjectPage')
              return { Component }
            },
          },
          {
            path: '/projects/:id/tasks/task-boards/:boardId/:taskId',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ProjectPage')
              return { Component }
            },
          },
          {
            path: '/projects/:id/tasks/:taskId',
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
