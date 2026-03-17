import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  jobType: varchar('jobType', { length: 128 }).notNull(),
  jobDate: varchar('jobDate', { length: 10 }).notNull(),
  productionBefore: int('productionBefore'),
  productionAfter: int('productionAfter'),
  production30Days: int('production30Days'),
  status: mysqlEnum('status', ['Successful', 'Partially Successful', 'Failed']).notNull(),
  notes: text('notes'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type WellJobRow = typeof wellJobs.$inferSelect;
export type InsertWellJob = typeof wellJobs.$inferInsert;