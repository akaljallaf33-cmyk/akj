import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createWellJob, deleteWellJob, getAllWellJobs, updateWellJob } from "./db";

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
});

export type AppRouter = typeof appRouter;
