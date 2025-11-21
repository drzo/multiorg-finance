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

describe("organizations", () => {
  it("should create an organization", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.organizations.create({
      name: "Test Organization",
      description: "Test description",
    });

    expect(result).toBeDefined();
  });

  it("should list organizations for user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create an organization first
    await caller.organizations.create({
      name: "Test Org 1",
    });

    const organizations = await caller.organizations.list();
    expect(Array.isArray(organizations)).toBe(true);
  });

  it("should create organization with parent", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create parent organization
    await caller.organizations.create({
      name: "Parent Org",
    });

    const orgs = await caller.organizations.list();
    const parentId = orgs[0]?.id;

    // Create child organization
    const result = await caller.organizations.create({
      name: "Child Org",
      parentId,
    });

    expect(result).toBeDefined();
  });

  it("should get organization hierarchy", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const hierarchy = await caller.organizations.hierarchy();
    expect(Array.isArray(hierarchy)).toBe(true);
  });
});
