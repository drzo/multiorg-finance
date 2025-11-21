# Universal Hypergraph System Guide

## Overview

The Multi-Org Finance Management System has been extended with a **universal hypergraph representation** that supports:

1. **Multi-parent shareholding** - Complex ownership structures with weighted relationships
2. **Multiplex networks** - Multiple simultaneous relationship types between entities
3. **Multi-agent actor networks** - Individual and population-level agents with behavior models
4. **Discrete event timelines** - State-changing events with causal chains
5. **System dynamics** - Stocks and flows modeling for simulation
6. **N-ary hyperedges** - Relationships connecting multiple entities simultaneously

This transforms the simple tree hierarchy into a sophisticated multi-dimensional network capable of representing complex organizational structures, ownership chains, agent interactions, and temporal dynamics.

---

## Architecture

### Conceptual Model

```
Traditional Tree:           Universal Hypergraph:
    A                       ╔═══════════════════════════╗
   / \                      ║  Universal Hypergraph     ║
  B   C                     ║  - Nodes (all entities)   ║
 / \                        ║  - Hyperedges (n-ary)     ║
D   E                       ║  - Shareholdings (multi)  ║
                            ║  - Relationships (typed)  ║
                            ║  - Events (temporal)      ║
                            ║  - Stocks & Flows         ║
                            ╚═══════════════════════════╝
```

### Data Model Layers

1. **Base Layer**: Organizations, Users, Transactions (existing)
2. **Agent Layer**: Multi-agent profiles with behavior models
3. **Ownership Layer**: Multi-parent shareholding with percentages
4. **Relationship Layer**: Typed multiplex network edges
5. **Hypergraph Layer**: Universal nodes and n-ary hyperedges
6. **Temporal Layer**: Events and state transitions
7. **Dynamics Layer**: Stocks, flows, and simulations

---

## Key Features

### 1. Multi-Parent Shareholding

**Problem Solved**: Traditional tree structures only allow one parent. Real organizations have multiple shareholders.

**Implementation**:
- `shareholding` table replaces simple `parentId`
- Each shareholding has `sharePercentage` (in basis points: 10000 = 100%)
- Supports `votingRights` separate from ownership percentage
- Tracks `shareClass` (common, preferred, voting, etc.)

**Example**:
```typescript
// Company C is owned by:
// - Company A: 60% ownership, 70% voting rights
// - Company B: 40% ownership, 30% voting rights

await trpc.hypergraph.createShareholding.mutate({
  childOrgId: companyC.id,
  parentOrgId: companyA.id,
  sharePercentage: 6000, // 60% in basis points
  votingRights: 7000,     // 70% in basis points
  shareClass: "common"
});

await trpc.hypergraph.createShareholding.mutate({
  childOrgId: companyC.id,
  parentOrgId: companyB.id,
  sharePercentage: 4000,
  votingRights: 3000,
  shareClass: "preferred"
});
```

**Effective Ownership Calculation**:
```typescript
// Calculate transitive ownership through chains
// If A owns 60% of B, and B owns 40% of C
// Then A effectively owns 24% of C (0.6 × 0.4)

const ownership = await trpc.hypergraph.getEffectiveOwnership.query({
  parentOrgId: companyA.id,
  maxDepth: 10
});
```

### 2. Multiplex Networks

**Problem Solved**: Entities have multiple types of relationships simultaneously (ownership, partnership, competition, etc.)

**Implementation**:
- `relationship_types` defines edge types with categories
- `relationships` stores typed edges between entities
- Supports directed/undirected and weighted/unweighted edges
- Temporal validity (`validFrom`, `validTo`)

**Relationship Categories**:
- `ownership` - Ownership relationships
- `partnership` - Collaborations and partnerships
- `transaction` - Financial transactions and supply chains
- `dependency` - Dependencies between entities
- `communication` - Communication channels
- `hierarchy` - Reporting hierarchies
- `custom` - User-defined relationship types

**Example**:
```typescript
// Create relationship types
await trpc.hypergraph.createRelationshipType.mutate({
  name: "supplies_to",
  category: "transaction",
  isDirected: true,
  isWeighted: true,
  description: "Supply chain relationship"
});

// Create relationship
await trpc.hypergraph.createRelationship.mutate({
  relationshipTypeId: suppliesTo.id,
  sourceEntityId: supplierOrg.id,
  sourceEntityType: "organization",
  targetEntityId: buyerOrg.id,
  targetEntityType: "organization",
  weight: 5000, // Strength of relationship (basis points)
  validFrom: new Date("2024-01-01"),
  validTo: null // Ongoing
});

// Query all relationships for an entity
const relationships = await trpc.hypergraph.getRelationshipsByEntity.query({
  entityType: "organization",
  entityId: myOrg.id
});
```

### 3. Multi-Agent Actor Networks

**Problem Solved**: Need to model entities as agents with goals, capabilities, and behavior models.

**Implementation**:
- `agents` table extends organizations/users with agent attributes
- Supports individual, collective, and population agents
- Stores agent state and behavior model type

**Agent Types**:
- `individual` - Single actor (person, organization)
- `collective` - Group of coordinated actors
- `population` - Large-scale population dynamics

**Behavior Models**:
- `rational` - Fully rational decision-making
- `bounded-rational` - Limited rationality
- `learning` - Adaptive learning agents
- `reactive` - Stimulus-response agents
- `custom` - User-defined models

**Example**:
```typescript
// Create agent profile for organization
await trpc.hypergraph.createAgent.mutate({
  entityId: myOrg.id,
  entityType: "organization",
  agentType: "individual",
  name: "Acme Corp Agent",
  attributes: {
    goals: ["maximize_profit", "minimize_risk"],
    capabilities: ["manufacturing", "distribution"],
    constraints: { budget: 1000000, capacity: 500 }
  },
  state: {
    resources: { cash: 500000, inventory: 200 },
    position: { market_share: 0.15 }
  },
  behaviorModel: "bounded-rational"
});
```

### 4. Discrete Event Timelines

**Problem Solved**: Need to track state changes over time and understand causal relationships between events.

**Implementation**:
- `events` table records discrete state-changing events
- Stores `stateBefore` and `stateAfter` snapshots
- Supports causal chains via `causedBy` field
- `state_transitions` defines valid state machine transitions

**Example**:
```typescript
// Record an event
await trpc.hypergraph.createEvent.mutate({
  eventType: "payment_received",
  timestamp: new Date(),
  sourceEntityId: customer.id,
  sourceEntityType: "organization",
  targetEntityId: myOrg.id,
  targetEntityType: "organization",
  stateBefore: { balance: 1000, status: "pending" },
  stateAfter: { balance: 1500, status: "paid" },
  eventData: { amount: 500, invoice_id: 123 },
  causedBy: previousEvent.id // Causal chain
});

// Query event timeline
const timeline = await trpc.hypergraph.getEventTimeline.query({
  entityType: "organization",
  entityId: myOrg.id
});

// Define valid state transitions
await trpc.hypergraph.createStateTransition.mutate({
  entityType: "debt",
  fromState: "active",
  toState: "paid",
  eventType: "payment_completed",
  conditions: { remainingAmount: 0 },
  actions: { updateStatus: "paid", notifyCreditor: true },
  probability: 10000 // 100% (deterministic)
});
```

### 5. System Dynamics (Stocks & Flows)

**Problem Solved**: Model accumulations (stocks) and rates of change (flows) for simulation and forecasting.

**Implementation**:
- `stocks` table represents accumulation variables
- `flows` table represents rate variables
- Supports differential equation modeling
- `simulation_runs` stores simulation results

**Stock-Flow Patterns**:
```
[Source] --flow--> [Stock] --flow--> [Sink]

Example:
[Revenue] --inflow--> [Cash] --outflow--> [Expenses]
```

**Example**:
```typescript
// Create stock (accumulation)
await trpc.hypergraph.createStock.mutate({
  entityId: myOrg.id,
  entityType: "organization",
  stockName: "cash_balance",
  currentValue: 100000, // $1,000.00 (in cents)
  unit: "USD_cents",
  minValue: 0,
  initialValue: 100000
});

// Create inflow
await trpc.hypergraph.createFlow.mutate({
  flowName: "monthly_revenue",
  sourceStockId: null, // Exogenous inflow
  targetStockId: cashStock.id,
  flowType: "inflow",
  rateFormula: "5000 * (1 + growth_rate)", // $50/month
  currentRate: 5000,
  unit: "USD_cents_per_month"
});

// Create outflow
await trpc.hypergraph.createFlow.mutate({
  flowName: "monthly_expenses",
  sourceStockId: cashStock.id,
  targetStockId: null, // Exogenous outflow
  flowType: "outflow",
  rateFormula: "3000", // $30/month fixed
  currentRate: 3000,
  unit: "USD_cents_per_month"
});

// Query stock-flow dynamics
const dynamics = await trpc.hypergraph.getStockFlowDynamics.query({
  entityType: "organization",
  entityId: myOrg.id
});

// Results show:
// - currentValue: 100000
// - totalInflow: 5000
// - totalOutflow: 3000
// - projectedValue: 102000 (net +2000 per period)
```

### 6. Universal Hypergraph

**Problem Solved**: Represent complex n-ary relationships that connect multiple entities simultaneously.

**Implementation**:
- `hypergraph_nodes` - Universal node representation (all entities)
- `hypergraph_hyperedges` - N-ary relationships
- `hypergraph_incidences` - Incidence matrix (node-hyperedge connections)

**Hyperedge vs. Edge**:
- **Edge**: Connects 2 nodes (A → B)
- **Hyperedge**: Connects N nodes (A, B, C, D → Hyperedge)

**Use Cases**:
- **Meetings**: Connect all participants
- **Transactions**: Connect buyer, seller, product, payment method
- **Projects**: Connect team members, resources, deliverables
- **Events**: Connect all affected entities

**Example**:
```typescript
// Create hypergraph nodes
const nodeA = await trpc.hypergraph.createHypergraphNode.mutate({
  nodeType: "organization",
  entityId: orgA.id,
  label: "Company A",
  properties: { industry: "tech", size: "large" }
});

const nodeB = await trpc.hypergraph.createHypergraphNode.mutate({
  nodeType: "organization",
  entityId: orgB.id,
  label: "Company B",
  properties: { industry: "finance", size: "medium" }
});

const nodeC = await trpc.hypergraph.createHypergraphNode.mutate({
  nodeType: "organization",
  entityId: orgC.id,
  label: "Company C",
  properties: { industry: "retail", size: "small" }
});

// Create hyperedge connecting all three
const hyperedge = await trpc.hypergraph.createHypergraphHyperedge.mutate({
  edgeType: "joint_venture",
  label: "Tech-Finance-Retail Partnership",
  properties: { startDate: "2024-01-01", duration: "3 years" },
  weight: 10000
});

// Create incidences (connect nodes to hyperedge)
await trpc.hypergraph.createHypergraphIncidence.mutate({
  hyperedgeId: hyperedge.id,
  nodeId: nodeA.id,
  role: "tech_provider",
  weight: 5000 // 50% stake
});

await trpc.hypergraph.createHypergraphIncidence.mutate({
  hyperedgeId: hyperedge.id,
  nodeId: nodeB.id,
  role: "financial_backer",
  weight: 3000 // 30% stake
});

await trpc.hypergraph.createHypergraphIncidence.mutate({
  hyperedgeId: hyperedge.id,
  nodeId: nodeC.id,
  role: "distribution_channel",
  weight: 2000 // 20% stake
});

// Query hypergraph neighborhood
const neighborhood = await trpc.hypergraph.getHypergraphNeighborhood.query({
  nodeId: nodeA.id
});
// Returns all hyperedges containing nodeA and their participants
```

---

## Visualization

### Universal Hypergraph Visualization Component

The `UniversalHypergraphVisualization` component provides interactive visualization of the entire hypergraph system.

**Features**:
- **Multiple view modes**:
  - All Layers: Shows everything simultaneously
  - Hypergraph Only: N-ary hyperedges only
  - Ownership Network: Multi-parent shareholding
  - Multiplex Network: Typed relationships
  
- **Color schemes**:
  - By Type: Color nodes by entity type
  - By Weight: Color by relationship strength
  - By Degree: Color by connectivity

- **Interactions**:
  - Drag nodes to reposition
  - Scroll to zoom in/out
  - Click nodes/hyperedges to select
  - Force-directed layout for automatic positioning

**Visual Encoding**:
- **Nodes**: Circles representing entities
- **Dashed lines**: Shareholding relationships (ownership)
- **Solid lines**: Typed relationships (multiplex)
- **Shaded regions**: Hyperedges (n-ary relationships)
- **Line thickness**: Relationship weight/strength

**Usage**:
```typescript
import UniversalHypergraphVisualization from "@/components/UniversalHypergraphVisualization";

<UniversalHypergraphVisualization
  nodes={hypergraphNodes}
  hyperedges={hyperedges}
  shareholdings={shareholdings}
  relationships={relationships}
  onNodeClick={(node) => console.log("Selected:", node)}
  onHyperedgeClick={(he) => console.log("Selected hyperedge:", he)}
/>
```

---

## Use Cases

### 1. Complex Corporate Structures

**Scenario**: Model a holding company with multiple subsidiaries, cross-shareholdings, and joint ventures.

**Solution**:
- Use multi-parent shareholding for ownership percentages
- Track voting rights separately from ownership
- Model joint ventures as hyperedges connecting multiple companies
- Calculate effective ownership through chains

### 2. Supply Chain Networks

**Scenario**: Track supplier-buyer relationships, dependencies, and transaction flows.

**Solution**:
- Use multiplex relationships for different connection types
- "supplies_to" relationships for supply chain
- "depends_on" relationships for dependencies
- "transacts_with" for financial flows
- Weight edges by transaction volume

### 3. Multi-Agent Simulation

**Scenario**: Simulate market dynamics with competing and cooperating agents.

**Solution**:
- Create agent profiles for each organization
- Define behavior models (rational, learning, etc.)
- Use events to record agent actions
- Track state transitions over time
- Run system dynamics simulations

### 4. Financial Forecasting

**Scenario**: Forecast cash flow, revenue, and expenses over time.

**Solution**:
- Model cash as a stock
- Revenue as inflow, expenses as outflow
- Define rate formulas based on business rules
- Run simulations with different parameters
- Analyze results for decision-making

### 5. Organizational Evolution

**Scenario**: Track how organizational structures change over time.

**Solution**:
- Record events for mergers, acquisitions, spin-offs
- Store state snapshots before/after each event
- Build causal chains of events
- Query timeline to understand history
- Visualize evolution in hypergraph

---

## API Reference

### Agents

```typescript
// Create agent
trpc.hypergraph.createAgent.mutate({ ... })

// Get agents by type
trpc.hypergraph.getAgentsByType.query({ agentType: "individual" })

// Get agent for entity
trpc.hypergraph.getAgentByEntity.query({ entityType: "organization", entityId: 1 })
```

### Shareholding

```typescript
// Create shareholding
trpc.hypergraph.createShareholding.mutate({ ... })

// Get shareholders
trpc.hypergraph.getShareholdersByOrg.query({ orgId: 1 })

// Get subsidiaries
trpc.hypergraph.getSubsidiariesByOrg.query({ orgId: 1 })

// Calculate effective ownership
trpc.hypergraph.getEffectiveOwnership.query({ parentOrgId: 1, maxDepth: 10 })
```

### Relationships

```typescript
// Create relationship type
trpc.hypergraph.createRelationshipType.mutate({ ... })

// Get all relationship types
trpc.hypergraph.getRelationshipTypes.query()

// Create relationship
trpc.hypergraph.createRelationship.mutate({ ... })

// Get relationships for entity
trpc.hypergraph.getRelationshipsByEntity.query({ entityType: "organization", entityId: 1 })
```

### Hypergraph

```typescript
// Create node
trpc.hypergraph.createHypergraphNode.mutate({ ... })

// Get node by entity
trpc.hypergraph.getHypergraphNodeByEntity.query({ nodeType: "organization", entityId: 1 })

// Create hyperedge
trpc.hypergraph.createHypergraphHyperedge.mutate({ ... })

// Create incidence
trpc.hypergraph.createHypergraphIncidence.mutate({ ... })

// Get neighborhood
trpc.hypergraph.getHypergraphNeighborhood.query({ nodeId: 1 })
```

### Events & State Transitions

```typescript
// Create event
trpc.hypergraph.createEvent.mutate({ ... })

// Get event timeline
trpc.hypergraph.getEventTimeline.query({ entityType: "organization", entityId: 1 })

// Create state transition rule
trpc.hypergraph.createStateTransition.mutate({ ... })

// Get valid transitions
trpc.hypergraph.getValidTransitions.query({ entityType: "debt", fromState: "active" })
```

### System Dynamics

```typescript
// Create stock
trpc.hypergraph.createStock.mutate({ ... })

// Get stocks for entity
trpc.hypergraph.getStocksByEntity.query({ entityType: "organization", entityId: 1 })

// Create flow
trpc.hypergraph.createFlow.mutate({ ... })

// Get flows for stock
trpc.hypergraph.getFlowsByStock.query({ stockId: 1 })

// Get stock-flow dynamics
trpc.hypergraph.getStockFlowDynamics.query({ entityType: "organization", entityId: 1 })

// Create simulation run
trpc.hypergraph.createSimulationRun.mutate({ ... })

// Update simulation
trpc.hypergraph.updateSimulationRun.mutate({ id: 1, updates: { status: "completed" } })

// Get simulation runs
trpc.hypergraph.getSimulationRuns.query({ limit: 10 })
```

---

## Database Schema

See `hypergraph-schema.sql` for complete SQL DDL with:
- 13 new tables for hypergraph functionality
- Comprehensive indexes for performance
- Foreign key constraints for integrity
- Example queries for common operations

Key tables:
- `agents` - Multi-agent profiles
- `shareholding` - Multi-parent ownership
- `relationship_types` - Edge type definitions
- `relationships` - Multiplex network edges
- `hypergraph_nodes` - Universal nodes
- `hypergraph_hyperedges` - N-ary relationships
- `hypergraph_incidences` - Incidence matrix
- `events` - Discrete event timeline
- `state_transitions` - State machine rules
- `stocks` - System dynamics accumulations
- `flows` - System dynamics rates
- `simulation_runs` - Simulation history

---

## Performance Considerations

### Indexing Strategy

All critical query paths are indexed:
- `idx_shareholding_child` - Fast parent lookup
- `idx_relationships_source` - Fast relationship queries
- `idx_hypergraph_incidences_node` - Fast neighborhood queries
- `idx_events_timestamp` - Fast timeline queries
- `idx_stocks_entity` - Fast stock queries

### Query Optimization

- Use recursive CTEs for ownership chains (limited depth)
- Batch hypergraph queries to reduce round-trips
- Cache simulation results for repeated analysis
- Use materialized views for complex aggregations

### Scalability

- Hypergraph operations scale with node count and edge density
- Consider partitioning events table by timestamp
- Use read replicas for analytical queries
- Implement pagination for large result sets

---

## Future Enhancements

1. **Temporal Hypergraphs**: Time-varying hyperedges
2. **Probabilistic Models**: Uncertainty in relationships
3. **Graph Algorithms**: Centrality, community detection, path finding
4. **Machine Learning**: Link prediction, node classification
5. **Real-time Updates**: WebSocket-based live visualization
6. **3D Visualization**: Three-dimensional hypergraph rendering
7. **Export Formats**: GraphML, GEXF, JSON-LD
8. **Query Language**: Domain-specific query language for hypergraphs

---

## References

- **Hypergraph Theory**: Berge, C. (1984). Hypergraphs: Combinatorics of Finite Sets
- **System Dynamics**: Sterman, J. (2000). Business Dynamics: Systems Thinking
- **Multi-Agent Systems**: Wooldridge, M. (2009). An Introduction to MultiAgent Systems
- **Multiplex Networks**: Kivelä, M. et al. (2014). Multilayer Networks

---

## Support

For questions or issues with the hypergraph system:
1. Check the SQL schema documentation
2. Review API examples in this guide
3. Inspect database with Management UI
4. Submit issues to GitHub repository

---

**Last Updated**: 2025-01-21  
**Version**: 2.0.0 (Hypergraph Extension)
