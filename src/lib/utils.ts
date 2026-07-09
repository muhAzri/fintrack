import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/// Title-case a display name: "muhammad azri" -> "Muhammad Azri". Leaves email
/// addresses untouched (a name shown as a fallback email stays literal).
export function titleCase(value: string): string {
  if (value.includes("@")) return value;
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(" ");
}
