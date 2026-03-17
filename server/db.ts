import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertJobFinance, InsertOilPrice, InsertUser, InsertWellJob, jobFinance, oilPrices, users, wellJobs } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

// ─── Well Jobs ───────────────────────────────────────────────────────────────

export async function getAllWellJobs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wellJobs).orderBy(wellJobs.jobDate);
}

export async function createWellJob(data: InsertWellJob) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(wellJobs).values(data);
  const insertId = (result[0] as { insertId: number }).insertId;
  const rows = await db.select().from(wellJobs).where(eq(wellJobs.id, insertId)).limit(1);
  return rows[0];
}

export async function updateWellJob(id: number, data: Partial<InsertWellJob>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(wellJobs).set(data).where(eq(wellJobs.id, id));
  const rows = await db.select().from(wellJobs).where(eq(wellJobs.id, id)).limit(1);
  return rows[0];
}

export async function deleteWellJob(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(wellJobs).where(eq(wellJobs.id, id));
  return { success: true };
}

// ─── Job Finance ─────────────────────────────────────────────────────────────

export async function getAllJobFinance() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobFinance);
}

export async function getJobFinanceByWellJobId(wellJobId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(jobFinance).where(eq(jobFinance.wellJobId, wellJobId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertJobFinance(data: InsertJobFinance) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(jobFinance).values(data).onDuplicateKeyUpdate({
    set: {
      ct1DailyRate: data.ct1DailyRate,
      operationalDays: data.operationalDays,
      badWeatherDays: data.badWeatherDays,
      jobBill: data.jobBill,
      notes: data.notes,
    },
  });
  const rows = await db.select().from(jobFinance).where(eq(jobFinance.wellJobId, data.wellJobId)).limit(1);
  return rows[0];
}

export async function deleteJobFinance(wellJobId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(jobFinance).where(eq(jobFinance.wellJobId, wellJobId));
  return { success: true };
}

// ─── Oil Prices ───────────────────────────────────────────────────────────────

export async function getAllOilPrices() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(oilPrices).orderBy(oilPrices.month);
}

export async function upsertOilPrice(data: InsertOilPrice) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(oilPrices).values(data).onDuplicateKeyUpdate({
    set: { avgPrice: data.avgPrice },
  });
  const rows = await db.select().from(oilPrices).where(eq(oilPrices.month, data.month)).limit(1);
  return rows[0];
}
