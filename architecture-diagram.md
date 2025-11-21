# Multi-Org Finance Management System Architecture

## High-Level Data Flow: Upload → AI Parsing → Tensor Visualization

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React UI Components]
        Upload[File Upload Component]
        Dashboard[Financial Dashboard]
        TensorViz[Tensor-Based Org Hierarchy Visualization]
    end

    subgraph "API Layer - tRPC"
        InvoiceAPI[Invoice Router]
        BankStmtAPI[Bank Statement Router]
        TransAPI[Transaction Router]
        OrgAPI[Organization Router]
        ExpenseAPI[Expense Router]
        DebtAPI[Debt Router]
    end

    subgraph "Business Logic Layer"
        FileHandler[File Handler]
        S3Storage[S3 Storage Service]
        AIParser[AI Document Parser - LLM]
        DataExtractor[Data Extraction Engine]
        TensorCalc[Tensor Hierarchy Calculator]
    end

    subgraph "Data Layer"
        DB[(MySQL Database)]
        
        subgraph "Database Tables"
            OrgTable[Organizations Table]
            InvoiceTable[Invoices Table]
            BankStmtTable[Bank Statements Table]
            TransTable[Transactions Table]
            ExpenseTable[Expenses Table]
            DebtTable[Debts Table]
        end
    end

    %% Upload Flow
    Upload -->|1. User uploads file| InvoiceAPI
    Upload -->|1. User uploads file| BankStmtAPI
    
    InvoiceAPI -->|2. Base64 content| FileHandler
    BankStmtAPI -->|2. Base64 content| FileHandler
    
    FileHandler -->|3. Store file| S3Storage
    S3Storage -->|4. Return URL| FileHandler
    
    FileHandler -->|5. Save metadata| InvoiceTable
    FileHandler -->|5. Save metadata| BankStmtTable
    
    %% AI Parsing Flow
    InvoiceAPI -->|6. Parse request| AIParser
    BankStmtAPI -->|6. Parse request| AIParser
    
    AIParser -->|7. Fetch file URL| S3Storage
    AIParser -->|8. Extract data with LLM| DataExtractor
    
    DataExtractor -->|9. Structured data| TransAPI
    TransAPI -->|10. Create transactions| TransTable
    TransAPI -->|10. Link to source| InvoiceTable
    TransAPI -->|10. Link to source| BankStmtTable
    
    %% Organization Hierarchy Flow
    OrgAPI -->|11. Query hierarchy| OrgTable
    OrgTable -->|12. Parent-child relations| TensorCalc
    
    TensorCalc -->|13. Calculate fiber bundles| Dashboard
    Dashboard -->|14. Render tensor graph| TensorViz
    
    %% Financial Aggregation Flow
    ExpenseAPI -->|Query expenses| ExpenseTable
    DebtAPI -->|Query debts| DebtTable
    TransAPI -->|Query transactions| TransTable
    
    ExpenseTable -->|Aggregate by org| Dashboard
    DebtTable -->|Aggregate by org| Dashboard
    TransTable -->|Aggregate by org| Dashboard
    
    %% Visualization
    TensorViz -->|D3.js hierarchical layout| UI
    Dashboard -->|Financial metrics| UI

    style AIParser fill:#ff9999
    style TensorCalc fill:#99ccff
    style S3Storage fill:#99ff99
    style DB fill:#ffcc99
```

## Detailed Component Architecture

```mermaid
graph LR
    subgraph "Client Side"
        A[User Interface]
        B[tRPC Client]
        C[React Query Cache]
    end

    subgraph "Server Side"
        D[Express Server]
        E[tRPC Router]
        F[Authentication Middleware]
        G[Business Logic]
    end

    subgraph "External Services"
        H[Manus LLM API]
        I[S3 Storage]
        J[MySQL Database]
    end

    A --> B
    B --> C
    B --> D
    D --> F
    F --> E
    E --> G
    G --> H
    G --> I
    G --> J

    style H fill:#ff9999
    style I fill:#99ff99
    style J fill:#ffcc99
```

## Data Flow Sequence: Invoice Upload to Visualization

```mermaid
sequenceDiagram
    participant User
    participant UI as React UI
    participant tRPC as tRPC Client
    participant API as Invoice Router
    participant S3 as S3 Storage
    participant LLM as AI Parser (LLM)
    participant DB as Database
    participant Viz as Tensor Visualizer

    User->>UI: Upload invoice file
    UI->>tRPC: invoices.upload(file)
    tRPC->>API: Upload mutation
    
    API->>S3: storagePut(fileContent)
    S3-->>API: Return file URL
    
    API->>DB: Insert invoice metadata
    DB-->>API: Invoice ID
    API-->>tRPC: Success response
    tRPC-->>UI: Update UI

    User->>UI: Click "Parse with AI"
    UI->>tRPC: invoices.parse(id)
    tRPC->>API: Parse mutation
    
    API->>S3: Fetch file from URL
    S3-->>API: File content
    
    API->>LLM: invokeLLM(prompt + file)
    Note over LLM: Extract: amount, date,<br/>vendor, line items
    LLM-->>API: Structured JSON data
    
    API->>DB: Create transactions
    API->>DB: Update invoice.isParsed
    DB-->>API: Success
    API-->>tRPC: Parsed data
    tRPC-->>UI: Refresh transactions

    User->>UI: View Dashboard
    UI->>tRPC: organizations.hierarchy()
    tRPC->>API: Hierarchy query
    API->>DB: SELECT with parent joins
    DB-->>API: Org tree structure
    
    API->>Viz: Calculate tensor layout
    Note over Viz: D3.js hierarchical tree<br/>Fiber bundle representation
    Viz-->>API: Layout coordinates
    API-->>tRPC: Hierarchy data
    tRPC-->>UI: Render tensor graph
    UI-->>User: Display visualization
```

## Tensor-Based Hierarchy Representation

```mermaid
graph TD
    Root[Root Organization Bundle]
    
    Root -->|Fiber 1| Child1[Child Org 1]
    Root -->|Fiber 2| Child2[Child Org 2]
    Root -->|Fiber 3| Child3[Child Org 3]
    
    Child1 -->|Fiber 1.1| GC1[Grandchild 1.1]
    Child1 -->|Fiber 1.2| GC2[Grandchild 1.2]
    
    Child2 -->|Fiber 2.1| GC3[Grandchild 2.1]
    
    Child3 -->|Fiber 3.1| GC4[Grandchild 3.1]
    Child3 -->|Fiber 3.2| GC5[Grandchild 3.2]
    Child3 -->|Fiber 3.3| GC6[Grandchild 3.3]

    style Root fill:#4a90e2,stroke:#2e5c8a,stroke-width:3px
    style Child1 fill:#7cb342,stroke:#558b2f
    style Child2 fill:#7cb342,stroke:#558b2f
    style Child3 fill:#7cb342,stroke:#558b2f
    style GC1 fill:#ffa726,stroke:#f57c00
    style GC2 fill:#ffa726,stroke:#f57c00
    style GC3 fill:#ffa726,stroke:#f57c00
    style GC4 fill:#ffa726,stroke:#f57c00
    style GC5 fill:#ffa726,stroke:#f57c00
    style GC6 fill:#ffa726,stroke:#f57c00
```

## Database Schema Relationships

```mermaid
erDiagram
    USERS ||--o{ ORGANIZATIONS : creates
    ORGANIZATIONS ||--o{ ORGANIZATIONS : "parent-child"
    ORGANIZATIONS ||--o{ EXPENSES : has
    ORGANIZATIONS ||--o{ DEBTS : has
    ORGANIZATIONS ||--o{ INVOICES : has
    ORGANIZATIONS ||--o{ BANK_STATEMENTS : has
    ORGANIZATIONS ||--o{ TRANSACTIONS : has
    
    INVOICES ||--o{ TRANSACTIONS : generates
    BANK_STATEMENTS ||--o{ TRANSACTIONS : generates
    DEBTS ||--o{ DEBT_PAYMENTS : has
    
    USERS {
        int id PK
        string openId UK
        string name
        string email
        enum role
    }
    
    ORGANIZATIONS {
        int id PK
        int userId FK
        int parentId FK
        string name
        text description
    }
    
    EXPENSES {
        int id PK
        int organizationId FK
        int amount
        string category
        datetime expenseDate
    }
    
    DEBTS {
        int id PK
        int organizationId FK
        string creditorName
        int originalAmount
        int remainingAmount
        enum status
    }
    
    INVOICES {
        int id PK
        int organizationId FK
        string fileName
        string fileUrl
        boolean isParsed
    }
    
    BANK_STATEMENTS {
        int id PK
        int organizationId FK
        string fileName
        string fileUrl
        boolean isParsed
    }
    
    TRANSACTIONS {
        int id PK
        int organizationId FK
        int sourceId FK
        enum sourceType
        int amount
        boolean isIncome
        datetime transactionDate
    }
    
    DEBT_PAYMENTS {
        int id PK
        int debtId FK
        int amount
        datetime paymentDate
    }
```

## Technology Stack

```mermaid
mindmap
  root((Multi-Org Finance))
    Frontend
      React 19
      Tailwind CSS 4
      shadcn/ui
      D3.js
      Wouter Router
      tRPC Client
    Backend
      Express 4
      tRPC 11
      Node.js 22
      TypeScript
      Drizzle ORM
    Database
      MySQL/TiDB
      Drizzle Schema
    External Services
      Manus LLM API
      S3 Storage
      OAuth Authentication
    Testing
      Vitest
      TypeScript Compiler
    Visualization
      D3.js Hierarchical Layout
      SVG Rendering
      Tensor Fiber Bundles
```

## Key Architectural Patterns

### 1. **Tensor-Based Hierarchy**
- Organizations are modeled as fiber bundles
- Parent organizations are bundles containing child fibers
- D3.js hierarchical tree layout with custom fiber rendering
- Each connection represents a parent-child relationship as a fiber in the bundle

### 2. **AI-Powered Document Parsing**
- Files uploaded to S3 for persistent storage
- LLM (Claude) extracts structured data from unstructured documents
- Automatic transaction creation from parsed invoices/statements
- Metadata stored in database with links to S3 files

### 3. **Type-Safe API with tRPC**
- End-to-end type safety from database to UI
- No manual API contracts or REST endpoints
- Automatic serialization with SuperJSON (Date objects preserved)
- React Query integration for caching and optimistic updates

### 4. **Financial Aggregation**
- Real-time calculation of totals across org hierarchy
- Monthly and weekly financial views
- Debt tracking with payment history
- Transaction categorization and filtering

### 5. **Multi-Tenancy**
- User-scoped data isolation
- Organization hierarchy supports unlimited nesting
- Role-based access control (admin/user)
- OAuth-based authentication

## Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        LB[Load Balancer]
        
        subgraph "Application Servers"
            App1[Node.js Instance 1]
            App2[Node.js Instance 2]
        end
        
        subgraph "Data Layer"
            DB[(MySQL Primary)]
            DBReplica[(MySQL Replica)]
        end
        
        subgraph "External Services"
            S3[S3 Storage]
            LLM[Manus LLM API]
            OAuth[OAuth Server]
        end
    end
    
    Users[Users] --> LB
    LB --> App1
    LB --> App2
    
    App1 --> DB
    App2 --> DB
    App1 --> DBReplica
    App2 --> DBReplica
    
    App1 --> S3
    App2 --> S3
    App1 --> LLM
    App2 --> LLM
    App1 --> OAuth
    App2 --> OAuth

    style LB fill:#4a90e2
    style DB fill:#ffcc99
    style S3 fill:#99ff99
    style LLM fill:#ff9999
```

---

## Summary

This architecture demonstrates:

1. **Separation of Concerns**: Clear boundaries between UI, API, business logic, and data layers
2. **Scalability**: Stateless API servers, database replication, external storage
3. **Type Safety**: End-to-end TypeScript with tRPC
4. **AI Integration**: LLM-powered document parsing for automation
5. **Advanced Visualization**: Tensor-based hierarchical representation using D3.js
6. **Real-time Updates**: React Query for optimistic UI updates
7. **Security**: OAuth authentication, user-scoped data, role-based access

The system efficiently handles the complete flow from document upload through AI parsing to visual representation in the tensor-based organization hierarchy.
