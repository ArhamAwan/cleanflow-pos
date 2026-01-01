import { useState } from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useDatabaseInit } from '@/hooks/use-database';
import { formatCurrency } from '@/data/mockData';

type ReportType = 'STR-1' | 'STR-2' | 'STR-3' | 'PST' | 'WHT' | 'SUMMARY';

export default function TaxReports() {
  const [reportType, setReportType] = useState<ReportType>('SUMMARY');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
  const [province, setProvince] = useState('SINDH');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isElectron } = useDatabaseInit();

  const generateReport = async () => {
    if (!isElectron || !window.electronAPI) {
      toast({
        title: 'Error',
        description: 'Electron API not available',
        variant: 'destructive',
      });
      return;
    }

    if (!startDate || !endDate) {
      toast({
        title: 'Error',
        description: 'Please select start and end dates',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      let result;
      
      switch (reportType) {
        case 'STR-1':
          result = await window.electronAPI.taxReports.generateSTR1(startDate, endDate);
          break;
        case 'STR-2':
          result = await window.electronAPI.taxReports.generateSTR2(startDate, endDate);
          break;
        case 'STR-3':
          result = await window.electronAPI.taxReports.generateSTR3(startDate, endDate);
          break;
        case 'PST':
          result = await window.electronAPI.taxReports.generatePST(province, startDate, endDate);
          break;
        case 'WHT':
          result = await window.electronAPI.taxReports.generateWHT(startDate, endDate);
          break;
        case 'SUMMARY':
          result = await window.electronAPI.taxReports.getSummary(startDate, endDate);
          break;
        default:
          throw new Error('Invalid report type');
      }

      if (result.success && result.data) {
        setReportData(result.data);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to generate report',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderReport = () => {
    if (!reportData) return null;

    switch (reportType) {
      case 'STR-1':
        return (
          <div className="space-y-4">
            <div className="glass-card rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">STR-1: Sales Tax Return (Sales)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Invoices</div>
                  <div className="text-2xl font-bold">{reportData.totalInvoices || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Sales</div>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.totalSales || 0)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Sales Tax</div>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.totalSalesTax || 0)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">PST</div>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.totalPST || 0)}</div>
                </div>
              </div>
              {reportData.invoices && reportData.invoices.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Sales Amount</TableHead>
                      <TableHead>Sales Tax</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.invoices.map((inv: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{inv.invoiceNumber}</TableCell>
                        <TableCell>{new Date(inv.date).toLocaleDateString()}</TableCell>
                        <TableCell>{inv.customerName || 'N/A'}</TableCell>
                        <TableCell>{formatCurrency(inv.salesAmount)}</TableCell>
                        <TableCell>{formatCurrency(inv.salesTax)}</TableCell>
                        <TableCell>{formatCurrency(inv.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        );

      case 'STR-3':
        return (
          <div className="space-y-4">
            <div className="glass-card rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">STR-3: Sales Tax Return (Summary)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">Output Tax</div>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.outputTax?.total || 0)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Input Tax</div>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.inputTax?.total || 0)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Tax Payable</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(reportData.summary?.taxPayable || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Tax Refundable</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(reportData.summary?.taxRefundable || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'SUMMARY':
        return (
          <div className="space-y-4">
            <div className="glass-card rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Tax Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-2">Sales</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Total Sales:</span>
                      <span className="font-medium">{formatCurrency(reportData.sales?.totalSales || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sales Tax:</span>
                      <span className="font-medium">{formatCurrency(reportData.sales?.salesTax || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PST:</span>
                      <span className="font-medium">{formatCurrency(reportData.sales?.pst || 0)}</span>
                    </div>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-2">Purchases</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Total Purchases:</span>
                      <span className="font-medium">{formatCurrency(reportData.purchases?.totalAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Input Tax:</span>
                      <span className="font-medium">{formatCurrency(reportData.purchases?.inputTax || 0)}</span>
                    </div>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-2">Net Tax</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Output Tax:</span>
                      <span className="font-medium">{formatCurrency(reportData.netTax?.outputTax || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Input Tax:</span>
                      <span className="font-medium">{formatCurrency(reportData.netTax?.inputTax || 0)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-semibold">Net Payable:</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(reportData.netTax?.payable || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="glass-card rounded-lg p-6">
            <pre className="text-sm overflow-auto">{JSON.stringify(reportData, null, 2)}</pre>
          </div>
        );
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Tax Reports"
        description="Generate Pakistani tax returns and reports"
        icon={FileText}
      />

      <div className="space-y-6">
        {/* Report Configuration */}
        <div className="glass-card rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={(value: ReportType) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUMMARY">Tax Summary</SelectItem>
                  <SelectItem value="STR-1">STR-1 (Sales)</SelectItem>
                  <SelectItem value="STR-2">STR-2 (Purchases)</SelectItem>
                  <SelectItem value="STR-3">STR-3 (Summary)</SelectItem>
                  <SelectItem value="PST">PST Return</SelectItem>
                  <SelectItem value="WHT">WHT Return</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {reportType === 'PST' && (
              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Select value={province} onValueChange={setProvince}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINDH">Sindh</SelectItem>
                    <SelectItem value="PUNJAB">Punjab</SelectItem>
                    <SelectItem value="KPK">KPK</SelectItem>
                    <SelectItem value="BALOCHISTAN">Balochistan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {reportType !== 'PST' && <div />}

            <div className="flex items-end">
              <Button onClick={generateReport} disabled={loading} className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </div>

        {/* Report Results */}
        {reportData && renderReport()}
      </div>
    </MainLayout>
  );
}

