import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Download } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/exportUtils";
import { useDatabaseInit } from "@/hooks/use-database";

interface CustomerTransaction {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function CustomerLedger() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [dateFrom, setDateFrom] = useState("2024-12-01");
  const [dateTo, setDateTo] = useState(() => {
    // Always default to current date
    return new Date().toISOString().split("T")[0];
  });
  const [customer, setCustomer] = useState<any>(null);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const { isElectron } = useDatabaseInit();

  useEffect(() => {
    if (isElectron && customerId && window.electronAPI) {
      fetchCustomerLedger();
    }
  }, [isElectron, customerId]);

  // Refresh ledger when navigating back to this page
  useEffect(() => {
    const handleFocus = () => {
      if (isElectron && customerId && window.electronAPI) {
        fetchCustomerLedger();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isElectron, customerId]);

  const fetchCustomerLedger = async () => {
    if (!isElectron || !customerId || !window.electronAPI) return;

    setLoading(true);
    try {
      const result = await window.electronAPI.customers.getLedger(customerId);
      if (result.success && result.data) {
        const customerData = result.data;
        setCustomer(customerData);

        // Transform ledger entries to transactions
        const ledgerEntries = customerData.ledgerEntries || [];
        let runningBalance = 0;
        const txs: CustomerTransaction[] = ledgerEntries.map((entry: any) => {
          runningBalance =
            runningBalance +
            (Number(entry.debit) || 0) -
            (Number(entry.credit) || 0);
          return {
            id: entry.id,
            date: entry.date || entry.created_at,
            description: entry.description || "Transaction",
            debit: Number(entry.debit) || 0,
            credit: Number(entry.credit) || 0,
            balance: runningBalance,
          };
        });

        setTransactions(txs);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load customer ledger",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to fetch customer ledger:", error);
      toast({
        title: "Error",
        description: "Failed to load customer ledger",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading ledger...</p>
        </div>
      </MainLayout>
    );
  }

  if (!customer) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Customer not found</p>
          <Button
            variant="outline"
            onClick={() => navigate("/customers")}
            className="mt-4"
          >
            Back to Customers
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Filter by date range
  const filteredTransactions = transactions.filter(
    (t) => t.date >= dateFrom && t.date <= dateTo
  );

  const handleExport = () => {
    exportToExcel(
      filteredTransactions.map((t) => ({
        Date: t.date,
        Description: t.description,
        Debit: t.debit || "",
        Credit: t.credit || "",
        Balance: t.balance,
      })),
      `${customer.name.replace(/\s+/g, "_")}_Ledger`
    );
    toast({
      title: "Export Complete",
      description: "Ledger has been exported to Excel.",
    });
  };

  const columns = [
    { key: "date", header: "Date" },
    { key: "description", header: "Description" },
    {
      key: "debit",
      header: "Debit (Receivable)",
      render: (t: CustomerTransaction) =>
        t.debit ? (
          <span className="text-destructive font-medium">
            {formatCurrency(t.debit)}
          </span>
        ) : (
          "-"
        ),
    },
    {
      key: "credit",
      header: "Credit (Received)",
      render: (t: CustomerTransaction) =>
        t.credit ? (
          <span className="text-success font-medium">
            {formatCurrency(t.credit)}
          </span>
        ) : (
          "-"
        ),
    },
    {
      key: "balance",
      header: "Balance",
      render: (t: CustomerTransaction) => (
        <span
          className={
            t.balance > 0
              ? "text-destructive font-semibold"
              : "text-success font-semibold"
          }
        >
          {formatCurrency(t.balance)}
        </span>
      ),
    },
  ];

  const finalBalance =
    filteredTransactions.length > 0
      ? filteredTransactions[filteredTransactions.length - 1].balance
      : 0;

  return (
    <MainLayout>
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/customers")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </div>

      <PageHeader
        title={`${customer.name} - Ledger`}
        description={`Phone: ${customer.phone || "N/A"} | Address: ${
          customer.address || "N/A"
        }`}
        action={
          <Button
            onClick={handleExport}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        }
      />

      {/* Date Range Filters */}
      <div className="mb-6 glass-card rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Date Range:</span>
          </div>
          <div className="space-y-1">
            <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40 glass-input"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40 glass-input"
            />
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="mb-6 glass-card rounded-xl p-6">
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="text-sm text-muted-foreground">Total Billed</p>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(
                filteredTransactions.reduce((sum, t) => sum + t.debit, 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Received</p>
            <p className="text-xl font-bold text-success">
              {formatCurrency(
                filteredTransactions.reduce((sum, t) => sum + t.credit, 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Outstanding Balance</p>
            <p
              className={`text-xl font-bold ${
                finalBalance > 0 ? "text-destructive" : "text-success"
              }`}
            >
              {formatCurrency(finalBalance)}
            </p>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredTransactions}
        keyExtractor={(t) => t.id}
      />
    </MainLayout>
  );
}
