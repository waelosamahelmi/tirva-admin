import { useState, useEffect } from "react";
import { useAndroid } from "@/lib/android-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Smartphone, Wifi, Bluetooth, Bell, Bug } from "lucide-react";

interface PermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PermissionsDialog({ isOpen, onClose }: PermissionsDialogProps) {  const { 
    hasNotificationPermission, 
    hasBluetoothPermission, 
    hasNetworkPermission,
    requestNotificationPermission,
    requestBluetoothPermission,
    requestNetworkPermission,
    testNetworkConnectivity,
    isAndroid
  } = useAndroid();

  const [requesting, setRequesting] = useState<string | null>(null);
  const [allPermissionsGranted, setAllPermissionsGranted] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [androidMethods, setAndroidMethods] = useState<string[]>([]);
  useEffect(() => {
    const allGranted = hasNotificationPermission && hasBluetoothPermission && hasNetworkPermission;
    setAllPermissionsGranted(allGranted);
    
    // Check available Android methods for debugging
    if (typeof (window as any).Android !== 'undefined') {
      const methods = Object.keys((window as any).Android);
      setAndroidMethods(methods);
      console.log('🔍 Available Android WebView methods:', methods);
    }
    
    if (allGranted) {
      // Auto-close after 2 seconds when all permissions are granted
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasNotificationPermission, hasBluetoothPermission, hasNetworkPermission, onClose]);  const handleRequestPermission = async (type: 'notification' | 'bluetooth' | 'network') => {
    console.log(`🎯 Button clicked for ${type} permission!`);
    alert(`Starting ${type} permission request...`);
    setRequesting(type);
    
    try {
      console.log(`🚀 Starting ${type} permission request...`);
      console.log(`🔍 Android interface available:`, typeof (window as any).Android !== 'undefined');
      console.log(`🔍 Request function available:`, typeof (type === 'notification' ? requestNotificationPermission : type === 'bluetooth' ? requestBluetoothPermission : requestNetworkPermission) !== 'undefined');
      
      let result = false;
      
      switch (type) {
        case 'notification':
          console.log(`🔔 Calling requestNotificationPermission...`);
          result = await requestNotificationPermission();
          break;
        case 'bluetooth':
          console.log(`🔵 Calling requestBluetoothPermission...`);
          result = await requestBluetoothPermission();
          break;
        case 'network':
          console.log(`🌐 Calling requestNetworkPermission...`);
          result = await requestNetworkPermission();
          break;
      }
      
      console.log(`✅ ${type} permission request completed with result:`, result);
      alert(`${type} permission request completed with result: ${result}`);
    } catch (error) {
      console.error(`❌ Error requesting ${type} permission:`, error);
      console.error(`📄 Full error details:`, JSON.stringify(error, null, 2));
      alert(`Error requesting ${type} permission: ${error}`);
    } finally {
      console.log(`🏁 Finishing ${type} permission request, clearing requesting state...`);
      setRequesting(null);
    }
  };

  const permissions = [
    {
      id: 'network',
      name: 'Network Access',
      description: 'Required to receive orders and communicate with the server',
      icon: Wifi,
      granted: hasNetworkPermission,
      handler: () => handleRequestPermission('network')
    },
    {
      id: 'bluetooth',
      name: 'Bluetooth',
      description: 'Required for printer connectivity and device scanning',
      icon: Bluetooth,
      granted: hasBluetoothPermission,
      handler: () => handleRequestPermission('bluetooth')
    },
    {
      id: 'notification',
      name: 'Notifications',
      description: 'Required to alert you when new orders arrive',
      icon: Bell,
      granted: hasNotificationPermission,
      handler: () => handleRequestPermission('notification')
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg mx-4 rounded-lg" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-center">
            <Smartphone className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold">App Permissions Required</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
            To provide the best experience, this app needs access to the following features:
          </p>
          
          {permissions.map((permission) => {
            const Icon = permission.icon;
            return (
              <Card key={permission.id} className={`${permission.granted ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-gray-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${permission.granted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {permission.name}
                        </h3>
                        {permission.granted ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        {permission.description}
                      </p>                      {!permission.granted && (
                        <Button
                          onClick={() => {
                            console.log(`🎯 Individual permission button clicked for ${permission.id}!`);
                            permission.handler();
                          }}
                          disabled={requesting === permission.id}
                          size="sm"
                          className="w-full"
                        >
                          {requesting === permission.id ? 'Requesting...' : 'Grant Permission'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {allPermissionsGranted && (
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-700 dark:text-green-300 font-semibold">
                All permissions granted! The app is ready to use.
              </p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                Closing automatically...
              </p>
            </div>
          )}          {!allPermissionsGranted && (
            <div className="space-y-3">
              <div className="flex space-x-3">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  Skip for Now
                </Button>                <Button
                  onClick={async () => {
                    console.log(`🚀 === GRANT ALL PERMISSIONS CLICKED ===`);
                    console.log(`🔍 Current permission states:`, {
                      hasNetworkPermission,
                      hasBluetoothPermission,
                      hasNotificationPermission
                    });
                    
                    try {
                      // Request all remaining permissions
                      if (!hasNetworkPermission) {
                        console.log(`🌐 Requesting network permission...`);
                        await handleRequestPermission('network');
                      }
                      if (!hasBluetoothPermission) {
                        console.log(`🔵 Requesting bluetooth permission...`);
                        await handleRequestPermission('bluetooth');
                      }
                      if (!hasNotificationPermission) {
                        console.log(`🔔 Requesting notification permission...`);
                        await handleRequestPermission('notification');
                      }
                      console.log(`✅ Grant All completed!`);
                    } catch (error) {
                      console.error(`❌ Error in Grant All:`, error);
                    }
                  }}
                  className="flex-1"
                  disabled={requesting !== null}
                >
                  {requesting ? 'Requesting...' : 'Grant All'}
                </Button>
              </div>
                {/* Debug info toggle */}
              <Button
                onClick={() => {
                  console.log(`🧪 Debug button clicked! Current state:`, showDebugInfo);
                  setShowDebugInfo(!showDebugInfo);
                }}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                <Bug className="w-4 h-4 mr-2" />
                {showDebugInfo ? 'Hide' : 'Show'} Debug Info
              </Button>              {/* Test button click functionality */}
              <Button
                onClick={() => {
                  console.log(`✅ Test button clicked! This proves button clicks are working.`);
                  alert('Button click test - this should show if clicks are working!');
                }}
                variant="outline"
                size="sm"
                className="w-full mt-2"
              >
                Test Button Click
              </Button>

              {/* Network connectivity test button */}
              <Button
                onClick={async () => {
                  console.log(`🌐 Network connectivity test button clicked!`);
                  alert('Starting network connectivity test...');
                  try {
                    const result = await testNetworkConnectivity();
                    console.log(`✅ Network test completed with result:`, result);
                  } catch (error) {
                    console.error(`❌ Network test error:`, error);
                    alert(`Network test error: ${error}`);
                  }
                }}
                variant="outline"
                size="sm"
                className="w-full mt-2"
              >
                🌐 Test Network & Server Connection
              </Button>
            </div>
          )}

          {/* Debug information */}
          {showDebugInfo && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <Bug className="w-4 h-4 mr-2" />
                  Debug Information
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <div>
                  <strong>Platform:</strong> {isAndroid ? 'Android WebView' : 'Web Browser'}
                </div>
                <div>
                  <strong>Android Interface:</strong> {typeof (window as any).Android !== 'undefined' ? '✅ Available' : '❌ Not Available'}
                </div>
                <div>
                  <strong>Permission States:</strong>
                  <ul className="ml-4 mt-1">
                    <li>🔔 Notifications: {hasNotificationPermission ? '✅' : '❌'}</li>
                    <li>🔵 Bluetooth: {hasBluetoothPermission ? '✅' : '❌'}</li>
                    <li>🌐 Network: {hasNetworkPermission ? '✅' : '❌'}</li>
                  </ul>
                </div>
                {androidMethods.length > 0 && (
                  <div>
                    <strong>Available Android Methods:</strong>
                    <div className="max-h-32 overflow-y-auto mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                      {androidMethods.map((method, index) => (
                        <div key={index} className="font-mono">{method}</div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  Check the browser console for detailed permission request logs.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}



