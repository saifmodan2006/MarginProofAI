export const BASE = "/api/v1";
export async function api<T = any>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(BASE + path, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    let detail;
    try {
      const body = await response.json();
      detail = body.error?.message || body.detail || body;
    } catch {
      detail = response.statusText;
    }
    throw new Error(
      typeof detail === "string" ? detail : JSON.stringify(detail),
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export function money(value: unknown, currency = "USD") {
  if (value === null || value === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}
export function percent(value: unknown) {
  return value === null || value === undefined
    ? "N/A"
    : `${Number(value).toFixed(1)}%`;
}
export const label = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
export type Finding = {
  id: string;
  title: string;
  category: string;
  severity: string;
  confidence: string;
  amount: string | null;
  currency: string;
  status: string;
  description: string;
  next_action: string;
  owner: string | null;
  evidence: Record<string, any>[];
  discovered_at: string;
  recalculated_at: string;
};
