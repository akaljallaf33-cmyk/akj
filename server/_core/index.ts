import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getDb } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function runMigrations() {
  if (!process.env.DATABASE_URL) return;
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    const client = await pool.connect();
    await client.query(`
      CREATE TYPE IF NOT EXISTS "role" AS ENUM ('user', 'admin');
      CREATE TYPE IF NOT EXISTS "serviceLine" AS ENUM ('coiled-tubing', 'wireline', 'pumping');
      CREATE TYPE IF NOT EXISTS "status" AS ENUM ('Complete', 'Incomplete');
    `).catch(() => {}); // ignore if types already exist

    // Migrate old status enum values if needed
    await client.query(`
      DO $$
      BEGIN
        -- Check if old enum values exist and migrate them
        IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'status' AND e.enumlabel = 'Successful') THEN
          -- Update existing rows first
          UPDATE well_jobs SET status = 'Complete'::text WHERE status::text = 'Successful';
          UPDATE well_jobs SET status = 'Incomplete'::text WHERE status::text IN ('Partially Successful', 'Failed');
          -- Rename old type, create new one, swap column, drop old
          ALTER TYPE status RENAME TO status_old;
          CREATE TYPE status AS ENUM ('Complete', 'Incomplete');
          ALTER TABLE well_jobs ALTER COLUMN status TYPE status USING status::text::status;
          DROP TYPE status_old;
        END IF;
      END
      $$;
    `).catch((e: unknown) => console.log('[Database] Status migration skipped:', (e as Error).message));

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        "openId" VARCHAR(64) NOT NULL UNIQUE,
        name TEXT,
        email VARCHAR(320),
        "loginMethod" VARCHAR(64),
        role "role" NOT NULL DEFAULT 'user',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "lastSignedIn" TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS well_jobs (
        id SERIAL PRIMARY KEY,
        "serviceLine" "serviceLine" NOT NULL,
        platform VARCHAR(128) NOT NULL,
        "wellNumber" VARCHAR(64) NOT NULL,
        unit VARCHAR(32),
        "jobType" VARCHAR(128) NOT NULL,
        "startDate" VARCHAR(10) NOT NULL,
        "endDate" VARCHAR(10) NOT NULL,
        "productionBefore" INTEGER,
        "productionAfter" INTEGER,
        "production30Days" INTEGER,
        status "status" NOT NULL,
        notes TEXT,
        "ct1DailyRate" DOUBLE PRECISION,
        "operationalDays" DOUBLE PRECISION,
        "badWeatherDays" DOUBLE PRECISION,
        "onRig" INTEGER DEFAULT 0,
        "rigDailyRate" DOUBLE PRECISION,
        "rigOperationalDays" DOUBLE PRECISION,
        "rigBadWeatherDays" DOUBLE PRECISION,
        "jobBill" DOUBLE PRECISION,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS job_finance (
        id SERIAL PRIMARY KEY,
        "wellJobId" INTEGER NOT NULL UNIQUE,
        "ct1DailyRate" INTEGER,
        "operationalDays" INTEGER,
        "badWeatherDays" INTEGER,
        "jobBill" INTEGER,
        notes TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS oil_prices (
        id SERIAL PRIMARY KEY,
        month VARCHAR(7) NOT NULL UNIQUE,
        "avgPrice" INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS well_plans (
        id SERIAL PRIMARY KEY,
        year INTEGER NOT NULL,
        platform VARCHAR(128) NOT NULL,
        "wellNumber" VARCHAR(64) NOT NULL,
        "serviceLine" "serviceLine" NOT NULL,
        "plannedJobType" VARCHAR(128),
        "expectedRecovery" INTEGER,
        "plannedDate" VARCHAR(10),
        notes TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    client.release();
    await pool.end();
    console.log('[Database] Schema ready');
  } catch (err) {
    console.error('[Database] Migration error:', err);
  }
}

async function startServer() {
  await runMigrations();
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
