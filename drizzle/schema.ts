import { double, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here

export const wellJobs = mysqlTable('well_jobs', {
  id: int('id').autoincrement().primaryKey(),
  serviceLine: mysqlEnum('serviceLine', ['coiled-tubing', 'wireline', 'pumping']).notNull(),
  platform: varchar('platform', { length: 128 }).notNull(),
  wellNumber: varchar('wellNumber', { length: 64 }).notNull(),
  unit: varchar('unit', { length: 32 }),
  jobType: varchar('jobType', { length: 128 }).notNull(),
  startDate: varchar('startDate', { length: 10 }).notNull(), // YYYY-MM-DD — job start date
  endDate: varchar('endDate', { length: 10 }).notNull(),   // YYYY-MM-DD — job end date (used for month grouping)
  productionBefore: int('productionBefore'),
  productionAfter: int('productionAfter'),
  production30Days: int('production30Days'),
  status: mysqlEnum('status', ['Successful', 'Partially Successful', 'Failed']).notNull(),
  notes: text('notes'),
  // CT-1 cost fields (jack-up based)
  ct1DailyRate: double('ct1DailyRate'),       // USD/day — CT-1 jack-up daily rate
  operationalDays: double('operationalDays'), // days at full rate
  badWeatherDays: double('badWeatherDays'),   // days at 50% rate
  // CT-2 rig cost fields (when CT-2 is on a rig)
  onRig: int('onRig').default(0),             // 0 = no rig, 1 = on rig
  rigDailyRate: double('rigDailyRate'),        // USD/day — rig daily rate for CT-2
  rigOperationalDays: double('rigOperationalDays'), // rig days at full rate
  rigBadWeatherDays: double('rigBadWeatherDays'),   // rig days at 50% rate
  // Shared
  jobBill: double('jobBill'),                 // USD — job service bill
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type WellJobRow = typeof wellJobs.$inferSelect;
export type InsertWellJob = typeof wellJobs.$inferInsert;

// Finance: per-job cost data linked to a well job
export const jobFinance = mysqlTable('job_finance', {
  id: int('id').autoincrement().primaryKey(),
  wellJobId: int('wellJobId').notNull().unique(), // 1-to-1 with well_jobs
  // CT-1 specific fields (jack-up)
  ct1DailyRate: int('ct1DailyRate'),       // USD/day
  operationalDays: int('operationalDays'), // days at full rate
  badWeatherDays: int('badWeatherDays'),   // days at 50% rate
  // Shared
  jobBill: int('jobBill'),                 // USD — additional job cost
  notes: text('notes'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type JobFinanceRow = typeof jobFinance.$inferSelect;
export type InsertJobFinance = typeof jobFinance.$inferInsert;

// Finance: monthly average oil prices (Brent crude, USD/bbl)
export const oilPrices = mysqlTable('oil_prices', {
  id: int('id').autoincrement().primaryKey(),
  month: varchar('month', { length: 7 }).notNull().unique(), // e.g. '2026-01'
  avgPrice: int('avgPrice').notNull(),                       // USD/bbl
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type OilPriceRow = typeof oilPrices.$inferSelect;
export type InsertOilPrice = typeof oilPrices.$inferInsert;