import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number with a sign prefix (+/-) and locale formatting.
 * @param value - The number to format
 * @param options - Optional Intl.NumberFormat options
 * @returns Formatted string with sign prefix
 */
export function formatSignedNumber(value: number, options?: Intl.NumberFormatOptions): string {
  const formatted = value.toLocaleString(undefined, options);
  return value > 0 ? `+${formatted}` : formatted;
}

/**
 * Returns the appropriate Tailwind color class based on whether a value is positive or negative.
 * @param value - The number to check
 * @param positiveClass - Class to use for positive values (default: 'text-positive')
 * @param negativeClass - Class to use for negative values (default: 'text-negative')
 * @param zeroClass - Class to use for zero (default: same as positiveClass)
 * @returns Tailwind color class string
 */
export function getSignColor(
  value: number,
  positiveClass = 'text-positive',
  negativeClass = 'text-negative',
  zeroClass?: string
): string {
  if (value === 0) return zeroClass ?? positiveClass;
  return value > 0 ? positiveClass : negativeClass;
}
