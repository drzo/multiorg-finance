import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { BarChart3, TrendingDown, TrendingUp, Wallet, CreditCard, FileText, Building2 } from "lucide-react";
import OrgHierarchyVisualization from "@/components/OrgHierarchyVisualization";
import { Link } from "wouter";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<"week" | "month">("month");

  const { data: organizations = [] } = trpc.organizations.list.useQuery(undefined, {
    enabled: !!user,
  });

  const selectedOrg = useMemo(() => {
    if (!selectedOrgId && organizations.length > 0) {
      setSelectedOrgId(organizations[0].id);
      return organizations[0];
    }
    return organizations.find(o => o.id === selectedOrgId);
  }, [selectedOrgId, organizations]);

  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    if (timeRange === "week") {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    return { startDate, endDate };
  }, [timeRange]);

  const { data: summary } = trpc.analytics.summary.useQuery(
    {
      organizationId: selectedOrgId!,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
    { enabled: !!selectedOrgId }
  );

  const { data: expenses = [] } = trpc.expenses.byDateRange.useQuery(
    {
      organizationId: selectedOrgId!,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
    { enabled: !!selectedOrgId }
  );

  const { data: debts = [] } = trpc.debts.list.useQuery(
    { organizationId: selectedOrgId! },
    { enabled: !!selectedOrgId }
  );

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  if (loading) {
    return <DashboardLayout>Loading...</DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Financial Dashboard</h1>
            <p className="text-muted-foreground">
              Multi-organization finance management with tensor-based hierarchy visualization
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as "week" | "month")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
              </SelectContent>
            </Select>
            {organizations.length > 0 && (
              <Select
                value={selectedOrgId?.toString() || ""}
                onValueChange={(v) => setSelectedOrgId(Number(v))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {organizations.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Welcome to Multi-Org Finance Manager</CardTitle>
              <CardDescription>
                Get started by creating your first organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/organizations">
                <Button>
                  <Building2 className="mr-2 h-4 w-4" />
                  Create Organization
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Financial Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(summary?.totalIncome || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {timeRange === "week" ? "Last 7 days" : "Last 30 days"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(summary?.totalExpenses || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {timeRange === "week" ? "Last 7 days" : "Last 30 days"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Debts</CardTitle>
                  <CreditCard className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(summary?.totalDebts || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {debts.filter(d => d.status === "active").length} active debts
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.transactionCount || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {timeRange === "week" ? "Last 7 days" : "Last 30 days"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Organization Hierarchy Visualization */}
            <OrgHierarchyVisualization
              organizations={organizations}
              onNodeClick={(org) => setSelectedOrgId(org.id)}
            />

            {/* Recent Activity */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Expenses</CardTitle>
                  <CardDescription>Latest expenses for {selectedOrg?.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  {expenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No expenses recorded yet</p>
                  ) : (
                    <div className="space-y-4">
                      {expenses.slice(0, 5).map((expense) => (
                        <div key={expense.id} className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {expense.description || expense.category || "Expense"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(expense.expenseDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-sm font-semibold text-red-600">
                            -{formatCurrency(expense.amount)}
                          </div>
                        </div>
                      ))}
                      <Link href="/expenses">
                        <Button variant="outline" className="w-full">
                          View All Expenses
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active Debts</CardTitle>
                  <CardDescription>Outstanding debts for {selectedOrg?.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  {debts.filter(d => d.status === "active").length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active debts</p>
                  ) : (
                    <div className="space-y-4">
                      {debts
                        .filter(d => d.status === "active")
                        .slice(0, 5)
                        .map((debt) => (
                          <div key={debt.id} className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{debt.creditorName}</p>
                              <p className="text-xs text-muted-foreground">
                                {debt.dueDate
                                  ? `Due: ${new Date(debt.dueDate).toLocaleDateString()}`
                                  : "No due date"}
                              </p>
                            </div>
                            <div className="text-sm font-semibold text-orange-600">
                              {formatCurrency(debt.remainingAmount)}
                            </div>
                          </div>
                        ))}
                      <Link href="/debts">
                        <Button variant="outline" className="w-full">
                          View All Debts
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
