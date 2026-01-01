import { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useDatabaseInit } from '@/hooks/use-database';
import { CompanySettings } from '@/types';

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    logoUrl: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    taxId: '',
    salesTaxRegistration: '',
    signatureUrl: '',
    brandColorPrimary: '',
    brandColorSecondary: '',
  });
  const { toast } = useToast();
  const { isElectron } = useDatabaseInit();

  // Fetch company settings
  const fetchSettings = async () => {
    if (!isElectron || !window.electronAPI) return;

    setLoading(true);
    try {
      const result = await window.electronAPI.companySettings.get();
      if (result.success && result.data) {
        const data = result.data;
        setSettings(data);
        setFormData({
          companyName: data.companyName || '',
          logoUrl: data.logoUrl || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          taxId: data.taxId || '',
          salesTaxRegistration: data.salesTaxRegistration || '',
          signatureUrl: data.signatureUrl || '',
          brandColorPrimary: data.brandColorPrimary || '',
          brandColorSecondary: data.brandColorSecondary || '',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load company settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch company settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load company settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isElectron) {
      fetchSettings();
    }
  }, [isElectron]);

  const handleSave = async () => {
    if (!isElectron || !window.electronAPI) {
      toast({
        title: 'Error',
        description: 'Electron API not available',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.companyName.trim()) {
      toast({
        title: 'Error',
        description: 'Company name is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const result = await window.electronAPI.companySettings.update(formData);
      if (result.success && result.data) {
        toast({
          title: 'Success',
          description: 'Company settings saved successfully',
        });
        setSettings(result.data);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save company settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to save company settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save company settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-8 text-muted-foreground">Loading company settings...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Company Settings"
        description="Manage your company information and branding"
        icon={Settings}
      />

      <div className="space-y-6">
        <div className="glass-card rounded-lg p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter company address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="Enter website URL"
                  />
                </div>
              </div>
            </div>

            {/* Tax Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Tax Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID (NTN)</Label>
                  <Input
                    id="taxId"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="Enter NTN"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salesTaxRegistration">Sales Tax Registration</Label>
                  <Input
                    id="salesTaxRegistration"
                    value={formData.salesTaxRegistration}
                    onChange={(e) => setFormData({ ...formData, salesTaxRegistration: e.target.value })}
                    placeholder="Enter sales tax registration number"
                  />
                </div>
              </div>
            </div>

            {/* Branding */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Branding</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="Enter logo image URL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signatureUrl">Signature URL</Label>
                  <Input
                    id="signatureUrl"
                    value={formData.signatureUrl}
                    onChange={(e) => setFormData({ ...formData, signatureUrl: e.target.value })}
                    placeholder="Enter signature image URL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandColorPrimary">Primary Brand Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="brandColorPrimary"
                      type="color"
                      value={formData.brandColorPrimary || '#3b82f6'}
                      onChange={(e) => setFormData({ ...formData, brandColorPrimary: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.brandColorPrimary}
                      onChange={(e) => setFormData({ ...formData, brandColorPrimary: e.target.value })}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandColorSecondary">Secondary Brand Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="brandColorSecondary"
                      type="color"
                      value={formData.brandColorSecondary || '#8b5cf6'}
                      onChange={(e) => setFormData({ ...formData, brandColorSecondary: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.brandColorSecondary}
                      onChange={(e) => setFormData({ ...formData, brandColorSecondary: e.target.value })}
                      placeholder="#8b5cf6"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

