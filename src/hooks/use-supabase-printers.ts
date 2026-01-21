import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PrinterDevice } from '@/lib/printer/types';

export interface PrinterRecord {
  id: string;
  name: string;
  type: 'network' | 'bluetooth';
  address: string;
  port?: number;
  is_default: boolean;
  is_active: boolean;
  capabilities: any;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export function useSupabasePrinters() {
  const [printers, setPrinters] = useState<PrinterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load printers from Supabase
  const loadPrinters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('printers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (supabaseError) {
        throw supabaseError;
      }

      setPrinters(data || []);
      console.log(`📄 Loaded ${data?.length || 0} printers from Supabase`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load printers';
      setError(errorMessage);
      console.error('❌ Failed to load printers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save printer to Supabase
  const savePrinter = async (device: PrinterDevice): Promise<PrinterRecord | null> => {
    try {
      const printerRecord: Omit<PrinterRecord, 'created_at' | 'updated_at'> = {
        id: device.id,
        name: device.name,
        type: device.type,
        address: device.address,
        port: device.port,
        is_default: false,
        is_active: true,
        capabilities: device.capabilities || {},
        metadata: device.metadata || {}
      };

      const { data, error: supabaseError } = await supabase
        .from('printers')
        .upsert(printerRecord, { onConflict: 'id' })
        .select()
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      console.log(`💾 Saved printer to Supabase: ${device.name}`);
      
      // Update local state
      setPrinters(current => {
        const existing = current.find(p => p.id === device.id);
        if (existing) {
          return current.map(p => p.id === device.id ? data : p);
        } else {
          return [...current, data];
        }
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save printer';
      setError(errorMessage);
      console.error('❌ Failed to save printer:', err);
      return null;
    }
  };

  // Delete printer from Supabase
  const deletePrinter = async (printerId: string): Promise<boolean> => {
    try {
      const { error: supabaseError } = await supabase
        .from('printers')
        .update({ is_active: false })
        .eq('id', printerId);

      if (supabaseError) {
        throw supabaseError;
      }

      console.log(`🗑️ Deleted printer from Supabase: ${printerId}`);
      
      // Update local state
      setPrinters(current => current.filter(p => p.id !== printerId));
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete printer';
      setError(errorMessage);
      console.error('❌ Failed to delete printer:', err);
      return false;
    }
  };

  // Set default printer
  const setDefaultPrinter = async (printerId: string): Promise<boolean> => {
    try {
      // First, clear all default flags
      await supabase
        .from('printers')
        .update({ is_default: false })
        .neq('id', printerId);

      // Then set the new default
      const { error: supabaseError } = await supabase
        .from('printers')
        .update({ is_default: true })
        .eq('id', printerId);

      if (supabaseError) {
        throw supabaseError;
      }

      console.log(`⭐ Set default printer: ${printerId}`);
      
      // Update local state
      setPrinters(current => 
        current.map(p => ({ 
          ...p, 
          is_default: p.id === printerId 
        }))
      );
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set default printer';
      setError(errorMessage);
      console.error('❌ Failed to set default printer:', err);
      return false;
    }
  };

  // Convert PrinterRecord to PrinterDevice
  const toDevice = (record: PrinterRecord): PrinterDevice => ({
    id: record.id,
    name: record.name,
    type: record.type,
    address: record.address,
    port: record.port,
    isConnected: false,
    status: 'offline',
    capabilities: record.capabilities,
    metadata: record.metadata
  });

  // Convert PrinterDevice to PrinterRecord
  const fromDevice = (device: PrinterDevice): Omit<PrinterRecord, 'created_at' | 'updated_at'> => ({
    id: device.id,
    name: device.name,
    type: device.type,
    address: device.address,
    port: device.port,
    is_default: false,
    is_active: true,
    capabilities: device.capabilities || {},
    metadata: device.metadata || {}
  });

  useEffect(() => {
    loadPrinters();
  }, []);

  return {
    printers,
    loading,
    error,
    loadPrinters,
    savePrinter,
    deletePrinter,
    setDefaultPrinter,
    toDevice,
    fromDevice
  };
}



