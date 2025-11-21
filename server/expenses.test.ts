import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("expenses", () => {
  it("should create an expense", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create organization first
    await caller.organizations.create({
      name: "Test Org",
    });

    const orgs = await caller.organizations.list();
    const orgId = orgs[0]?.id;

    const result = await caller.expenses.create({
      organizationId: orgId!,
      amount: 10000, // $100.00 in cents
      category: "Office Supplies",
      description: "Test expense",
      expenseDate: new Date(),
    });

    expect(result).toBeDefined();
  });

  it("should list expenses for organization", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create organization
    await caller.organizations.create({
      name: "Test Org",
    });

    const orgs = await caller.organizations.list();
    const orgId = orgs[0]?.id;

    // Create expense
    await caller.expenses.create({
      organizationId: orgId!,
      amount: 5000,
      expenseDate: new Date(),
    });

    const expenses = await caller.expenses.list({
      organizationId: orgId!,
    });

    expect(Array.isArray(expenses)).toBe(true);
  });

  it("should get expenses by date range", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create organization
    await caller.organizations.create({
      name: "Test Org",
    });

    const orgs = await caller.organizations.list();
    const orgId = orgs[0]?.id;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();

    const expenses = await caller.expenses.byDateRange({
      organizationId: orgId!,
      startDate,
      endDate,
    });

    expect(Array.isArray(expenses)).toBe(true);
  });
});
