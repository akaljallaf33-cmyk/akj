CREATE TABLE `job_finance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wellJobId` int NOT NULL,
	`ct1DailyRate` int,
	`operationalDays` int,
	`badWeatherDays` int,
	`jobBill` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_finance_id` PRIMARY KEY(`id`),
	CONSTRAINT `job_finance_wellJobId_unique` UNIQUE(`wellJobId`)
);
--> statement-breakpoint
CREATE TABLE `oil_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`month` varchar(7) NOT NULL,
	`avgPrice` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oil_prices_id` PRIMARY KEY(`id`),
	CONSTRAINT `oil_prices_month_unique` UNIQUE(`month`)
);
