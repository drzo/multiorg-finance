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

describe("debts", () => {
  it("should create a debt", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create organization first
    await caller.organizations.create({
      name: "Test Org",
    });

    const orgs = await caller.organizations.list();
    const orgId = orgs[0]?.id;

    const result = await caller.debts.create({
      organizationId: orgId!,
      creditorName: "Test Creditor",
      originalAmount: 100000, // $1000.00 in cents
      remainingAmount: 100000,
      status: "active",
    });

    expect(result).toBeDefined();
  });

  it("should list debts for organization", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create organization
    await caller.organizations.create({
      name: "Test Org",
    });

    const orgs = await caller.organizations.list();
    const orgId = orgs[0]?.id;

    // Create debt
    await caller.debts.create({
      organizationId: orgId!,
      creditorName: "Bank",
      originalAmount: 50000,
      remainingAmount: 50000,
    });

    const debts = await caller.debts.list({
      organizationId: orgId!,
    });

    expect(Array.isArray(debts)).toBe(true);
  });

  it("should add payment to debt", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create organization
    await caller.organizations.create({
      name: "Test Org",
    });

    const orgs = await caller.organizations.list();
    const orgId = orgs[0]?.id;

    // Create debt
    await caller.debts.create({
      organizationId: orgId!,
      creditorName: "Lender",
      originalAmount: 100000,
      remainingAmount: 100000,
    });

    const debts = await caller.debts.list({
      organizationId: orgId!,
    });
    const debtId = debts[0]?.id;

    // Add payment
    const result = await caller.debts.addPayment({
      debtId: debtId!,
      amount: 10000, // $100.00 payment
      paymentDate: new Date(),
    });

    expect(result.success).toBe(true);

    // Verify remaining amount was updated
    const updatedDebt = await caller.debts.get({ id: debtId! });
    expect(updatedDebt?.remainingAmount).toBe(90000);
  });

  it("should mark debt as paid when fully paid", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create organization
    await caller.organizations.create({
      name: "Test Org Paid",
    });

    const orgs = await caller.organizations.list();
    const orgId = orgs.find(o => o.name === "Test Org Paid")?.id;

    // Create debt
    await caller.debts.create({
      organizationId: orgId!,
      creditorName: "Unique Creditor",
      originalAmount: 10000,
      remainingAmount: 10000,
    });

    const debts = await caller.debts.list({
      organizationId: orgId!,
    });
    const debtId = debts.find(d => d.creditorName === "Unique Creditor")?.id;

    // Pay full amount
    await caller.debts.addPayment({
      debtId: debtId!,
      amount: 10000,
      paymentDate: new Date(),
    });

    // Verify status changed to paid
    const updatedDebt = await caller.debts.get({ id: debtId! });
    expect(updatedDebt?.status).toBe("paid");
    expect(updatedDebt?.remainingAmount).toBe(0);
  });
});
