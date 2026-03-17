import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createWellJob, deleteWellJob, getAllJobFinance, getAllOilPrices, getAllWellJobs, upsertJobFinance, upsertOilPrice, updateWellJob } from "./db";
import { ENV } from "./_core/env";
import { SignJWT } from "jose";

const WI_SESSION_COOKIE = "wi_session";

async function signWiSession(username: string): Promise<string> {
  const secret = new TextEncoder().encode(ENV.cookieSecret || "wi-secret-fallback");
  return new SignJWT({ username, type: "wi_dashboard" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
    .sign(secret);
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Dashboard-specific login (username + password)
  // Uses token returned in response body (stored in localStorage) to avoid cross-origin cookie issues
  dashboard: router({
    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input }) => {
        const validUser = input.username === ENV.dashboardUsername;
        const validPass = input.password === ENV.dashboardPassword;
        if (!validUser || !validPass) {
          throw new Error("Invalid username or password");
        }
        const token = await signWiSession(input.username);
        return { success: true, token };
      }),

    logout: publicProcedure.mutation(() => {
      return { success: true };
    }),

    // Verifies a token passed in the Authorization header
    check: publicProcedure
      .input(z.object({ token: z.string().optional() }))
      .query(async ({ input }) => {
        try {
          const { jwtVerify } = await import("jose");
          const token = input.token;
          if (!token) return { authenticated: false };
          const secret = new TextEncoder().encode(ENV.cookieSecret || "wi-secret-fallback");
          const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
          if ((payload as any).type !== "wi_dashboard") return { authenticated: false };
          return { authenticated: true, username: (payload as any).username as string };
        } catch {
          return { authenticated: false };
        }
      }),
  }),

  // Well Intervention Jobs CRUD
  wellJobs: router({
    list: publicProcedure.query(async () => {
      return getAllWellJobs();
    }),

    create: publicProcedure
      .input(z.object({
        serviceLine: z.enum(['coiled-tubing', 'wireline', 'pumping']),
        platform: z.string().min(1),
        wellNumber: z.string().min(1),
        unit: z.string().optional(),
        jobType: z.string().min(1),
        jobDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        productionBefore: z.number().int().nullable(),
        productionAfter: z.number().int().nullable(),
        production30Days: z.number().int().nullable(),
        status: z.enum(['Successful', 'Partially Successful', 'Failed']),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return createWellJob(input);
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number().int(),
        serviceLine: z.enum(['coiled-tubing', 'wireline', 'pumping']).optional(),
        platform: z.string().min(1).optional(),
        wellNumber: z.string().min(1).optional(),
        unit: z.string().optional(),
        jobType: z.string().min(1).optional(),
        jobDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        productionBefore: z.number().int().nullable().optional(),
        productionAfter: z.number().int().nullable().optional(),
        production30Days: z.number().int().nullable().optional(),
        status: z.enum(['Successful', 'Partially Successful', 'Failed']).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateWellJob(id, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        return deleteWellJob(input.id);
      }),
  }),

  // Finance: per-job cost data and monthly oil prices
  finance: router({
    // Get all job finance records
    listJobFinance: publicProcedure.query(async () => {
      return getAllJobFinance();
    }),

    // Upsert finance data for a specific well job
    upsertJobFinance: publicProcedure
      .input(z.object({
        wellJobId: z.number().int(),
        ct1DailyRate: z.number().int().nullable().optional(),
        operationalDays: z.number().int().nullable().optional(),
        badWeatherDays: z.number().int().nullable().optional(),
        jobBill: z.number().int().nullable().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return upsertJobFinance(input);
      }),

    // Get all monthly oil prices
    listOilPrices: publicProcedure.query(async () => {
      return getAllOilPrices();
    }),

    // Set or update monthly average oil price
    upsertOilPrice: publicProcedure
      .input(z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        avgPrice: z.number().int().min(1),
      }))
      .mutation(async ({ input }) => {
        return upsertOilPrice(input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
