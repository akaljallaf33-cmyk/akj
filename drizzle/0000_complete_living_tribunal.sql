CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."serviceLine" AS ENUM('coiled-tubing', 'wireline', 'pumping');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('Successful', 'Partially Successful', 'Failed');--> statement-breakpoint
CREATE TABLE "job_finance" (
	"id" serial PRIMARY KEY NOT NULL,
	"wellJobId" integer NOT NULL,
	"ct1DailyRate" integer,
	"operationalDays" integer,
	"badWeatherDays" integer,
	"jobBill" integer,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "job_finance_wellJobId_unique" UNIQUE("wellJobId")
);
--> statement-breakpoint
CREATE TABLE "oil_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" varchar(7) NOT NULL,
	"avgPrice" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oil_prices_month_unique" UNIQUE("month")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "well_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"serviceLine" "serviceLine" NOT NULL,
	"platform" varchar(128) NOT NULL,
	"wellNumber" varchar(64) NOT NULL,
	"unit" varchar(32),
	"jobType" varchar(128) NOT NULL,
	"startDate" varchar(10) NOT NULL,
	"endDate" varchar(10) NOT NULL,
	"productionBefore" integer,
	"productionAfter" integer,
	"production30Days" integer,
	"status" "status" NOT NULL,
	"notes" text,
	"ct1DailyRate" double precision,
	"operationalDays" double precision,
	"badWeatherDays" double precision,
	"onRig" integer DEFAULT 0,
	"rigDailyRate" double precision,
	"rigOperationalDays" double precision,
	"rigBadWeatherDays" double precision,
	"jobBill" double precision,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "well_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"platform" varchar(128) NOT NULL,
	"wellNumber" varchar(64) NOT NULL,
	"serviceLine" "serviceLine" NOT NULL,
	"plannedJobType" varchar(128),
	"expectedRecovery" integer,
	"plannedDate" varchar(10),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
