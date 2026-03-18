CREATE TABLE `well_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`platform` varchar(128) NOT NULL,
	`wellNumber` varchar(64) NOT NULL,
	`serviceLine` enum('coiled-tubing','wireline','pumping') NOT NULL,
	`plannedJobType` varchar(128),
	`expectedRecovery` int,
	`plannedDate` varchar(10),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `well_plans_id` PRIMARY KEY(`id`)
);
