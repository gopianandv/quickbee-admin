// config.defs.ts

export type ConfigType = "boolean" | "number" | "enum" | "json" | "stringArray";

export type ConfigDef = {
  key: string;
  label: string;
  group:
    | "Platform Fee"
    | "Cashout"
    | "KYC"
    | "Ratings"
    // | "Notifications"   ❌ removed (ENV-managed)
    | "Other";
  type: ConfigType;
  help?: string;
  danger?: boolean;

  min?: number;
  max?: number;
  step?: number;

  enumValues?: string[];

  defaultValue?: any;
};

export const CONFIG_DEFS: ConfigDef[] = [
  // Platform Fee
  {
    key: "platformFee.appPercent",
    label: "APP Fee %",
    group: "Platform Fee",
    type: "number",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 10,
    help: "Platform fee % for APP tasks (0–100).",
  },
  {
    key: "platformFee.cashPercent",
    label: "CASH Fee %",
    group: "Platform Fee",
    type: "number",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 10,
    help: "Platform fee % for CASH tasks (0–100).",
  },
  {
    key: "platformFee.payer",
    label: "Fee payer",
    group: "Platform Fee",
    type: "enum",
    enumValues: ["HELPER", "CONSUMER"],
    defaultValue: "HELPER",
    help: "Who pays platform fee.",
    danger: true,
  },
  {
    key: "platformFee.ledgerEnabled",
    label: "Ledger enabled",
    group: "Platform Fee",
    type: "boolean",
    defaultValue: true,
    help: "Whether PlatformFeeLedger is enabled.",
    danger: true,
  },

  // Cashout
  {
    key: "cashout.enabled",
    label: "Cashout enabled",
    group: "Cashout",
    type: "boolean",
    defaultValue: true,
  },
  {
    key: "cashout.minAmountPaise",
    label: "Min cashout (paise)",
    group: "Cashout",
    type: "number",
    min: 0,
    max: 10_00_00_000,
    step: 100,
    defaultValue: 5000,
    help: "₹50 = 5000 paise.",
  },
  {
    key: "cashout.allowedRoles",
    label: "Allowed roles",
    group: "Cashout",
    type: "stringArray",
    defaultValue: ["helper", "consumer"],
    help: "Roles allowed to request cashout.",
  },

  // KYC
  {
    key: "kyc.required",
    label: "KYC required",
    group: "KYC",
    type: "boolean",
    defaultValue: true,
    danger: true,
  },

  // Ratings risk
  {
    key: "ratingRisk.threshold",
    label: "Risk threshold",
    group: "Ratings",
    type: "number",
    min: 1,
    max: 5,
    step: 0.1,
    defaultValue: 3.5,
    help: "Below this average rating → watchlist risk.",
  },
  {
    key: "ratingRisk.minReviews",
    label: "Min reviews",
    group: "Ratings",
    type: "number",
    min: 0,
    max: 10_000,
    step: 1,
    defaultValue: 3,
    help: "Minimum reviews before risk applies.",
  },
  {
    key: "ratingRisk.windowDays",
    label: "Window (days)",
    group: "Ratings",
    type: "number",
    min: 1,
    max: 3650,
    step: 1,
    defaultValue: 60,
    help: "Lookback window for ratings risk rules (days).",
  },

  // (Notifications removed — ENV-managed)
];

export function getConfigDef(key: string) {
  return CONFIG_DEFS.find((d) => d.key === key) || null;
}
