import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

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
