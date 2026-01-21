import { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Dialog } from '@capacitor/dialog';
import { Browser } from '@capacitor/browser';

interface UpdateInfo {
  version: string;
  downloadUrl: string;
  releaseDate: string;
  fileSize: string;
}

const SKIPPED_VERSION_KEY = 'plateos_skipped_update_version';

export function useAppUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');

  const GITHUB_REPO = 'waelosamahelmi/tirva-admin';
  const CHECK_INTERVAL = 1000 * 60 * 60; // Check every hour

  // Get current app version on mount
  useEffect(() => {
    const getAppVersion = async () => {
      try {
        const info = await CapacitorApp.getInfo();
        setCurrentVersion(info.version);
      } catch (error) {
        console.error('Error getting app version:', error);
        // Fallback to package.json version
        setCurrentVersion('1.0.0');
      }
    };
    getAppVersion();
  }, []);

  const checkForUpdates = async () => {
    try {
      setChecking(true);
      
      // Check if we're online before attempting to fetch
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.log('📴 Offline - skipping update check');
        return;
      }
      
      // Fetch latest release from GitHub with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Failed to check for updates');
        return;
      }

      const release = await response.json();
      const latestVersion = release.tag_name.replace('v', '');
      
      // Find APK asset
      const apkAsset = release.assets.find((asset: any) => 
        asset.name.endsWith('.apk')
      );

      if (!apkAsset) {
        console.error('No APK found in latest release');
        return;
      }

      // Check if user skipped this version
      const skippedVersion = localStorage.getItem(SKIPPED_VERSION_KEY);
      
      // Compare versions
      if (isNewerVersion(latestVersion, currentVersion) && latestVersion !== skippedVersion) {
        const updateInfo: UpdateInfo = {
          version: latestVersion,
          downloadUrl: apkAsset.browser_download_url,
          releaseDate: new Date(release.published_at).toLocaleDateString(),
          fileSize: (apkAsset.size / (1024 * 1024)).toFixed(2) + ' MB'
        };

        setUpdateInfo(updateInfo);
        setUpdateAvailable(true);
      }
    } catch (error) {
      // Gracefully handle network errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('⏱️ Update check timed out - will retry later');
        } else if (error.message.includes('fetch') || error.message.includes('network')) {
          console.log('🌐 Network error checking for updates - will retry later');
        } else {
          console.error('Error checking for updates:', error);
        }
      } else {
        console.error('Error checking for updates:', error);
      }
    } finally {
      setChecking(false);
    }
  };

  const isNewerVersion = (latest: string, current: string): boolean => {
    // Simple version comparison (assumes format: YYYYMMDD_HHMMSS or X.Y.Z)
    return latest > current;
  };

  const showUpdateDialog = async (info: UpdateInfo) => {
    const { value } = await Dialog.confirm({
      title: '🎉 Update Available!',
      message: `PlateOS ${info.version} is now available!\n\nSize: ${info.fileSize}\nReleased: ${info.releaseDate}\n\nWould you like to download the update?`,
      okButtonTitle: 'Update Now',
      cancelButtonTitle: 'Later'
    });

    if (value) {
      downloadUpdate();
    }
  };

  const downloadUpdate = async () => {
    try {
      if (!updateInfo?.downloadUrl) {
        console.error('No download URL available');
        return;
      }
      
      console.log('Opening download URL:', updateInfo.downloadUrl);
      
      // Open download URL in browser
      await Browser.open({ url: updateInfo.downloadUrl });
      
      // Show instructions
      await Dialog.alert({
        title: 'Download Started',
        message: 'The APK is downloading. Once complete:\n\n1. Open the downloaded file\n2. Install the update\n3. The app will restart automatically'
      });
    } catch (error) {
      console.error('Error downloading update:', error);
      await Dialog.alert({
        title: 'Download Error',
        message: 'Failed to start download. Please try again later.'
      });
    }
  };

  const skipUpdate = () => {
    if (updateInfo) {
      localStorage.setItem(SKIPPED_VERSION_KEY, updateInfo.version);
      setUpdateAvailable(false);
    }
  };

  const manualCheckForUpdates = async () => {
    await checkForUpdates();
    
    if (!updateAvailable && !checking) {
      await Dialog.alert({
        title: 'No Updates',
        message: 'You are using the latest version of PlateOS!'
      });
    }
  };

  // Auto-check on app startup
  useEffect(() => {
    checkForUpdates();
  }, []);

  // Periodic update checks
  useEffect(() => {
    const interval = setInterval(() => {
      checkForUpdates();
    }, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Check when app becomes active
  useEffect(() => {
    let listenerHandle: any;
    
    const setupListener = async () => {
      listenerHandle = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          checkForUpdates();
        }
      });
    };
    
    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, []);

  return {
    updateAvailable,
    updateInfo,
    checking,
    checkForUpdates: manualCheckForUpdates,
    downloadUpdate,
    skipUpdate
  };
}



