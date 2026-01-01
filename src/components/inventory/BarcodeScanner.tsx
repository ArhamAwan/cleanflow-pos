import { useState, useRef, useEffect } from 'react';
import { Camera, Search, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Item } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemFound?: (item: Item) => void;
}

export function BarcodeScanner({
  open,
  onOpenChange,
  onItemFound,
}: BarcodeScannerProps) {
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [foundItem, setFoundItem] = useState<Item | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cameraContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleScan = async () => {
    if (!barcode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a barcode',
        variant: 'destructive',
      });
      return;
    }

    if (!window.electronAPI) {
      toast({
        title: 'Error',
        description: 'Barcode scanning is only available in Electron app',
        variant: 'destructive',
      });
      return;
    }

    await handleScanWithBarcode(barcode.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  const reset = () => {
    setBarcode('');
    setFoundItem(null);
    setIsScanning(false);
  };

  const startCamera = async () => {
    if (!cameraContainerRef.current) return;

    try {
      const scanner = new Html5Qrcode(cameraContainerRef.current.id);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Barcode detected
          setBarcode(decodedText);
          handleScanWithBarcode(decodedText);
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent during scanning)
        }
      );

      setCameraActive(true);
      setCameraError(null);
    } catch (error: any) {
      console.error('Camera error:', error);
      setCameraError(error.message || 'Failed to start camera');
      setCameraActive(false);
      setScanMode('manual');
      toast({
        title: 'Camera Error',
        description: 'Failed to access camera. Please use manual entry.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (error) {
        console.error('Error stopping camera:', error);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  const handleScanWithBarcode = async (barcodeValue: string) => {
    if (!barcodeValue.trim() || !window.electronAPI) {
      return;
    }

    setIsScanning(true);
    try {
      const result = await window.electronAPI.inventory.items.getByBarcode(barcodeValue.trim());
      
      if (result.success && result.data) {
        if (result.data.type === 'item') {
          setFoundItem(result.data.data);
          onItemFound?.(result.data.data);
          toast({
            title: 'Item Found',
            description: `Found: ${result.data.data.name}`,
          });
          // Stop camera after successful scan
          await stopCamera();
        } else {
          toast({
            title: 'Variant Found',
            description: 'Item variant found (variant details not yet implemented)',
          });
        }
      } else {
        toast({
          title: 'Not Found',
          description: 'No item found with this barcode',
          variant: 'destructive',
        });
        setFoundItem(null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to scan barcode',
        variant: 'destructive',
      });
      setFoundItem(null);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (open && scanMode === 'camera') {
      // Small delay to ensure dialog is rendered
      setTimeout(() => {
        startCamera();
      }, 300);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open, scanMode]);

  const handleClose = async () => {
    await stopCamera();
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-card-static max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Barcode Scanner
          </DialogTitle>
          <DialogDescription>
            Scan or enter a barcode to find an item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={scanMode === 'camera' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (scanMode === 'manual') {
                  setScanMode('camera');
                }
              }}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Camera Scan
            </Button>
            <Button
              variant={scanMode === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (scanMode === 'camera') {
                  stopCamera();
                  setScanMode('manual');
                }
              }}
              className="flex-1"
            >
              <Search className="h-4 w-4 mr-2" />
              Manual Entry
            </Button>
          </div>

          {/* Camera Preview */}
          {scanMode === 'camera' && (
            <div className="space-y-2">
              <div
                id="barcode-scanner-container"
                ref={cameraContainerRef}
                className="relative aspect-video bg-muted rounded-lg overflow-hidden border-2 border-border"
              />
              {cameraError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                  <AlertCircle className="h-4 w-4" />
                  <span>{cameraError}</span>
                </div>
              )}
              {!cameraActive && !cameraError && (
                <div className="text-center text-sm text-muted-foreground">
                  Starting camera...
                </div>
              )}
            </div>
          )}

          {/* Manual Barcode Entry */}
          {scanMode === 'manual' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Enter barcode manually:
              </label>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter barcode..."
                  className="flex-1"
                  autoFocus
                />
                <Button
                  onClick={handleScan}
                  disabled={isScanning || !barcode.trim()}
                >
                  <Search className="h-4 w-4 mr-2" />
                  {isScanning ? 'Scanning...' : 'Search'}
                </Button>
              </div>
            </div>
          )}

          {/* Found Item Display */}
          {foundItem && (
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-1">
                    {foundItem.name}
                  </h4>
                  {foundItem.sku && (
                    <p className="text-sm text-muted-foreground">SKU: {foundItem.sku}</p>
                  )}
                  {foundItem.category && (
                    <p className="text-sm text-muted-foreground">Category: {foundItem.category}</p>
                  )}
                  <p className="text-sm font-medium text-foreground mt-2">
                    Price: {foundItem.sellingPrice.toFixed(2)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFoundItem(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          {foundItem && (
            <Button onClick={() => {
              onItemFound?.(foundItem);
              handleClose();
            }}>
              Use Item
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


