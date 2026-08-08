/**
 * Direct port of the web app's design tokens (Smart-Savor/app/globals.css :root custom
 * properties) into a plain object, so this app carries the same visual identity as the web
 * console/patient pages without a separate design pass.
 */
export const colors = {
  background: "#f6f8fc",
  foreground: "#0f172a",
  card: "#ffffff",
  cardForeground: "#0f172a",
  muted: "#f1f5f9",
  mutedForeground: "#64748b",
  primary: "#1d4ed8",
  primaryStrong: "#1e40af",
  primaryDeep: "#172554",
  primaryForeground: "#ffffff",
  primarySoft: "#dbeafe",
  primaryTint: "#eff6ff",
  accent: "#3b82f6",
  border: "#e2e8f0",
  success: "#047857",
  successSoft: "#d1fae5",
  successTint: "#ecfdf5",
  warning: "#b45309",
  warningSoft: "#fef3c7",
  warningTint: "#fffbeb",
  danger: "#dc2626",
  dangerSoft: "#fee2e2",
  dangerTint: "#fef2f2",
};

export const radius = { card: 16, input: 10, pill: 999 };

export const shadow = {
  card: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  button: {
    shadowColor: "#1d4ed8",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
};

export const chipColors: Record<"blue" | "green" | "amber" | "red" | "ghost", { bg: string; fg: string }> = {
  blue: { bg: colors.primarySoft, fg: colors.primaryStrong },
  green: { bg: colors.successSoft, fg: colors.success },
  amber: { bg: colors.warningSoft, fg: colors.warning },
  red: { bg: colors.dangerSoft, fg: colors.danger },
  ghost: { bg: colors.card, fg: colors.mutedForeground },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
