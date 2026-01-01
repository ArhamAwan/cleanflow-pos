import { useState, useEffect } from "react";
import { Settings, Plus, Save, Trash2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useDatabaseInit } from "@/hooks/use-database";
import { TaxRate, TaxType } from "@/types";
import { formatCurrency } from "@/data/mockData";

export default function TaxSettings() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
  const [formData, setFormData] = useState({
    taxType: "SALES_TAX" as TaxType,
    rate: 17,
    applicableFrom: new Date().toISOString().split("T")[0],
    applicableTo: "",
    isActive: true,
  });
  const { toast } = useToast();
  const { isElectron } = useDatabaseInit();

  // Fetch tax rates
  const fetchTaxRates = async () => {
    if (!isElectron) {
      console.warn("Not in Electron environment");
      return;
    }

    if (!window.electronAPI) {
      console.error("electronAPI not available");
      toast({
        title: "Error",
        description: "Electron API not available. Please restart the app.",
        variant: "destructive",
      });
      return;
    }

    if (!window.electronAPI.tax) {
      console.error("tax API not available");
      toast({
        title: "Error",
        description:
          "Tax API not available. Please restart the app to register handlers.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.tax.getRates();
      if (result.success && result.data) {
        setTaxRates(result.data);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load tax rates",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to fetch tax rates:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to load tax rates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isElectron) {
      fetchTaxRates();
    }
  }, [isElectron]);

  const handleSave = async () => {
    if (!isElectron) {
      toast({
        title: "Error",
        description: "Not in Electron environment",
        variant: "destructive",
      });
      return;
    }

    if (!window.electronAPI) {
      toast({
        title: "Error",
        description: "Electron API not available. Please restart the app.",
        variant: "destructive",
      });
      return;
    }

    if (!window.electronAPI.tax) {
      toast({
        title: "Error",
        description:
          "Tax API not available. Please restart the app to register handlers.",
        variant: "destructive",
      });
      return;
    }

    if (formData.rate < 0 || formData.rate > 100) {
      toast({
        title: "Error",
        description: "Tax rate must be between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const result = await window.electronAPI.tax.saveRate({
        id: editingRate?.id,
        taxType: formData.taxType,
        rate: formData.rate,
        applicableFrom: formData.applicableFrom,
        applicableTo: formData.applicableTo || null,
        isActive: formData.isActive,
      });

      console.log("Save result:", result);

      if (result.success && result.data) {
        toast({
          title: "Success",
          description: "Tax rate saved successfully",
        });
        setIsDialogOpen(false);
        setEditingRate(null);
        // Reset form
        setFormData({
          taxType: "SALES_TAX",
          rate: 17,
          applicableFrom: new Date().toISOString().split("T")[0],
          applicableTo: "",
          isActive: true,
        });
        fetchTaxRates();
      } else {
        console.error("Save failed:", result);
        toast({
          title: "Error",
          description: result.error || "Failed to save tax rate",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Exception during save:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save tax rate",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (rate: TaxRate) => {
    setEditingRate(rate);
    setFormData({
      taxType: rate.taxType,
      rate: rate.rate,
      applicableFrom: rate.applicableFrom.split("T")[0],
      applicableTo: rate.applicableTo ? rate.applicableTo.split("T")[0] : "",
      isActive: rate.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    console.log("handleNew called");
    setEditingRate(null);
    setFormData({
      taxType: "SALES_TAX",
      rate: 17,
      applicableFrom: new Date().toISOString().split("T")[0],
      applicableTo: "",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const getTaxTypeLabel = (type: TaxType) => {
    const labels = {
      SALES_TAX: "Sales Tax (Federal)",
      PST: "Provincial Sales Tax (PST)",
      WHT: "Withholding Tax (WHT)",
    };
    return labels[type] || type;
  };

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

  // Group rates by tax type
  const ratesByType = taxRates.reduce((acc, rate) => {
    if (!acc[rate.taxType]) {
      acc[rate.taxType] = [];
    }
    acc[rate.taxType].push(rate);
    return acc;
  }, {} as Record<TaxType, TaxRate[]>);

  return (
    <MainLayout>
      <PageHeader
        title="Tax Settings"
        description="Configure tax rates for Sales Tax, PST, and WHT"
        action={
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Tax Rate
          </Button>
        }
      />

      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading tax rates...
          </div>
        ) : (
          <>
            {/* Sales Tax Section */}
            <div className="glass-card rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                Sales Tax (Federal)
              </h3>
              {ratesByType.SALES_TAX && ratesByType.SALES_TAX.length > 0 ? (
                <div className="space-y-2">
                  {ratesByType.SALES_TAX.map((rate) => (
                    <div
                      key={rate.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{rate.rate}%</div>
                        <div className="text-sm text-muted-foreground">
                          From: {formatDate(rate.applicableFrom)}
                          {rate.applicableTo &&
                            ` - To: ${formatDate(rate.applicableTo)}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm ${
                            rate.isActive ? "text-green-600" : "text-gray-400"
                          }`}
                        >
                          {rate.isActive ? "Active" : "Inactive"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rate)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No Sales Tax rates configured
                </div>
              )}
            </div>

            {/* PST Section */}
            <div className="glass-card rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                Provincial Sales Tax (PST)
              </h3>
              {ratesByType.PST && ratesByType.PST.length > 0 ? (
                <div className="space-y-2">
                  {ratesByType.PST.map((rate) => (
                    <div
                      key={rate.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{rate.rate}%</div>
                        <div className="text-sm text-muted-foreground">
                          From: {formatDate(rate.applicableFrom)}
                          {rate.applicableTo &&
                            ` - To: ${formatDate(rate.applicableTo)}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm ${
                            rate.isActive ? "text-green-600" : "text-gray-400"
                          }`}
                        >
                          {rate.isActive ? "Active" : "Inactive"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rate)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No PST rates configured
                </div>
              )}
            </div>

            {/* WHT Section */}
            <div className="glass-card rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                Withholding Tax (WHT)
              </h3>
              {ratesByType.WHT && ratesByType.WHT.length > 0 ? (
                <div className="space-y-2">
                  {ratesByType.WHT.map((rate) => (
                    <div
                      key={rate.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{rate.rate}%</div>
                        <div className="text-sm text-muted-foreground">
                          From: {formatDate(rate.applicableFrom)}
                          {rate.applicableTo &&
                            ` - To: ${formatDate(rate.applicableTo)}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm ${
                            rate.isActive ? "text-green-600" : "text-gray-400"
                          }`}
                        >
                          {rate.isActive ? "Active" : "Inactive"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rate)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No WHT rates configured
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Tax Rate Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card-static">
          <DialogHeader>
            <DialogTitle>
              {editingRate ? "Edit Tax Rate" : "New Tax Rate"}
            </DialogTitle>
            <DialogDescription>
              Configure tax rate for Pakistani tax compliance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taxType">Tax Type</Label>
              <Select
                value={formData.taxType}
                onValueChange={(value: TaxType) =>
                  setFormData({ ...formData, taxType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SALES_TAX">Sales Tax (Federal)</SelectItem>
                  <SelectItem value="PST">
                    Provincial Sales Tax (PST)
                  </SelectItem>
                  <SelectItem value="WHT">Withholding Tax (WHT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">Tax Rate (%)</Label>
              <Input
                id="rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.rate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rate: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="17"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="applicableFrom">Applicable From</Label>
              <Input
                id="applicableFrom"
                type="date"
                value={formData.applicableFrom}
                onChange={(e) =>
                  setFormData({ ...formData, applicableFrom: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="applicableTo">Applicable To (Optional)</Label>
              <Input
                id="applicableTo"
                type="date"
                value={formData.applicableTo}
                onChange={(e) =>
                  setFormData({ ...formData, applicableTo: e.target.value })
                }
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setEditingRate(null);
                setFormData({
                  taxType: "SALES_TAX",
                  rate: 17,
                  applicableFrom: new Date().toISOString().split("T")[0],
                  applicableTo: "",
                  isActive: true,
                });
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
