import { useToast } from '@/hooks/use-toast';

interface ExportData {
  [key: string]: string | number | boolean | null | undefined;
}

export function exportToExcel(data: ExportData[], filename: string): void {
  if (data.length === 0) {
    return;
  }

  // Get headers from first item
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function useExport() {
  const { toast } = useToast();

  const exportData = (data: ExportData[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: 'No Data',
        description: 'There is no data to export.',
        variant: 'destructive',
      });
      return;
    }

    exportToExcel(data, filename);
    toast({
      title: 'Export Complete',
      description: `${filename}.csv has been downloaded.`,
    });
  };

  return { exportData };
}
