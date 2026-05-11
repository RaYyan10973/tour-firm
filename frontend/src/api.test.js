import { describe, expect, it, vi } from "vitest";

import { api } from "./api";

describe("api client", () => {
  it("adds Authorization header when token provided", async () => {
    const fetchMock = vi.fn(async (url, options) => {
      return {
        ok: true,
        json: async () => ({ url, headers: options.headers }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const data = await api.me("TOKEN123");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(data.headers.Authorization).toBe("Bearer TOKEN123");

    vi.unstubAllGlobals();
  });

  it("throws server detail when response not ok", async () => {
    const fetchMock = vi.fn(async () => {
      return {
        ok: false,
        json: async () => ({ detail: "Invalid credentials" }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.login({ username: "x", password: "y" })).rejects.toThrow("Invalid credentials");

    vi.unstubAllGlobals();
  });
});

