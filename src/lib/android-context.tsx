import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { BleClient, BleDevice } from '@capacitor-community/bluetooth-le';
import { Network } from '@capacitor/network';

interface AndroidContextType {
  isAndroid: boolean;
  hasNotificationPermission: boolean;
  hasBluetoothPermission: boolean;
  hasNetworkPermission: boolean;
  isLoggedInPersistent: boolean;
  isFirstRun: boolean;
  permissionsRequested: boolean;
  requestNotificationPermission: () => Promise<boolean>;
  requestBluetoothPermission: () => Promise<boolean>;
  requestNetworkPermission: () => Promise<boolean>;
  enablePersistentLogin: () => void;
  sendNotification: (title: string, message: string, customSound?: string) => void;
  playCustomSound: (soundName: string) => void;
  scanBluetooth: () => Promise<any[]>;
  connectToLocalNetwork: (ip: string) => Promise<boolean>;
  markPermissionsRequested: () => void;
  enableBackgroundMode: () => void;
  keepAppActive: () => void;
  testAndroidInterface: () => void;
  testNetworkConnectivity: () => Promise<boolean>;
}

const AndroidContext = createContext<AndroidContextType | undefined>(undefined);

export function AndroidProvider({ children }: { children: ReactNode }) {
  const [isAndroid, setIsAndroid] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [hasBluetoothPermission, setHasBluetoothPermission] = useState(false);
  const [hasNetworkPermission, setHasNetworkPermission] = useState(false);
  const [isLoggedInPersistent, setIsLoggedInPersistent] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState(true);
  const [permissionsRequested, setPermissionsRequested] = useState(false);

  useEffect(() => {
    // Check if permissions have been requested before
    const hasRequestedBefore = localStorage.getItem('permissions-requested');
    if (hasRequestedBefore) {
      setPermissionsRequested(true);
      setIsFirstRun(false);
    }

    // Use Capacitor for proper platform detection
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    const isAndroidPlatform = platform === 'android';
    
    console.log('🔍 Platform detection:', {
      platform,
      isNative,
      isAndroidPlatform,
      userAgent: navigator.userAgent,
      hasAndroidInterface: typeof (window as any).Android !== 'undefined'
    });

    setIsAndroid(isAndroidPlatform);

    // Check for Android interface (WebView context)
    if (typeof (window as any).Android !== 'undefined') {
      console.log('📱 Android WebView interface detected');
      setIsAndroid(true);
      checkPermissions();
      checkPersistentLogin();
    } else if (isAndroidPlatform && isNative) {
      console.log('📱 Native Android platform detected');
      // In a proper Capacitor app, we'd use Capacitor plugins here
      checkPermissions();
    } else {
      console.log('🌐 Web platform detected, setting default permissions');
      setHasNotificationPermission(false);
      setHasBluetoothPermission(false);
      setHasNetworkPermission(true);
    }    // Request persistent login on Android
    if (isAndroidPlatform) {
      enablePersistentLogin();
      
      // Configure status bar for Android
      try {
        StatusBar.setStyle({ style: Style.Light });
        StatusBar.setBackgroundColor({ color: '#FFFFFF' });
        StatusBar.setOverlaysWebView({ overlay: false });
        console.log('✅ Status bar configured for Android');
      } catch (error) {
        console.warn('⚠️ Could not configure status bar:', error);
      }
    }
  }, []);

  // Run debug test after everything is initialized
  useEffect(() => {
    if (typeof (window as any).Android !== 'undefined') {
      // Delay to ensure all functions are defined
      setTimeout(() => {
        testAndroidInterface();
      }, 1000);
    }
  }, [isAndroid]);

  const checkPermissions = async () => {
    if (typeof (window as any).Android !== 'undefined') {
      try {
        console.log('🔍 Checking Android permissions...');
        
        // Check notification permission
        let notifications = false;
        if (typeof (window as any).Android.hasNotificationPermission !== 'undefined') {
          notifications = await (window as any).Android.hasNotificationPermission();
          console.log('📱 Notification permission:', notifications);
        } else {
          console.log('⚠️ hasNotificationPermission method not available');
        }
        
        // Check Bluetooth permission
        let bluetooth = false;
        if (typeof (window as any).Android.hasBluetoothPermission !== 'undefined') {
          bluetooth = await (window as any).Android.hasBluetoothPermission();
          console.log('🔵 Bluetooth permission:', bluetooth);
        } else {
          console.log('⚠️ hasBluetoothPermission method not available');
        }
        
        // Check network permission
        let network = true; // Default to true for web compatibility
        if (typeof (window as any).Android.hasNetworkPermission !== 'undefined') {
          network = await (window as any).Android.hasNetworkPermission();
          console.log('🌐 Network permission:', network);
        } else {
          console.log('⚠️ hasNetworkPermission method not available, defaulting to true');
        }
        
        console.log('📊 Permission summary:', { notifications, bluetooth, network });
        
        setHasNotificationPermission(notifications);
        setHasBluetoothPermission(bluetooth);
        setHasNetworkPermission(network);
      } catch (error) {
        console.error('❌ Error checking permissions:', error);
      }
    } else {
      console.log('🌐 Running in web browser, setting default permissions');
      setHasNotificationPermission(false);
      setHasBluetoothPermission(false);
      setHasNetworkPermission(true);
    }
  };

  const checkPersistentLogin = () => {
    if (typeof (window as any).Android !== 'undefined') {
      try {
        const persistent = (window as any).Android.isPersistentLoginEnabled();
        setIsLoggedInPersistent(persistent);
      } catch (error) {
        console.error('Error checking persistent login:', error);
      }
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    console.log('🔔 === REQUESTING NOTIFICATION PERMISSIONS ===');
    console.log('🔍 Platform:', Capacitor.getPlatform());
    console.log('🔍 Is Native:', Capacitor.isNativePlatform());
    console.log('🔍 Android interface available:', typeof (window as any).Android !== 'undefined');

    // Check if running in Android WebView with interface
    if (typeof (window as any).Android !== 'undefined') {
      try {
        console.log('📱 Using Android WebView interface');
        console.log('🔍 Available Android methods:', Object.keys((window as any).Android));
        
        // First request basic notification permission
        let basicNotification = false;
        if (typeof (window as any).Android.requestNotificationPermission !== 'undefined') {
          console.log('📱 Requesting basic notification permission...');
          basicNotification = await (window as any).Android.requestNotificationPermission();
          console.log('✅ Basic notification permission result:', basicNotification);
        } else {
          console.log('⚠️ Basic notification permission method not available');
          alert('Notification permission method not available. Please ensure the app has proper native interface.');
        }
        
        // Request POST_NOTIFICATIONS permission for Android 13+
        let postNotifications = true;
        if (typeof (window as any).Android.requestPostNotificationsPermission !== 'undefined') {
          console.log('📱 Requesting POST_NOTIFICATIONS permission (Android 13+)...');
          postNotifications = await (window as any).Android.requestPostNotificationsPermission();
          console.log('✅ POST_NOTIFICATIONS permission result:', postNotifications);
        } else {
          console.log('ℹ️ POST_NOTIFICATIONS permission method not available (not Android 13+)');
        }
        
        const granted = basicNotification && postNotifications;
        console.log('🏁 Final notification permission result:', granted);
        
        // Re-check permissions after requesting
        await checkPermissions();
        
        return granted;
      } catch (error) {
        console.error('❌ Error requesting notification permission:', error);
        alert(`Error requesting notification permission: ${error}`);
        return false;
      }
    }
    
    // Fallback for native Capacitor app (use Capacitor plugins)
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      console.log('📱 Using Capacitor native Android platform');
      console.log('ℹ️ Native Capacitor notification handling not implemented yet');
      setHasNotificationPermission(true);
      return true;
    }
    
    // Fallback for web
    if ('Notification' in window) {
      console.log('🌐 Requesting web notification permission...');
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      console.log('✅ Web notification permission result:', granted);
      setHasNotificationPermission(granted);
      return granted;
    }
    
    // If no notification support available, show alert
    console.log('❌ No notification support available');
    alert('Notification permissions are not available in this environment. Please ensure you are running the app in an Android WebView with proper native interface.');
    return false;
  };
  const requestBluetoothPermission = async (): Promise<boolean> => {
    console.log('🔵 === REQUESTING BLUETOOTH PERMISSIONS ===');
    console.log('🔍 Platform:', Capacitor.getPlatform());
    console.log('🔍 Is Native:', Capacitor.isNativePlatform());
    console.log('🔍 Android interface available:', typeof (window as any).Android !== 'undefined');

    // Try to use Capacitor BLE plugin first for modern permission handling
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        console.log('📱 Using Capacitor BLE plugin for permissions...');
        
        // Initialize BLE client
        await BleClient.initialize();
        
        // The plugin handles permissions internally
        console.log('✅ BLE plugin initialized successfully');
        setHasBluetoothPermission(true);
        return true;
        
      } catch (error) {
        console.error('❌ BLE plugin initialization failed:', error);
        // Continue to WebView fallback
      }
    }

    // Check if running in Android WebView with interface
    if (typeof (window as any).Android !== 'undefined') {
      try {
        console.log('📱 Using Android WebView interface');
        console.log('🔍 Available Android methods:', Object.keys((window as any).Android));
        
        let granted = false;
        
        // For Android 12+ (API 31+) - Request comprehensive Bluetooth permissions
        if (typeof (window as any).Android.requestBluetoothPermissions !== 'undefined') {
          console.log('📱 Requesting modern Bluetooth permissions (Android 12+)...');
          granted = await (window as any).Android.requestBluetoothPermissions();
          console.log('✅ Modern Bluetooth permissions result:', granted);
        } else if (typeof (window as any).Android.requestBluetoothPermission !== 'undefined') {
          // Fallback for older Android versions
          console.log('📱 Requesting legacy Bluetooth permission...');
          granted = await (window as any).Android.requestBluetoothPermission();
          console.log('✅ Legacy Bluetooth permission result:', granted);
        } else {
          console.log('❌ No Bluetooth permission request methods available');
          alert('Bluetooth permission methods not available. Please ensure the app has proper native interface.');
          granted = false;
        }
        
        console.log('🏁 Final Bluetooth permission result:', granted);
        
        // Re-check permissions after requesting
        await checkPermissions();
        
        return granted;
      } catch (error) {
        console.error('❌ Error requesting bluetooth permission:', error);
        alert(`Error requesting Bluetooth permission: ${error}`);
        return false;
      }
    }

    // If no Bluetooth support available, show alert
    console.log('❌ No Bluetooth support available');
    alert('Bluetooth permissions are not available in this environment. Please ensure you are running the app in an Android WebView with proper native interface.');
    return false;
  };

  const requestNetworkPermission = async (): Promise<boolean> => {
    console.log('🌐 === REQUESTING NETWORK PERMISSIONS ===');
    console.log('🔍 Platform:', Capacitor.getPlatform());
    console.log('🔍 Is Native:', Capacitor.isNativePlatform());
    console.log('🔍 Android interface available:', typeof (window as any).Android !== 'undefined');

    if (typeof (window as any).Android !== 'undefined') {
      try {
        console.log('📱 Using Android WebView interface');
        let granted = true; // Network is usually granted by default
        
        if (typeof (window as any).Android.requestNetworkPermission !== 'undefined') {
          console.log('📱 Requesting network permission...');
          granted = await (window as any).Android.requestNetworkPermission();
          console.log('✅ Network permission result:', granted);
        } else {
          console.log('ℹ️ Network permission method not available (likely auto-granted)');
        }
        
        await checkPermissions();
        return granted;
      } catch (error) {
        console.error('❌ Error requesting network permission:', error);
        return true; // Default to true for network
      }
    }
    
    // Network is generally available on all platforms
    console.log('🌐 Network access available');
    setHasNetworkPermission(true);
    return true;
  };

  const enablePersistentLogin = () => {
    if (typeof (window as any).Android !== 'undefined') {
      try {
        if (typeof (window as any).Android.enablePersistentLogin !== 'undefined') {
          (window as any).Android.enablePersistentLogin();
          setIsLoggedInPersistent(true);
          console.log('✅ Persistent login enabled');
        }
      } catch (error) {
        console.error('Error enabling persistent login:', error);
      }
    } else {
      // Fallback for web
      setIsLoggedInPersistent(true);
    }
  };

  const sendNotification = (title: string, message: string, customSound?: string) => {
    if (typeof (window as any).Android !== 'undefined' && hasNotificationPermission) {
      try {
        // Use custom sound notification method if sound is specified
        if (customSound && typeof (window as any).Android.showNotificationWithSound !== 'undefined') {
          (window as any).Android.showNotificationWithSound(title, message, customSound);
        } else if (typeof (window as any).Android.showNotification !== 'undefined') {
          (window as any).Android.showNotification(title, message);
        } else if (typeof (window as any).Android.sendNotification !== 'undefined') {
          (window as any).Android.sendNotification(title, message);
        } else {
          console.log('No notification methods available on Android interface');
        }
      } catch (error) {
        console.error('Error sending Android notification:', error);
      }
    } else if ('Notification' in window && hasNotificationPermission) {
      try {
        new Notification(title, { body: message });
        // Play custom sound for web notifications if specified
        if (customSound) {
          playCustomSound(customSound);
        }
      } catch (error) {
        console.error('Error sending web notification:', error);
      }
    } else {
      console.log('Notifications not available or permission not granted');
    }
  };

  const playCustomSound = (soundName: string) => {
    if (typeof (window as any).Android !== 'undefined') {
      try {
        if (typeof (window as any).Android.playCustomSound !== 'undefined') {
          (window as any).Android.playCustomSound(soundName);
        } else {
          console.log('playCustomSound method not available on Android interface');
        }
      } catch (error) {
        console.error('Error playing custom sound:', error);
      }
    } else {
      // Fallback for web: try to play audio file
      try {
        const audio = new Audio(`/sounds/${soundName}.mp3`);
        audio.play().catch(e => console.warn('Could not play web audio:', e));
      } catch (error) {
        console.warn('Could not play custom sound on web:', error);
      }
    }
  };  const scanBluetooth = async (): Promise<any[]> => {
    console.log('🔵 Starting comprehensive Bluetooth scan...');
    console.log('🔍 Bluetooth permission:', hasBluetoothPermission);
    console.log('🔍 Platform:', Capacitor.getPlatform());
    console.log('🔍 Is Native:', Capacitor.isNativePlatform());
    
    const devices: any[] = [];
    
    // Method 1: Try Android native Bluetooth scanning if available
    if (typeof (window as any).Android !== 'undefined') {
      console.log('📱 Trying Android native Bluetooth scanning...');
      
      // Try multiple Android Bluetooth methods
      const androidMethods = [
        'scanBluetoothDevices',
        'discoverBluetoothDevices', 
        'getBondedDevices',
        'scanForPrinters',
        'getBluetoothDevices'
      ];
      
      for (const method of androidMethods) {
        try {
          if (typeof (window as any).Android[method] === 'function') {
            console.log(`📱 Trying Android method: ${method}`);
            const result = await (window as any).Android[method]();
            
            if (result && Array.isArray(result) && result.length > 0) {
              console.log(`✅ Android ${method} found ${result.length} devices:`, result);
              devices.push(...result.map(device => ({
                id: device.address || device.id || device.deviceId,
                name: device.name || 'Unknown Device',
                address: device.address || device.id || device.deviceId,
                type: 'bluetooth',
                uuids: device.uuids || [],
                rssi: device.rssi
              })));
              break; // Found devices, no need to try other methods
            }
          }
        } catch (error) {
          console.log(`❌ Android ${method} failed:`, error);
        }
      }
    }
    
    // Method 2: Try Capacitor BLE plugin
    if (Capacitor.isNativePlatform()) {
      try {
        console.log('🔵 Trying Capacitor BLE plugin...');
        
        // Check if we have permission - if not, request it
        if (!hasBluetoothPermission) {
          console.log('🔵 Requesting Bluetooth permission...');
          const permissionGranted = await requestBluetoothPermission();
          if (!permissionGranted) {
            throw new Error('Bluetooth permission not granted');
          }
        }
        
        // Initialize Bluetooth LE
        console.log('🔵 Initializing Bluetooth LE...');
        await BleClient.initialize();
        
        // Check if Bluetooth is enabled
        const isEnabled = await BleClient.isEnabled();
        if (!isEnabled) {
          console.log('🔵 Bluetooth is not enabled, requesting to enable...');
          try {
            await BleClient.requestEnable();
          } catch (error) {
            console.error('❌ User declined to enable Bluetooth:', error);
            throw new Error('Bluetooth must be enabled to scan for devices');
          }
        }
        
        console.log('🔵 Starting BLE device scan...');
        const bleDevices: any[] = [];
        
        // Start scanning for devices with increased timeout
        await BleClient.requestLEScan(
          {
            allowDuplicates: false,
            scanMode: 2, // SCAN_MODE_LOW_LATENCY for faster discovery
          },
          (result) => {
            console.log('🔵 Found BLE device:', result.device);
            bleDevices.push(result.device);
          }
        );
        
        // Scan for 15 seconds for better device discovery
        console.log('🔵 Scanning for 15 seconds...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        // Stop scanning
        await BleClient.stopLEScan();
        
        console.log(`✅ BLE scan completed, found ${bleDevices.length} devices`);
        
        // Add BLE devices to the list
        for (const device of bleDevices) {
          const existingDevice = devices.find(d => d.address === device.deviceId);
          if (!existingDevice) {
            devices.push({
              id: device.deviceId,
              name: device.name || 'Unknown BLE Device',
              address: device.deviceId,
              type: 'bluetooth',
              uuids: device.uuids || [],
              rssi: device.rssi
            });
          }
        }
        
      } catch (error: any) {
        console.error('❌ Capacitor BLE scan failed:', error);
        
        // Don't throw here, continue with other methods
        if (error.message?.includes('not available')) {
          console.log('ℹ️ Bluetooth LE not available, trying other methods...');
        } else if (error.message?.includes('permission')) {
          console.log('ℹ️ Bluetooth permission issue, trying other methods...');
        }
      }
    }
    
    // Method 3: Try Web Bluetooth API if available (for future compatibility)
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      try {
        console.log('🌐 Trying Web Bluetooth API...');
        
        const webDevice = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['battery_service', 'device_information']
        });
        
        if (webDevice) {
          console.log('✅ Web Bluetooth found device:', webDevice);
          const existingDevice = devices.find(d => d.address === webDevice.id);
          if (!existingDevice) {
            devices.push({
              id: webDevice.id,
              name: webDevice.name || 'Web Bluetooth Device',
              address: webDevice.id,
              type: 'bluetooth',
              uuids: [],
              rssi: undefined
            });
          }
        }
        
      } catch (error) {
        console.log('❌ Web Bluetooth failed:', error);
        // This is expected in most cases, as Web Bluetooth requires user interaction
      }
    }
    
    console.log(`🔵 Bluetooth scan completed. Total devices found: ${devices.length}`);
    
    if (devices.length === 0) {
      console.warn('⚠️ No Bluetooth devices found. This could be due to:');
      console.warn('  - Bluetooth being disabled');
      console.warn('  - No devices in range');
      console.warn('  - Permission issues');
      console.warn('  - Platform limitations');
      
      throw new Error('No Bluetooth devices found. Please ensure Bluetooth is enabled and devices are discoverable.');
    }
    
    return devices;
  };

  const connectToLocalNetwork = async (ip: string): Promise<boolean> => {
    if (typeof (window as any).Android !== 'undefined' && hasNetworkPermission) {
      try {
        if (typeof (window as any).Android.connectToNetwork !== 'undefined') {
          return await (window as any).Android.connectToNetwork(ip);
        }
      } catch (error) {
        console.error('Error connecting to network:', error);
      }
    }
    return false;
  };

  const markPermissionsRequested = () => {
    setPermissionsRequested(true);
    setIsFirstRun(false);
    localStorage.setItem('permissions-requested', 'true');
  };

  const enableBackgroundMode = () => {
    if (typeof (window as any).Android !== 'undefined') {
      try {
        if (typeof (window as any).Android.enableBackgroundMode !== 'undefined') {
          (window as any).Android.enableBackgroundMode();
        }
      } catch (error) {
        console.error('Error enabling background mode:', error);
      }
    }
  };

  const keepAppActive = () => {
    if (typeof (window as any).Android !== 'undefined') {
      try {
        if (typeof (window as any).Android.keepAppActive !== 'undefined') {
          (window as any).Android.keepAppActive();
        }
      } catch (error) {
        console.error('Error keeping app active:', error);
      }
    }
  };

  const testAndroidInterface = () => {
    console.log('🧪 === TESTING ANDROID INTERFACE ===');
    console.log('🔍 Platform:', Capacitor.getPlatform());
    console.log('🔍 Is Native:', Capacitor.isNativePlatform());
    console.log('🔍 User Agent:', navigator.userAgent);
    console.log('🔍 Android interface available:', typeof (window as any).Android !== 'undefined');
    
    if (typeof (window as any).Android !== 'undefined') {
      console.log('📱 Available Android methods:', Object.keys((window as any).Android));
      console.log('🎯 Testing basic method calls...');
      
      // Test each method availability
      const methods = [
        'hasNotificationPermission',
        'hasBluetoothPermission', 
        'hasNetworkPermission',
        'requestNotificationPermission',
        'requestBluetoothPermission',
        'requestNetworkPermission'
      ];
      
      methods.forEach(method => {
        const available = typeof (window as any).Android[method] !== 'undefined';
        console.log(`🔍 ${method}: ${available ? '✅ Available' : '❌ Not Available'}`);
      });
    } else {
      console.log('❌ Android interface not available');
    }
  };  // Add a network connectivity test function
  const testNetworkConnectivity = async () => {
    console.log('🌐 === TESTING NETWORK CONNECTIVITY ===');
    
    // Test basic internet connectivity
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://httpbin.org/json', { 
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('✅ Internet connectivity test passed');
      
      // Test Supabase connectivity
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (supabaseUrl) {
        console.log('🔍 Testing Supabase connectivity to:', supabaseUrl);
        
        try {
          const supabaseController = new AbortController();
          const supabaseTimeoutId = setTimeout(() => supabaseController.abort(), 10000);
          
          const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'GET',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            signal: supabaseController.signal
          });
          
          clearTimeout(supabaseTimeoutId);
          
          if (supabaseResponse.ok || supabaseResponse.status === 401) {
            // 401 is expected when accessing without proper auth
            console.log('✅ Supabase connectivity test passed');
            alert(`✅ Network and Supabase connectivity successful!\n\nSupabase URL: ${supabaseUrl}`);
            return true;
          } else {
            console.error('❌ Supabase responded with error:', supabaseResponse.status);
            alert(`❌ Supabase connectivity issue: ${supabaseResponse.status}`);
            return false;
          }
        } catch (error) {
          console.error('❌ Supabase connectivity test failed:', error);
          alert(`❌ Cannot connect to Supabase.\n\nError: ${error}\n\nPlease check your Supabase configuration.`);
          return false;
        }
      } else {
        console.error('❌ Supabase URL not configured');
        alert('❌ Supabase URL not configured. Please check your environment variables.');
        return false;
      }
    } catch (error) {
      console.error('❌ Internet connectivity test failed:', error);
      alert('❌ No internet connection detected. Please check your network settings.');
      return false;
    }
  };

  const value: AndroidContextType = {
    isAndroid,
    hasNotificationPermission,
    hasBluetoothPermission,
    hasNetworkPermission,
    isLoggedInPersistent,
    isFirstRun,
    permissionsRequested,
    requestNotificationPermission,
    requestBluetoothPermission,
    requestNetworkPermission,
    enablePersistentLogin,
    sendNotification,
    playCustomSound,
    scanBluetooth,
    connectToLocalNetwork,
    markPermissionsRequested,
    enableBackgroundMode,
    keepAppActive,
    testAndroidInterface,
    testNetworkConnectivity,
  };

  return (
    <AndroidContext.Provider value={value}>
      {children}
    </AndroidContext.Provider>
  );
}

export function useAndroid() {
  const context = useContext(AndroidContext);
  if (context === undefined) {
    throw new Error("useAndroid must be used within an AndroidProvider");
  }
  return context;
}



