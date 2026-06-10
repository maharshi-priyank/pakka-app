declare module '@cashfreepayments/cashfree-js' {
  interface CashfreeInstance {
    subscriptions(options: { subscriptionSessionId: string }): void
  }
  export function load(options: { mode: 'sandbox' | 'production' }): Promise<CashfreeInstance>
}
