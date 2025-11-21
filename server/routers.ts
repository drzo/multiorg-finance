import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";

// Helper to generate random suffix for file keys
function randomSuffix() {
  return Math.random().toString(36).substring(2, 15);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ===== Organizations =====
  organizations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getOrganizationsByUser(ctx.user.id);
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getOrganizationById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        parentId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createOrganization({
          ...input,
          ownerId: ctx.user.id,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        parentId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateOrganization(id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteOrganization(input.id);
      }),
    
    hierarchy: protectedProcedure.query(async ({ ctx }) => {
      return await db.getOrganizationHierarchy(ctx.user.id);
    }),
  }),

  // ===== Expenses =====
  expenses: router({
    list: protectedProcedure
      .input(z.object({ organizationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getExpensesByOrganization(input.organizationId);
      }),
    
    byDateRange: protectedProcedure
      .input(z.object({
        organizationId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return await db.getExpensesByDateRange(input.organizationId, input.startDate, input.endDate);
      }),
    
    create: protectedProcedure
      .input(z.object({
        organizationId: z.number(),
        amount: z.number(),
        currency: z.string().default("USD"),
        category: z.string().optional(),
        description: z.string().optional(),
        expenseDate: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createExpense({
          ...input,
          userId: ctx.user.id,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        amount: z.number().optional(),
        currency: z.string().optional(),
        category: z.string().optional(),
        description: z.string().optional(),
        expenseDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateExpense(id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteExpense(input.id);
      }),
  }),

  // ===== Debts =====
  debts: router({
    list: protectedProcedure
      .input(z.object({ organizationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDebtsByOrganization(input.organizationId);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getDebtById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        organizationId: z.number(),
        creditorName: z.string().min(1),
        originalAmount: z.number(),
        remainingAmount: z.number(),
        currency: z.string().default("USD"),
        interestRate: z.number().optional(),
        dueDate: z.date().optional(),
        status: z.enum(["active", "paid", "overdue"]).default("active"),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createDebt({
          ...input,
          userId: ctx.user.id,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        creditorName: z.string().optional(),
        originalAmount: z.number().optional(),
        remainingAmount: z.number().optional(),
        currency: z.string().optional(),
        interestRate: z.number().optional(),
        dueDate: z.date().optional(),
        status: z.enum(["active", "paid", "overdue"]).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateDebt(id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteDebt(input.id);
      }),
    
    addPayment: protectedProcedure
      .input(z.object({
        debtId: z.number(),
        amount: z.number(),
        paymentDate: z.date(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Create payment record
        await db.createDebtPayment(input);
        
        // Update remaining amount
        const debt = await db.getDebtById(input.debtId);
        if (debt) {
          const newRemaining = Math.max(0, debt.remainingAmount - input.amount);
          const newStatus = newRemaining === 0 ? "paid" : debt.status;
          await db.updateDebt(input.debtId, {
            remainingAmount: newRemaining,
            status: newStatus,
          });
        }
        
        return { success: true };
      }),
    
    getPayments: protectedProcedure
      .input(z.object({ debtId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDebtPaymentsByDebt(input.debtId);
      }),
  }),

  // ===== Invoices =====
  invoices: router({
    list: protectedProcedure
      .input(z.object({ organizationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getInvoicesByOrganization(input.organizationId);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getInvoiceById(input.id);
      }),
    
    upload: protectedProcedure
      .input(z.object({
        organizationId: z.number(),
        fileName: z.string(),
        fileContent: z.string(), // base64 encoded
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Decode base64 and upload to S3
        const buffer = Buffer.from(input.fileContent, 'base64');
        const fileKey = `${ctx.user.id}-invoices/${input.fileName}-${randomSuffix()}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // Save to database
        return await db.createInvoice({
          organizationId: input.organizationId,
          userId: ctx.user.id,
          fileKey,
          fileUrl: url,
          fileName: input.fileName,
          mimeType: input.mimeType,
          fileSize: buffer.length,
          isParsed: false,
        });
      }),
    
    parse: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const invoice = await db.getInvoiceById(input.id);
        if (!invoice) throw new Error("Invoice not found");
        
        // Use LLM to parse invoice
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a financial document parser. Extract structured data from invoices including: invoice number, date, total amount, line items, vendor name, and any other relevant financial information. Return the data as JSON."
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Parse this invoice and extract all financial information:" },
                { type: "image_url", image_url: { url: invoice.fileUrl } }
              ]
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "invoice_data",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  invoiceNumber: { type: "string" },
                  invoiceDate: { type: "string" },
                  totalAmount: { type: "number" },
                  currency: { type: "string" },
                  vendorName: { type: "string" },
                  lineItems: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        quantity: { type: "number" },
                        unitPrice: { type: "number" },
                        total: { type: "number" }
                      },
                      required: ["description", "total"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["totalAmount"],
                additionalProperties: false
              }
            }
          }
        });
        
        const content = response.choices[0]?.message?.content;
        const parsedData = typeof content === 'string' ? content : "{}";
        
        // Update invoice with parsed data
        await db.updateInvoice(input.id, {
          parsedData,
          isParsed: true,
        });
        
        return { success: true, data: JSON.parse(parsedData) };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteInvoice(input.id);
      }),
  }),

  // ===== Bank Statements =====
  bankStatements: router({
    list: protectedProcedure
      .input(z.object({ organizationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getBankStatementsByOrganization(input.organizationId);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getBankStatementById(input.id);
      }),
    
    upload: protectedProcedure
      .input(z.object({
        organizationId: z.number(),
        fileName: z.string(),
        fileContent: z.string(), // base64 encoded
        mimeType: z.string(),
        statementDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Decode base64 and upload to S3
        const buffer = Buffer.from(input.fileContent, 'base64');
        const fileKey = `${ctx.user.id}-statements/${input.fileName}-${randomSuffix()}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // Save to database
        return await db.createBankStatement({
          organizationId: input.organizationId,
          userId: ctx.user.id,
          fileKey,
          fileUrl: url,
          fileName: input.fileName,
          mimeType: input.mimeType,
          fileSize: buffer.length,
          statementDate: input.statementDate,
          isParsed: false,
        });
      }),
    
    parse: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const statement = await db.getBankStatementById(input.id);
        if (!statement) throw new Error("Bank statement not found");
        
        // Use LLM to parse bank statement
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a financial document parser. Extract all transactions from bank statements including: date, description, amount (positive for credits, negative for debits), and balance. Return the data as JSON."
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Parse this bank statement and extract all transactions:" },
                { type: "image_url", image_url: { url: statement.fileUrl } }
              ]
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "statement_data",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  accountNumber: { type: "string" },
                  statementDate: { type: "string" },
                  openingBalance: { type: "number" },
                  closingBalance: { type: "number" },
                  transactions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        description: { type: "string" },
                        amount: { type: "number" },
                        balance: { type: "number" }
                      },
                      required: ["date", "description", "amount"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["transactions"],
                additionalProperties: false
              }
            }
          }
        });
        
        const content = response.choices[0]?.message?.content;
        const parsedData = typeof content === 'string' ? content : "{}";
        
        // Update statement with parsed data
        await db.updateBankStatement(input.id, {
          parsedData,
          isParsed: true,
        });
        
        return { success: true, data: JSON.parse(parsedData) };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteBankStatement(input.id);
      }),
  }),

  // ===== Transactions =====
  transactions: router({
    list: protectedProcedure
      .input(z.object({ organizationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTransactionsByOrganization(input.organizationId);
      }),
    
    byDateRange: protectedProcedure
      .input(z.object({
        organizationId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return await db.getTransactionsByDateRange(input.organizationId, input.startDate, input.endDate);
      }),
    
    create: protectedProcedure
      .input(z.object({
        organizationId: z.number(),
        sourceType: z.enum(["invoice", "bank_statement", "manual"]),
        sourceId: z.number().optional(),
        amount: z.number(),
        currency: z.string().default("USD"),
        transactionDate: z.date(),
        description: z.string().optional(),
        category: z.string().optional(),
        isIncome: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createTransaction({
          ...input,
          userId: ctx.user.id,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        amount: z.number().optional(),
        currency: z.string().optional(),
        transactionDate: z.date().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        isIncome: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateTransaction(id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteTransaction(input.id);
      }),
  }),

  // ===== Financial Analytics =====
  analytics: router({
    summary: protectedProcedure
      .input(z.object({
        organizationId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return await db.getFinancialSummary(input.organizationId, input.startDate, input.endDate);
      }),
  }),
});

export type AppRouter = typeof appRouter;
