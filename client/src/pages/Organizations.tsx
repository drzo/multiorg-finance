import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Building2, Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

export default function Organizations() {
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parentId: null as number | null,
  });

  const utils = trpc.useUtils();
  const { data: organizations = [] } = trpc.organizations.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createMutation = trpc.organizations.create.useMutation({
    onSuccess: () => {
      utils.organizations.list.invalidate();
      setIsCreateOpen(false);
      setFormData({ name: "", description: "", parentId: null });
      toast.success("Organization created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create organization: ${error.message}`);
    },
  });

  const updateMutation = trpc.organizations.update.useMutation({
    onSuccess: () => {
      utils.organizations.list.invalidate();
      setIsEditOpen(false);
      setEditingOrg(null);
      toast.success("Organization updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update organization: ${error.message}`);
    },
  });

  const deleteMutation = trpc.organizations.delete.useMutation({
    onSuccess: () => {
      utils.organizations.list.invalidate();
      toast.success("Organization deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete organization: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("Organization name is required");
      return;
    }
    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      parentId: formData.parentId || undefined,
    });
  };

  const handleEdit = (org: any) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      description: org.description || "",
      parentId: org.parentId,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!formData.name.trim()) {
      toast.error("Organization name is required");
      return;
    }
    updateMutation.mutate({
      id: editingOrg.id,
      name: formData.name,
      description: formData.description || undefined,
      parentId: formData.parentId || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this organization? This action cannot be undone.")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Organizations</h1>
            <p className="text-muted-foreground">
              Manage your organizational hierarchy with parent-child relationships
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Organization</DialogTitle>
                <DialogDescription>
                  Add a new organization to your finance management system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Organization name"
                  />
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
                <div>
                  <Label htmlFor="parent">Parent Organization</Label>
                  <Select
                    value={formData.parentId?.toString() || "none"}
                    onValueChange={(v) => setFormData({ ...formData, parentId: v === "none" ? null : Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No parent (root organization)</SelectItem>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {organizations.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Organizations Yet</CardTitle>
              <CardDescription>
                Create your first organization to start managing finances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Organization
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <Card key={org.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(org)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(org.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  {org.description && (
                    <CardDescription>{org.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {org.parentId ? (
                      <>
                        Parent:{" "}
                        {organizations.find((o) => o.id === org.parentId)?.name ||
                          "Unknown"}
                      </>
                    ) : (
                      "Root organization"
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Created: {new Date(org.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Organization</DialogTitle>
              <DialogDescription>
                Update organization details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Organization name"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <Label htmlFor="edit-parent">Parent Organization</Label>
                <Select
                  value={formData.parentId?.toString() || "none"}
                  onValueChange={(v) => setFormData({ ...formData, parentId: v === "none" ? null : Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent (root organization)</SelectItem>
                    {organizations
                      .filter((org) => org.id !== editingOrg?.id)
                      .map((org) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
