CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityId` int NOT NULL,
	`entityType` enum('organization','user','population') NOT NULL,
	`agentType` enum('individual','collective','population') NOT NULL,
	`name` varchar(255) NOT NULL,
	`attributes` json,
	`state` json,
	`behaviorModel` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`timestamp` timestamp NOT NULL,
	`sourceEntityId` int,
	`sourceEntityType` varchar(50),
	`targetEntityId` int,
	`targetEntityType` varchar(50),
	`stateBefore` json,
	`stateAfter` json,
	`eventData` json,
	`causedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`flowName` varchar(100) NOT NULL,
	`sourceStockId` int,
	`targetStockId` int,
	`flowType` enum('inflow','outflow','biflow') NOT NULL,
	`rateFormula` text NOT NULL,
	`currentRate` int,
	`unit` varchar(50),
	`attributes` json,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `flows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hypergraph_hyperedges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`edgeType` varchar(50) NOT NULL,
	`label` varchar(255),
	`properties` json,
	`weight` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hypergraph_hyperedges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hypergraph_incidences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hyperedgeId` int NOT NULL,
	`nodeId` int NOT NULL,
	`role` varchar(50),
	`weight` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hypergraph_incidences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hypergraph_nodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nodeType` varchar(50) NOT NULL,
	`entityId` int NOT NULL,
	`label` varchar(255) NOT NULL,
	`properties` json,
	`embedding` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hypergraph_nodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `relationship_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`category` enum('ownership','partnership','transaction','dependency','communication','hierarchy','custom') NOT NULL,
	`isDirected` boolean NOT NULL DEFAULT true,
	`isWeighted` boolean NOT NULL DEFAULT false,
	`attributes` json,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `relationship_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `relationship_types_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `relationships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`relationshipTypeId` int NOT NULL,
	`sourceEntityId` int NOT NULL,
	`sourceEntityType` enum('organization','user','agent') NOT NULL,
	`targetEntityId` int NOT NULL,
	`targetEntityType` enum('organization','user','agent') NOT NULL,
	`weight` int,
	`attributes` json,
	`validFrom` timestamp NOT NULL DEFAULT (now()),
	`validTo` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `relationships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shareholding` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childOrgId` int NOT NULL,
	`parentOrgId` int NOT NULL,
	`sharePercentage` int NOT NULL,
	`shareClass` varchar(50),
	`votingRights` int,
	`acquisitionDate` timestamp,
	`attributes` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shareholding_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulation_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runName` varchar(255) NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`timeStep` int NOT NULL,
	`parameters` json,
	`results` json,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `simulation_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `state_transitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`fromState` varchar(100) NOT NULL,
	`toState` varchar(100) NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`conditions` json,
	`actions` json,
	`probability` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `state_transitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityId` int NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`stockName` varchar(100) NOT NULL,
	`currentValue` int NOT NULL,
	`unit` varchar(50),
	`minValue` int,
	`maxValue` int,
	`initialValue` int,
	`attributes` json,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stocks_id` PRIMARY KEY(`id`)
);
