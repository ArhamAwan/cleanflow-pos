import { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
}

export function DataTable<T>({ columns, data, keyExtractor }: DataTableProps<T>) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            {columns.map((column) => (
              <TableHead key={column.key} className="text-muted-foreground font-semibold">
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                No data available
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={keyExtractor(item)} className="border-border/50 hover:bg-muted/30 transition-colors">
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.render 
                      ? column.render(item) 
                      : String((item as Record<string, unknown>)[column.key] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
