import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Organizations table with hierarchical parent-child relationships
 * Supports tensor-based visualization where child entities are fibers of parent bundles
 */
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  parentId: int("parentId"), // Self-referencing for hierarchy
  ownerId: int("ownerId").notNull(), // User who created/owns this org
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

/**
 * Expenses table for tracking all expenditures
 */
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(), // Who recorded this expense
  amount: int("amount").notNull(), // Store as cents to avoid decimal issues
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  category: varchar("category", { length: 100 }),
  description: text("description"),
  expenseDate: timestamp("expenseDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

/**
 * Debts table for tracking money owed
 */
export const debts = mysqlTable("debts", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(), // Who recorded this debt
  creditorName: varchar("creditorName", { length: 255 }).notNull(),
  originalAmount: int("originalAmount").notNull(), // Store as cents
  remainingAmount: int("remainingAmount").notNull(), // Store as cents
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  interestRate: int("interestRate"), // Store as basis points (e.g., 500 = 5%)
  dueDate: timestamp("dueDate"),
  status: mysqlEnum("status", ["active", "paid", "overdue"]).default("active").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Debt = typeof debts.$inferSelect;
export type InsertDebt = typeof debts.$inferInsert;

/**
 * Debt payments tracking
 */
export const debtPayments = mysqlTable("debtPayments", {
  id: int("id").autoincrement().primaryKey(),
  debtId: int("debtId").notNull(),
  amount: int("amount").notNull(), // Store as cents
  paymentDate: timestamp("paymentDate").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DebtPayment = typeof debtPayments.$inferSelect;
export type InsertDebtPayment = typeof debtPayments.$inferInsert;

/**
 * Invoices table for uploaded invoice files
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(), // Who uploaded this
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 key
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(), // S3 URL
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"), // bytes
  parsedData: text("parsedData"), // JSON string of parsed invoice data
  isParsed: boolean("isParsed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Bank statements table for uploaded statement files
 */
export const bankStatements = mysqlTable("bankStatements", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(), // Who uploaded this
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 key
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(), // S3 URL
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"), // bytes
  statementDate: timestamp("statementDate"),
  parsedData: text("parsedData"), // JSON string of parsed transactions
  isParsed: boolean("isParsed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BankStatement = typeof bankStatements.$inferSelect;
export type InsertBankStatement = typeof bankStatements.$inferInsert;

/**
 * Transactions table for parsed financial data from invoices/statements
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  sourceType: mysqlEnum("sourceType", ["invoice", "bank_statement", "manual"]).notNull(),
  sourceId: int("sourceId"), // Reference to invoice or bank statement
  amount: int("amount").notNull(), // Store as cents
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  transactionDate: timestamp("transactionDate").notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  isIncome: boolean("isIncome").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// =====================================================
// HYPERGRAPH EXTENSION - Multi-Agent Networks
// =====================================================

/**
 * Agents table - Multi-agent actor network
 * Represents individual and population-level actors
 */
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  entityId: int("entityId").notNull(),
  entityType: mysqlEnum("entityType", ["organization", "user", "population"]).notNull(),
  agentType: mysqlEnum("agentType", ["individual", "collective", "population"]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  attributes: json("attributes"), // Agent-specific attributes
  state: json("state"), // Current agent state
  behaviorModel: varchar("behaviorModel", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

/**
 * Shareholding table - Multi-parent ownership structure
 * Replaces simple parentId with complex weighted relationships
 */
export const shareholding = mysqlTable("shareholding", {
  id: int("id").autoincrement().primaryKey(),
  childOrgId: int("childOrgId").notNull(),
  parentOrgId: int("parentOrgId").notNull(),
  sharePercentage: int("sharePercentage").notNull(), // Store as basis points (10000 = 100%)
  shareClass: varchar("shareClass", { length: 50 }),
  votingRights: int("votingRights"), // Store as basis points
  acquisitionDate: timestamp("acquisitionDate"),
  attributes: json("attributes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Shareholding = typeof shareholding.$inferSelect;
export type InsertShareholding = typeof shareholding.$inferInsert;

/**
 * Relationship types - Defines types of relationships in multiplex network
 */
export const relationshipTypes = mysqlTable("relationship_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  category: mysqlEnum("category", [
    "ownership",
    "partnership",
    "transaction",
    "dependency",
    "communication",
    "hierarchy",
    "custom",
  ]).notNull(),
  isDirected: boolean("isDirected").default(true).notNull(),
  isWeighted: boolean("isWeighted").default(false).notNull(),
  attributes: json("attributes"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RelationshipType = typeof relationshipTypes.$inferSelect;
export type InsertRelationshipType = typeof relationshipTypes.$inferInsert;

/**
 * Relationships table - Multiplex network edges
 * Stores typed relationships between entities
 */
export const relationships = mysqlTable("relationships", {
  id: int("id").autoincrement().primaryKey(),
  relationshipTypeId: int("relationshipTypeId").notNull(),
  sourceEntityId: int("sourceEntityId").notNull(),
  sourceEntityType: mysqlEnum("sourceEntityType", ["organization", "user", "agent"]).notNull(),
  targetEntityId: int("targetEntityId").notNull(),
  targetEntityType: mysqlEnum("targetEntityType", ["organization", "user", "agent"]).notNull(),
  weight: int("weight"), // Store as basis points for consistency
  attributes: json("attributes"),
  validFrom: timestamp("validFrom").defaultNow().notNull(),
  validTo: timestamp("validTo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Relationship = typeof relationships.$inferSelect;
export type InsertRelationship = typeof relationships.$inferInsert;

/**
 * Hypergraph nodes - Universal entity representation
 * All entities become nodes in the hypergraph
 */
export const hypergraphNodes = mysqlTable("hypergraph_nodes", {
  id: int("id").autoincrement().primaryKey(),
  nodeType: varchar("nodeType", { length: 50 }).notNull(),
  entityId: int("entityId").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  properties: json("properties"),
  embedding: json("embedding"), // Vector embedding for similarity
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HypergraphNode = typeof hypergraphNodes.$inferSelect;
export type InsertHypergraphNode = typeof hypergraphNodes.$inferInsert;

/**
 * Hypergraph hyperedges - N-ary relationships
 * Connects multiple nodes simultaneously
 */
export const hypergraphHyperedges = mysqlTable("hypergraph_hyperedges", {
  id: int("id").autoincrement().primaryKey(),
  edgeType: varchar("edgeType", { length: 50 }).notNull(),
  label: varchar("label", { length: 255 }),
  properties: json("properties"),
  weight: int("weight"), // Store as basis points
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HypergraphHyperedge = typeof hypergraphHyperedges.$inferSelect;
export type InsertHypergraphHyperedge = typeof hypergraphHyperedges.$inferInsert;

/**
 * Hypergraph incidences - Node-hyperedge connections
 * Incidence matrix representation
 */
export const hypergraphIncidences = mysqlTable("hypergraph_incidences", {
  id: int("id").autoincrement().primaryKey(),
  hyperedgeId: int("hyperedgeId").notNull(),
  nodeId: int("nodeId").notNull(),
  role: varchar("role", { length: 50 }),
  weight: int("weight"), // Store as basis points
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HypergraphIncidence = typeof hypergraphIncidences.$inferSelect;
export type InsertHypergraphIncidence = typeof hypergraphIncidences.$inferInsert;

/**
 * Events table - Discrete event timeline
 * Records state-changing events
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  sourceEntityId: int("sourceEntityId"),
  sourceEntityType: varchar("sourceEntityType", { length: 50 }),
  targetEntityId: int("targetEntityId"),
  targetEntityType: varchar("targetEntityType", { length: 50 }),
  stateBefore: json("stateBefore"),
  stateAfter: json("stateAfter"),
  eventData: json("eventData"),
  causedBy: int("causedBy"), // Previous event in causal chain
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * State transitions - State machine definition
 * Defines valid state transitions for entities
 */
export const stateTransitions = mysqlTable("state_transitions", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  fromState: varchar("fromState", { length: 100 }).notNull(),
  toState: varchar("toState", { length: 100 }).notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  conditions: json("conditions"),
  actions: json("actions"),
  probability: int("probability"), // Store as basis points
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StateTransition = typeof stateTransitions.$inferSelect;
export type InsertStateTransition = typeof stateTransitions.$inferInsert;

/**
 * Stocks table - System dynamics accumulations
 * Represents stock variables that change via flows
 */
export const stocks = mysqlTable("stocks", {
  id: int("id").autoincrement().primaryKey(),
  entityId: int("entityId").notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  stockName: varchar("stockName", { length: 100 }).notNull(),
  currentValue: int("currentValue").notNull(), // Store as integer (scaled)
  unit: varchar("unit", { length: 50 }),
  minValue: int("minValue"),
  maxValue: int("maxValue"),
  initialValue: int("initialValue"),
  attributes: json("attributes"),
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Stock = typeof stocks.$inferSelect;
export type InsertStock = typeof stocks.$inferInsert;

/**
 * Flows table - System dynamics rates of change
 * Represents flow variables that change stock levels
 */
export const flows = mysqlTable("flows", {
  id: int("id").autoincrement().primaryKey(),
  flowName: varchar("flowName", { length: 100 }).notNull(),
  sourceStockId: int("sourceStockId"),
  targetStockId: int("targetStockId"),
  flowType: mysqlEnum("flowType", ["inflow", "outflow", "biflow"]).notNull(),
  rateFormula: text("rateFormula").notNull(),
  currentRate: int("currentRate"), // Store as integer (scaled)
  unit: varchar("unit", { length: 50 }),
  attributes: json("attributes"),
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Flow = typeof flows.$inferSelect;
export type InsertFlow = typeof flows.$inferInsert;

/**
 * Simulation runs - System dynamics simulation history
 */
export const simulationRuns = mysqlTable("simulation_runs", {
  id: int("id").autoincrement().primaryKey(),
  runName: varchar("runName", { length: 255 }).notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  timeStep: int("timeStep").notNull(), // Store as milliseconds
  parameters: json("parameters"),
  results: json("results"),
  status: mysqlEnum("status", ["running", "completed", "failed"]).default("running").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type SimulationRun = typeof simulationRuns.$inferSelect;
export type InsertSimulationRun = typeof simulationRuns.$inferInsert;
