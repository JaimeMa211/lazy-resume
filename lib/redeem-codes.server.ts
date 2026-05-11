import "server-only";

import type { AccountPlan } from "@/lib/auth-client";

export type RedeemCodeEntry = {
  plan: AccountPlan;
  description: string;
};

type RedeemCodeMap = Record<string, RedeemCodeEntry>;

function isAccountPlan(value: unknown): value is AccountPlan {
  return value === "free" || value === "monthly" || value === "yearly" || value === "buyout";
}

function normalizeRedeemCodes(input: unknown): RedeemCodeMap {
  if (!input || typeof input !== "object") {
    return {};
  }

  const entries = Object.entries(input as Record<string, unknown>);

  return Object.fromEntries(
    entries.flatMap(([rawCode, rawEntry]) => {
      if (!rawCode || typeof rawCode !== "string" || !rawEntry || typeof rawEntry !== "object") {
        return [];
      }

      const code = rawCode.trim().toUpperCase();
      const plan = (rawEntry as { plan?: unknown }).plan;
      const description = (rawEntry as { description?: unknown }).description;

      if (!code || !isAccountPlan(plan) || typeof description !== "string" || !description.trim()) {
        return [];
      }

      return [[code, { plan, description: description.trim() }] satisfies [string, RedeemCodeEntry]];
    }),
  );
}

function parseRedeemCodesFromEnv(): RedeemCodeMap {
  const raw = process.env.REDEEM_CODES_JSON;

  if (!raw) {
    return {};
  }

  try {
    return normalizeRedeemCodes(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

export function verifyRedeemCode(code: string): RedeemCodeEntry | null {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  const redeemCodes = parseRedeemCodesFromEnv();
  return redeemCodes[normalized] ?? null;
}
