/**
 * Pricing configuration for minute packages and Stripe Checkout.
 * Edit this file to change amounts, packages, or admin pricing.
 *
 * - currency: Stripe currency code (e.g. "dkk", "eur", "usd").
 *   Stripe expects amounts in the smallest unit: øre for DKK, cents for EUR/USD (price × 100).
 * - adminPrice: Price in the main currency unit (e.g. DKK) for the admin email.
 * - adminEmail: Email that receives the admin price.
 * - currencyDisplay: Suffix shown in the UI (e.g. "kr." for "35 kr.").
 * - packages: id (must match /api/checkout), minutes, price (in main unit).
 */
export const PRICING_CONFIG = {
  currency: "dkk",
  adminPrice: 2,
  adminEmail: "admin@admitted.dk",
  currencyDisplay: "kr.",
  packages: [
    { id: "small", minutes: 30, price: 5 },
    { id: "medium", minutes: 60, price: 10 },
    { id: "large", minutes: 120, price: 20 },
  ],
} as const;
