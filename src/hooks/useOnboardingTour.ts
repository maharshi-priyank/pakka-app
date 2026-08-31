import { useCallback } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const TOUR_KEY = 'clearwork_tour_v1_seen'

declare global {
  interface Window {
    _cwStartExtended?: () => void
  }
}

export function useOnboardingTour() {
  const startExtendedTour = useCallback(() => {
    const extDriver = driver({
      showProgress: true,
      popoverClass: 'pakka-tour-popover',
      steps: [
        {
          element: '#tour-projects',
          popover: {
            title: 'Projects',
            description: 'Organise client work into projects with tasks, timelines, and milestones.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-tasks',
          popover: {
            title: 'Tasks',
            description: 'Your personal task board — across all projects and standalone work.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-inbox',
          popover: {
            title: 'Inbox',
            description: 'Messages and notifications from clients and your team in one place.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-timelog',
          popover: {
            title: 'Time Log',
            description: 'Track billable hours and export to invoices with one click.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-expenses',
          popover: {
            title: 'Expenses',
            description: 'Log and categorise business expenses. Attach receipts and tag projects.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-reports',
          popover: {
            title: 'Reports',
            description: 'Revenue trends, outstanding invoices, and client performance — all in one view.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-calendar',
          popover: {
            title: 'Calendar',
            description: 'Schedule meetings and deadlines. Sync with Google or Apple Calendar.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-forms',
          popover: {
            title: 'Forms',
            description: 'Collect client briefs, feedback, or intake information — no third-party tools needed.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-automations',
          popover: {
            title: 'Automations',
            description: 'Set up triggers to handle repetitive tasks — follow-ups, reminders, and status updates.',
            side: 'right',
            align: 'start',
          },
        },
        {
          popover: {
            title: "You know the whole app",
            description: "Welcome aboard. Everything you need to run your freelance business is right here.",
            side: 'over',
            align: 'center',
          },
        },
      ],
      onDestroyed: () => {
        localStorage.setItem(TOUR_KEY, 'true')
        delete window._cwStartExtended
      },
    })
    extDriver.drive()
  }, [])

  const startTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      popoverClass: 'pakka-tour-popover',
      steps: [
        {
          popover: {
            title: 'Welcome to ClearWork',
            description: "Let's show you where everything lives. Takes about 90 seconds.",
            side: 'over',
            align: 'center',
          },
        },
        {
          element: '#tour-dashboard',
          popover: {
            title: 'Dashboard',
            description: 'Your business at a glance — revenue, activity, and what needs attention.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-leads',
          popover: {
            title: 'Leads',
            description: 'Track every prospect in your pipeline before they become a client.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-contacts',
          popover: {
            title: 'Contacts',
            description: 'Everyone you have worked with — clients, collaborators, and vendors.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-proposals',
          popover: {
            title: 'Proposals',
            description: 'Send polished proposals and track opens, views, and acceptances.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-contracts',
          popover: {
            title: 'Contracts',
            description: 'E-sign agreements in minutes. No PDFs, no chasing.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-invoices',
          popover: {
            title: 'Invoices',
            description: 'GST-ready invoices with UPI payment links built in.',
            side: 'right',
            align: 'start',
          },
        },
        {
          popover: {
            title: "That's the core",
            description: `
              <p style="margin:0 0 12px">You now know where the essentials live.</p>
              <button
                id="cw-tour-explore"
                style="
                  display:inline-flex;align-items:center;gap:6px;
                  padding:7px 14px;border-radius:8px;border:1.5px solid #6366F1;
                  background:transparent;color:#6366F1;font-size:13px;font-weight:600;
                  cursor:pointer;transition:background 0.15s,color 0.15s;
                "
                onmouseover="this.style.background='#6366F1';this.style.color='#fff'"
                onmouseout="this.style.background='transparent';this.style.color='#6366F1'"
              >
                Explore all features →
              </button>
            `,
            side: 'over',
            align: 'center',
          },
        },
      ],
      onHighlighted: (_element, _step, opts) => {
        if (opts.state.activeIndex !== 7) return
        setTimeout(() => {
          const btn = document.getElementById('cw-tour-explore')
          if (btn) {
            btn.addEventListener('click', () => {
              driverObj.destroy()
              startExtendedTour()
            }, { once: true })
          }
        }, 0)
      },
      onDestroyed: () => {
        localStorage.setItem(TOUR_KEY, 'true')
        delete window._cwStartExtended
      },
    })

    window._cwStartExtended = startExtendedTour
    driverObj.drive()
  }, [startExtendedTour])

  const startIfFirstVisit = useCallback(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      setTimeout(startTour, 800)
    }
  }, [startTour])

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_KEY)
    startTour()
  }, [startTour])

  return { startTour, startIfFirstVisit, resetTour }
}
