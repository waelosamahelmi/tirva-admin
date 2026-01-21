import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Save, RotateCcw } from 'lucide-react';
import { PrinterDevice } from '@/lib/printer/types';

interface FontSettings {
  restaurantName: { width: number; height: number };
  header: { width: number; height: number };
  orderNumber: { width: number; height: number };
  menuItems: { width: number; height: number };
  toppings: { width: number; height: number };
  totals: { width: number; height: number };
  finalTotal: { width: number; height: number };
  characterSpacing: number;
}

const defaultFontSettings: FontSettings = {
  restaurantName: { width: 2, height: 2 },
  header: { width: 2, height: 2 },
  orderNumber: { width: 2, height: 3 },
  menuItems: { width: 2, height: 2 },
  toppings: { width: 1, height: 1 },
  totals: { width: 2, height: 2 },
  finalTotal: { width: 3, height: 3 },
  characterSpacing: 0
};

interface PrinterFontSettingsProps {
  printer: PrinterDevice;
  onUpdate?: (printer: PrinterDevice) => void;
}

export function PrinterFontSettings({ printer, onUpdate }: PrinterFontSettingsProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<FontSettings>(defaultFontSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Only show font settings for Star printers
  if (printer.printerType !== 'star') {
    return null;
  }

  // Load font settings from printer metadata
  useEffect(() => {
    if (printer.metadata?.fontSettings) {
      setSettings(printer.metadata.fontSettings as FontSettings);
    } else {
      setSettings(defaultFontSettings);
    }
    setHasChanges(false);
  }, [printer.id, printer.metadata?.fontSettings]);

  const handleSizeChange = (
    section: keyof Omit<FontSettings, 'characterSpacing'>,
    dimension: 'width' | 'height',
    value: string
  ) => {
    const numValue = parseInt(value) || 1;
    const clampedValue = Math.max(1, Math.min(4, numValue)); // Limit to 1-4
    
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [dimension]: clampedValue
      }
    }));
    setHasChanges(true);
  };

  const handleSpacingChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(0, Math.min(10, numValue)); // Limit to 0-10
    
    setSettings(prev => ({
      ...prev,
      characterSpacing: clampedValue
    }));
    setHasChanges(true);
  };

  const handleReset = () => {
    setSettings(defaultFontSettings);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update printer in database via API
      const response = await fetch(`/api/printers/${printer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: printer.name,
          address: printer.address,
          port: printer.port,
          printerType: printer.printerType,
          isActive: true,
          fontSettings: settings,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update font settings');
      }

      const updatedPrinter = await response.json();
      
      // Update local printer object
      const updated = {
        ...printer,
        metadata: {
          ...printer.metadata,
          fontSettings: settings
        }
      };

      if (onUpdate) {
        onUpdate(updated);
      }

      setHasChanges(false);
      
      toast({
        title: "Font Settings Saved",
        description: "Printer font settings have been updated successfully",
      });
    } catch (error) {
      console.error('Failed to save font settings:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save font settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderSizeInputs = (
    label: string,
    section: keyof Omit<FontSettings, 'characterSpacing'>
  ) => (
    <div className="grid grid-cols-3 gap-3 items-center">
      <Label className="text-sm font-medium">{label}</Label>
      <div>
        <Label htmlFor={`${section}-width`} className="text-xs text-muted-foreground">Width</Label>
        <Input
          id={`${section}-width`}
          type="number"
          min="1"
          max="4"
          value={settings[section].width}
          onChange={(e) => handleSizeChange(section, 'width', e.target.value)}
          className="h-8"
        />
      </div>
      <div>
        <Label htmlFor={`${section}-height`} className="text-xs text-muted-foreground">Height</Label>
        <Input
          id={`${section}-height`}
          type="number"
          min="1"
          max="4"
          value={settings[section].height}
          onChange={(e) => handleSizeChange(section, 'height', e.target.value)}
          className="h-8"
        />
      </div>
    </div>
  );

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Font Settings</span>
          <Badge variant="outline">Star Printer Only</Badge>
        </CardTitle>
        <CardDescription>
          Configure font sizes for different receipt sections. Values range from 1-4 (1=normal, 2=double, 3=triple, 4=quadruple).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderSizeInputs('Restaurant Name', 'restaurantName')}
        {renderSizeInputs('Header Text', 'header')}
        {renderSizeInputs('Order Number', 'orderNumber')}
        {renderSizeInputs('Menu Items', 'menuItems')}
        {renderSizeInputs('Toppings', 'toppings')}
        {renderSizeInputs('Subtotal/Fees', 'totals')}
        {renderSizeInputs('Final Total', 'finalTotal')}
        
        <div className="grid grid-cols-3 gap-3 items-center">
          <Label className="text-sm font-medium">Character Spacing</Label>
          <div className="col-span-2">
            <Input
              type="number"
              min="0"
              max="10"
              value={settings.characterSpacing}
              onChange={(e) => handleSpacingChange(e.target.value)}
              className="h-8"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Spacing between characters in dots (0-10)
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={isSaving}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}



