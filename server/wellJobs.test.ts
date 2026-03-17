import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module so tests don't need a real database
vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  return actual;
});

vi.mock("./db", () => ({
  getAllWellJobs: vi.fn().mockResolvedValue([
    {
      id: 1,
      serviceLine: "coiled-tubing",
      platform: "Platform A",
      wellNumber: "A-01",
      jobType: "Cleanout / Milling",
      jobDate: "2026-01-15",
      productionBefore: 320,
      productionAfter: 580,
      production30Days: 540,
      status: "Successful",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  createWellJob: vi.fn().mockImplementation(async (data) => ({
    id: 99,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  updateWellJob: vi.fn().mockImplementation(async (id, data) => ({
    id,
    serviceLine: "coiled-tubing",
    platform: "Platform A",
    wellNumber: "A-01",
    jobType: "Cleanout / Milling",
    jobDate: "2026-01-15",
    productionBefore: 320,
    productionAfter: 580,
    production30Days: 540,
    status: "Successful",
    notes: null,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  deleteWellJob: vi.fn().mockResolvedValue({ success: true }),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("wellJobs router", () => {
  it("list returns all jobs", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.wellJobs.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].platform).toBe("Platform A");
  });

  it("create saves a new job", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.wellJobs.create({
      serviceLine: "wireline",
      platform: "Platform B",
      wellNumber: "B-02",
      jobType: "Perforation",
      jobDate: "2026-03-10",
      productionBefore: 200,
      productionAfter: 450,
      production30Days: 420,
      status: "Successful",
    });
    expect(result).toBeDefined();
    expect(result?.serviceLine).toBe("wireline");
    expect(result?.platform).toBe("Platform B");
  });

  it("update modifies an existing job", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.wellJobs.update({
      id: 1,
      productionAfter: 600,
    });
    expect(result).toBeDefined();
    expect(result?.productionAfter).toBe(600);
  });

  it("delete removes a job", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.wellJobs.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("create rejects invalid service line", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.wellJobs.create({
        serviceLine: "invalid" as "coiled-tubing",
        platform: "P",
        wellNumber: "W",
        jobType: "T",
        jobDate: "2026-01-01",
        productionBefore: null,
        productionAfter: null,
        production30Days: null,
        status: "Successful",
      })
    ).rejects.toThrow();
  });
});

describe("dashboard.login", () => {
  it("returns success and a token with correct credentials", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.login({
      username: "aaljallaf",
      password: "aljallaf",
    });
    expect(result.success).toBe(true);
    expect(typeof result.token).toBe("string");
    expect(result.token.length).toBeGreaterThan(10);
  });

  it("throws with wrong password", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.dashboard.login({ username: "aaljallaf", password: "wrongpassword" })
    ).rejects.toThrow("Invalid username or password");
  });

  it("throws with wrong username", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.dashboard.login({ username: "wronguser", password: "aljallaf" })
    ).rejects.toThrow("Invalid username or password");
  });
});
