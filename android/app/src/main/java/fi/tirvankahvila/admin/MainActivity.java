package fi.tirvankahvila.admin;

import android.os.Bundle;
import android.webkit.WebView;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.restaurant.admin.PairedBluetoothHelper;
import java.util.ArrayList;

/**
 * Main Activity for Restaurant Order Master Android App
 * Initializes native printer bridge for WebView integration
 */
public class MainActivity extends BridgeActivity {
    
    private static final String TAG = "MainActivity";
    private PrinterBridge printerBridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register DirectPrintPlugin BEFORE calling super.onCreate()
        registerPlugin(DirectPrintPlugin.class);
        
        super.onCreate(savedInstanceState);
        
        Log.d(TAG, "✅ DirectPrintPlugin registered for LocalPrintService support");
        Log.d(TAG, "MainActivity onCreate - initializing printer bridge");
        
        try {
            // Initialize printer bridge with context
            printerBridge = new PrinterBridge(this);
            
            // Get WebView from Capacitor bridge
            WebView webView = getBridge().getWebView();
            
            if (webView != null) {
                Log.d(TAG, "WebView found - configuring settings");
                
                // Configure WebView settings for optimal performance
                webView.getSettings().setJavaScriptEnabled(true);
                webView.getSettings().setDomStorageEnabled(true);
                webView.getSettings().setAllowFileAccess(true);
                webView.getSettings().setAllowContentAccess(true);
                webView.getSettings().setAllowUniversalAccessFromFileURLs(true);
                webView.getSettings().setAllowFileAccessFromFileURLs(true);
                
                // Enable mixed content for network printer access
                webView.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                
                // Add printer bridge to JavaScript interface
                webView.addJavascriptInterface(printerBridge, "Android");
                
                Log.d(TAG, "✅ PrinterBridge successfully added to WebView as 'Android' interface");
                Log.d(TAG, "🖨️ Native printing capabilities now available to web app");
                
                // Test bridge availability
                testBridgeIntegration(webView);
                
            } else {
                Log.e(TAG, "❌ WebView not available - PrinterBridge cannot be initialized");
                Log.e(TAG, "This will result in printing fallback to web-only methods");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error initializing MainActivity: " + e.getMessage(), e);
        }
        
        Log.d(TAG, "MainActivity onCreate completed");
        
        // Register plugins
        registerPlugin(PairedBluetoothHelper.class);
        registerPlugin(Z92PrinterPlugin.class);
    }

    /**
     * Test if the bridge integration is working correctly
     */
    private void testBridgeIntegration(WebView webView) {
        try {
            // Execute a simple JavaScript test to verify bridge availability
            String testScript = 
                "console.log('🧪 Testing Android bridge integration...'); " +
                "if (typeof window.Android === 'object') { " +
                "  console.log('✅ Android bridge object found'); " +
                "  if (typeof window.Android.sendRawDataToPrinter === 'function') { " +
                "    console.log('✅ sendRawDataToPrinter method available'); " +
                "  } else { " +
                "    console.error('❌ sendRawDataToPrinter method missing'); " +
                "  } " +
                "  if (typeof window.Android.getBridgeInfo === 'function') { " +
                "    console.log('✅ getBridgeInfo method available'); " +
                "  } " +
                "} else { " +
                "  console.error('❌ Android bridge object not found'); " +
                "}";
            
            // Post a delayed execution to ensure WebView is ready
            webView.postDelayed(() -> {
                webView.evaluateJavascript(testScript, result -> {
                    Log.d(TAG, "Bridge integration test executed");
                });
            }, 1000);
            
        } catch (Exception e) {
            Log.e(TAG, "Error testing bridge integration: " + e.getMessage());
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        Log.d(TAG, "MainActivity onResume");
        
        if (printerBridge != null) {
            // Refresh network state when activity resumes
            printerBridge.refreshNetworkState();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        Log.d(TAG, "MainActivity onPause");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "MainActivity onDestroy - cleaning up");
        
        if (printerBridge != null) {
            try {
                printerBridge.cleanup();
                Log.d(TAG, "PrinterBridge cleanup completed");
            } catch (Exception e) {
                Log.e(TAG, "Error during PrinterBridge cleanup: " + e.getMessage());
            }
            printerBridge = null;
        }
        
        Log.d(TAG, "MainActivity destroyed");
    }

    @Override
    public void onBackPressed() {
        // Handle back button press gracefully
        WebView webView = getBridge().getWebView();
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    /**
     * Get the printer bridge instance (for testing or debugging)
     */
    public PrinterBridge getPrinterBridge() {
        return printerBridge;
    }
}

