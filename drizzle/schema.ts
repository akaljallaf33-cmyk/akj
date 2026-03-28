import { doublePrecision, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const serviceLineEnum = pgEnum("serviceLine", ["coiled-tubing", "wireline", "pumping"]);
export const statusEnum = pgEnum("status", ["Complete", "Incomplete"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const wellJobs = pgTable('well_jobs', {
  id: serial('id').primaryKey(),
  serviceLine: serviceLineEnum('serviceLine').notNull(),
  platform: varchar('platform', { length: 128 }).notNull(),
  wellNumber: varchar('wellNumber', { length: 64 }).notNull(),
  unit: varchar('unit', { length: 32 }),
  jobType: varchar('jobType', { length: 128 }).notNull(),
  startDate: varchar('startDate', { length: 10 }).notNull(),
  endDate: varchar('endDate', { length: 10 }).notNull(),
  productionBefore: integer('productionBefore'),
  productionAfter: integer('productionAfter'),
  production30Days: integer('production30Days'),
  status: statusEnum('status').notNull(),
  notes: text('notes'),
  // CT-1 cost fields (jack-up based)
  ct1DailyRate: doublePrecision('ct1DailyRate'),
  operationalDays: doublePrecision('operationalDays'),
  badWeatherDays: doublePrecision('badWeatherDays'),
  // CT-2 rig cost fields (when CT-2 is on a rig)
  onRig: integer('onRig').default(0),
  rigDailyRate: doublePrecision('rigDailyRate'),
  rigOperationalDays: doublePrecision('rigOperationalDays'),
  rigBadWeatherDays: doublePrecision('rigBadWeatherDays'),
  // Wireline equipment rental cost
  wlEquipmentRentPerDay: doublePrecision('wlEquipmentRentPerDay'),
  wlRentalDays: doublePrecision('wlRentalDays'),
  // CT NPT (Non-Productive Time) tracking
  nptDays: doublePrecision('nptDays'),
  nptNotes: text('nptNotes'),
  // Shared
  jobBill: doublePrecision('jobBill'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type WellJobRow = typeof wellJobs.$inferSelect;
export type InsertWellJob = typeof wellJobs.$inferInsert;

export const jobFinance = pgTable('job_finance', {
  id: serial('id').primaryKey(),
  wellJobId: integer('wellJobId').notNull().unique(),
  ct1DailyRate: integer('ct1DailyRate'),
  operationalDays: integer('operationalDays'),
  badWeatherDays: integer('badWeatherDays'),
  jobBill: integer('jobBill'),
  notes: text('notes'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type JobFinanceRow = typeof jobFinance.$inferSelect;
export type InsertJobFinance = typeof jobFinance.$inferInsert;

export const oilPrices = pgTable('oil_prices', {
  id: serial('id').primaryKey(),
  month: varchar('month', { length: 7 }).notNull().unique(),
  avgPrice: integer('avgPrice').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type OilPriceRow = typeof oilPrices.$inferSelect;
export type InsertOilPrice = typeof oilPrices.$inferInsert;

export const wellPlans = pgTable('well_plans', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),
  platform: varchar('platform', { length: 128 }).notNull(),
  wellNumber: varchar('wellNumber', { length: 64 }).notNull(),
  serviceLine: serviceLineEnum('serviceLine').notNull(),
  plannedJobType: varchar('plannedJobType', { length: 128 }),
  expectedRecovery: integer('expectedRecovery'),
  plannedDate: varchar('plannedDate', { length: 10 }),
  notes: text('notes'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type WellPlanRow = typeof wellPlans.$inferSelect;
export type InsertWellPlan = typeof wellPlans.$inferInsert;
