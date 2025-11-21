import { eq, and, desc, asc, gte, lte, sql, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  organizations, 
  expenses, 
  debts, 
  debtPayments, 
  invoices, 
  bankStatements, 
  transactions,
  InsertOrganization,
  InsertExpense,
  InsertDebt,
  InsertDebtPayment,
  InsertInvoice,
  InsertBankStatement,
  InsertTransaction
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ===== Organizations =====

export async function createOrganization(data: InsertOrganization) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(organizations).values(data);
  return result;
}

export async function getOrganizationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(organizations).where(eq(organizations.ownerId, userId)).orderBy(desc(organizations.createdAt));
}

export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return result[0];
}

export async function updateOrganization(id: number, data: Partial<InsertOrganization>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(organizations).set(data).where(eq(organizations.id, id));
}

export async function deleteOrganization(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(organizations).where(eq(organizations.id, id));
}

export async function getOrganizationHierarchy(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all organizations for user
  return await db.select().from(organizations).where(eq(organizations.ownerId, userId));
}

// ===== Expenses =====

export async function createExpense(data: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(expenses).values(data);
}

export async function getExpensesByOrganization(organizationId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(expenses)
    .where(eq(expenses.organizationId, organizationId))
    .orderBy(desc(expenses.expenseDate))
    .limit(limit);
}

export async function getExpensesByDateRange(organizationId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(expenses)
    .where(
      and(
        eq(expenses.organizationId, organizationId),
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate)
      )
    )
    .orderBy(desc(expenses.expenseDate));
}

export async function updateExpense(id: number, data: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(expenses).set(data).where(eq(expenses.id, id));
}

export async function deleteExpense(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(expenses).where(eq(expenses.id, id));
}

// ===== Debts =====

export async function createDebt(data: InsertDebt) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(debts).values(data);
}

export async function getDebtsByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(debts)
    .where(eq(debts.organizationId, organizationId))
    .orderBy(desc(debts.createdAt));
}

export async function getDebtById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(debts).where(eq(debts.id, id)).limit(1);
  return result[0];
}

export async function updateDebt(id: number, data: Partial<InsertDebt>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(debts).set(data).where(eq(debts.id, id));
}

export async function deleteDebt(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(debts).where(eq(debts.id, id));
}

// ===== Debt Payments =====

export async function createDebtPayment(data: InsertDebtPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(debtPayments).values(data);
}

export async function getDebtPaymentsByDebt(debtId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(debtPayments)
    .where(eq(debtPayments.debtId, debtId))
    .orderBy(desc(debtPayments.paymentDate));
}

// ===== Invoices =====

export async function createInvoice(data: InsertInvoice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(invoices).values(data);
}

export async function getInvoicesByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(invoices)
    .where(eq(invoices.organizationId, organizationId))
    .orderBy(desc(invoices.createdAt));
}

export async function getInvoiceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return result[0];
}

export async function updateInvoice(id: number, data: Partial<InsertInvoice>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(invoices).set(data).where(eq(invoices.id, id));
}

export async function deleteInvoice(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(invoices).where(eq(invoices.id, id));
}

// ===== Bank Statements =====

export async function createBankStatement(data: InsertBankStatement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(bankStatements).values(data);
}

export async function getBankStatementsByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(bankStatements)
    .where(eq(bankStatements.organizationId, organizationId))
    .orderBy(desc(bankStatements.createdAt));
}

export async function getBankStatementById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(bankStatements).where(eq(bankStatements.id, id)).limit(1);
  return result[0];
}

export async function updateBankStatement(id: number, data: Partial<InsertBankStatement>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(bankStatements).set(data).where(eq(bankStatements.id, id));
}

export async function deleteBankStatement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(bankStatements).where(eq(bankStatements.id, id));
}

// ===== Transactions =====

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(transactions).values(data);
}

export async function getTransactionsByOrganization(organizationId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(transactions)
    .where(eq(transactions.organizationId, organizationId))
    .orderBy(desc(transactions.transactionDate))
    .limit(limit);
}

export async function getTransactionsByDateRange(organizationId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(transactions)
    .where(
      and(
        eq(transactions.organizationId, organizationId),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    )
    .orderBy(desc(transactions.transactionDate));
}

export async function updateTransaction(id: number, data: Partial<InsertTransaction>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(transactions).set(data).where(eq(transactions.id, id));
}

export async function deleteTransaction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(transactions).where(eq(transactions.id, id));
}

// ===== Financial Aggregations =====

export async function getFinancialSummary(organizationId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return { totalExpenses: 0, totalIncome: 0, totalDebts: 0, transactionCount: 0 };
  
  const expensesResult = await db.select({
    total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`
  }).from(expenses).where(
    and(
      eq(expenses.organizationId, organizationId),
      gte(expenses.expenseDate, startDate),
      lte(expenses.expenseDate, endDate)
    )
  );
  
  const incomeResult = await db.select({
    total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`
  }).from(transactions).where(
    and(
      eq(transactions.organizationId, organizationId),
      eq(transactions.isIncome, true),
      gte(transactions.transactionDate, startDate),
      lte(transactions.transactionDate, endDate)
    )
  );
  
  const debtsResult = await db.select({
    total: sql<number>`COALESCE(SUM(${debts.remainingAmount}), 0)`
  }).from(debts).where(
    and(
      eq(debts.organizationId, organizationId),
      eq(debts.status, 'active')
    )
  );
  
  const transactionsResult = await db.select({
    count: sql<number>`COUNT(*)`
  }).from(transactions).where(
    and(
      eq(transactions.organizationId, organizationId),
      gte(transactions.transactionDate, startDate),
      lte(transactions.transactionDate, endDate)
    )
  );
  
  return {
    totalExpenses: expensesResult[0]?.total || 0,
    totalIncome: incomeResult[0]?.total || 0,
    totalDebts: debtsResult[0]?.total || 0,
    transactionCount: transactionsResult[0]?.count || 0
  };
}
