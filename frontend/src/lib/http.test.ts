import { http as mswHttp, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/store";
import { http } from "@/lib/http";
import { resetDb } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";

function setExpiredSession() {
  useAuthStore.setState({
    user: null,
    accessToken: "expired-token",
    refreshToken: "refresh-2",
    isAuthenticated: true,
  });
}

describe("http refresh interceptor", () => {
  beforeEach(() => {
    resetDb();
  });

  it("retries the original request after refreshing an expired access token", async () => {
    setExpiredSession();

    const response = await http.get("/me");

    expect(response.status).toBe(200);
    expect(response.data.id).toBe(2);
    expect(useAuthStore.getState().accessToken).toBe("access-2");
  });

  it("dedupes concurrent refresh requests behind a single call", async () => {
    setExpiredSession();
    let refreshCalls = 0;
    server.use(
      mswHttp.post("/api/v1/auth/refresh", () => {
        refreshCalls += 1;
        return HttpResponse.json({ access_token: "access-2" });
      }),
    );

    const [first, second] = await Promise.all([http.get("/me"), http.get("/me")]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(refreshCalls).toBe(1);
  });

  it("allows a new refresh cycle once the previous one finished", async () => {
    setExpiredSession();
    await http.get("/me");
    expect(useAuthStore.getState().accessToken).toBe("access-2");

    useAuthStore.setState({ accessToken: "expired-again" });
    let secondCycleRefreshCalls = 0;
    server.use(
      mswHttp.post("/api/v1/auth/refresh", () => {
        secondCycleRefreshCalls += 1;
        return HttpResponse.json({ access_token: "access-2" });
      }),
    );

    const response = await http.get("/me");

    expect(response.status).toBe(200);
    expect(secondCycleRefreshCalls).toBe(1);
  });

  describe("when the refresh token itself is invalid", () => {
    beforeEach(() => {
      vi.stubGlobal("location", {
        href: "http://localhost/events/1",
        search: "",
        pathname: "/events/1",
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("forces logout and redirects to /login without retrying", async () => {
      useAuthStore.setState({
        user: null,
        accessToken: "expired-token",
        refreshToken: "not-a-real-refresh-token",
        isAuthenticated: true,
      });

      await expect(http.get("/me")).rejects.toMatchObject({
        response: { status: 401 },
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(window.location.href).toContain("/login?redirect=");
    });
  });
});

describe("http request interceptor", () => {
  it("does not attach an Authorization header to /auth/login", async () => {
    resetDb();
    useAuthStore.setState({
      user: null,
      accessToken: "some-leftover-token",
      refreshToken: null,
      isAuthenticated: false,
    });

    const spy = vi.fn();
    server.use(
      mswHttp.post("/api/v1/auth/login", async ({ request }) => {
        spy(request.headers.get("Authorization"));
        return HttpResponse.json({ access_token: "a", refresh_token: "r" });
      }),
    );

    await http.post("/auth/login", { email: "x@example.com", password: "x" });

    expect(spy).toHaveBeenCalledWith(null);
  });

  it("does not force a logout when /auth/login itself returns 401", async () => {
    resetDb();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });

    await expect(
      http.post("/auth/login", {
        email: "organizador@example.com",
        password: "WrongPassword",
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
