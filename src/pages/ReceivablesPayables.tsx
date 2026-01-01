import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, Users, Calendar } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { useDatabaseInit } from "@/hooks/use-database";

interface Receivable {
  customerId: string;
  customerName: string;
  phone: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  daysOverdue: number;
  ageCategory: string;
}

interface Payable {
  expenseId: string;
  supplierName: string;
  description: string;
  amount: number;
  expenseDate: string;
  daysOutstanding: number;
  ageCategory: string;
  category: string;
  method: string;
}

export default function ReceivablesPayables() {
  const [activeTab, setActiveTab] = useState<"receivables" | "payables">("receivables");
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [receivablesSummary, setReceivablesSummary] = useState<any>(null);
  const [payablesSummary, setPayablesSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [ageFilter, setAgeFilter] = useState<string>("all");
  const { toast } = useToast();
  const { isElectron } = useDatabaseInit();

  // Fetch receivables
  const fetchReceivables = async () => {
    if (!isElectron || !window.electronAPI) return;

    setLoading(true);
    try {
      const [receivablesResult, summaryResult] = await Promise.all([
        window.electronAPI.receivables.getAll(),
        window.electronAPI.receivables.getSummary(),
      ]);

      if (receivablesResult.success && receivablesResult.data) {
        setReceivables(receivablesResult.data as Receivable[]);
      }

      if (summaryResult.success && summaryResult.data) {
        setReceivablesSummary(summaryResult.data);
      }
    } catch (error) {
      console.error("Failed to fetch receivables:", error);
      toast({
        title: "Error",
        description: "Failed to load receivables",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch payables
  const fetchPayables = async () => {
    if (!isElectron || !window.electronAPI) return;

    setLoading(true);
    try {
      const [payablesResult, summaryResult] = await Promise.all([
        window.electronAPI.payables.getAll(),
        window.electronAPI.payables.getSummary(),
      ]);

      if (payablesResult.success && payablesResult.data) {
        setPayables(payablesResult.data as Payable[]);
      }

      if (summaryResult.success && summaryResult.data) {
        setPayablesSummary(summaryResult.data);
      }
    } catch (error) {
      console.error("Failed to fetch payables:", error);
      toast({
        title: "Error",
        description: "Failed to load payables",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isElectron) {
      if (activeTab === "receivables") {
        fetchReceivables();
      } else {
        fetchPayables();
      }
    }
  }, [isElectron, activeTab]);

  const filteredReceivables = receivables.filter((rec) => {
    if (ageFilter === "all") return true;
    return rec.ageCategory === ageFilter;
  });

  const filteredPayables = payables.filter((pay) => {
    if (ageFilter === "all") return true;
    return pay.ageCategory === ageFilter;
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

  const getAgeColor = (category: string) => {
    const colors = {
      current: "bg-green-500",
      "0-30": "bg-blue-500",
      "31-60": "bg-yellow-500",
      "61-90": "bg-orange-500",
      "90+": "bg-red-500",
    };
    return colors[category as keyof typeof colors] || "bg-gray-500";
  };

  return (
    <MainLayout>
      <PageHeader
        title="Receivables & Payables"
        description="Track money owed to you and money you owe"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "receivables" | "payables")}>
        <TabsList className="mb-6">
          <TabsTrigger value="receivables">
            <TrendingUp className="h-4 w-4 mr-2" />
            Receivables
          </TabsTrigger>
          <TabsTrigger value="payables">
            <TrendingDown className="h-4 w-4 mr-2" />
            Payables
          </TabsTrigger>
        </TabsList>

        {/* Receivables Tab */}
        <TabsContent value="receivables" className="space-y-6">
          {/* Summary Cards */}
          {receivablesSummary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-card rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Receivables</div>
                    <div className="text-2xl font-bold mt-1">
                      {formatCurrency(receivablesSummary.totalReceivables || 0)}
                    </div>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="glass-card rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Customers</div>
                    <div className="text-2xl font-bold mt-1">
                      {receivablesSummary.totalCustomers || 0}
                    </div>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="glass-card rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Overdue (90+ days)</div>
                    <div className="text-2xl font-bold mt-1 text-red-500">
                      {formatCurrency(receivablesSummary.aging?.["90+"]?.amount || 0)}
                    </div>
                  </div>
                  <Calendar className="h-8 w-8 text-red-500" />
                </div>
              </div>

              <div className="glass-card rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Current (0-30 days)</div>
                    <div className="text-2xl font-bold mt-1 text-green-500">
                      {formatCurrency(receivablesSummary.aging?.["0-30"]?.amount || 0)}
                    </div>
                  </div>
                  <Calendar className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </div>
          )}

          {/* Aging Summary */}
          {receivablesSummary && (
            <div className="glass-card rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Aging Analysis</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(receivablesSummary.aging || {}).map(([age, data]: [string, any]) => (
                  <div key={age} className="text-center">
                    <div className="text-sm text-muted-foreground">{age} days</div>
                    <div className="text-xl font-bold mt-1">{data.count || 0}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatCurrency(data.amount || 0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter and Table */}
          <div className="glass-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Receivables List</h3>
              <Select value={ageFilter} onValueChange={setAgeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by age" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ages</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="0-30">0-30 days</SelectItem>
                  <SelectItem value="31-60">31-60 days</SelectItem>
                  <SelectItem value="61-90">61-90 days</SelectItem>
                  <SelectItem value="90+">90+ days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading receivables...</div>
            ) : filteredReceivables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No receivables found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceivables.map((rec) => (
                    <TableRow key={`${rec.customerId}-${rec.invoiceId}`}>
                      <TableCell className="font-medium">{rec.customerName}</TableCell>
                      <TableCell>{rec.invoiceNumber}</TableCell>
                      <TableCell>{formatDate(rec.invoiceDate)}</TableCell>
                      <TableCell>{rec.dueDate ? formatDate(rec.dueDate) : "-"}</TableCell>
                      <TableCell>{formatCurrency(rec.totalAmount)}</TableCell>
                      <TableCell>{formatCurrency(rec.paidAmount)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(rec.outstandingAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getAgeColor(rec.ageCategory)}>
                          {rec.daysOverdue} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{rec.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Payables Tab */}
        <TabsContent value="payables" className="space-y-6">
          {/* Summary Cards */}
          {payablesSummary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Payables</div>
                    <div className="text-2xl font-bold mt-1">
                      {formatCurrency(payablesSummary.totalPayables || 0)}
                    </div>
                  </div>
                  <DollarSign className="h-8 w-8 text-red-500" />
                </div>
              </div>

              <div className="glass-card rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Suppliers</div>
                    <div className="text-2xl font-bold mt-1">
                      {payablesSummary.totalSuppliers || 0}
                    </div>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="glass-card rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Overdue (90+ days)</div>
                    <div className="text-2xl font-bold mt-1 text-red-500">
                      {formatCurrency(payablesSummary.aging?.["90+"]?.amount || 0)}
                    </div>
                  </div>
                  <Calendar className="h-8 w-8 text-red-500" />
                </div>
              </div>
            </div>
          )}

          {/* Payables Table */}
          <div className="glass-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Payables List</h3>
              <Select value={ageFilter} onValueChange={setAgeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by age" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ages</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="0-30">0-30 days</SelectItem>
                  <SelectItem value="31-60">31-60 days</SelectItem>
                  <SelectItem value="61-90">61-90 days</SelectItem>
                  <SelectItem value="90+">90+ days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading payables...</div>
            ) : filteredPayables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No payables found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayables.map((pay) => (
                    <TableRow key={pay.expenseId}>
                      <TableCell className="font-medium">{pay.supplierName}</TableCell>
                      <TableCell>{pay.description}</TableCell>
                      <TableCell>{pay.category}</TableCell>
                      <TableCell>{formatDate(pay.expenseDate)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(pay.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getAgeColor(pay.ageCategory)}>
                          {pay.daysOutstanding} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{pay.method}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}

