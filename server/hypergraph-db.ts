/**
 * Database helpers for hypergraph operations
 * Handles multi-parent shareholding, multiplex networks, and hypergraph queries
 */

import { eq, and, or, sql, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  agents,
  shareholding,
  relationshipTypes,
  relationships,
  hypergraphNodes,
  hypergraphHyperedges,
  hypergraphIncidences,
  events,
  stateTransitions,
  stocks,
  flows,
  simulationRuns,
  organizations,
  type InsertAgent,
  type InsertShareholding,
  type InsertRelationshipType,
  type InsertRelationship,
  type InsertHypergraphNode,
  type InsertHypergraphHyperedge,
  type InsertHypergraphIncidence,
  type InsertEvent,
  type InsertStateTransition,
  type InsertStock,
  type InsertFlow,
  type InsertSimulationRun,
} from "../drizzle/schema";

// =====================================================
// AGENTS
// =====================================================

export async function createAgent(agent: InsertAgent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(agents).values(agent);
  return result;
}

export async function getAgentsByType(agentType: "individual" | "collective" | "population") {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(agents).where(eq(agents.agentType, agentType));
}

export async function getAgentByEntity(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(agents)
    .where(and(
      eq(agents.entityType, entityType as any),
      eq(agents.entityId, entityId)
    ))
    .limit(1);
  
  return result[0] || null;
}

// =====================================================
// SHAREHOLDING - Multi-Parent Ownership
// =====================================================

export async function createShareholding(share: InsertShareholding) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(shareholding).values(share);
  return result;
}

export async function getShareholdersByOrg(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all parent organizations that own this org
  const result = await db
    .select({
      shareholdingId: shareholding.id,
      parentId: shareholding.parentOrgId,
      parentName: organizations.name,
      sharePercentage: shareholding.sharePercentage,
      votingRights: shareholding.votingRights,
      shareClass: shareholding.shareClass,
      acquisitionDate: shareholding.acquisitionDate,
    })
    .from(shareholding)
    .leftJoin(organizations, eq(shareholding.parentOrgId, organizations.id))
    .where(eq(shareholding.childOrgId, orgId));
  
  return result;
}

export async function getSubsidiariesByOrg(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all child organizations owned by this org
  const result = await db
    .select({
      shareholdingId: shareholding.id,
      childId: shareholding.childOrgId,
      childName: organizations.name,
      sharePercentage: shareholding.sharePercentage,
      votingRights: shareholding.votingRights,
      shareClass: shareholding.shareClass,
      acquisitionDate: shareholding.acquisitionDate,
    })
    .from(shareholding)
    .leftJoin(organizations, eq(shareholding.childOrgId, organizations.id))
    .where(eq(shareholding.parentOrgId, orgId));
  
  return result;
}

// Calculate effective ownership through chain
export async function getEffectiveOwnership(parentOrgId: number, maxDepth: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  // Recursive CTE to calculate ownership chain
  const query = sql`
    WITH RECURSIVE ownership_chain AS (
      SELECT 
        childOrgId,
        parentOrgId,
        sharePercentage,
        sharePercentage AS effectiveOwnership,
        1 AS depth,
        CAST(CONCAT(parentOrgId, '->', childOrgId) AS CHAR(500)) AS chain
      FROM shareholding
      WHERE parentOrgId = ${parentOrgId}
      
      UNION ALL
      
      SELECT 
        s.childOrgId,
        oc.parentOrgId,
        s.sharePercentage,
        (oc.effectiveOwnership * s.sharePercentage / 10000) AS effectiveOwnership,
        oc.depth + 1,
        CONCAT(oc.chain, '->', s.childOrgId)
      FROM shareholding s
      INNER JOIN ownership_chain oc ON s.parentOrgId = oc.childOrgId
      WHERE oc.depth < ${maxDepth}
    )
    SELECT 
      oc.childOrgId,
      o.name AS childName,
      oc.effectiveOwnership,
      oc.depth,
      oc.chain
    FROM ownership_chain oc
    JOIN organizations o ON oc.childOrgId = o.id
    WHERE oc.effectiveOwnership >= 100
    ORDER BY oc.effectiveOwnership DESC
  `;
  
  return await db.execute(query);
}

// =====================================================
// RELATIONSHIPS - Multiplex Networks
// =====================================================

export async function createRelationshipType(relType: InsertRelationshipType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(relationshipTypes).values(relType);
  return result;
}

export async function getRelationshipTypes() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(relationshipTypes);
}

export async function createRelationship(rel: InsertRelationship) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(relationships).values(rel);
  return result;
}

export async function getRelationshipsByEntity(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all relationships where entity is source or target
  const result = await db
    .select({
      relationshipId: relationships.id,
      relationshipType: relationshipTypes.name,
      category: relationshipTypes.category,
      isDirected: relationshipTypes.isDirected,
      direction: sql<string>`CASE 
        WHEN ${relationships.sourceEntityId} = ${entityId} THEN 'outgoing'
        ELSE 'incoming'
      END`,
      connectedEntityId: sql<number>`CASE 
        WHEN ${relationships.sourceEntityId} = ${entityId} THEN ${relationships.targetEntityId}
        ELSE ${relationships.sourceEntityId}
      END`,
      connectedEntityType: sql<string>`CASE 
        WHEN ${relationships.sourceEntityId} = ${entityId} THEN ${relationships.targetEntityType}
        ELSE ${relationships.sourceEntityType}
      END`,
      weight: relationships.weight,
      attributes: relationships.attributes,
      validFrom: relationships.validFrom,
      validTo: relationships.validTo,
    })
    .from(relationships)
    .leftJoin(relationshipTypes, eq(relationships.relationshipTypeId, relationshipTypes.id))
    .where(
      or(
        and(
          eq(relationships.sourceEntityId, entityId),
          eq(relationships.sourceEntityType, entityType as any)
        ),
        and(
          eq(relationships.targetEntityId, entityId),
          eq(relationships.targetEntityType, entityType as any)
        )
      )
    );
  
  return result;
}

// =====================================================
// HYPERGRAPH OPERATIONS
// =====================================================

export async function createHypergraphNode(node: InsertHypergraphNode) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(hypergraphNodes).values(node);
  return result;
}

export async function getHypergraphNodeByEntity(nodeType: string, entityId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(hypergraphNodes)
    .where(and(
      eq(hypergraphNodes.nodeType, nodeType),
      eq(hypergraphNodes.entityId, entityId)
    ))
    .limit(1);
  
  return result[0] || null;
}

export async function createHypergraphHyperedge(hyperedge: InsertHypergraphHyperedge) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(hypergraphHyperedges).values(hyperedge);
  return result;
}

export async function createHypergraphIncidence(incidence: InsertHypergraphIncidence) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(hypergraphIncidences).values(incidence);
  return result;
}

export async function getHypergraphNeighborhood(nodeId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all hyperedges containing this node
  const result = await db
    .select({
      hyperedgeId: hypergraphHyperedges.id,
      edgeType: hypergraphHyperedges.edgeType,
      label: hypergraphHyperedges.label,
      weight: hypergraphHyperedges.weight,
      participants: sql<string>`GROUP_CONCAT(
        CONCAT(${hypergraphNodes.label}, ' (', ${hypergraphIncidences.role}, ')')
        SEPARATOR ', '
      )`,
    })
    .from(hypergraphIncidences)
    .leftJoin(hypergraphHyperedges, eq(hypergraphIncidences.hyperedgeId, hypergraphHyperedges.id))
    .leftJoin(hypergraphNodes, eq(hypergraphIncidences.nodeId, hypergraphNodes.id))
    .where(sql`${hypergraphIncidences.hyperedgeId} IN (
      SELECT hyperedgeId FROM hypergraph_incidences WHERE nodeId = ${nodeId}
    )`)
    .groupBy(hypergraphHyperedges.id, hypergraphHyperedges.edgeType, hypergraphHyperedges.label, hypergraphHyperedges.weight);
  
  return result;
}

// =====================================================
// EVENTS & STATE TRANSITIONS
// =====================================================

export async function createEvent(event: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(events).values(event);
  return result;
}

export async function getEventTimeline(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(events)
    .where(and(
      eq(events.targetEntityType, entityType),
      eq(events.targetEntityId, entityId)
    ))
    .orderBy(events.timestamp);
}

export async function createStateTransition(transition: InsertStateTransition) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(stateTransitions).values(transition);
  return result;
}

export async function getValidTransitions(entityType: string, fromState: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(stateTransitions)
    .where(and(
      eq(stateTransitions.entityType, entityType),
      eq(stateTransitions.fromState, fromState)
    ));
}

// =====================================================
// SYSTEM DYNAMICS - Stocks & Flows
// =====================================================

export async function createStock(stock: InsertStock) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(stocks).values(stock);
  return result;
}

export async function getStocksByEntity(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(stocks)
    .where(and(
      eq(stocks.entityType, entityType),
      eq(stocks.entityId, entityId)
    ));
}

export async function createFlow(flow: InsertFlow) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(flows).values(flow);
  return result;
}

export async function getFlowsByStock(stockId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(flows)
    .where(or(
      eq(flows.sourceStockId, stockId),
      eq(flows.targetStockId, stockId)
    ));
}

export async function getStockFlowDynamics(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Calculate net flow for each stock
  const query = sql`
    SELECT 
      s.id AS stockId,
      s.stockName,
      s.currentValue,
      s.unit,
      COALESCE(SUM(CASE WHEN f.targetStockId = s.id THEN f.currentRate ELSE 0 END), 0) AS totalInflow,
      COALESCE(SUM(CASE WHEN f.sourceStockId = s.id THEN f.currentRate ELSE 0 END), 0) AS totalOutflow,
      s.currentValue + 
        COALESCE(SUM(CASE WHEN f.targetStockId = s.id THEN f.currentRate ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN f.sourceStockId = s.id THEN f.currentRate ELSE 0 END), 0) AS projectedValue
    FROM stocks s
    LEFT JOIN flows f ON s.id = f.sourceStockId OR s.id = f.targetStockId
    WHERE s.entityType = ${entityType} AND s.entityId = ${entityId}
    GROUP BY s.id, s.stockName, s.currentValue, s.unit
  `;
  
  return await db.execute(query);
}

export async function createSimulationRun(simulation: InsertSimulationRun) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(simulationRuns).values(simulation);
  return result;
}

export async function updateSimulationRun(id: number, updates: Partial<InsertSimulationRun>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.update(simulationRuns)
    .set(updates)
    .where(eq(simulationRuns.id, id));
  
  return result;
}

export async function getSimulationRuns(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(simulationRuns)
    .orderBy(sql`${simulationRuns.createdAt} DESC`)
    .limit(limit);
}
