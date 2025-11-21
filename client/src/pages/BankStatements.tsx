import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Plus, FileText, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function BankStatements() {
  const { user } = useAuth();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statementDate, setStatementDate] = useState("");

  const utils = trpc.useUtils();
  const { data: organizations = [] } = trpc.organizations.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: statements = [] } = trpc.bankStatements.list.useQuery(
    { organizationId: selectedOrgId! },
    { enabled: !!selectedOrgId }
  );

  const uploadMutation = trpc.bankStatements.upload.useMutation({
    onSuccess: () => {
      utils.bankStatements.list.invalidate();
      setIsUploadOpen(false);
      setSelectedFile(null);
      setStatementDate("");
      toast.success("Bank statement uploaded successfully");
    },
    onError: (error) => {
      toast.error(`Failed to upload statement: ${error.message}`);
    },
  });

  const parseMutation = trpc.bankStatements.parse.useMutation({
    onSuccess: () => {
      utils.bankStatements.list.invalidate();
      toast.success("Bank statement parsed successfully");
    },
    onError: (error) => {
      toast.error(`Failed to parse statement: ${error.message}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedOrgId) {
      toast.error("Please select an organization");
      return;
    }
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const base64Content = base64.split(",")[1];
      
      uploadMutation.mutate({
        organizationId: selectedOrgId,
        fileName: selectedFile.name,
        fileContent: base64Content,
        mimeType: selectedFile.type,
        statementDate: statementDate ? new Date(statementDate) : undefined,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bank Statements</h1>
            <p className="text-muted-foreground">
              Upload and parse bank statements with AI
            </p>
          </div>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Upload Statement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Bank Statement</DialogTitle>
                <DialogDescription>
                  Upload a bank statement file (PDF, CSV) for automatic parsing
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
                  <Label htmlFor="date">Statement Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={statementDate}
                    onChange={(e) => setStatementDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="file">Statement File</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.csv,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filter by Organization</CardTitle>
            <CardDescription>Select an organization to view its statements</CardDescription>
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
              <CardTitle>Statement List</CardTitle>
              <CardDescription>
                {statements.length} statement{statements.length !== 1 ? "s" : ""} uploaded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bank statements uploaded yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Statement Date</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statements.map((statement) => (
                      <TableRow key={statement.id}>
                        <TableCell className="font-medium">
                          <a
                            href={statement.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            {statement.fileName}
                          </a>
                        </TableCell>
                        <TableCell>
                          {statement.statementDate
                            ? new Date(statement.statementDate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {new Date(statement.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {statement.isParsed ? (
                            <Badge variant="secondary">Parsed</Badge>
                          ) : (
                            <Badge>Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!statement.isParsed && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => parseMutation.mutate({ id: statement.id })}
                              disabled={parseMutation.isPending}
                            >
                              {parseMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Parse with AI"
                              )}
                            </Button>
                          )}
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
