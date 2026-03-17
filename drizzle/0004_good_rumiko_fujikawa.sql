ALTER TABLE `well_jobs` ADD `ct1DailyRate` double;--> statement-breakpoint
ALTER TABLE `well_jobs` ADD `operationalDays` double;--> statement-breakpoint
ALTER TABLE `well_jobs` ADD `badWeatherDays` double;--> statement-breakpoint
ALTER TABLE `well_jobs` ADD `onRig` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `well_jobs` ADD `rigDailyRate` double;--> statement-breakpoint
ALTER TABLE `well_jobs` ADD `rigOperationalDays` double;--> statement-breakpoint
ALTER TABLE `well_jobs` ADD `rigBadWeatherDays` double;--> statement-breakpoint
ALTER TABLE `well_jobs` ADD `jobBill` double;