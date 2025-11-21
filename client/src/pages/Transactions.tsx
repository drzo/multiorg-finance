import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, BarChart3 } from "lucide-react";

export default function Transactions() {
  const { user } = useAuth();
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);

  const { data: organizations = [] } = trpc.organizations.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: transactions = [] } = trpc.transactions.list.useQuery(
    { organizationId: selectedOrgId! },
    { enabled: !!selectedOrgId }
  );

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const getSourceBadge = (sourceType: string) => {
    const labels: Record<string, string> = {
      invoice: "Invoice",
      bank_statement: "Bank Statement",
      manual: "Manual",
    };
    return <Badge variant="secondary">{labels[sourceType] || sourceType}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Transactions</h1>
            <p className="text-muted-foreground">
              View all financial transactions from invoices and bank statements
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filter by Organization</CardTitle>
            <CardDescription>Select an organization to view its transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedOrgId?.toString() || ""}
              onValueChange={(v) => setSelectedOrgId(Number(v))}
            >
              <SelectTrigger className="w-full">
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
          </CardContent>
        </Card>

        {selectedOrgId && (
          <Card>
            <CardHeader>
              <CardTitle>Transaction List</CardTitle>
              <CardDescription>
                {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} recorded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions recorded yet</p>
                  <p className="text-sm mt-2">
                    Transactions are automatically created when you parse invoices or bank statements
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.transactionDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {transaction.isIncome ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <ArrowUpCircle className="h-4 w-4" />
                              <span>Income</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-600">
                              <ArrowDownCircle className="h-4 w-4" />
                              <span>Expense</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getSourceBadge(transaction.sourceType)}</TableCell>
                        <TableCell>{transaction.category || "-"}</TableCell>
                        <TableCell>{transaction.description || "-"}</TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            transaction.isIncome ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {transaction.isIncome ? "+" : "-"}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
