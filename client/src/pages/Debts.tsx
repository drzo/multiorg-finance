import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Plus, Trash2, DollarSign, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function Debts() {
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedDebtId, setSelectedDebtId] = useState<number | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    creditorName: "",
    originalAmount: "",
    remainingAmount: "",
    interestRate: "",
    dueDate: "",
    description: "",
  });
  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: organizations = [] } = trpc.organizations.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: debts = [] } = trpc.debts.list.useQuery(
    { organizationId: selectedOrgId! },
    { enabled: !!selectedOrgId }
  );

  const createMutation = trpc.debts.create.useMutation({
    onSuccess: () => {
      utils.debts.list.invalidate();
      setIsCreateOpen(false);
      setFormData({ creditorName: "", originalAmount: "", remainingAmount: "", interestRate: "", dueDate: "", description: "" });
      toast.success("Debt created successfully");
    },
  });

  const deleteMutation = trpc.debts.delete.useMutation({
    onSuccess: () => {
      utils.debts.list.invalidate();
      toast.success("Debt deleted successfully");
    },
  });

  const addPaymentMutation = trpc.debts.addPayment.useMutation({
    onSuccess: () => {
      utils.debts.list.invalidate();
      setIsPaymentOpen(false);
      setPaymentData({ amount: "", paymentDate: new Date().toISOString().split("T")[0], notes: "" });
      toast.success("Payment recorded successfully");
    },
  });

  const handleCreate = () => {
    if (!selectedOrgId) {
      toast.error("Please select an organization");
      return;
    }
    if (!formData.creditorName.trim()) {
      toast.error("Creditor name is required");
      return;
    }
    if (!formData.originalAmount || parseFloat(formData.originalAmount) <= 0) {
      toast.error("Please enter a valid original amount");
      return;
    }
    if (!formData.remainingAmount || parseFloat(formData.remainingAmount) < 0) {
      toast.error("Please enter a valid remaining amount");
      return;
    }
    
    createMutation.mutate({
      organizationId: selectedOrgId,
      creditorName: formData.creditorName,
      originalAmount: Math.round(parseFloat(formData.originalAmount) * 100),
      remainingAmount: Math.round(parseFloat(formData.remainingAmount) * 100),
      interestRate: formData.interestRate ? Math.round(parseFloat(formData.interestRate) * 100) : undefined,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      description: formData.description || undefined,
    });
  };

  const handleAddPayment = () => {
    if (!selectedDebtId) return;
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    
    addPaymentMutation.mutate({
      debtId: selectedDebtId,
      amount: Math.round(parseFloat(paymentData.amount) * 100),
      paymentDate: new Date(paymentData.paymentDate),
      notes: paymentData.notes || undefined,
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      active: "default",
      paid: "secondary",
      overdue: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Debt Management</h1>
            <p className="text-muted-foreground">
              Track debts and payment history across organizations
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Debt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Debt</DialogTitle>
                <DialogDescription>
                  Record a new debt for your organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="org">Organization</Label>
                  <Select
                    value={selectedOrgId?.toString() || ""}
                    onValueChange={(v) => setSelectedOrgId(Number(v))}
                  >
                    <SelectTrigger>
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
                </div>
                <div>
                  <Label htmlFor="creditor">Creditor Name</Label>
                  <Input
                    id="creditor"
                    value={formData.creditorName}
                    onChange={(e) => setFormData({ ...formData, creditorName: e.target.value })}
                    placeholder="Who is owed"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="original">Original Amount</Label>
                    <Input
                      id="original"
                      type="number"
                      step="0.01"
                      value={formData.originalAmount}
                      onChange={(e) => setFormData({ ...formData, originalAmount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="remaining">Remaining Amount</Label>
                    <Input
                      id="remaining"
                      type="number"
                      step="0.01"
                      value={formData.remainingAmount}
                      onChange={(e) => setFormData({ ...formData, remainingAmount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="interest">Interest Rate (%)</Label>
                    <Input
                      id="interest"
                      type="number"
                      step="0.01"
                      value={formData.interestRate}
                      onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="due">Due Date</Label>
                    <Input
                      id="due"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Debt"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filter by Organization</CardTitle>
            <CardDescription>Select an organization to view its debts</CardDescription>
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
              <CardTitle>Debt List</CardTitle>
              <CardDescription>
                {debts.length} debt{debts.length !== 1 ? "s" : ""} recorded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {debts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No debts recorded yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creditor</TableHead>
                      <TableHead>Original</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debts.map((debt) => (
                      <TableRow key={debt.id}>
                        <TableCell className="font-medium">{debt.creditorName}</TableCell>
                        <TableCell>{formatCurrency(debt.originalAmount)}</TableCell>
                        <TableCell className="font-semibold text-orange-600">
                          {formatCurrency(debt.remainingAmount)}
                        </TableCell>
                        <TableCell>
                          {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(debt.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedDebtId(debt.id);
                                setIsPaymentOpen(true);
                              }}
                              disabled={debt.status === "paid"}
                            >
                              <DollarSign className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Delete this debt?")) {
                                  deleteMutation.mutate({ id: debt.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Dialog */}
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Add a payment for this debt
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="payment-amount">Payment Amount</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="payment-date">Payment Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="payment-notes">Notes</Label>
                <Textarea
                  id="payment-notes"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddPayment} disabled={addPaymentMutation.isPending}>
                {addPaymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
