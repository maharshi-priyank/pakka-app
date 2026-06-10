declare module '@cashfreepayments/cashfree-js' {
  interface CashfreeInstance {
    subscriptionsCheckout(options: { subsSessionId: string }): Promise<unknown>
  }
  export function load(options: { mode: 'sandbox' | 'production' }): Promise<CashfreeInstance>
}
