import { afterEach, describe, expect, it, vi } from "vitest";
import { api, money, percent } from "./api";
afterEach(() => vi.unstubAllGlobals());
describe("financial presentation", () => {
  it("keeps missing coverage distinct from zero", () => {
    expect(money(null)).toBe("N/A");
    expect(money(undefined)).toBe("N/A");
    expect(money("0")).toBe("$0.00");
    expect(percent(null)).toBe("N/A");
    expect(percent("0")).toBe("0.0%");
  });
  it("formats only the specified currency without conversion", () => {
    expect(money("1200", "USD")).toBe("$1,200.00");
    expect(money("1200", "EUR")).toBe("€1,200.00");
    expect(percent("-7.25")).toBe("-7.3%");
  });
});
describe("API error recovery", () => {
  it("exposes a backend validation error instead of an empty failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { message: "Duplicate import" } }),
            { status: 409 },
          ),
        ),
    );
    await expect(api("/imports/commit", { method: "POST" })).rejects.toThrow(
      "Duplicate import",
    );
  });
  it("supports empty successful responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    await expect(
      api("/datasets/example", { method: "DELETE" }),
    ).resolves.toBeUndefined();
  });
});
