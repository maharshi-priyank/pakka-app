import { useCallback } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const TOUR_KEY = 'pakka_tour_v1_seen'

export function useOnboardingTour() {
  const startTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      overlayColor: 'rgba(0,0,0,0.55)',
      stagePadding: 6,
      stageRadius: 12,
      popoverClass: 'pakka-tour-popover',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Done',
      steps: [
        {
          popover: {
            title: '👋 Welcome to Clinekt!',
            description: 'Let\'s take a quick 30-second tour so you know exactly where everything is.',
            side: 'over',
            align: 'center',
          },
        },
        {
          element: '#tour-leads',
          popover: {
            title: 'Leads — your pipeline',
            description: 'Add prospects here and track them through your sales stages — from first contact to closed won.',
            side: 'right',
          },
        },
        {
          element: '#tour-proposals',
          popover: {
            title: 'Proposals',
            description: 'Create beautiful, branded proposals and send them to clients with a single link. Track opens and acceptances.',
            side: 'right',
          },
        },
        {
          element: '#tour-contracts',
          popover: {
            title: 'Contracts',
            description: 'Send e-sign ready contracts. Once a client signs, everything is locked and stored here.',
            side: 'right',
          },
        },
        {
          element: '#tour-invoices',
          popover: {
            title: 'Invoices',
            description: 'Generate GST-compliant invoices and collect payments via Razorpay — directly from Clinekt.',
            side: 'right',
          },
        },
        {
          element: '#tour-clients',
          popover: {
            title: 'Clients',
            description: 'All your clients in one place, with their full history — proposals, contracts, invoices, and meetings.',
            side: 'right',
          },
        },
        {
          element: '#tour-settings',
          popover: {
            title: 'Settings',
            description: "Add your business name, logo, GST number, and bank details here — they'll auto-fill into all your documents.",
            side: 'right',
          },
        },
        {
          popover: {
            title: "You're all set! 🚀",
            description: 'Start by adding your first lead. The whole workflow — proposal → contract → invoice — flows from there.',
            side: 'over',
            align: 'center',
          },
        },
      ],
      onDestroyed: () => {
        localStorage.setItem(TOUR_KEY, 'true')
      },
    })

    driverObj.drive()
  }, [])

  const startIfFirstVisit = useCallback(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      // Small delay so the layout has rendered
      setTimeout(startTour, 800)
    }
  }, [startTour])

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_KEY)
    startTour()
  }, [startTour])

  return { startTour, startIfFirstVisit, resetTour }
}
