-- =====================================================
-- HYPERGRAPH EXTENSION FOR MULTI-AGENT FINANCE SYSTEM
-- =====================================================
-- Extends simple tree hierarchy to universal hypergraph
-- Supports:
-- - Multi-parent shareholding (complex ownership)
-- - Multiplex networks (multiple relationship types)
-- - Multi-agent actor networks (individual + population)
-- - Discrete event timelines (state transformations)
-- - System dynamics (stocks & flows)
-- - Universal hypergraph representation
-- =====================================================

-- =====================================================
-- AGENTS TABLE - Multi-Agent Actor Network
-- =====================================================
-- Represents both individual and population-level actors
-- Extends organizations to include agent-specific attributes
-- =====================================================

CREATE TABLE `agents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `entityId` INT NOT NULL COMMENT 'Links to organizations or users table',
  `entityType` ENUM('organization', 'user', 'population') NOT NULL COMMENT 'Type of entity this agent represents',
  `agentType` ENUM('individual', 'collective', 'population') NOT NULL COMMENT 'Agent classification',
  `name` VARCHAR(255) NOT NULL,
  `attributes` JSON COMMENT 'Agent-specific attributes (goals, capabilities, constraints)',
  `state` JSON COMMENT 'Current agent state (resources, position, status)',
  `behaviorModel` VARCHAR(100) COMMENT 'Behavior model type (rational, bounded-rational, learning, etc.)',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_agents_entityType` (`entityType`, `entityId`),
  INDEX `idx_agents_agentType` (`agentType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Multi-agent actor network - individual and population agents';


-- =====================================================
-- SHAREHOLDING TABLE - Multi-Parent Ownership
-- =====================================================
-- Replaces simple parentId with complex ownership structure
-- Enables multiple parents with weighted relationships
-- =====================================================

CREATE TABLE `shareholding` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `childOrgId` INT NOT NULL COMMENT 'Child organization',
  `parentOrgId` INT NOT NULL COMMENT 'Parent organization (shareholder)',
  `sharePercentage` DECIMAL(5,2) NOT NULL COMMENT 'Ownership percentage (0.00-100.00)',
  `shareClass` VARCHAR(50) COMMENT 'Share class (common, preferred, voting, etc.)',
  `votingRights` DECIMAL(5,2) COMMENT 'Voting rights percentage (may differ from ownership)',
  `acquisitionDate` DATE COMMENT 'Date of acquisition',
  `attributes` JSON COMMENT 'Additional shareholding attributes',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT `fk_shareholding_child` 
    FOREIGN KEY (`childOrgId`) REFERENCES `organizations`(`id`) 
    ON DELETE CASCADE,
  CONSTRAINT `fk_shareholding_parent` 
    FOREIGN KEY (`parentOrgId`) REFERENCES `organizations`(`id`) 
    ON DELETE CASCADE,
  
  -- Ensure valid percentages
  CONSTRAINT `chk_share_percentage` CHECK (`sharePercentage` >= 0 AND `sharePercentage` <= 100),
  CONSTRAINT `chk_voting_rights` CHECK (`votingRights` IS NULL OR (`votingRights` >= 0 AND `votingRights` <= 100)),
  
  -- Unique constraint: one shareholding record per parent-child pair
  UNIQUE KEY `uk_shareholding` (`childOrgId`, `parentOrgId`),
  
  INDEX `idx_shareholding_child` (`childOrgId`),
  INDEX `idx_shareholding_parent` (`parentOrgId`),
  INDEX `idx_shareholding_percentage` (`sharePercentage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Multi-parent shareholding - complex ownership structures';


-- =====================================================
-- RELATIONSHIP_TYPES TABLE - Multiplex Network Support
-- =====================================================
-- Defines different types of relationships between entities
-- Enables multiplex network analysis
-- =====================================================

CREATE TABLE `relationship_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Relationship type name',
  `category` ENUM('ownership', 'partnership', 'transaction', 'dependency', 'communication', 'hierarchy', 'custom') NOT NULL,
  `isDirected` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Whether relationship has direction',
  `isWeighted` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether relationship has weight',
  `attributes` JSON COMMENT 'Type-specific attributes schema',
  `description` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Relationship type definitions for multiplex networks';

-- Insert default relationship types
INSERT INTO `relationship_types` (`name`, `category`, `isDirected`, `isWeighted`, `description`) VALUES
('owns', 'ownership', TRUE, TRUE, 'Ownership relationship with percentage weight'),
('partners_with', 'partnership', FALSE, FALSE, 'Partnership or collaboration'),
('supplies_to', 'transaction', TRUE, TRUE, 'Supply chain relationship'),
('depends_on', 'dependency', TRUE, FALSE, 'Dependency relationship'),
('reports_to', 'hierarchy', TRUE, FALSE, 'Reporting hierarchy'),
('transacts_with', 'transaction', FALSE, TRUE, 'Financial transaction relationship'),
('competes_with', 'custom', FALSE, FALSE, 'Competition relationship');


-- =====================================================
-- RELATIONSHIPS TABLE - Multiplex Edge Representation
-- =====================================================
-- Stores pairwise relationships between entities
-- Part of the multiplex network structure
-- =====================================================

CREATE TABLE `relationships` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `relationshipTypeId` INT NOT NULL COMMENT 'Type of relationship',
  `sourceEntityId` INT NOT NULL COMMENT 'Source entity (from)',
  `sourceEntityType` ENUM('organization', 'user', 'agent') NOT NULL,
  `targetEntityId` INT NOT NULL COMMENT 'Target entity (to)',
  `targetEntityType` ENUM('organization', 'user', 'agent') NOT NULL,
  `weight` DECIMAL(10,4) COMMENT 'Relationship weight/strength',
  `attributes` JSON COMMENT 'Relationship-specific attributes',
  `validFrom` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Temporal validity start',
  `validTo` TIMESTAMP NULL COMMENT 'Temporal validity end (NULL = ongoing)',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT `fk_relationships_type` 
    FOREIGN KEY (`relationshipTypeId`) REFERENCES `relationship_types`(`id`) 
    ON DELETE CASCADE,
  
  INDEX `idx_relationships_source` (`sourceEntityType`, `sourceEntityId`),
  INDEX `idx_relationships_target` (`targetEntityType`, `targetEntityId`),
  INDEX `idx_relationships_type` (`relationshipTypeId`),
  INDEX `idx_relationships_temporal` (`validFrom`, `validTo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Multiplex network edges - typed relationships between entities';


-- =====================================================
-- HYPERGRAPH_NODES TABLE - Universal Entity Representation
-- =====================================================
-- Universal node table for hypergraph representation
-- All entities (orgs, users, agents, transactions) become nodes
-- =====================================================

CREATE TABLE `hypergraph_nodes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nodeType` VARCHAR(50) NOT NULL COMMENT 'Type of entity (organization, user, transaction, event, etc.)',
  `entityId` INT NOT NULL COMMENT 'ID in source table',
  `label` VARCHAR(255) NOT NULL COMMENT 'Human-readable label',
  `properties` JSON COMMENT 'Node properties',
  `embedding` JSON COMMENT 'Vector embedding for similarity search',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_hypergraph_node` (`nodeType`, `entityId`),
  INDEX `idx_hypergraph_nodes_type` (`nodeType`),
  INDEX `idx_hypergraph_nodes_label` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Universal hypergraph nodes - all entities as nodes';


-- =====================================================
-- HYPERGRAPH_HYPEREDGES TABLE - N-ary Relationships
-- =====================================================
-- Hyperedges connect multiple nodes simultaneously
-- Represents complex n-ary relationships
-- =====================================================

CREATE TABLE `hypergraph_hyperedges` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `edgeType` VARCHAR(50) NOT NULL COMMENT 'Type of hyperedge (transaction, meeting, event, etc.)',
  `label` VARCHAR(255) COMMENT 'Human-readable label',
  `properties` JSON COMMENT 'Hyperedge properties',
  `weight` DECIMAL(10,4) COMMENT 'Hyperedge weight',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_hypergraph_hyperedges_type` (`edgeType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Hypergraph hyperedges - n-ary relationships';


-- =====================================================
-- HYPERGRAPH_INCIDENCES TABLE - Node-Hyperedge Connections
-- =====================================================
-- Maps which nodes participate in which hyperedges
-- Incidence matrix representation
-- =====================================================

CREATE TABLE `hypergraph_incidences` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `hyperedgeId` INT NOT NULL COMMENT 'Hyperedge ID',
  `nodeId` INT NOT NULL COMMENT 'Node ID',
  `role` VARCHAR(50) COMMENT 'Role of node in hyperedge (source, target, participant, etc.)',
  `weight` DECIMAL(10,4) COMMENT 'Incidence weight',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT `fk_incidences_hyperedge` 
    FOREIGN KEY (`hyperedgeId`) REFERENCES `hypergraph_hyperedges`(`id`) 
    ON DELETE CASCADE,
  CONSTRAINT `fk_incidences_node` 
    FOREIGN KEY (`nodeId`) REFERENCES `hypergraph_nodes`(`id`) 
    ON DELETE CASCADE,
  
  UNIQUE KEY `uk_incidence` (`hyperedgeId`, `nodeId`),
  INDEX `idx_incidences_hyperedge` (`hyperedgeId`),
  INDEX `idx_incidences_node` (`nodeId`),
  INDEX `idx_incidences_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Hypergraph incidence matrix - node-hyperedge connections';


-- =====================================================
-- EVENTS TABLE - Discrete Event Timeline
-- =====================================================
-- Records discrete events that cause state transitions
-- Foundation for event-driven simulation
-- =====================================================

CREATE TABLE `events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `eventType` VARCHAR(100) NOT NULL COMMENT 'Type of event (transaction, meeting, decision, etc.)',
  `timestamp` TIMESTAMP NOT NULL COMMENT 'Event occurrence time',
  `sourceEntityId` INT COMMENT 'Entity that triggered the event',
  `sourceEntityType` VARCHAR(50),
  `targetEntityId` INT COMMENT 'Entity affected by the event',
  `targetEntityType` VARCHAR(50),
  `stateBefore` JSON COMMENT 'State snapshot before event',
  `stateAfter` JSON COMMENT 'State snapshot after event',
  `eventData` JSON COMMENT 'Event-specific data',
  `causedBy` INT COMMENT 'Previous event that caused this event (causal chain)',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT `fk_events_causedBy` 
    FOREIGN KEY (`causedBy`) REFERENCES `events`(`id`) 
    ON DELETE SET NULL,
  
  INDEX `idx_events_timestamp` (`timestamp`),
  INDEX `idx_events_type` (`eventType`),
  INDEX `idx_events_source` (`sourceEntityType`, `sourceEntityId`),
  INDEX `idx_events_target` (`targetEntityType`, `targetEntityId`),
  INDEX `idx_events_causal` (`causedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Discrete event timeline - state transformation events';


-- =====================================================
-- STATE_TRANSITIONS TABLE - State Machine Representation
-- =====================================================
-- Defines valid state transitions for entities
-- Enables state machine modeling
-- =====================================================

CREATE TABLE `state_transitions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `entityType` VARCHAR(50) NOT NULL COMMENT 'Type of entity this transition applies to',
  `fromState` VARCHAR(100) NOT NULL COMMENT 'Source state',
  `toState` VARCHAR(100) NOT NULL COMMENT 'Target state',
  `eventType` VARCHAR(100) NOT NULL COMMENT 'Event that triggers transition',
  `conditions` JSON COMMENT 'Conditions that must be met for transition',
  `actions` JSON COMMENT 'Actions to perform during transition',
  `probability` DECIMAL(5,4) COMMENT 'Transition probability (for stochastic models)',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_transition` (`entityType`, `fromState`, `toState`, `eventType`),
  INDEX `idx_transitions_entity` (`entityType`),
  INDEX `idx_transitions_from` (`fromState`),
  INDEX `idx_transitions_to` (`toState`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='State transition rules - state machine definition';


-- =====================================================
-- STOCKS TABLE - System Dynamics Accumulations
-- =====================================================
-- Represents stock variables in system dynamics models
-- Accumulations that change over time via flows
-- =====================================================

CREATE TABLE `stocks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `entityId` INT NOT NULL COMMENT 'Entity this stock belongs to',
  `entityType` VARCHAR(50) NOT NULL,
  `stockName` VARCHAR(100) NOT NULL COMMENT 'Name of stock variable',
  `currentValue` DECIMAL(20,4) NOT NULL COMMENT 'Current stock level',
  `unit` VARCHAR(50) COMMENT 'Unit of measurement',
  `minValue` DECIMAL(20,4) COMMENT 'Minimum allowed value',
  `maxValue` DECIMAL(20,4) COMMENT 'Maximum allowed value',
  `initialValue` DECIMAL(20,4) COMMENT 'Initial value at t=0',
  `attributes` JSON COMMENT 'Stock-specific attributes',
  `lastUpdated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_stock` (`entityType`, `entityId`, `stockName`),
  INDEX `idx_stocks_entity` (`entityType`, `entityId`),
  INDEX `idx_stocks_name` (`stockName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='System dynamics stocks - accumulation variables';


-- =====================================================
-- FLOWS TABLE - System Dynamics Rates of Change
-- =====================================================
-- Represents flow variables in system dynamics models
-- Rates that change stock levels over time
-- =====================================================

CREATE TABLE `flows` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `flowName` VARCHAR(100) NOT NULL COMMENT 'Name of flow variable',
  `sourceStockId` INT COMMENT 'Source stock (NULL for exogenous inflow)',
  `targetStockId` INT COMMENT 'Target stock (NULL for exogenous outflow)',
  `flowType` ENUM('inflow', 'outflow', 'biflow') NOT NULL COMMENT 'Direction of flow',
  `rateFormula` TEXT NOT NULL COMMENT 'Formula for calculating flow rate',
  `currentRate` DECIMAL(20,4) COMMENT 'Current flow rate',
  `unit` VARCHAR(50) COMMENT 'Unit of measurement (per time period)',
  `attributes` JSON COMMENT 'Flow-specific attributes',
  `lastUpdated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT `fk_flows_source` 
    FOREIGN KEY (`sourceStockId`) REFERENCES `stocks`(`id`) 
    ON DELETE CASCADE,
  CONSTRAINT `fk_flows_target` 
    FOREIGN KEY (`targetStockId`) REFERENCES `stocks`(`id`) 
    ON DELETE CASCADE,
  
  INDEX `idx_flows_source` (`sourceStockId`),
  INDEX `idx_flows_target` (`targetStockId`),
  INDEX `idx_flows_name` (`flowName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='System dynamics flows - rate variables';


-- =====================================================
-- SIMULATION_RUNS TABLE - System Dynamics Simulation History
-- =====================================================
-- Stores results of system dynamics simulations
-- =====================================================

CREATE TABLE `simulation_runs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `runName` VARCHAR(255) NOT NULL,
  `startTime` TIMESTAMP NOT NULL COMMENT 'Simulation start time',
  `endTime` TIMESTAMP NOT NULL COMMENT 'Simulation end time',
  `timeStep` DECIMAL(10,4) NOT NULL COMMENT 'Time step size',
  `parameters` JSON COMMENT 'Simulation parameters',
  `results` JSON COMMENT 'Simulation results (time series data)',
  `status` ENUM('running', 'completed', 'failed') NOT NULL DEFAULT 'running',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedAt` TIMESTAMP NULL,
  
  INDEX `idx_simulation_runs_status` (`status`),
  INDEX `idx_simulation_runs_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='System dynamics simulation run history';


-- =====================================================
-- EXAMPLE QUERIES FOR HYPERGRAPH OPERATIONS
-- =====================================================

-- Query 1: Get all shareholders of an organization (multi-parent)
-- =====================================================
/*
SELECT 
  o.name AS child_org,
  p.name AS parent_org,
  s.sharePercentage,
  s.votingRights,
  s.shareClass
FROM shareholding s
JOIN organizations o ON s.childOrgId = o.id
JOIN organizations p ON s.parentOrgId = p.id
WHERE s.childOrgId = ?
ORDER BY s.sharePercentage DESC;
*/

-- Query 2: Calculate effective ownership through chain
-- (e.g., if A owns 60% of B, and B owns 40% of C, A effectively owns 24% of C)
-- =====================================================
/*
WITH RECURSIVE ownership_chain AS (
  -- Direct ownership
  SELECT 
    childOrgId,
    parentOrgId,
    sharePercentage,
    sharePercentage AS effectiveOwnership,
    1 AS depth,
    CAST(parentOrgId AS CHAR(500)) AS chain
  FROM shareholding
  WHERE parentOrgId = ?
  
  UNION ALL
  
  -- Indirect ownership
  SELECT 
    s.childOrgId,
    oc.parentOrgId,
    s.sharePercentage,
    (oc.effectiveOwnership * s.sharePercentage / 100) AS effectiveOwnership,
    oc.depth + 1,
    CONCAT(oc.chain, '->', s.childOrgId)
  FROM shareholding s
  INNER JOIN ownership_chain oc ON s.parentOrgId = oc.childOrgId
  WHERE oc.depth < 10  -- Prevent infinite loops
)
SELECT 
  o.name AS controlled_org,
  oc.effectiveOwnership,
  oc.depth,
  oc.chain
FROM ownership_chain oc
JOIN organizations o ON oc.childOrgId = o.id
WHERE oc.effectiveOwnership >= 1.0  -- Only show significant ownership
ORDER BY oc.effectiveOwnership DESC;
*/

-- Query 3: Get multiplex network for an entity
-- (all relationships of different types)
-- =====================================================
/*
SELECT 
  rt.name AS relationship_type,
  rt.category,
  CASE 
    WHEN r.sourceEntityId = ? THEN 'outgoing'
    ELSE 'incoming'
  END AS direction,
  CASE 
    WHEN r.sourceEntityId = ? THEN r.targetEntityId
    ELSE r.sourceEntityId
  END AS connected_entity_id,
  CASE 
    WHEN r.sourceEntityId = ? THEN r.targetEntityType
    ELSE r.sourceEntityType
  END AS connected_entity_type,
  r.weight,
  r.attributes
FROM relationships r
JOIN relationship_types rt ON r.relationshipTypeId = rt.id
WHERE (r.sourceEntityId = ? AND r.sourceEntityType = ?)
   OR (r.targetEntityId = ? AND r.targetEntityType = ?)
ORDER BY rt.category, r.weight DESC;
*/

-- Query 4: Get hypergraph neighborhood (all hyperedges containing a node)
-- =====================================================
/*
SELECT 
  he.id AS hyperedge_id,
  he.edgeType,
  he.label,
  GROUP_CONCAT(
    CONCAT(hn.label, ' (', hi.role, ')')
    ORDER BY hi.role
    SEPARATOR ', '
  ) AS participants
FROM hypergraph_incidences hi
JOIN hypergraph_hyperedges he ON hi.hyperedgeId = he.id
JOIN hypergraph_incidences hi2 ON he.id = hi2.hyperedgeId
JOIN hypergraph_nodes hn ON hi2.nodeId = hn.id
WHERE hi.nodeId = ?
GROUP BY he.id, he.edgeType, he.label
ORDER BY he.createdAt DESC;
*/

-- Query 5: Get event timeline with state transitions
-- =====================================================
/*
SELECT 
  e.timestamp,
  e.eventType,
  JSON_EXTRACT(e.stateBefore, '$.status') AS status_before,
  JSON_EXTRACT(e.stateAfter, '$.status') AS status_after,
  e.eventData,
  prev.eventType AS caused_by_event
FROM events e
LEFT JOIN events prev ON e.causedBy = prev.id
WHERE e.targetEntityId = ? AND e.targetEntityType = ?
ORDER BY e.timestamp ASC;
*/

-- Query 6: System dynamics - calculate stock changes over time
-- =====================================================
/*
SELECT 
  s.stockName,
  s.currentValue,
  SUM(CASE WHEN f.targetStockId = s.id THEN f.currentRate ELSE 0 END) AS total_inflow,
  SUM(CASE WHEN f.sourceStockId = s.id THEN f.currentRate ELSE 0 END) AS total_outflow,
  s.currentValue + 
    SUM(CASE WHEN f.targetStockId = s.id THEN f.currentRate ELSE 0 END) -
    SUM(CASE WHEN f.sourceStockId = s.id THEN f.currentRate ELSE 0 END) AS projected_value
FROM stocks s
LEFT JOIN flows f ON s.id = f.sourceStockId OR s.id = f.targetStockId
WHERE s.entityId = ? AND s.entityType = ?
GROUP BY s.id, s.stockName, s.currentValue;
*/

-- =====================================================
-- HYPERGRAPH SCHEMA SUMMARY
-- =====================================================
/*
This schema extends the simple tree hierarchy to a universal hypergraph with:

1. MULTI-PARENT SHAREHOLDING:
   - shareholding table replaces simple parentId
   - Supports weighted ownership (percentages)
   - Enables complex corporate structures
   - Calculates effective ownership through chains

2. MULTIPLEX NETWORKS:
   - relationship_types defines edge types
   - relationships stores typed edges
   - Supports multiple simultaneous relationship types
   - Temporal validity for time-varying networks

3. MULTI-AGENT ACTOR NETWORKS:
   - agents table for individual/collective/population actors
   - Behavior models and state tracking
   - Enables agent-based simulation

4. DISCRETE EVENT TIMELINES:
   - events table records state-changing events
   - state_transitions defines valid transitions
   - Causal chains link events
   - State snapshots enable time-travel queries

5. SYSTEM DYNAMICS:
   - stocks table for accumulation variables
   - flows table for rate variables
   - simulation_runs stores simulation results
   - Supports differential equation modeling

6. UNIVERSAL HYPERGRAPH:
   - hypergraph_nodes: all entities as nodes
   - hypergraph_hyperedges: n-ary relationships
   - hypergraph_incidences: incidence matrix
   - Enables complex network analysis

INTEGRATION POINTS:
- Organizations → Agents → Hypergraph Nodes
- Shareholding → Relationships → Hyperedges
- Transactions → Events → State Transitions
- Financial metrics → Stocks → Flows
*/
