import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, FileText, Eye, ArrowRight } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/data/mockData";
import { Estimate, EstimateStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useDatabaseInit } from "@/hooks/use-database";
import { EstimateViewDialog } from "@/components/invoices/EstimateViewDialog";

const statusColors: Record<EstimateStatus, string> = {
  DRAFT: "bg-gray-500",
  SENT: "bg-blue-500",
  ACCEPTED: "bg-green-500",
  REJECTED: "bg-red-500",
  CONVERTED: "bg-purple-500",
};

export default function Estimates() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewEstimateId, setViewEstimateId] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();
  const { isElectron } = useDatabaseInit();

  // Fetch estimates
  const fetchEstimates = async () => {
    if (!isElectron || !window.electronAPI) return;

    setLoading(true);
    try {
      const filters: Record<string, unknown> = {};
      if (statusFilter !== "all") {
        filters.status = statusFilter;
      }

      const result = await window.electronAPI.estimates.getAll(filters);
      if (result.success && result.data) {
        const safeEstimates = result.data.map((estimate: any) => ({
          ...estimate,
          estimateNumber:
            estimate.estimateNumber || estimate.estimate_number || "N/A",
          customerName: estimate.customerName || estimate.customer_name || null,
          customerId: estimate.customerId || estimate.customer_id || "",
          date: estimate.date || new Date().toISOString().split("T")[0],
          subtotal: Number(estimate.subtotal) || 0,
          taxAmount: Number(estimate.taxAmount || estimate.tax_amount) || 0,
          totalAmount:
            Number(estimate.totalAmount || estimate.total_amount) || 0,
          status: estimate.status || "DRAFT",
        }));
        setEstimates(safeEstimates);
      } else {
        console.error("Failed to fetch estimates:", result);
        toast({
          title: "Error",
          description: result.error || "Failed to fetch estimates",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to fetch estimates:", error);
      toast({
        title: "Error",
        description: "Failed to fetch estimates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isElectron) {
      fetchEstimates();
    }
  }, [isElectron, statusFilter]);

  const filteredEstimates = estimates.filter((estimate) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      estimate.estimateNumber?.toLowerCase().includes(query) ||
      estimate.customerName?.toLowerCase().includes(query) ||
      estimate.customerId?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-PK", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const handleConvertToInvoice = async (estimateId: string) => {
    if (!isElectron || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.estimates.convertToInvoice(
        estimateId
      );
      if (result.success && result.data) {
        toast({
          title: "Success",
          description: `Estimate converted to invoice ${result.data.invoiceNumber}`,
        });
        fetchEstimates();
        navigate(`/invoices`);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to convert estimate to invoice",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to convert estimate:", error);
      toast({
        title: "Error",
        description: "Failed to convert estimate to invoice",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Estimates"
        description="Manage quotations and estimates"
      />

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by estimate number or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="CONVERTED">Converted</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => navigate("/estimates/create")}>
            <Plus className="h-4 w-4 mr-2" />
            New Estimate
          </Button>
        </div>

        {/* Estimates Table */}
        <div className="glass-card rounded-lg p-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading estimates...
            </div>
          ) : filteredEstimates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No estimates found. Create your first estimate to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estimate #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEstimates.map((estimate) => {
                  if (!estimate || !estimate.id) {
                    return null;
                  }

                  return (
                    <TableRow key={estimate.id}>
                      <TableCell className="font-medium">
                        {estimate.estimateNumber || "N/A"}
                      </TableCell>
                      <TableCell>
                        {estimate.customerName || estimate.customerId || "N/A"}
                      </TableCell>
                      <TableCell>
                        {estimate.date ? formatDate(estimate.date) : "-"}
                      </TableCell>
                      <TableCell>
                        {estimate.validUntil
                          ? formatDate(estimate.validUntil)
                          : "-"}
                      </TableCell>
                      <TableCell>{formatCurrency(estimate.subtotal)}</TableCell>
                      <TableCell>
                        {formatCurrency(estimate.taxAmount)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(estimate.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${
                            statusColors[estimate.status as EstimateStatus] ||
                            "bg-gray-500"
                          } text-white`}
                          variant="default"
                        >
                          {estimate.status || "DRAFT"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewEstimateId(estimate.id);
                              setIsViewDialogOpen(true);
                            }}
                            title="View Estimate"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {estimate.status !== "CONVERTED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleConvertToInvoice(estimate.id)
                              }
                              title="Convert to Invoice"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Estimate View Dialog */}
      <EstimateViewDialog
        estimateId={viewEstimateId}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        onConvertToInvoice={handleConvertToInvoice}
      />
    </MainLayout>
  );
}
