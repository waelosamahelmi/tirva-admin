import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { MobileApiClient } from "./mobile-api-client";
import { OfflineOrderManager } from "./offline-order-manager";
import { useAndroid } from "./android-context";
import { useToast } from "@/hooks/use-toast";

interface MobileApiContextType {
  // Connection Status
  isOnline: boolean;
  isConnectedToServer: boolean;
  connectionStatus: 'online' | 'offline' | 'connecting' | 'error';
  lastSyncTime: Date | null;
  
  // Order Management
  submitOrder: (order: any) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: string) => Promise<boolean>;
  syncOfflineOrders: () => Promise<void>;
  getOfflineOrdersCount: () => number;
  
  // Menu & Data Sync
  syncMenuData: () => Promise<void>;
  getLocalMenuItems: () => any[];
  
  // Settings & Configuration
  configureServerConnection: (serverUrl: string, apiKey?: string) => Promise<boolean>;
  testConnection: () => Promise<boolean>;
  
  // Offline Management
  enableOfflineMode: () => void;
  disableOfflineMode: () => void;
  isOfflineModeEnabled: boolean;
  
  // Error Handling
  getLastError: () => string | null;
  clearErrors: () => void;
}

const MobileApiContext = createContext<MobileApiContextType | undefined>(undefined);

export function MobileApiProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { isAndroid } = useAndroid();
    // Core services
  const [apiClient] = useState(() => MobileApiClient.getInstance());
  const [offlineManager] = useState(() => OfflineOrderManager.getInstance());
  
  // Connection state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isConnectedToServer, setIsConnectedToServer] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'connecting' | 'error'>('offline');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isOfflineModeEnabled, setIsOfflineModeEnabled] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Local data cache
  const [localMenuItems, setLocalMenuItems] = useState<any[]>([]);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionStatus('connecting');
      // Attempt to reconnect to server
      testConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsConnectedToServer(false);
      setConnectionStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  // Setup offline order manager events
  useEffect(() => {
    // The offline manager doesn't have event emitters in the current implementation
    // We'll use polling to check for updates instead
    const interval = setInterval(() => {
      // Check if orders have been synced
      const pendingCount = offlineManager.getPendingOrders().length;
      
      // Update last sync time when count goes to 0
      if (pendingCount === 0 && lastSyncTime === null) {
        setLastSyncTime(new Date());
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [offlineManager, lastSyncTime]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && isConnectedToServer && isOfflineModeEnabled) {
      syncOfflineOrders();
    }
  }, [isOnline, isConnectedToServer, isOfflineModeEnabled]);

  // Periodic connection testing
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline) {
        testConnection();
      }
    }, 30000); // Test every 30 seconds

    return () => clearInterval(interval);
  }, [isOnline]);
  const configureServerConnection = useCallback(async (serverUrl: string, apiKey?: string): Promise<boolean> => {
    try {
      setConnectionStatus('connecting');
      setLastError(null);

      // For now, we'll test the connection with the existing base URL
      // The MobileApiClient doesn't expose setServerUrl method
      const result = await apiClient.checkConnection();
      
      if (result.success) {
        setIsConnectedToServer(true);
        setConnectionStatus(isOnline ? 'online' : 'offline');
        
        // Save configuration
        localStorage.setItem('mobile-server-url', serverUrl);
        if (apiKey) {
          localStorage.setItem('mobile-api-key', apiKey);
        }

        toast({
          title: "Server Connected",
          description: "Successfully connected to the server",
        });

        // Initial data sync
        await syncMenuData();
        
        return true;
      } else {
        throw new Error(result.error || 'Connection test failed');
      }
    } catch (error) {
      console.error('Failed to configure server connection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setLastError(errorMessage);
      setIsConnectedToServer(false);
      setConnectionStatus('error');
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    }
  }, [apiClient, isOnline, toast]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      if (!isOnline) {
        setConnectionStatus('offline');
        return false;
      }

      setConnectionStatus('connecting');
      const result = await apiClient.checkConnection();
      
      setIsConnectedToServer(result.success);
      setConnectionStatus(result.success ? 'online' : 'error');
      
      if (!result.success) {
        setLastError(result.error || 'Connection test failed');
      } else {
        setLastError(null);
      }
      
      return result.success;
    } catch (error) {
      console.error('Connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      setLastError(errorMessage);
      setIsConnectedToServer(false);
      setConnectionStatus('error');
      return false;
    }
  }, [apiClient, isOnline]);

  const submitOrder = useCallback(async (order: any): Promise<boolean> => {
    try {
      setLastError(null);

      // Always queue the order first for offline support
      if (isOfflineModeEnabled) {
        await offlineManager.queueOrder(order);
      }

      // If online and connected, try to submit immediately
      if (isOnline && isConnectedToServer) {
        try {
          const result = await apiClient.createOrder(order);
          if (result.success && isOfflineModeEnabled) {
            // Order was submitted successfully, remove from offline queue
            offlineManager.removeOrder(order.id);
          }
          return result.success;
        } catch (error) {
          // If immediate submission fails but we're in offline mode, that's OK
          if (isOfflineModeEnabled) {
            console.warn('Immediate order submission failed, will sync later:', error);
            return true; // Order is queued for later sync
          } else {
            throw error; // Propagate error if not in offline mode
          }
        }
      } else if (isOfflineModeEnabled) {
        // Offline mode: order is queued, considered successful
        return true;
      } else {
        throw new Error('No connection and offline mode is disabled');
      }
    } catch (error) {
      console.error('Failed to submit order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Order submission failed';
      setLastError(errorMessage);
      
      toast({
        title: "Order Submission Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    }
  }, [apiClient, offlineManager, isOnline, isConnectedToServer, isOfflineModeEnabled, toast]);

  const updateOrderStatus = useCallback(async (orderId: string, status: string): Promise<boolean> => {
    try {
      setLastError(null);

      // Always queue the update first for offline support
      if (isOfflineModeEnabled) {
        await offlineManager.queueOrderUpdate(orderId, { status });
      }

      // If online and connected, try to update immediately
      if (isOnline && isConnectedToServer) {
        try {
          const result = await apiClient.updateOrder(orderId, { status });
          if (result.success && isOfflineModeEnabled) {
            // Update was successful, remove from offline queue
            offlineManager.removeUpdate(orderId);
          }
          return result.success;
        } catch (error) {
          // If immediate update fails but we're in offline mode, that's OK
          if (isOfflineModeEnabled) {
            console.warn('Immediate order update failed, will sync later:', error);
            return true; // Update is queued for later sync
          } else {
            throw error; // Propagate error if not in offline mode
          }
        }
      } else if (isOfflineModeEnabled) {
        // Offline mode: update is queued, considered successful
        return true;
      } else {
        throw new Error('No connection and offline mode is disabled');
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Order status update failed';
      setLastError(errorMessage);
      
      toast({
        title: "Order Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    }
  }, [apiClient, offlineManager, isOnline, isConnectedToServer, isOfflineModeEnabled, toast]);

  const syncOfflineOrders = useCallback(async (): Promise<void> => {
    if (!isOnline || !isConnectedToServer) {
      toast({
        title: "Sync Failed",
        description: "No server connection available",
        variant: "destructive",
      });
      return;
    }

    try {
      setLastError(null);
      
      toast({
        title: "Syncing Orders",
        description: "Synchronizing offline orders with server...",
      });

      await offlineManager.syncAll();
      setLastSyncTime(new Date());
      
      toast({
        title: "Sync Complete",
        description: "Offline orders have been synchronized",
      });
      
    } catch (error) {
      console.error('Failed to sync offline orders:', error);
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setLastError(errorMessage);
      
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [offlineManager, isOnline, isConnectedToServer, toast]);

  const getOfflineOrdersCount = useCallback((): number => {
    return offlineManager.getPendingOrders().length;
  }, [offlineManager]);

  const syncMenuData = useCallback(async (): Promise<void> => {
    if (!isOnline || !isConnectedToServer) {
      return;
    }

    try {
      setLastError(null);
      
      const result = await apiClient.getMenu();
      if (result.success && result.data) {
        setLocalMenuItems(result.data);
        
        // Cache menu data locally
        localStorage.setItem('cached-menu-items', JSON.stringify(result.data));
        localStorage.setItem('menu-cache-time', new Date().toISOString());
      }
      
    } catch (error) {
      console.error('Failed to sync menu data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Menu sync failed';
      setLastError(errorMessage);
      
      // Try to load from cache
      try {
        const cachedMenu = localStorage.getItem('cached-menu-items');
        if (cachedMenu) {
          setLocalMenuItems(JSON.parse(cachedMenu));
        }
      } catch (cacheError) {
        console.error('Failed to load menu from cache:', cacheError);
      }
    }
  }, [apiClient, isOnline, isConnectedToServer]);

  const getLocalMenuItems = useCallback((): any[] => {
    return localMenuItems;
  }, [localMenuItems]);

  const enableOfflineMode = useCallback(() => {
    setIsOfflineModeEnabled(true);
    localStorage.setItem('offline-mode-enabled', 'true');
    
    toast({
      title: "Offline Mode Enabled",
      description: "Orders will be queued when offline",
    });
  }, [toast]);

  const disableOfflineMode = useCallback(() => {
    setIsOfflineModeEnabled(false);
    localStorage.setItem('offline-mode-enabled', 'false');
    
    toast({
      title: "Offline Mode Disabled",
      description: "Orders require active connection",
    });
  }, [toast]);

  const getLastError = useCallback(() => {
    return lastError;
  }, [lastError]);

  const clearErrors = useCallback(() => {
    setLastError(null);
  }, []);

  // Load saved configuration on mount
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        // Load offline mode preference
        const offlineModeEnabled = localStorage.getItem('offline-mode-enabled');
        if (offlineModeEnabled !== null) {
          setIsOfflineModeEnabled(offlineModeEnabled === 'true');
        }        // Load server configuration
        const savedServerUrl = localStorage.getItem('mobile-server-url');
        const savedApiKey = localStorage.getItem('mobile-api-key');
        
        // For now, the API client uses a fixed base URL
        // Store configuration for future use
        if (savedServerUrl) {
          // Configuration is loaded but not applied until API supports it
          console.log('Loaded server configuration:', savedServerUrl);
        }
        
        // Test connection with current configuration
        await testConnection();

        // Load cached menu items
        const cachedMenu = localStorage.getItem('cached-menu-items');
        if (cachedMenu) {
          setLocalMenuItems(JSON.parse(cachedMenu));
        }
      } catch (error) {
        console.error('Failed to load mobile API configuration:', error);
      }
    };

    loadConfiguration();
  }, [apiClient, testConnection]);

  const contextValue: MobileApiContextType = {
    // Connection Status
    isOnline,
    isConnectedToServer,
    connectionStatus,
    lastSyncTime,
    
    // Order Management
    submitOrder,
    updateOrderStatus,
    syncOfflineOrders,
    getOfflineOrdersCount,
    
    // Menu & Data Sync
    syncMenuData,
    getLocalMenuItems,
    
    // Settings & Configuration
    configureServerConnection,
    testConnection,
    
    // Offline Management
    enableOfflineMode,
    disableOfflineMode,
    isOfflineModeEnabled,
    
    // Error Handling
    getLastError,
    clearErrors,
  };

  return (
    <MobileApiContext.Provider value={contextValue}>
      {children}
    </MobileApiContext.Provider>
  );
}

export function useMobileApi() {
  const context = useContext(MobileApiContext);
  if (context === undefined) {
    throw new Error('useMobileApi must be used within a MobileApiProvider');
  }
  return context;
}



