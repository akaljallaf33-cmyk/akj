ALTER TABLE `well_jobs` ADD `startDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `well_jobs` ADD `endDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `well_jobs` DROP COLUMN `jobDate`;