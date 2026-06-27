declare class Razorpay {
  constructor(options: Record<string, unknown>)
  open(): void
}

interface Window {
  Razorpay: typeof Razorpay
}
