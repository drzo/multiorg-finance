# Project TODO

## Database Schema
- [x] Organizations table with hierarchical parent-child relationships
- [x] Expenses table with categorization and org assignment
- [x] Debts table with tracking and payment history
- [x] Invoices table with file storage references
- [x] Bank statements table with file storage references
- [x] Transactions table for parsed financial data

## Backend API (tRPC Procedures)
- [x] Organization CRUD operations
- [x] Expense CRUD operations
- [x] Debt CRUD operations
- [x] Invoice upload and parsing
- [x] Bank statement upload and parsing
- [x] Financial aggregation queries (monthly/weekly views)
- [x] Org hierarchy queries for tensor visualization

## File Upload & Parsing
- [x] File upload endpoint with S3 storage
- [x] Invoice parsing logic (PDF/image extraction)
- [x] Bank statement parsing (CSV/PDF support)
- [x] Transaction auto-import from parsed files

## Tensor-Based Org Visualization
- [x] D3.js hierarchical graph component
- [x] Anime.js animation for org relationships
- [x] Parent-child fiber bundle representation
- [x] Interactive node exploration

## Dashboard & Reporting
- [x] Financial overview dashboard
- [x] Monthly financial summary view
- [x] Weekly financial summary view
- [x] Debt management dashboard
- [x] Expense tracking dashboard
- [x] Organization hierarchy view

## CRUD Interfaces
- [x] Organization management page
- [x] Expense management page
- [x] Debt management page
- [x] Invoice management page
- [x] Bank statement management page
- [x] Transaction review page

## Testing & Deployment
- [x] Write vitest tests for core procedures
- [x] Test file upload and parsing
- [x] Test org hierarchy visualization
- [x] Create checkpoint for deployment

## Hypergraph Enhancement

### Multi-Parent Shareholding & Multiplex Networks
- [x] Create shareholding table for multi-parent ownership
- [x] Implement relationship types table (ownership, partnership, subsidiary, etc.)
- [x] Build hyperedge table for n-ary relationships
- [x] Create agent profiles table (individual + population attributes)
- [x] Implement multiplex network queries

### Discrete Event Timeline & State Transformations
- [x] Create events table with state snapshots
- [x] Implement state transitions table
- [x] Build timeline query system
- [x] Create event-driven state machine
- [x] Add temporal queries for state history

### System Dynamics (Stocks & Flows)
- [x] Create stocks table (accumulations)
- [x] Create flows table (rates of change)
- [x] Implement stock-flow relationships
- [x] Build differential equation solver
- [x] Add system dynamics simulation engine

### Universal Hypergraph Representation
- [x] Create hypergraph nodes table (universal entity representation)
- [x] Create hypergraph hyperedges table (n-ary relationships)
- [x] Implement hypergraph traversal algorithms
- [x] Build hypergraph visualization component
- [x] Add hypergraph query language

### Testing & Documentation
- [ ] Write tests for hypergraph operations
- [ ] Document hypergraph schema
- [ ] Create hypergraph visualization examples
- [ ] Add API documentation for new endpoints
