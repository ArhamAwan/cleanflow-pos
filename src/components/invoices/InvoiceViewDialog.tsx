import { useState, useEffect } from "react";
import {
  Download,
  Share2,
  MessageCircle,
  Mail,
  Smartphone,
} from "lucide-react";
import jsPDF from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/data/mockData";
import { Invoice, CompanySettings } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useDatabaseInit } from "@/hooks/use-database";

interface InvoiceViewDialogProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceViewDialog({
  invoiceId,
  open,
  onOpenChange,
}: InvoiceViewDialogProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [companySettings, setCompanySettings] =
    useState<CompanySettings | null>(null);
  const { toast } = useToast();
  const { isElectron } = useDatabaseInit();

  useEffect(() => {
    if (open && isElectron && window.electronAPI) {
      fetchCompanySettings();
      if (invoiceId) {
        fetchInvoice();
      }
    }
  }, [open, invoiceId, isElectron]);

  const fetchCompanySettings = async () => {
    if (!isElectron || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.companySettings.get();
      if (result.success && result.data) {
        setCompanySettings(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch company settings:", error);
    }
  };

  const fetchInvoice = async () => {
    if (!invoiceId || !isElectron || !window.electronAPI) return;

    setLoading(true);
    try {
      const result = await window.electronAPI.invoices.getById(invoiceId);
      if (result.success && result.data) {
        setInvoice(result.data);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load invoice",
          variant: "destructive",
        });
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Failed to fetch invoice:", error);
      toast({
        title: "Error",
        description: "Failed to load invoice",
        variant: "destructive",
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-PK", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const handleDownload = async () => {
    if (!invoice) {
      toast({
        title: "Error",
        description: "Invoice not ready for PDF generation",
        variant: "destructive",
      });
      return;
    }

    setGeneratingPDF(true);
    try {
      // Create PDF using jsPDF's built-in text rendering
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let yPosition = margin;

      // Helper function to add text with word wrap
      const addText = (
        text: string,
        fontSize: number,
        isBold: boolean = false,
        align: "left" | "center" | "right" = "left"
      ) => {
        pdf.setFontSize(fontSize);
        pdf.setFont("helvetica", isBold ? "bold" : "normal");

        const lines = pdf.splitTextToSize(text, contentWidth);
        const lineHeight = fontSize * 0.4;

        // Check if we need a new page
        if (yPosition + lines.length * lineHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }

        lines.forEach((line: string) => {
          pdf.text(line, margin, yPosition, { align });
          yPosition += lineHeight;
        });

        return yPosition;
      };

      const formatDate = (dateString: string) => {
        try {
          return new Date(dateString).toLocaleDateString("en-PK", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        } catch {
          return dateString;
        }
      };

      // Header - Use company settings from database
      const companyName = companySettings?.companyName || "Company Name";
      const companyAddress = companySettings?.address || "Address";
      const companyPhone = companySettings?.phone || "Phone";
      const companyEmail = companySettings?.email;
      const companyTaxId = companySettings?.taxId
        ? `NTN: ${companySettings.taxId}`
        : null;

      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text(companyName, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      if (companyAddress) {
        pdf.text(companyAddress, pageWidth / 2, yPosition, { align: "center" });
        yPosition += 5;
      }
      if (companyPhone) {
        pdf.text(`Phone: ${companyPhone}`, pageWidth / 2, yPosition, {
          align: "center",
        });
        yPosition += 5;
      }
      if (companyEmail) {
        pdf.text(`Email: ${companyEmail}`, pageWidth / 2, yPosition, {
          align: "center",
        });
        yPosition += 5;
      }
      if (companyTaxId) {
        pdf.text(companyTaxId, pageWidth / 2, yPosition, { align: "center" });
        yPosition += 5;
      }

      yPosition += 10;
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 12;

      // Invoice Title and Number
      const invoiceType =
        invoice.invoiceType === "TAX_INVOICE"
          ? "TAX INVOICE"
          : invoice.invoiceType || "INVOICE";
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(invoiceType, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Invoice #: ${invoice.invoiceNumber || "N/A"}`,
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );
      yPosition += 6;
      pdf.text(
        `Date: ${invoice.date ? formatDate(invoice.date) : "N/A"}`,
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );
      if (invoice.dueDate) {
        yPosition += 6;
        pdf.text(
          `Due Date: ${formatDate(invoice.dueDate)}`,
          pageWidth / 2,
          yPosition,
          { align: "center" }
        );
      }
      yPosition += 12;

      // Customer and Invoice Info
      const boxHeight = invoice.paymentTerms ? 35 : 28;
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, yPosition, contentWidth / 2 - 5, boxHeight);
      pdf.rect(
        margin + contentWidth / 2 + 5,
        yPosition,
        contentWidth / 2 - 5,
        boxHeight
      );

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("Bill To:", margin + 5, yPosition + 7);
      pdf.text(
        "Invoice Details:",
        margin + contentWidth / 2 + 10,
        yPosition + 7
      );

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        invoice.customerName || invoice.customerId || "N/A",
        margin + 5,
        yPosition + 14
      );
      pdf.text(
        `Status: ${invoice.status || "N/A"}`,
        margin + contentWidth / 2 + 10,
        yPosition + 14
      );
      if (invoice.paymentTerms) {
        pdf.text(
          `Payment Terms: ${invoice.paymentTerms}`,
          margin + contentWidth / 2 + 10,
          yPosition + 21
        );
      }

      yPosition += boxHeight + 10;

      // Items Table
      if (invoice.items && invoice.items.length > 0) {
        // Calculate column positions - ensure they fit within contentWidth
        const tableStartX = margin;
        const tableEndX = pageWidth - margin;
        const tableWidth = tableEndX - tableStartX;

        // Column widths in mm - optimized for A4 page
        // Description, Qty, Unit Price, Discount, Tax %, Tax, Total
        const colWidths = [80, 20, 30, 25, 20, 30, 35];
        const totalColWidth = colWidths.reduce((sum, w) => sum + w, 0);

        // Adjust if columns don't fit
        if (totalColWidth > tableWidth) {
          const scale = tableWidth / totalColWidth;
          colWidths.forEach((w, i) => (colWidths[i] = w * scale));
        }

        const colPositions: number[] = [tableStartX + 3];
        for (let i = 1; i < colWidths.length; i++) {
          colPositions.push(colPositions[i - 1] + colWidths[i - 1]);
        }

        // Table header background
        pdf.setFillColor(240, 240, 240);
        pdf.rect(tableStartX, yPosition, tableWidth, 8, "F");

        const headers = [
          "Description",
          "Qty",
          "Unit Price",
          "Discount",
          "Tax %",
          "Tax",
          "Total",
        ];
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0);

        headers.forEach((header, i) => {
          if (i === 0) {
            // Description - left aligned
            pdf.text(header, colPositions[i], yPosition + 6, { align: "left" });
          } else {
            // All other headers - right aligned at the right edge of their column
            const xPos = colPositions[i] + colWidths[i] - 3;
            pdf.text(header, xPos, yPosition + 6, { align: "right" });
          }
        });

        yPosition += 10;
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.line(tableStartX, yPosition, tableEndX, yPosition);
        yPosition += 5;

        // Table rows
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        invoice.items.forEach((item, index) => {
          if (yPosition > pageHeight - margin - 30) {
            pdf.addPage();
            yPosition = margin + 10;
          }

          const quantity = Number(item.quantity) || 0;
          const unitPrice = Number(item.unitPrice) || 0;
          const discountAmount = Number(item.discountAmount) || 0;
          const taxRate = Number(item.taxRate) || 17;
          const taxAmount = Number(item.taxAmount) || 0;
          const lineTotal = Number(item.lineTotal) || 0;

          // Truncate description if too long
          let description = item.description || "N/A";
          const maxDescWidth = colWidths[0] - 6;
          if (pdf.getTextWidth(description) > maxDescWidth) {
            const words = description.split(" ");
            description = "";
            for (const word of words) {
              if (pdf.getTextWidth(description + word + " ") <= maxDescWidth) {
                description += word + " ";
              } else {
                break;
              }
            }
            if (description.length < item.description.length) {
              description = description.trim() + "...";
            }
          }

          const rowData = [
            description,
            quantity.toString(),
            formatCurrency(unitPrice),
            formatCurrency(discountAmount),
            `${taxRate}%`,
            formatCurrency(taxAmount),
            formatCurrency(lineTotal),
          ];

          rowData.forEach((data, i) => {
            if (i === 0) {
              // Description - left aligned
              pdf.text(data, colPositions[i], yPosition + 5, { align: "left" });
            } else {
              // All other columns - right aligned at the right edge of their column
              const xPos = colPositions[i] + colWidths[i] - 3;
              pdf.text(data, xPos, yPosition + 5, { align: "right" });
            }
          });

          // Draw row separator
          yPosition += 8;
          if (index < invoice.items.length - 1) {
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.2);
            pdf.line(tableStartX, yPosition, tableEndX, yPosition);
            yPosition += 2;
          }
        });

        yPosition += 5;
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.line(tableStartX, yPosition, tableEndX, yPosition);
        yPosition += 12;
      }

      // Totals Section
      const totalsX = pageWidth - margin - 90;
      const totalsWidth = 90;

      // Draw totals box
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      const totalsBoxHeight =
        (Number(invoice.discountAmount) || 0) > 0 ? 45 : 38;
      pdf.rect(totalsX, yPosition, totalsWidth, totalsBoxHeight);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      let totalsY = yPosition + 7;

      pdf.text("Subtotal:", totalsX + 5, totalsY);
      pdf.text(
        formatCurrency(Number(invoice.subtotal) || 0),
        totalsX + totalsWidth - 5,
        totalsY,
        { align: "right" }
      );
      totalsY += 7;

      if ((Number(invoice.discountAmount) || 0) > 0) {
        pdf.text("Discount:", totalsX + 5, totalsY);
        pdf.text(
          `-${formatCurrency(Number(invoice.discountAmount) || 0)}`,
          totalsX + totalsWidth - 5,
          totalsY,
          { align: "right" }
        );
        totalsY += 7;
      }

      pdf.text("Tax:", totalsX + 5, totalsY);
      pdf.text(
        formatCurrency(Number(invoice.taxAmount) || 0),
        totalsX + totalsWidth - 5,
        totalsY,
        { align: "right" }
      );
      totalsY += 7;

      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.line(totalsX, totalsY, totalsX + totalsWidth, totalsY);
      totalsY += 5;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Total:", totalsX + 5, totalsY);
      pdf.text(
        formatCurrency(Number(invoice.totalAmount) || 0),
        totalsX + totalsWidth - 5,
        totalsY,
        { align: "right" }
      );

      yPosition += totalsBoxHeight + 15;

      // Notes
      if (invoice.notes) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("Notes:", margin, yPosition);
        yPosition += 6;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        const noteLines = pdf.splitTextToSize(invoice.notes, contentWidth);
        noteLines.forEach((line: string) => {
          pdf.text(line, margin, yPosition);
          yPosition += 5;
        });
        yPosition += 5;
      }

      // Footer
      yPosition = pageHeight - margin - 15;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100);
      pdf.text("Thank you for your business!", pageWidth / 2, yPosition, {
        align: "center",
      });
      if (invoice.paymentTerms && !invoice.notes) {
        yPosition += 5;
        pdf.text(
          `Payment Terms: ${invoice.paymentTerms}`,
          pageWidth / 2,
          yPosition,
          { align: "center" }
        );
      }

      pdf.setTextColor(0, 0, 0);

      // Save the PDF
      const fileName = `Invoice-${invoice.invoiceNumber || "invoice"}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Success",
        description: "PDF downloaded successfully",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Generate invoice summary text for sharing
  const getInvoiceSummary = () => {
    if (!invoice) return "";
    const companyName = companySettings?.companyName || "Our Company";
    const itemsSummary =
      invoice.items
        ?.slice(0, 3)
        .map((item) => item.description)
        .join(", ") || "Items";
    const moreItems =
      invoice.items && invoice.items.length > 3
        ? ` and ${invoice.items.length - 3} more`
        : "";

    return (
      `Invoice ${invoice.invoiceNumber} from ${companyName}\n` +
      `Date: ${formatDate(invoice.date)}\n` +
      `Amount: ${formatCurrency(invoice.totalAmount)}\n` +
      `Items: ${itemsSummary}${moreItems}` +
      (invoice.dueDate ? `\nDue Date: ${formatDate(invoice.dueDate)}` : "")
    );
  };

  // WhatsApp sharing
  const handleShareWhatsApp = async () => {
    if (!invoice) {
      return;
    }

    const phone = invoice.customerPhone?.replace(/\D/g, "") || "";
    const message = encodeURIComponent(
      `Hello ${invoice.customerName || "Customer"},\n\n` +
        getInvoiceSummary() +
        `\n\nPlease find the invoice attached. Thank you!`
    );

    // If phone number is available, use wa.me with phone, otherwise use web.whatsapp.com
    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${message}`
      : `https://web.whatsapp.com/send?text=${message}`;

    if (isElectron && window.electronAPI?.openExternal) {
      try {
        const result = await window.electronAPI.openExternal(whatsappUrl);
        if (!result.success) {
          toast({
            title: "Error",
            description: result.error || "Failed to open WhatsApp",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to open WhatsApp: ${error}`,
          variant: "destructive",
        });
        return;
      }
    } else {
      window.open(whatsappUrl, "_blank");
    }

    toast({
      title: "WhatsApp",
      description: phone ? "Opening WhatsApp..." : "Opening WhatsApp Web...",
    });
  };

  // Email sharing
  const handleShareEmail = async () => {
    if (!invoice) {
      return;
    }

    const companyName = companySettings?.companyName || "Our Company";
    const companyEmail = companySettings?.email || "";
    const companyPhone = companySettings?.phone || "";
    const companyAddress = companySettings?.address || "";
    const customerEmail = invoice.customerPhone?.includes("@")
      ? invoice.customerPhone
      : null;

    const subject = encodeURIComponent(
      `Invoice ${invoice.invoiceNumber} from ${companyName}`
    );

    // Create HTML-formatted email body with bold text and better styling
    const itemsList =
      invoice.items && invoice.items.length > 0
        ? invoice.items
            .slice(0, 5)
            .map((item) => item.description)
            .join(", ") +
          (invoice.items.length > 5
            ? ` and ${invoice.items.length - 5} more`
            : "")
        : "N/A";

    // Create well-formatted plain text email (mailto: doesn't support HTML)
    // Using Unicode characters and spacing for better visual formatting
    const emailBody = [
      `Dear ${invoice.customerName || "Customer"},`,
      ``,
      `Please find your invoice details below:`,
      ``,
      `═══════════════════════════════════════════`,
      `          INVOICE DETAILS`,
      `═══════════════════════════════════════════`,
      ``,
      `Invoice Number:    ${invoice.invoiceNumber}`,
      `Date:              ${formatDate(invoice.date)}`,
      invoice.dueDate ? `Due Date:         ${formatDate(invoice.dueDate)}` : ``,
      ``,
      `Amount:            ${formatCurrency(invoice.totalAmount)}`,
      ``,
      `Items:             ${itemsList}`,
      invoice.paymentTerms ? `Payment Terms:    ${invoice.paymentTerms}` : ``,
      invoice.notes ? `Notes:             ${invoice.notes}` : ``,
      ``,
      `═══════════════════════════════════════════`,
      ``,
      `Please find the invoice PDF attached.`,
      ``,
      `Thank you for your business!`,
      ``,
      `Best regards,`,
      companyName ? `${companyName}` : ``,
      companyAddress ? `${companyAddress}` : ``,
      companyEmail ? `Email: ${companyEmail}` : ``,
      companyPhone ? `Phone: ${companyPhone}` : ``,
    ]
      .filter((line) => line !== "")
      .join("\n");

    const body = encodeURIComponent(emailBody);

    const emailTo = customerEmail || "";
    const mailtoUrl = `mailto:${emailTo}?subject=${subject}&body=${body}`;

    if (isElectron && window.electronAPI?.openExternal) {
      try {
        const result = await window.electronAPI.openExternal(mailtoUrl);
        if (!result.success) {
          toast({
            title: "Error",
            description: result.error || "Failed to open email client",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        console.error("❌ Error calling openExternal:", error);
        toast({
          title: "Error",
          description: `Failed to open email client: ${error}`,
          variant: "destructive",
        });
        return;
      }
    } else {
      window.open(mailtoUrl, "_blank");
    }

    toast({
      title: "Email",
      description: customerEmail
        ? "Opening email client..."
        : "Please enter customer email address",
    });
  };

  // SMS sharing
  const handleShareSMS = async () => {
    if (!invoice) {
      return;
    }

    const phone = invoice.customerPhone?.replace(/\D/g, "") || "";
    if (!phone) {
      toast({
        title: "Error",
        description: "Customer phone number is required for SMS",
        variant: "destructive",
      });
      return;
    }

    const message = encodeURIComponent(
      `Invoice ${invoice.invoiceNumber}\n` +
        `Amount: ${formatCurrency(invoice.totalAmount)}\n` +
        `Due: ${invoice.dueDate ? formatDate(invoice.dueDate) : "N/A"}\n` +
        `Thank you!`
    );

    const smsUrl = `sms:${phone}?body=${message}`;

    if (isElectron && window.electronAPI?.openExternal) {
      try {
        const result = await window.electronAPI.openExternal(smsUrl);
        if (!result.success) {
          toast({
            title: "Error",
            description: result.error || "Failed to open SMS app",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to open SMS app: ${error}`,
          variant: "destructive",
        });
        return;
      }
    } else {
      window.open(smsUrl, "_blank");
    }

    toast({
      title: "SMS",
      description: "Opening SMS app...",
    });
  };

  if (!invoice && !loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-static max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Invoice Details</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleShareWhatsApp().catch((err) => {
                    console.error("WhatsApp handler error:", err);
                  });
                }}
                disabled={!invoice}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleShareEmail().catch((err) => {
                    console.error("Email handler error:", err);
                  });
                }}
                disabled={!invoice}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleShareSMS().catch((err) => {
                    console.error("SMS handler error:", err);
                  });
                }}
                disabled={!invoice}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                SMS
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={generatingPDF || !invoice}
              >
                <Download className="h-4 w-4 mr-2" />
                {generatingPDF ? "Generating..." : "Download PDF"}
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>View invoice details and items</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading invoice...
          </div>
        ) : invoice ? (
          <div className="space-y-6">
            {/* Invoice Header */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  Invoice Information
                </h3>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Invoice #:</span>{" "}
                    {invoice.invoiceNumber}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span>{" "}
                    {invoice.invoiceType}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span>{" "}
                    {formatDate(invoice.date)}
                  </div>
                  {invoice.dueDate && (
                    <div>
                      <span className="font-medium">Due Date:</span>{" "}
                      {formatDate(invoice.dueDate)}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <Badge>{invoice.status}</Badge>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  Customer Information
                </h3>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Customer:</span>{" "}
                    {invoice.customerName || invoice.customerId}
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            {invoice.items && invoice.items.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4">Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Tax Rate</TableHead>
                      <TableHead>Tax Amount</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell>
                          {formatCurrency(item.discountAmount)}
                        </TableCell>
                        <TableCell>{item.taxRate}%</TableCell>
                        <TableCell>{formatCurrency(item.taxAmount)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.lineTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Invoice Totals */}
            <div className="border-t pt-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(Number(invoice.subtotal) || 0)}</span>
                  </div>
                  {(Number(invoice.discountAmount) || 0) > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Discount:</span>
                      <span>
                        -{formatCurrency(Number(invoice.discountAmount) || 0)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>
                      {formatCurrency(Number(invoice.taxAmount) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total:</span>
                    <span>
                      {formatCurrency(Number(invoice.totalAmount) || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes and Terms */}
            {(invoice.notes || invoice.paymentTerms) && (
              <div className="space-y-2 text-sm">
                {invoice.paymentTerms && (
                  <div>
                    <span className="font-medium">Payment Terms:</span>{" "}
                    {invoice.paymentTerms}
                  </div>
                )}
                {invoice.notes && (
                  <div>
                    <span className="font-medium">Notes:</span> {invoice.notes}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Invoice not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
