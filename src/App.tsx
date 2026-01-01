import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Jobs from "./pages/Jobs";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import Ledgers from "./pages/Ledgers";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import ServiceCatalog from "./pages/ServiceCatalog";
import CustomerLedger from "./pages/CustomerLedger";
import SyncStatus from "./pages/SyncStatus";
import Invoices from "./pages/Invoices";
import CreateInvoice from "./pages/CreateInvoice";
import Estimates from "./pages/Estimates";
import CreateEstimate from "./pages/CreateEstimate";
import Challans from "./pages/Challans";
import CreateChallan from "./pages/CreateChallan";
import CompanySettings from "./pages/CompanySettings";
import AppSettings from "./pages/AppSettings";
import TaxSettings from "./pages/TaxSettings";
import TaxReports from "./pages/TaxReports";
import ReceivablesPayables from "./pages/ReceivablesPayables";
import Items from "./pages/Items";
import Warehouses from "./pages/Warehouses";
import StockMovements from "./pages/StockMovements";
import ReorderManagement from "./pages/ReorderManagement";
import InventoryValuation from "./pages/InventoryValuation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SettingsProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers" element={<Customers />} />
                <Route
                  path="/customers/:customerId/ledger"
                  element={<CustomerLedger />}
                />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/create" element={<CreateInvoice />} />
                <Route path="/estimates" element={<Estimates />} />
                <Route path="/estimates/create" element={<CreateEstimate />} />
                <Route path="/challans" element={<Challans />} />
                <Route path="/challans/create" element={<CreateChallan />} />
                <Route path="/items" element={<Items />} />
                <Route path="/warehouses" element={<Warehouses />} />
                <Route path="/stock-movements" element={<StockMovements />} />
                <Route
                  path="/reorder-management"
                  element={<ReorderManagement />}
                />
                <Route
                  path="/inventory-valuation"
                  element={<InventoryValuation />}
                />
                <Route path="/payments" element={<Payments />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/ledgers" element={<Ledgers />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/service-catalog" element={<ServiceCatalog />} />
                <Route path="/company-settings" element={<CompanySettings />} />
                <Route path="/app-settings" element={<AppSettings />} />
                <Route path="/tax-settings" element={<TaxSettings />} />
                <Route path="/tax-reports" element={<TaxReports />} />
                <Route
                  path="/receivables-payables"
                  element={<ReceivablesPayables />}
                />
                <Route path="/users" element={<Users />} />
                <Route path="/sync" element={<SyncStatus />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </SettingsProvider>
  </QueryClientProvider>
);

export default App;
