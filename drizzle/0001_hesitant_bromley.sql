CREATE TABLE `well_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceLine` enum('coiled-tubing','wireline','pumping') NOT NULL,
	`platform` varchar(128) NOT NULL,
	`wellNumber` varchar(64) NOT NULL,
	`jobType` varchar(128) NOT NULL,
	`jobDate` varchar(10) NOT NULL,
	`productionBefore` int,
	`productionAfter` int,
	`production30Days` int,
	`status` enum('Successful','Partially Successful','Failed') NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `well_jobs_id` PRIMARY KEY(`id`)
);
