import { useState, useEffect } from "react";
import { useAndroid } from "@/lib/android-context";
import { PermissionsDialog } from "@/components/permissions-dialog";

interface AppWrapperProps {
  children: React.ReactNode;
}

export function AppWrapper({ children }: AppWrapperProps) {
  const { 
    isAndroid, 
    isFirstRun, 
    permissionsRequested, 
    hasNotificationPermission, 
    hasBluetoothPermission, 
    hasNetworkPermission,
    markPermissionsRequested 
  } = useAndroid();
  
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);

  useEffect(() => {
    // Show permissions dialog on first run for Android devices
    if (isAndroid && isFirstRun && !permissionsRequested) {
      // Small delay to let the app initialize
      const timer = setTimeout(() => {
        setShowPermissionsDialog(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isAndroid, isFirstRun, permissionsRequested]);

  const handlePermissionsDialogClose = () => {
    setShowPermissionsDialog(false);
    markPermissionsRequested();
  };

  return (
    <>
      {children}
      <PermissionsDialog 
        isOpen={showPermissionsDialog} 
        onClose={handlePermissionsDialogClose} 
      />
    </>
  );
}



