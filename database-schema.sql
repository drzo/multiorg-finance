-- =====================================================
-- Multi-Org Finance Management System - Database Schema
-- =====================================================
-- This schema supports tensor-based hierarchical organization representation
-- where child entities are modeled as fibers of their parent organization bundles
-- =====================================================

-- =====================================================
-- USERS TABLE
-- =====================================================
-- Core authentication and user management
-- Links to OAuth provider via openId
-- =====================================================

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `openId` VARCHAR(64) NOT NULL UNIQUE COMMENT 'OAuth identifier from Manus authentication',
  `name` TEXT COMMENT 'User display name',
  `email` VARCHAR(320) COMMENT 'User email address',
  `loginMethod` VARCHAR(64) COMMENT 'Authentication method used',
  `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user' COMMENT 'User role for access control',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX `idx_users_openId` (`openId`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User accounts with OAuth authentication';


-- =====================================================
-- ORGANIZATIONS TABLE - TENSOR HIERARCHY CORE
-- =====================================================
-- Implements hierarchical structure for tensor-based visualization
-- parentId creates the fiber bundle relationships:
--   - NULL parentId = Root organization (bundle)
--   - Non-NULL parentId = Child organization (fiber in parent bundle)
-- =====================================================

CREATE TABLE `organizations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL COMMENT 'Owner of this organization',
  `parentId` INT NULL COMMENT 'Parent organization ID - NULL for root, creates fiber bundle hierarchy',
  `name` VARCHAR(255) NOT NULL COMMENT 'Organization name',
  `description` TEXT COMMENT 'Organization description',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT `fk_organizations_userId` 
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`) 
    ON DELETE CASCADE,
  
  CONSTRAINT `fk_organizations_parentId` 
    FOREIGN KEY (`parentId`) REFERENCES `organizations`(`id`) 
    ON DELETE CASCADE
    COMMENT 'Self-referential FK enables unlimited nesting depth for tensor hierarchy',
  
  -- Indexes for hierarchy traversal
  INDEX `idx_organizations_userId` (`userId`),
  INDEX `idx_organizations_parentId` (`parentId`) COMMENT 'Critical for fiber bundle queries',
  INDEX `idx_organizations_hierarchy` (`userId`, `parentId`) COMMENT 'Composite index for user-scoped hierarchy traversal',
  INDEX `idx_organizations_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Hierarchical organization structure - enables tensor-based fiber bundle visualization';


-- =====================================================
-- INVOICES TABLE
-- =====================================================
-- Stores uploaded invoice files and parsing status
-- Links to S3 storage for actual file content
-- Generates transactions when parsed by AI
-- =====================================================

CREATE TABLE `invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `organizationId` INT NOT NULL COMMENT 'Organization this invoice belongs to',
  `fileName` VARCHAR(255) NOT NULL COMMENT 'Original filename',
  `fileUrl` TEXT NOT NULL COMMENT 'S3 URL for file access',
  `fileKey` VARCHAR(500) NOT NULL COMMENT 'S3 object key for file management',
  `mimeType` VARCHAR(100) COMMENT 'File MIME type (application/pdf, image/jpeg, etc.)',
  `isParsed` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether AI has parsed this invoice',
  `parsedData` JSON COMMENT 'Structured data extracted by AI (vendor, amount, line items, etc.)',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT `fk_invoices_organizationId` 
    FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) 
    ON DELETE CASCADE
    COMMENT 'Invoices cascade delete with organization',
  
  -- Indexes
  INDEX `idx_invoices_organizationId` (`organizationId`),
  INDEX `idx_invoices_isParsed` (`isParsed`) COMMENT 'Quick filter for pending parsing',
  INDEX `idx_invoices_createdAt` (`createdAt`) COMMENT 'Chronological ordering',
  INDEX `idx_invoices_org_parsed` (`organizationId`, `isParsed`) COMMENT 'Composite for filtered org queries'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Invoice documents with AI parsing support';


-- =====================================================
-- BANK_STATEMENTS TABLE
-- =====================================================
-- Stores uploaded bank statement files
-- Similar structure to invoices but with statement date
-- Generates transactions when parsed by AI
-- =====================================================

CREATE TABLE `bank_statements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `organizationId` INT NOT NULL COMMENT 'Organization this statement belongs to',
  `fileName` VARCHAR(255) NOT NULL COMMENT 'Original filename',
  `fileUrl` TEXT NOT NULL COMMENT 'S3 URL for file access',
  `fileKey` VARCHAR(500) NOT NULL COMMENT 'S3 object key for file management',
  `mimeType` VARCHAR(100) COMMENT 'File MIME type (application/pdf, text/csv, etc.)',
  `statementDate` DATE COMMENT 'Statement period date',
  `isParsed` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether AI has parsed this statement',
  `parsedData` JSON COMMENT 'Structured data extracted by AI (transactions, balances, etc.)',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT `fk_bank_statements_organizationId` 
    FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) 
    ON DELETE CASCADE
    COMMENT 'Bank statements cascade delete with organization',
  
  -- Indexes
  INDEX `idx_bank_statements_organizationId` (`organizationId`),
  INDEX `idx_bank_statements_isParsed` (`isParsed`) COMMENT 'Quick filter for pending parsing',
  INDEX `idx_bank_statements_statementDate` (`statementDate`) COMMENT 'Date-based queries',
  INDEX `idx_bank_statements_createdAt` (`createdAt`) COMMENT 'Chronological ordering',
  INDEX `idx_bank_statements_org_date` (`organizationId`, `statementDate`) COMMENT 'Composite for date-filtered org queries'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bank statement documents with AI parsing support';


-- =====================================================
-- TRANSACTIONS TABLE
-- =====================================================
-- Auto-generated from parsed invoices and bank statements
-- Links back to source documents for traceability
-- =====================================================

CREATE TABLE `transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `organizationId` INT NOT NULL COMMENT 'Organization this transaction belongs to',
  `sourceId` INT NOT NULL COMMENT 'ID of source document (invoice or bank statement)',
  `sourceType` ENUM('invoice', 'bank_statement', 'manual') NOT NULL COMMENT 'Type of source document',
  `amount` INT NOT NULL COMMENT 'Transaction amount in cents (avoid floating point)',
  `isIncome` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'TRUE for income, FALSE for expense',
  `category` VARCHAR(100) COMMENT 'Transaction category',
  `description` TEXT COMMENT 'Transaction description',
  `transactionDate` TIMESTAMP NOT NULL COMMENT 'Date of transaction',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT `fk_transactions_organizationId` 
    FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) 
    ON DELETE CASCADE,
  
  -- Indexes
  INDEX `idx_transactions_organizationId` (`organizationId`),
  INDEX `idx_transactions_source` (`sourceType`, `sourceId`) COMMENT 'Link back to source document',
  INDEX `idx_transactions_date` (`transactionDate`) COMMENT 'Date-based queries',
  INDEX `idx_transactions_isIncome` (`isIncome`) COMMENT 'Filter by income/expense',
  INDEX `idx_transactions_org_date` (`organizationId`, `transactionDate`) COMMENT 'Composite for date-filtered org queries'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Financial transactions auto-generated from parsed documents';


-- =====================================================
-- EXPENSES TABLE
-- =====================================================
-- Manual expense tracking per organization
-- =====================================================

CREATE TABLE `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `organizationId` INT NOT NULL COMMENT 'Organization this expense belongs to',
  `amount` INT NOT NULL COMMENT 'Expense amount in cents',
  `category` VARCHAR(100) COMMENT 'Expense category',
  `description` TEXT COMMENT 'Expense description',
  `expenseDate` TIMESTAMP NOT NULL COMMENT 'Date of expense',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT `fk_expenses_organizationId` 
    FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) 
    ON DELETE CASCADE,
  
  -- Indexes
  INDEX `idx_expenses_organizationId` (`organizationId`),
  INDEX `idx_expenses_date` (`expenseDate`),
  INDEX `idx_expenses_category` (`category`),
  INDEX `idx_expenses_org_date` (`organizationId`, `expenseDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Manual expense tracking per organization';


-- =====================================================
-- DEBTS TABLE
-- =====================================================
-- Debt tracking with payment history
-- =====================================================

CREATE TABLE `debts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `organizationId` INT NOT NULL COMMENT 'Organization this debt belongs to',
  `creditorName` VARCHAR(255) NOT NULL COMMENT 'Name of creditor',
  `originalAmount` INT NOT NULL COMMENT 'Original debt amount in cents',
  `remainingAmount` INT NOT NULL COMMENT 'Remaining debt amount in cents',
  `interestRate` INT COMMENT 'Interest rate in basis points (e.g., 500 = 5.00%)',
  `dueDate` DATE COMMENT 'Debt due date',
  `status` ENUM('active', 'paid', 'overdue') NOT NULL DEFAULT 'active' COMMENT 'Current debt status',
  `description` TEXT COMMENT 'Debt description',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT `fk_debts_organizationId` 
    FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) 
    ON DELETE CASCADE,
  
  -- Indexes
  INDEX `idx_debts_organizationId` (`organizationId`),
  INDEX `idx_debts_status` (`status`),
  INDEX `idx_debts_dueDate` (`dueDate`),
  INDEX `idx_debts_org_status` (`organizationId`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Debt tracking with status management';


-- =====================================================
-- DEBT_PAYMENTS TABLE
-- =====================================================
-- Payment history for debts
-- =====================================================

CREATE TABLE `debt_payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `debtId` INT NOT NULL COMMENT 'Debt this payment applies to',
  `amount` INT NOT NULL COMMENT 'Payment amount in cents',
  `paymentDate` TIMESTAMP NOT NULL COMMENT 'Date of payment',
  `notes` TEXT COMMENT 'Payment notes',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT `fk_debt_payments_debtId` 
    FOREIGN KEY (`debtId`) REFERENCES `debts`(`id`) 
    ON DELETE CASCADE,
  
  -- Indexes
  INDEX `idx_debt_payments_debtId` (`debtId`),
  INDEX `idx_debt_payments_date` (`paymentDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Payment history for debt tracking';


-- =====================================================
-- TENSOR HIERARCHY QUERIES
-- =====================================================
-- Example queries for tensor-based hierarchy visualization
-- =====================================================

-- Query 1: Get complete organization hierarchy for a user
-- This returns all organizations with their parent relationships
-- Used by the tensor visualizer to construct fiber bundles
-- =====================================================
/*
SELECT 
  o.id,
  o.name,
  o.description,
  o.parentId,
  p.name AS parentName,
  (SELECT COUNT(*) FROM organizations WHERE parentId = o.id) AS childCount
FROM organizations o
LEFT JOIN organizations p ON o.parentId = p.id
WHERE o.userId = ?
ORDER BY o.parentId NULLS FIRST, o.id;
*/

-- Query 2: Get organization tree with depth level
-- Calculates hierarchy depth for proper tensor rendering
-- =====================================================
/*
WITH RECURSIVE org_tree AS (
  -- Root organizations (bundles)
  SELECT 
    id, 
    name, 
    parentId, 
    0 AS depth,
    CAST(id AS CHAR(500)) AS path
  FROM organizations 
  WHERE userId = ? AND parentId IS NULL
  
  UNION ALL
  
  -- Child organizations (fibers)
  SELECT 
    o.id, 
    o.name, 
    o.parentId, 
    ot.depth + 1,
    CONCAT(ot.path, '->', o.id)
  FROM organizations o
  INNER JOIN org_tree ot ON o.parentId = ot.id
  WHERE o.userId = ?
)
SELECT * FROM org_tree ORDER BY depth, id;
*/

-- Query 3: Get financial summary aggregated by organization hierarchy
-- Aggregates expenses, debts, and transactions up the hierarchy
-- =====================================================
/*
SELECT 
  o.id,
  o.name,
  o.parentId,
  COALESCE(SUM(e.amount), 0) AS totalExpenses,
  COALESCE(SUM(d.remainingAmount), 0) AS totalDebts,
  COUNT(DISTINCT i.id) AS invoiceCount,
  COUNT(DISTINCT bs.id) AS statementCount,
  COUNT(DISTINCT t.id) AS transactionCount
FROM organizations o
LEFT JOIN expenses e ON o.id = e.organizationId
LEFT JOIN debts d ON o.id = d.organizationId AND d.status = 'active'
LEFT JOIN invoices i ON o.id = i.organizationId
LEFT JOIN bank_statements bs ON o.id = bs.organizationId
LEFT JOIN transactions t ON o.id = t.organizationId
WHERE o.userId = ?
GROUP BY o.id, o.name, o.parentId
ORDER BY o.parentId NULLS FIRST, o.id;
*/

-- Query 4: Get all descendants of an organization (fiber bundle expansion)
-- Returns all child fibers for a given parent bundle
-- =====================================================
/*
WITH RECURSIVE descendants AS (
  SELECT id, name, parentId, 0 AS level
  FROM organizations
  WHERE id = ?
  
  UNION ALL
  
  SELECT o.id, o.name, o.parentId, d.level + 1
  FROM organizations o
  INNER JOIN descendants d ON o.parentId = d.id
)
SELECT * FROM descendants ORDER BY level, id;
*/

-- =====================================================
-- TENSOR HIERARCHY FIELD EXPLANATIONS
-- =====================================================
/*
KEY FIELDS FOR TENSOR-BASED HIERARCHY:

1. organizations.parentId (INT NULL)
   - NULL: Root organization = Bundle (top-level entity)
   - Non-NULL: Child organization = Fiber (thread in parent bundle)
   - Self-referential FK enables unlimited nesting depth
   - Creates the mathematical "fiber bundle" structure

2. organizations.userId (INT NOT NULL)
   - Scopes entire hierarchy to a single user
   - Enables multi-tenancy
   - All hierarchy queries filtered by userId

3. organizations.id (INT PRIMARY KEY)
   - Unique identifier for each node in hierarchy
   - Used as parentId reference by children
   - Maps to D3.js node IDs in visualization

4. invoices.organizationId / bank_statements.organizationId
   - Links documents to specific nodes in hierarchy
   - Enables aggregation up the tree
   - Financial data flows from leaf fibers to root bundles

5. transactions.organizationId
   - Auto-generated transactions inherit org context
   - Enables hierarchical financial reporting
   - Aggregates across fiber bundles

TENSOR VISUALIZATION MAPPING:
- Root organizations (parentId = NULL) → Bundle centers
- Child organizations → Fibers emanating from parent bundle
- Grandchildren → Sub-fibers within child fiber bundles
- Financial data → Weights/colors on fibers
- Document counts → Fiber thickness/opacity
*/

-- =====================================================
-- INDEXES FOR TENSOR HIERARCHY PERFORMANCE
-- =====================================================
/*
Critical indexes for fast hierarchy traversal:

1. idx_organizations_parentId
   - Enables fast "find all children of parent X" queries
   - Used in recursive CTEs for tree traversal
   - Essential for D3.js hierarchy construction

2. idx_organizations_hierarchy (userId, parentId)
   - Composite index for user-scoped hierarchy queries
   - Reduces query time from O(n) to O(log n)
   - Supports both root finding and child traversal

3. idx_organizations_userId
   - Fast filtering of all user's organizations
   - Used in initial hierarchy load
   - Supports multi-tenancy isolation

4. Foreign key indexes on organizationId
   - Fast joins for financial aggregation
   - Enables efficient "roll-up" of metrics
   - Critical for dashboard performance
*/
