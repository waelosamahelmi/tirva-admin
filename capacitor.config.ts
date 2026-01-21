import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fi.tirvankahvila.admin',
  appName: 'Tirvan Kahvila Admin',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FFFFFF',
      overlaysWebView: false,
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true,
    },
    BluetoothLe: {
      displayStrings: {
        scanning: "Scanning for printers...",
        cancel: "Cancel",
        availableDevices: "Available Printers",
        noDeviceFound: "No printers found"
      }
    },
    ThermalPrinter: {
      connectionTimeout: 10000,
      printTimeout: 30000
    }
  }
};

export default config;
