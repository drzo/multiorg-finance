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

  // ===== HYPERGRAPH - Multi-Agent Networks =====
  hypergraph: router({
    // Agents
    createAgent: protectedProcedure
      .input(z.object({
        entityId: z.number(),
        entityType: z.enum(["organization", "user", "population"]),
        agentType: z.enum(["individual", "collective", "population"]),
        name: z.string(),
        attributes: z.any().optional(),
        state: z.any().optional(),
        behaviorModel: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.createAgent(input);
      }),
    
    getAgentsByType: protectedProcedure
      .input(z.object({ agentType: z.enum(["individual", "collective", "population"]) }))
      .query(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.getAgentsByType(input.agentType);
      }),
    
    getAgentByEntity: protectedProcedure
      .input(z.object({ entityType: z.string(), entityId: z.number() }))
      .query(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.getAgentByEntity(input.entityType, input.entityId);
      }),
    
    // Shareholding - Multi-Parent Ownership
    createShareholding: protectedProcedure
      .input(z.object({
        childOrgId: z.number(),
        parentOrgId: z.number(),
        sharePercentage: z.number().min(0).max(10000), // Basis points
        shareClass: z.string().optional(),
        votingRights: z.number().optional(),
        acquisitionDate: z.date().optional(),
        attributes: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.createShareholding(input);
      }),
    
    getShareholdersByOrg: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.getShareholdersByOrg(input.orgId);
      }),
    
    getSubsidiariesByOrg: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.getSubsidiariesByOrg(input.orgId);
      }),
    
    getEffectiveOwnership: protectedProcedure
      .input(z.object({ parentOrgId: z.number(), maxDepth: z.number().optional() }))
      .query(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.getEffectiveOwnership(input.parentOrgId, input.maxDepth);
      }),
    
    // Relationships - Multiplex Networks
    createRelationshipType: protectedProcedure
      .input(z.object({
        name: z.string(),
        category: z.enum(["ownership", "partnership", "transaction", "dependency", "communication", "hierarchy", "custom"]),
        isDirected: z.boolean().default(true),
        isWeighted: z.boolean().default(false),
        attributes: z.any().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.createRelationshipType(input);
      }),
    
    getRelationshipTypes: protectedProcedure
      .query(async () => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.getRelationshipTypes();
      }),
    
    createRelationship: protectedProcedure
      .input(z.object({
        relationshipTypeId: z.number(),
        sourceEntityId: z.number(),
        sourceEntityType: z.enum(["organization", "user", "agent"]),
        targetEntityId: z.number(),
        targetEntityType: z.enum(["organization", "user", "agent"]),
        weight: z.number().optional(),
        attributes: z.any().optional(),
        validFrom: z.date().optional(),
        validTo: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.createRelationship(input);
      }),
    
    getRelationshipsByEntity: protectedProcedure
      .input(z.object({ entityType: z.string(), entityId: z.number() }))
      .query(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.getRelationshipsByEntity(input.entityType, input.entityId);
      }),
    
    // Hypergraph Operations
    createHypergraphNode: protectedProcedure
      .input(z.object({
        nodeType: z.string(),
        entityId: z.number(),
        label: z.string(),
        properties: z.any().optional(),
        embedding: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.createHypergraphNode(input);
      }),
    
    getHypergraphNodeByEntity: protectedProcedure
      .input(z.object({ nodeType: z.string(), entityId: z.number() }))
      .query(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.getHypergraphNodeByEntity(input.nodeType, input.entityId);
      }),
    
    createHypergraphHyperedge: protectedProcedure
      .input(z.object({
        edgeType: z.string(),
        label: z.string().optional(),
        properties: z.any().optional(),
        weight: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.createHypergraphHyperedge(input);
      }),
    
    createHypergraphIncidence: protectedProcedure
      .input(z.object({
        hyperedgeId: z.number(),
        nodeId: z.number(),
        role: z.string().optional(),
        weight: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.createHypergraphIncidence(input);
      }),
    
    getHypergraphNeighborhood: protectedProcedure
      .input(z.object({ nodeId: z.number() }))
      .query(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.getHypergraphNeighborhood(input.nodeId);
      }),
    
    // Events & State Transitions
    createEvent: protectedProcedure
      .input(z.object({
        eventType: z.string(),
        timestamp: z.date(),
        sourceEntityId: z.number().optional(),
        sourceEntityType: z.string().optional(),
        targetEntityId: z.number().optional(),
        targetEntityType: z.string().optional(),
        stateBefore: z.any().optional(),
        stateAfter: z.any().optional(),
        eventData: z.any().optional(),
        causedBy: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.createEvent(input);
      }),
    
    getEventTimeline: protectedProcedure
      .input(z.object({ entityType: z.string(), entityId: z.number() }))
      .query(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.getEventTimeline(input.entityType, input.entityId);
      }),
    
    createStateTransition: protectedProcedure
      .input(z.object({
        entityType: z.string(),
        fromState: z.string(),
        toState: z.string(),
        eventType: z.string(),
        conditions: z.any().optional(),
        actions: z.any().optional(),
        probability: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.createStateTransition(input);
      }),
    
    getValidTransitions: protectedProcedure
      .input(z.object({ entityType: z.string(), fromState: z.string() }))
      .query(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.getValidTransitions(input.entityType, input.fromState);
      }),
    
    // System Dynamics - Stocks & Flows
    createStock: protectedProcedure
      .input(z.object({
        entityId: z.number(),
        entityType: z.string(),
        stockName: z.string(),
        currentValue: z.number(),
        unit: z.string().optional(),
        minValue: z.number().optional(),
        maxValue: z.number().optional(),
        initialValue: z.number().optional(),
        attributes: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.createStock(input);
      }),
    
    getStocksByEntity: protectedProcedure
      .input(z.object({ entityType: z.string(), entityId: z.number() }))
      .query(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.getStocksByEntity(input.entityType, input.entityId);
      }),
    
    createFlow: protectedProcedure
      .input(z.object({
        flowName: z.string(),
        sourceStockId: z.number().optional(),
        targetStockId: z.number().optional(),
        flowType: z.enum(["inflow", "outflow", "biflow"]),
        rateFormula: z.string(),
        currentRate: z.number().optional(),
        unit: z.string().optional(),
        attributes: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.createFlow(input);
      }),
    
    getFlowsByStock: protectedProcedure
      .input(z.object({ stockId: z.number() }))
      .query(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.getFlowsByStock(input.stockId);
      }),
    
    getStockFlowDynamics: protectedProcedure
      .input(z.object({ entityType: z.string(), entityId: z.number() }))
      .query(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.getStockFlowDynamics(input.entityType, input.entityId);
      }),
    
    createSimulationRun: protectedProcedure
      .input(z.object({
        runName: z.string(),
        startTime: z.date(),
        endTime: z.date(),
        timeStep: z.number(),
        parameters: z.any().optional(),
        results: z.any().optional(),
        status: z.enum(["running", "completed", "failed"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.createSimulationRun(input);
      }),
    
    updateSimulationRun: protectedProcedure
      .input(z.object({
        id: z.number(),
        updates: z.object({
          status: z.enum(["running", "completed", "failed"]).optional(),
          results: z.any().optional(),
          completedAt: z.date().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.updateSimulationRun(input.id, input.updates);
      }),
    
    getSimulationRuns: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        const hypergraphDb = await import("./hypergraph-db");
        return await hypergraphDb.getSimulationRuns(input.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;
