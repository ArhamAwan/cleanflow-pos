import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { Users, FileText, Package, Briefcase } from 'lucide-react';
import { useDatabaseInit } from '@/hooks/use-database';
import type { Customer, Invoice, Item, Job } from '@/types';

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const { isElectron } = useDatabaseInit();

  // Fetch all data when dialog opens
  useEffect(() => {
    if (open && isElectron && window.electronAPI) {
      setLoading(true);
      Promise.all([
        // Fetch customers
        window.electronAPI.customers.getAll().then((result) => {
          if (result.success && result.data) {
            setCustomers(result.data as Customer[]);
          }
        }),
        // Fetch invoices
        window.electronAPI.invoices.getAll().then((result) => {
          if (result.success && result.data) {
            setInvoices(result.data as Invoice[]);
          }
        }),
        // Fetch items
        window.electronAPI.inventory.items.getAll({ isActive: true }).then((result) => {
          if (result.success && result.data) {
            setItems(result.data as Item[]);
          }
        }),
        // Fetch jobs
        window.electronAPI.jobs.getAll().then((result) => {
          if (result.success && result.data) {
            setJobs(result.data as Job[]);
          }
        }),
      ]).finally(() => setLoading(false));
    }
  }, [open, isElectron]);

  // Filter results based on search query
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return {
        customers: customers.slice(0, 5),
        invoices: invoices.slice(0, 5),
        items: items.slice(0, 5),
        jobs: jobs.slice(0, 5),
      };
    }

    const query = searchQuery.toLowerCase();
    return {
      customers: customers.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.phone?.includes(query) ||
          c.email?.toLowerCase().includes(query)
      ),
      invoices: invoices.filter(
        (inv) =>
          inv.invoiceNumber?.toLowerCase().includes(query) ||
          inv.customerName?.toLowerCase().includes(query)
      ),
      items: items.filter(
        (item) =>
          item.name?.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query) ||
          item.barcode?.includes(query)
      ),
      jobs: jobs.filter(
        (job) =>
          job.customerName?.toLowerCase().includes(query) ||
          job.serviceName?.toLowerCase().includes(query)
      ),
    };
  }, [searchQuery, customers, invoices, items, jobs]);

  const handleSelect = (type: string, id: string) => {
    onOpenChange(false);

    switch (type) {
      case 'customer':
        navigate(`/customers`);
        break;
      case 'invoice':
        navigate(`/invoices`);
        break;
      case 'item':
        navigate(`/items`);
        break;
      case 'job':
        navigate(`/jobs`);
        break;
    }
  };

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const hasResults =
    filteredResults.customers.length > 0 ||
    filteredResults.invoices.length > 0 ||
    filteredResults.items.length > 0 ||
    filteredResults.jobs.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search customers, invoices, items, jobs..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList shouldFilter={false}>
        {loading && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        )}
        {!loading && !hasResults && searchQuery && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}
        {!loading && !searchQuery && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Start typing to search...
          </div>
        )}
        {!loading && hasResults && (
          <>
            {filteredResults.customers.length > 0 && (
              <CommandGroup heading="Customers">
                {filteredResults.customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={`customer-${customer.name}-${customer.phone || ''}-${customer.id}`}
                    onSelect={() => handleSelect('customer', customer.id)}
                    keywords={[customer.name, customer.phone || '', customer.email || '']}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <span>{customer.name}</span>
                    {customer.phone && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {customer.phone}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {filteredResults.invoices.length > 0 && (
              <CommandGroup heading="Invoices">
                {filteredResults.invoices.map((invoice) => (
                  <CommandItem
                    key={invoice.id}
                    value={`invoice-${invoice.invoiceNumber || ''}-${invoice.customerName || ''}-${invoice.id}`}
                    onSelect={() => handleSelect('invoice', invoice.id)}
                    keywords={[invoice.invoiceNumber || '', invoice.customerName || '']}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <span>{invoice.invoiceNumber}</span>
                    {invoice.customerName && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        - {invoice.customerName}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {filteredResults.items.length > 0 && (
              <CommandGroup heading="Items">
                {filteredResults.items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`item-${item.name}-${item.sku || ''}-${item.barcode || ''}-${item.id}`}
                    onSelect={() => handleSelect('item', item.id)}
                    keywords={[item.name, item.sku || '', item.barcode || '']}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    <span>{item.name}</span>
                    {item.sku && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        SKU: {item.sku}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {filteredResults.jobs.length > 0 && (
              <CommandGroup heading="Jobs">
                {filteredResults.jobs.map((job) => (
                  <CommandItem
                    key={job.id}
                    value={`job-${job.serviceName}-${job.customerName || ''}-${job.id}`}
                    onSelect={() => handleSelect('job', job.id)}
                    keywords={[job.serviceName, job.customerName || '']}
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    <span>{job.serviceName}</span>
                    {job.customerName && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        - {job.customerName}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

