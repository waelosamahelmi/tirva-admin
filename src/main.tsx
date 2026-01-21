import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { logger } from './lib/logger';

// Initialize logger
logger.info('Application starting...', { 
  platform: Capacitor.getPlatform(),
  timestamp: new Date().toISOString() 
});

// Initialize Capacitor and handle platform detection
const initializeApp = async () => {
  try {
    console.log('🚀 Initializing app...');
    console.log('📱 Platform info:', {
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      userAgent: navigator.userAgent
    });

    // If running on a native platform
    if (Capacitor.isNativePlatform()) {
      console.log('📱 Running on native platform');
      
      // Wait a bit for React to render, then hide splash screen
      setTimeout(async () => {
        try {
          await SplashScreen.hide();
          console.log('✅ Splash screen hidden');
        } catch (error) {
          console.log('⚠️ Error hiding splash screen:', error);
        }
      }, 1000);
    } else {
      console.log('🌐 Running on web platform');
      
      // Register service worker for PWA on web
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('✅ SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('❌ SW registration failed: ', registrationError);
          });
      }
    }
  } catch (error) {
    console.log('❌ Error initializing app:', error);
  }
};

// Handle app ready state
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM Content Loaded');
  
  // Render app immediately
  createRoot(document.getElementById("root")!).render(<App />);
  
  // Initialize platform-specific features
  initializeApp();
});



