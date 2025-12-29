import { useState, useEffect } from "react";
import { Plus, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/data/mockData";
import { Payment, Customer, Job } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
  usePayments,
  useCustomers,
  useJobs,
  useDatabaseInit,
} from "@/hooks/use-database";

export default function Payments() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<"cash_in" | "cash_out">(
    "cash_in"
  );
  const [formData, setFormData] = useState({
    amount: "",
    method: "cash" as "cash" | "bank",
    customerId: "",
    jobId: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const { toast } = useToast();

  // Database hooks
  const { isElectron } = useDatabaseInit();
  const {
    payments: dbPayments,
    fetchPayments,
    createPayment: dbCreatePayment,
  } = usePayments();
  const { customers: dbCustomers, fetchCustomers } = useCustomers();
  const { jobs: dbJobs, fetchJobs } = useJobs();

  // Fetch data on mount
  useEffect(() => {
    if (isElectron) {
      fetchPayments();
      fetchCustomers();
      fetchJobs();
    }
  }, [isElectron, fetchPayments, fetchCustomers, fetchJobs]);

  // Use DB data only (empty arrays when not in Electron)
  const payments: Payment[] = isElectron ? dbPayments : [];
  const customers: Customer[] = isElectron ? dbCustomers : [];
  const jobs: Job[] = isElectron ? dbJobs : [];

  const cashInPayments = payments.filter((p) => p.type === "cash_in");
  const cashOutPayments = payments.filter((p) => p.type === "cash_out");

  const handleSubmit = async () => {
    if (isElectron) {
      const result = await dbCreatePayment({
        type: paymentType,
        amount: Number(formData.amount),
        method: formData.method,
        customerId: formData.customerId || undefined,
        jobId: formData.jobId || undefined,
        description: formData.description,
        date: formData.date,
      });
      if (result) {
        toast({
          title: "Payment Recorded",
          description: `${
            paymentType === "cash_in" ? "Cash In" : "Cash Out"
          } of ${formatCurrency(Number(formData.amount))} recorded.`,
        });
      }
    } else {
      toast({
        title: "Payment Recorded",
        description: `${
          paymentType === "cash_in" ? "Cash In" : "Cash Out"
        } of ${formatCurrency(Number(formData.amount))} recorded.`,
      });
    }
    setIsModalOpen(false);
    setFormData({
      amount: "",
      method: "cash",
      customerId: "",
      jobId: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  const openModal = (type: "cash_in" | "cash_out") => {
    setPaymentType(type);
    setIsModalOpen(true);
  };

  const columns = [
    { key: "id", header: "Payment ID" },
    { key: "description", header: "Description" },
    { key: "date", header: "Date" },
    {
      key: "method",
      header: "Method",
      render: (payment: Payment) => (
        <span className="px-2 py-1 bg-muted rounded text-xs font-medium uppercase">
          {payment.method}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (payment: Payment) => (
        <span
          className={
            payment.type === "cash_in"
              ? "text-success font-medium"
              : "text-destructive font-medium"
          }
        >
          {payment.type === "cash_in" ? "+" : "-"}
          {formatCurrency(payment.amount)}
        </span>
      ),
    },
  ];

  return (
    <MainLayout>
      <PageHeader
        title="Payments"
        description="Record and track cash inflows and outflows"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-success" />
              Cash In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(
                cashInPayments.reduce((sum, p) => sum + p.amount, 0)
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => openModal("cash_in")}
            >
              <Plus className="h-4 w-4 mr-1" />
              Record Cash In
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-destructive" />
              Cash Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(
                cashOutPayments.reduce((sum, p) => sum + p.amount, 0)
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => openModal("cash_out")}
            >
              <Plus className="h-4 w-4 mr-1" />
              Record Cash Out
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Payments</TabsTrigger>
          <TabsTrigger value="cash_in">Cash In</TabsTrigger>
          <TabsTrigger value="cash_out">Cash Out</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <DataTable
            columns={columns}
            data={payments}
            keyExtractor={(payment) => payment.id}
          />
        </TabsContent>
        <TabsContent value="cash_in" className="mt-4">
          <DataTable
            columns={columns}
            data={cashInPayments}
            keyExtractor={(payment) => payment.id}
          />
        </TabsContent>
        <TabsContent value="cash_out" className="mt-4">
          <DataTable
            columns={columns}
            data={cashOutPayments}
            keyExtractor={(payment) => payment.id}
          />
        </TabsContent>
      </Tabs>

      {/* Payment Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="glass-card-static">
          <DialogHeader>
            <DialogTitle>
              {paymentType === "cash_in" ? "Record Cash In" : "Record Cash Out"}
            </DialogTitle>
            <DialogDescription>
              Enter the payment details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (PKR)</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={formData.method}
                onValueChange={(v: "cash" | "bank") =>
                  setFormData({ ...formData, method: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentType === "cash_in" && (
              <>
                <div className="space-y-2">
                  <Label>Customer (Optional)</Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(v) =>
                      setFormData({ ...formData, customerId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Linked Job (Optional)</Label>
                  <Select
                    value={formData.jobId}
                    onValueChange={(v) =>
                      setFormData({ ...formData, jobId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select job" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs
                        .filter((j) => j.paymentStatus !== "paid")
                        .map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.id} - {job.customerName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit}>Record Payment</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
