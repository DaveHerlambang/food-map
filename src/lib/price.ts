// No imports: unit-tested with `node --test`.

/** google.type.Money as the Places API (New) returns it (units is a string). */
export type GoogleMoney = { currencyCode?: string; units?: string | number; nanos?: number }

export type PriceRange = { min: number | null; max: number | null; currency: string }

/**
 * Google's price level as 1–4 (shown as $–$$$$). FREE and UNSPECIFIED are null:
 * a restaurant is never "free", and "unknown" is not a price.
 */
export function levelFromGoogle(value: string | null | undefined): number | null {
  switch (value) {
    case "PRICE_LEVEL_INEXPENSIVE":
      return 1
    case "PRICE_LEVEL_MODERATE":
      return 2
    case "PRICE_LEVEL_EXPENSIVE":
      return 3
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return 4
    default:
      return null
  }
}

export function moneyToNumber(money: GoogleMoney | null | undefined): number | null {
  if (!money) return null
  const hasUnits = money.units !== undefined && money.units !== null && money.units !== ""
  const hasNanos = typeof money.nanos === "number"
  if (!hasUnits && !hasNanos) return null
  const units = hasUnits ? Number(money.units) : 0
  if (!Number.isFinite(units)) return null
  return units + (hasNanos ? (money.nanos as number) / 1e9 : 0)
}

/** Google's priceRange (start inclusive, end optional) → our PriceRange. */
export function parseGoogleRange(
  range: { startPrice?: GoogleMoney; endPrice?: GoogleMoney } | null | undefined,
): PriceRange | null {
  if (!range) return null
  const min = moneyToNumber(range.startPrice)
  const max = moneyToNumber(range.endPrice)
  const currency = range.startPrice?.currencyCode ?? range.endPrice?.currencyCode
  if ((min === null && max === null) || !currency) return null
  return { min, max, currency }
}

/** 1 → "$", 4 → "$$$$"; anything else → null. */
export function dollars(level: number | null | undefined): string | null {
  return typeof level === "number" && Number.isInteger(level) && level >= 1 && level <= 4
    ? "$".repeat(level)
    : null
}

/** "RP 25.000–150.000", "RP 75.000+", "UP TO RP 100.000", "USD 10–20". */
export function formatPriceRange(range: PriceRange): string {
  const sep = range.currency === "IDR" ? "." : ","
  const num = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, sep)
  const prefix = range.currency === "IDR" ? "RP " : `${range.currency} `
  if (range.min !== null && range.max !== null) return `${prefix}${num(range.min)}–${num(range.max)}`
  if (range.min !== null) return `${prefix}${num(range.min)}+`
  return `UP TO ${prefix}${num(range.max ?? 0)}`
}
