import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPublic } from "@/lib/ingest/http";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("public HTTP redirects", () => {
  it("removes authorization but keeps other headers across origins", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://93.184.216.35/next" } }))
      .mockResolvedValueOnce(new Response("ok"));

    await fetchPublic("https://93.184.216.34/start", {
      headers: { authorization: "Bearer test-secret", "x-trace": "keep" },
    });

    const headers = new Headers(fetchMock.mock.calls[1][1].headers);
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("x-trace")).toBe("keep");
  });

  it("keeps authorization for same-origin redirects", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/next" } }))
      .mockResolvedValueOnce(new Response("ok"));

    await fetchPublic("https://93.184.216.34/start", {
      headers: { authorization: "Bearer test-secret" },
    });

    const headers = new Headers(fetchMock.mock.calls[1][1].headers);
    expect(headers.get("authorization")).toBe("Bearer test-secret");
  });
});
