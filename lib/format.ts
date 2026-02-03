/**
 * Shared formatting utilities for the application
 */

/**
 * Format currency amount in SDG
 */
export function formatCurrencySDG(amount?: number | null): string {
  const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `${val.toLocaleString("en-US")} SDG`;
}

/**
 * Format date with contextual labels (Today, Yesterday, etc.)
 */
export function formatDateLabel(date: string): string {
  if (!date) return "";
  const today = new Date();
  const d = new Date(date + "T00:00:00Z");
  const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return `اليوم - ${date}`;
  if (diffDays === 1) return `أمس - ${date}`;
  return date;
}

/**
 * Get initials from a full name (Arabic-safe): first letters of first two words
 */
export function getInitials(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .substring(0, 2);
}