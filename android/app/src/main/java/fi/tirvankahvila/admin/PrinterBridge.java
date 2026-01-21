package fi.tirvankahvila.admin;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.app.NotificationManager;
import android.app.NotificationChannel;
import android.app.Notification;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Production-Ready Android Native Bridge for Printer Operations
 * Provides RAW TCP printing, network utilities, and diagnostics for WebView
 */
public class PrinterBridge {
    private static final String TAG = "PrinterBridge";
    private static final String VERSION = "2.1.0";
    private static final int DEFAULT_TIMEOUT = 5000; // 5 seconds
    private static final int MAX_RETRIES = 3;
    
    private Context context;
    private ExecutorService executorService;
    private ConnectivityManager connectivityManager;
    private WifiManager wifiManager;

    public PrinterBridge(Context context) {
        this.context = context;
        this.executorService = Executors.newCachedThreadPool();
        this.connectivityManager = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        this.wifiManager = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        
        Log.d(TAG, "🚀 PrinterBridge v" + VERSION + " initialized");
        Log.d(TAG, "📱 Ready for production network printing operations");
    }

    /**
     * PRIMARY PRINTING METHOD - Send raw data to printer via TCP socket
     * This is the core method for thermal printer communication
     * 
     * @param address Printer IP address
     * @param port Printer port (typically 9100 for RAW/JetDirect)
     * @param base64Data Print data encoded as base64 string
     * @return true if print successful, false otherwise
     */
    @JavascriptInterface
    public boolean sendRawDataToPrinter(String address, int port, String base64Data) {
        final long startTime = System.currentTimeMillis();
        
        Log.d(TAG, String.format("🖨️ ===== STARTING PRINT OPERATION ====="));
        Log.d(TAG, String.format("📍 Target: %s:%d", address, port));
        Log.d(TAG, String.format("📄 Data size: %d base64 characters", base64Data.length()));
        
        try {
            // Input validation
            if (address == null || address.trim().isEmpty()) {
                Log.e(TAG, "❌ Invalid address: null or empty");
                return false;
            }
            
            if (port <= 0 || port > 65535) {
                Log.e(TAG, "❌ Invalid port: " + port);
                return false;
            }
            
            if (base64Data == null || base64Data.trim().isEmpty()) {
                Log.e(TAG, "❌ Invalid print data: null or empty");
                return false;
            }
            
            // Decode base64 data
            byte[] printData;
            try {
                printData = Base64.decode(base64Data, Base64.DEFAULT);
                Log.d(TAG, String.format("✅ Decoded %d bytes from base64", printData.length));
            } catch (IllegalArgumentException e) {
                Log.e(TAG, "❌ Base64 decode failed: " + e.getMessage());
                return false;
            }
            
            if (printData.length == 0) {
                Log.e(TAG, "❌ Decoded data is empty");
                return false;
            }
            
            // Check network connectivity
            if (!isNetworkAvailable()) {
                Log.e(TAG, "❌ Network not available");
                return false;
            }
            
            // Attempt printing with retries
            Exception lastException = null;
            for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    Log.d(TAG, String.format("🔄 Print attempt %d/%d", attempt, MAX_RETRIES));
                    
                    boolean success = performTCPPrint(address, port, printData, attempt);
                    
                    if (success) {
                        final long duration = System.currentTimeMillis() - startTime;
                        Log.d(TAG, String.format("✅ ===== PRINT SUCCESSFUL ====="));
                        Log.d(TAG, String.format("⏱️ Total duration: %dms", duration));
                        Log.d(TAG, String.format("📊 %d bytes sent to %s:%d", printData.length, address, port));
                        return true;
                    }
                    
                } catch (Exception e) {
                    lastException = e;
                    Log.w(TAG, String.format("⚠️ Attempt %d failed: %s", attempt, e.getMessage()));
                    
                    if (attempt < MAX_RETRIES) {
                        try {
                            Thread.sleep(1000 * attempt); // Progressive delay
                        } catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                            break;
                        }
                    }
                }
            }
            
            final long duration = System.currentTimeMillis() - startTime;
            Log.e(TAG, String.format("❌ ===== PRINT FAILED ====="));
            Log.e(TAG, String.format("⏱️ Total duration: %dms", duration));
            Log.e(TAG, String.format("🔄 All %d attempts failed", MAX_RETRIES));
            if (lastException != null) {
                Log.e(TAG, "📝 Last error: " + lastException.getMessage());
            }
            
            return false;
            
        } catch (Exception e) {
            final long duration = System.currentTimeMillis() - startTime;
            Log.e(TAG, String.format("❌ Print operation exception after %dms: %s", duration, e.getMessage()), e);
            return false;
        }
    }

    /**
     * Perform the actual TCP print operation
     */
    private boolean performTCPPrint(String address, int port, byte[] printData, int attempt) throws Exception {
        Socket socket = null;
        OutputStream outputStream = null;
        
        try {
            Log.d(TAG, String.format("🔌 Connecting to %s:%d (attempt %d)", address, port, attempt));
            
            // Create socket with timeout
            socket = new Socket();
            socket.setTcpNoDelay(true); // Reduce latency
            socket.setKeepAlive(false); // Don't keep connection alive
            
            // Connect with timeout
            socket.connect(new InetSocketAddress(address, port), DEFAULT_TIMEOUT);
            socket.setSoTimeout(DEFAULT_TIMEOUT);
            
            Log.d(TAG, String.format("✅ Connected to %s:%d", address, port));
            
            // Get output stream and send data
            outputStream = socket.getOutputStream();
            
            Log.d(TAG, String.format("📤 Sending %d bytes...", printData.length));
            outputStream.write(printData);
            outputStream.flush();
            
            Log.d(TAG, "✅ Data sent successfully");
            
            // Small delay to ensure data is processed
            Thread.sleep(100);
            
            return true;
            
        } catch (SocketTimeoutException e) {
            throw new Exception("Connection timeout to " + address + ":" + port, e);
        } catch (IOException e) {
            throw new Exception("IO error communicating with " + address + ":" + port + ": " + e.getMessage(), e);
        } finally {
            // Clean up resources
            try {
                if (outputStream != null) {
                    outputStream.close();
                }
            } catch (IOException e) {
                Log.w(TAG, "Error closing output stream: " + e.getMessage());
            }
            
            try {
                if (socket != null && !socket.isClosed()) {
                    socket.close();
                }
            } catch (IOException e) {
                Log.w(TAG, "Error closing socket: " + e.getMessage());
            }
        }
    }

    /**
     * Test printer connection without sending data
     * Used for printer discovery and health monitoring
     * 
     * @param address Printer IP address
     * @param port Printer port
     * @return true if connection successful, false otherwise
     */
    @JavascriptInterface
    public boolean testPrinterConnection(String address, int port) {
        final long startTime = System.currentTimeMillis();
        
        Log.d(TAG, String.format("🔍 Testing connection to %s:%d", address, port));
        
        try {
            // Input validation
            if (address == null || address.trim().isEmpty()) {
                Log.d(TAG, "❌ Invalid address for connection test");
                return false;
            }
            
            if (port <= 0 || port > 65535) {
                Log.d(TAG, "❌ Invalid port for connection test: " + port);
                return false;
            }
            
            // Check network availability
            if (!isNetworkAvailable()) {
                Log.d(TAG, "❌ Network not available for connection test");
                return false;
            }
            
            Socket socket = null;
            try {
                socket = new Socket();
                socket.connect(new InetSocketAddress(address, port), 3000); // Shorter timeout for tests
                
                final long duration = System.currentTimeMillis() - startTime;
                Log.d(TAG, String.format("✅ Connection test successful to %s:%d (%dms)", address, port, duration));
                return true;
                
            } finally {
                if (socket != null && !socket.isClosed()) {
                    try {
                        socket.close();
                    } catch (IOException e) {
                        // Ignore close errors
                    }
                }
            }
            
        } catch (Exception e) {
            final long duration = System.currentTimeMillis() - startTime;
            Log.d(TAG, String.format("❌ Connection test failed to %s:%d (%dms): %s", address, port, duration, e.getMessage()));
            return false;
        }
    }

    /**
     * Advanced printing method with custom timeout and detailed response
     * 
     * @param address Printer IP address
     * @param port Printer port
     * @param base64Data Print data as base64
     * @param timeout Custom timeout in milliseconds
     * @return JSON string with detailed result information
     */
    @JavascriptInterface
    public String sendDataToPrinterAdvanced(String address, int port, String base64Data, int timeout) {
        final long startTime = System.currentTimeMillis();
        JSONObject result = new JSONObject();
        
        try {
            result.put("success", false);
            result.put("address", address);
            result.put("port", port);
            result.put("timeout", timeout);
            result.put("startTime", startTime);
            
            // Use custom timeout if provided
            int actualTimeout = (timeout > 0 && timeout <= 30000) ? timeout : DEFAULT_TIMEOUT;
            
            Log.d(TAG, String.format("🖨️ Advanced print to %s:%d (timeout: %dms)", address, port, actualTimeout));
            
            // Decode data
            byte[] printData = Base64.decode(base64Data, Base64.DEFAULT);
            result.put("dataSize", printData.length);
            
            // Perform print operation
            Socket socket = null;
            try {
                socket = new Socket();
                socket.connect(new InetSocketAddress(address, port), actualTimeout);
                socket.setSoTimeout(actualTimeout);
                
                OutputStream outputStream = socket.getOutputStream();
                outputStream.write(printData);
                outputStream.flush();
                outputStream.close();
                
                result.put("success", true);
                result.put("message", "Print completed successfully");
                
            } finally {
                if (socket != null && !socket.isClosed()) {
                    socket.close();
                }
            }
            
        } catch (Exception e) {
            try {
                result.put("error", e.getMessage());
                result.put("errorType", e.getClass().getSimpleName());
            } catch (JSONException je) {
                // Ignore JSON errors
            }
        }
        
        try {
            final long duration = System.currentTimeMillis() - startTime;
            result.put("duration", duration);
            result.put("endTime", System.currentTimeMillis());
        } catch (JSONException e) {
            // Ignore JSON errors
        }
        
        return result.toString();
    }

    /**
     * Get comprehensive network information
     * Used for intelligent printer discovery
     * 
     * @return JSON string with network details
     */
    @JavascriptInterface
    public String getNetworkInfo() {
        Log.d(TAG, "📡 Getting network information");
        
        JSONObject networkInfo = new JSONObject();
        
        try {
            // Network connectivity
            boolean isConnected = isNetworkAvailable();
            networkInfo.put("connected", isConnected);
            
            if (isConnected) {
                NetworkInfo activeNetwork = connectivityManager.getActiveNetworkInfo();
                if (activeNetwork != null) {
                    networkInfo.put("type", activeNetwork.getTypeName());
                    networkInfo.put("state", activeNetwork.getState().toString());
                    networkInfo.put("reason", activeNetwork.getReason());
                }
                
                // WiFi specific information
                if (wifiManager != null && wifiManager.isWifiEnabled()) {
                    WifiInfo wifiInfo = wifiManager.getConnectionInfo();
                    if (wifiInfo != null) {
                        networkInfo.put("wifiEnabled", true);
                        networkInfo.put("ssid", wifiInfo.getSSID());
                        networkInfo.put("rssi", wifiInfo.getRssi());
                        networkInfo.put("linkSpeed", wifiInfo.getLinkSpeed());
                        
                        // Get IP address and calculate network base
                        int ip = wifiInfo.getIpAddress();
                        String ipAddress = String.format("%d.%d.%d.%d",
                            (ip & 0xff),
                            (ip >> 8 & 0xff),
                            (ip >> 16 & 0xff),
                            (ip >> 24 & 0xff));
                        
                        networkInfo.put("ipAddress", ipAddress);
                        
                        // Calculate network base (e.g., 192.168.1 from 192.168.1.100)
                        String[] ipParts = ipAddress.split("\\.");
                        if (ipParts.length >= 3) {
                            String networkBase = ipParts[0] + "." + ipParts[1] + "." + ipParts[2];
                            networkInfo.put("networkBase", networkBase);
                        }
                    }
                } else {
                    networkInfo.put("wifiEnabled", false);
                }
            }
            
            // Bridge information
            networkInfo.put("bridgeVersion", VERSION);
            networkInfo.put("timestamp", System.currentTimeMillis());
            
            Log.d(TAG, "✅ Network info collected: " + networkInfo.toString());
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error getting network info: " + e.getMessage());
            try {
                networkInfo.put("error", e.getMessage());
            } catch (JSONException je) {
                // Ignore
            }
        }
        
        return networkInfo.toString();
    }

    /**
     * Test overall network connectivity
     * 
     * @return true if network is available and functional
     */
    @JavascriptInterface
    public boolean testNetworkConnectivity() {
        Log.d(TAG, "🌐 Testing network connectivity");
        
        try {
            boolean available = isNetworkAvailable();
            
            if (available) {
                // Additional test: try to resolve a well-known address
                Future<Boolean> future = executorService.submit(() -> {
                    try {
                        InetAddress address = InetAddress.getByName("8.8.8.8");
                        return address.isReachable(3000);
                    } catch (Exception e) {
                        return false;
                    }
                });
                
                boolean reachable = future.get(5, TimeUnit.SECONDS);
                Log.d(TAG, String.format("✅ Network connectivity test: %s", reachable ? "PASSED" : "FAILED"));
                return reachable;
            }
            
            Log.d(TAG, "❌ Network not available");
            return false;
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Network connectivity test error: " + e.getMessage());
            return false;
        }
    }

    /**
     * Get comprehensive bridge information and capabilities
     * 
     * @return JSON string with bridge details
     */
    @JavascriptInterface
    public String getBridgeInfo() {
        Log.d(TAG, "ℹ️ Getting bridge information");
        
        JSONObject bridgeInfo = new JSONObject();
        
        try {
            // Basic bridge info
            bridgeInfo.put("name", "Restaurant Order Master Printer Bridge");
            bridgeInfo.put("version", VERSION);
            bridgeInfo.put("platform", "Android");
            bridgeInfo.put("timestamp", System.currentTimeMillis());
            
            // Capabilities
            JSONObject capabilities = new JSONObject();
            capabilities.put("rawTCPPrinting", true);
            capabilities.put("networkDiscovery", true);
            capabilities.put("connectionTesting", true);
            capabilities.put("networkInfo", true);
            capabilities.put("advancedPrinting", true);
            capabilities.put("retryLogic", true);
            capabilities.put("timeoutControl", true);
            bridgeInfo.put("capabilities", capabilities);
            
            // Supported protocols
            bridgeInfo.put("supportedProtocols", new String[]{"RAW/JetDirect", "ESC/POS"});
            
            // Configuration
            JSONObject config = new JSONObject();
            config.put("defaultTimeout", DEFAULT_TIMEOUT);
            config.put("maxRetries", MAX_RETRIES);
            bridgeInfo.put("configuration", config);
            
            // Network status
            bridgeInfo.put("networkAvailable", isNetworkAvailable());
            
            Log.d(TAG, "✅ Bridge info compiled successfully");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error getting bridge info: " + e.getMessage());
            try {
                bridgeInfo.put("error", e.getMessage());
            } catch (JSONException je) {
                // Ignore
            }
        }
        
        return bridgeInfo.toString();
    }

    /**
     * Check if network is available
     */
    private boolean isNetworkAvailable() {
        try {
            if (connectivityManager == null) {
                return false;
            }
            
            NetworkInfo activeNetwork = connectivityManager.getActiveNetworkInfo();
            return activeNetwork != null && activeNetwork.isConnectedOrConnecting();
            
        } catch (Exception e) {
            Log.e(TAG, "Error checking network availability: " + e.getMessage());
            return false;
        }
    }

    /**
     * Refresh network state (called from MainActivity)
     */
    public void refreshNetworkState() {
        Log.d(TAG, "🔄 Refreshing network state");
        // This can be called when the activity resumes to update network info
    }

    // ===== NOTIFICATION METHODS =====

    /**
     * Show notification with alert.mp3 sound (default custom sound)
     */
    @JavascriptInterface
    public void showNotification(String title, String message) {
        showNotificationWithSound(title, message, "alert");
    }

    /**
     * Send notification with alert.mp3 sound (alias for showNotification for compatibility)
     */
    @JavascriptInterface
    public void sendNotification(String title, String message) {
        showNotificationWithSound(title, message, "alert");
    }

    /**
     * Show notification with custom sound
     * @param title Notification title
     * @param message Notification message
     * @param soundName Sound file name in res/raw folder (without extension), or null for default
     */
    @JavascriptInterface
    public void showNotificationWithSound(String title, String message, String soundName) {
        try {
            android.app.NotificationManager notificationManager = 
                (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            
            if (notificationManager == null) {
                Log.e(TAG, "❌ NotificationManager not available");
                return;
            }

            String channelId = "restaurant_orders";
            String channelName = "Restaurant Orders";
            
            // Create notification channel for Android O and above
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                android.app.NotificationChannel channel = notificationManager.getNotificationChannel(channelId);
                if (channel == null) {
                    channel = new android.app.NotificationChannel(
                        channelId, 
                        channelName, 
                        android.app.NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.setDescription("Notifications for new restaurant orders");
                    channel.enableLights(true);
                    channel.enableVibration(true);
                    channel.setVibrationPattern(new long[]{100, 200, 300, 400, 500, 400, 300, 200, 400});
                    
                    // Set custom sound if specified
                    if (soundName != null && !soundName.trim().isEmpty()) {
                        try {
                            String soundFileName = soundName.toLowerCase().replace(" ", "_");
                            android.net.Uri soundUri = android.net.Uri.parse(
                                "android.resource://" + context.getPackageName() + "/raw/" + soundFileName
                            );
                            android.media.AudioAttributes audioAttributes = new android.media.AudioAttributes.Builder()
                                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                                .build();
                            channel.setSound(soundUri, audioAttributes);
                            Log.d(TAG, "🔊 Custom sound set: " + soundFileName);
                        } catch (Exception e) {
                            Log.w(TAG, "⚠️ Failed to set custom sound, using default: " + e.getMessage());
                        }
                    }
                    
                    notificationManager.createNotificationChannel(channel);
                    Log.d(TAG, "✅ Notification channel created: " + channelId);
                }
            }

            // Build notification
            android.app.Notification.Builder builder;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                builder = new android.app.Notification.Builder(context, channelId);
            } else {
                builder = new android.app.Notification.Builder(context);
                // For older versions, set sound directly on notification
                if (soundName != null && !soundName.trim().isEmpty()) {
                    try {
                        String soundFileName = soundName.toLowerCase().replace(" ", "_");
                        android.net.Uri soundUri = android.net.Uri.parse(
                            "android.resource://" + context.getPackageName() + "/raw/" + soundFileName
                        );
                        builder.setSound(soundUri);
                        Log.d(TAG, "🔊 Custom sound set for legacy notification: " + soundFileName);
                    } catch (Exception e) {
                        Log.w(TAG, "⚠️ Failed to set custom sound on legacy notification: " + e.getMessage());
                        // Fallback to alert.mp3 instead of default sound
                        try {
                            android.net.Uri alertUri = android.net.Uri.parse(
                                "android.resource://" + context.getPackageName() + "/raw/alert"
                            );
                            builder.setSound(alertUri);
                            Log.d(TAG, "🔊 Fallback to alert.mp3 sound");
                        } catch (Exception fallbackError) {
                            builder.setDefaults(android.app.Notification.DEFAULT_SOUND);
                        }
                    }
                } else {
                    // Use alert.mp3 as default instead of system default
                    try {
                        android.net.Uri alertUri = android.net.Uri.parse(
                            "android.resource://" + context.getPackageName() + "/raw/alert"
                        );
                        builder.setSound(alertUri);
                        Log.d(TAG, "🔊 Using alert.mp3 as default notification sound");
                    } catch (Exception e) {
                        Log.w(TAG, "⚠️ Could not use alert.mp3, falling back to system sound");
                        builder.setDefaults(android.app.Notification.DEFAULT_SOUND);
                    }
                }
            }

            builder.setContentTitle(title != null ? title : "Restaurant Order")
                   .setContentText(message != null ? message : "New notification")
                   .setSmallIcon(android.R.drawable.ic_dialog_info) // You can change this to a custom icon
                   .setPriority(android.app.Notification.PRIORITY_HIGH)
                   .setAutoCancel(true)
                   .setDefaults(android.app.Notification.DEFAULT_LIGHTS | android.app.Notification.DEFAULT_VIBRATE);

            // Show notification
            int notificationId = (int) System.currentTimeMillis();
            notificationManager.notify(notificationId, builder.build());
            
            Log.d(TAG, String.format("✅ Notification shown - Title: '%s', Message: '%s', Sound: %s", 
                title, message, soundName != null ? soundName : "default"));
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to show notification: " + e.getMessage(), e);
        }
    }

    /**
     * Play a custom sound from res/raw folder
     * @param soundName Sound file name (without extension)
     */
    @JavascriptInterface
    public void playCustomSound(String soundName) {
        try {
            if (soundName == null || soundName.trim().isEmpty()) {
                Log.w(TAG, "⚠️ Sound name is empty");
                return;
            }

            String soundFileName = soundName.toLowerCase().replace(" ", "_");
            
            // Get resource ID for the sound file
            int soundResId = context.getResources().getIdentifier(
                soundFileName, "raw", context.getPackageName()
            );
            
            if (soundResId == 0) {
                Log.e(TAG, "❌ Sound file not found: " + soundFileName + " in res/raw/");
                return;
            }

            // Create and play MediaPlayer
            android.media.MediaPlayer mediaPlayer = android.media.MediaPlayer.create(context, soundResId);
            if (mediaPlayer != null) {
                mediaPlayer.setOnCompletionListener(new android.media.MediaPlayer.OnCompletionListener() {
                    @Override
                    public void onCompletion(android.media.MediaPlayer mp) {
                        mp.release();
                    }
                });
                mediaPlayer.start();
                Log.d(TAG, "🔊 Playing custom sound: " + soundFileName);
            } else {
                Log.e(TAG, "❌ Failed to create MediaPlayer for: " + soundFileName);
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to play custom sound: " + e.getMessage(), e);
        }
    }

    /**
     * Clean up resources
     */
    public void cleanup() {
        Log.d(TAG, "🧹 Cleaning up PrinterBridge resources");
        
        try {
            if (executorService != null && !executorService.isShutdown()) {
                executorService.shutdown();
                if (!executorService.awaitTermination(2, TimeUnit.SECONDS)) {
                    executorService.shutdownNow();
                }
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }
        
        Log.d(TAG, "✅ PrinterBridge cleanup completed");
    }
}

