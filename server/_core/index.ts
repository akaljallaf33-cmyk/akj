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
  const { Pool } = await import('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const client = await pool.connect();

  // Step 1: Create enum types individually (each in its own try/catch)
  try { await client.query(`CREATE TYPE "role" AS ENUM ('user', 'admin')`); } catch { /* already exists */ }
  try { await client.query(`CREATE TYPE "serviceLine" AS ENUM ('coiled-tubing', 'wireline', 'pumping')`); } catch { /* already exists */ }
  try { await client.query(`CREATE TYPE "status" AS ENUM ('Complete', 'Incomplete')`); } catch { /* already exists */ }

  // Step 2: Migrate old status enum values (Successful -> Complete, Failed/Partial -> Incomplete)
  try {
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'status' AND e.enumlabel = 'Successful'
        ) THEN
          -- Temporarily cast to text to allow update
          ALTER TABLE well_jobs ALTER COLUMN status TYPE TEXT;
          UPDATE well_jobs SET status = 'Complete' WHERE status = 'Successful';
          UPDATE well_jobs SET status = 'Incomplete' WHERE status IN ('Partially Successful', 'Failed');
          -- Drop old enum and create new one
          DROP TYPE IF EXISTS status;
          CREATE TYPE status AS ENUM ('Complete', 'Incomplete');
          -- Cast column back to new enum
          ALTER TABLE well_jobs ALTER COLUMN status TYPE status USING status::status;
        END IF;
      END
      $$;
    `);
    console.log('[Database] Status enum migration complete');
  } catch (e) {
    console.log('[Database] Status migration note:', (e as Error).message);
  }

  // Step 3: Create tables
  try {
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
  } catch (e) {
    console.error('[Database] Table creation error:', (e as Error).message);
  }

  client.release();
  await pool.end();
  console.log('[Database] Schema ready');
}

async function startServer() {
  try {
    await runMigrations();
  } catch (err) {
    console.error('[Database] Migration error:', err);
  }
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
