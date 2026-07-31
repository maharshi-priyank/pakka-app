// Shared symbol/prefix map for the 5-currency set every document type
// (Contact, Proposal, Contract, Invoice) validates against. Mirrors the
// inline map InvoiceEditor.tsx already used before this feature (AED has no
// single-glyph symbol in common use, so the 3-letter code is used as a
// prefix, matching InvoiceEditor's existing convention).
export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
}

export function currencySymbol(currency: string | null | undefined): string {
  if (!currency) return CURRENCY_SYMBOLS.INR
  return CURRENCY_SYMBOLS[currency] ?? currency
}
