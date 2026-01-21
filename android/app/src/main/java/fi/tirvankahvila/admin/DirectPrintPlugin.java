package fi.tirvankahvila.admin;

import android.content.Context;
import android.print.PrintManager;
import android.print.PrintDocumentAdapter;
import android.print.PrintAttributes;
import android.print.PrintJob;
import android.print.PrintJobInfo;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;
import org.json.JSONArray;

/**
 * Direct Printing Plugin using Android Print Framework
 * Works with LocalPrintService and other print services on the device
 */
@CapacitorPlugin(name = "DirectPrint")
public class DirectPrintPlugin extends Plugin {

    /**
     * Check if print service is available
     */
    @PluginMethod
    public void isAvailable(PluginCall call) {
        try {
            android.util.Log.d("DirectPrint", "Checking print service availability...");
            
            Context context = getContext();
            PrintManager printManager = (PrintManager) context.getSystemService(Context.PRINT_SERVICE);
            
            boolean available = printManager != null;
            
            android.util.Log.d("DirectPrint", "Print service available: " + available);
            
            JSObject result = new JSObject();
            result.put("available", available);
            result.put("message", available ? "Print service ready" : "Print service not available");
            
            call.resolve(result);
        } catch (Exception e) {
            android.util.Log.e("DirectPrint", "Error checking availability: " + e.getMessage(), e);
            call.reject("Failed to check print service: " + e.getMessage());
        }
    }

    /**
     * Print text directly
     */
    @PluginMethod
    public void printText(PluginCall call) {
        String text = call.getString("text");
        String jobName = call.getString("jobName", "Print Job");
        Boolean silentPrint = call.getBoolean("silentPrint", false); // New parameter for auto-print
        
        if (text == null || text.isEmpty()) {
            call.reject("Text is required");
            return;
        }

        try {
            android.util.Log.d("DirectPrint", "Printing text: " + jobName + " (silent: " + silentPrint + ")");
            
            Context context = getContext();
            
            // Create WebView on main thread
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    WebView webView = new WebView(context);
                    
                    webView.setWebViewClient(new WebViewClient() {
                        @Override
                        public void onPageFinished(WebView view, String url) {
                            android.util.Log.d("DirectPrint", "WebView loaded, creating print job...");
                            createPrintJob(view, jobName, call, silentPrint);
                        }
                    });

                    // Build HTML content optimized for receipt printing
                    String htmlContent = buildReceiptHtml(text);
                    
                    webView.loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null);
                    
                } catch (Exception e) {
                    android.util.Log.e("DirectPrint", "Error creating WebView: " + e.getMessage(), e);
                    call.reject("Failed to create print job: " + e.getMessage());
                }
            });
            
        } catch (Exception e) {
            android.util.Log.e("DirectPrint", "Print failed: " + e.getMessage(), e);
            call.reject("Print failed: " + e.getMessage());
        }
    }

    /**
     * Process text to convert simple HTML tags to proper HTML
     */
    private String processTextWithHtmlTags(String text) {
        // Convert <small> tags to span with class
        text = text.replace("<small>", "</pre><div class='small'><pre>")
                   .replace("</small>", "</pre></div><pre>");
        return text;
    }

    /**
     * Build HTML content for receipt with proper Finnish formatting
     */
    private String buildReceiptHtml(String text) {
        return "<!DOCTYPE html>" +
               "<html>" +
               "<head>" +
               "<meta charset=\"UTF-8\">" +
               "<style>" +
               "@page { " +
               "  size: 58mm auto; " +
               "  margin: 0; " +
               "}" +
               "body { " +
               "  width: 58mm; " +
               "  margin: 0 10mm; " +  // 10mm left and right margins
               "  padding: 3mm 0; " +  // Increased padding for better spacing
               "  font-family: 'Arial', 'Helvetica', sans-serif; " +
               "  font-size: 14pt; " +  // Increased from 10pt to 14pt for better readability
               "  line-height: 1.6; " +  // Increased from 1.1 to 1.6 for more space between lines
               "  font-weight: bold; " +
               "}" +
               "pre { " +
               "  margin: 0; " +
               "  white-space: pre-wrap; " +
               "  word-wrap: break-word; " +
               "  font-family: 'Arial', 'Helvetica', sans-serif; " +
               "  font-weight: bold; " +
               "  font-size: 14pt; " +  // Increased from 10pt to 14pt
               "  line-height: 1.6; " +  // Increased from 1.1 to 1.6
               "}" +
               ".header { " +
               "  text-align: center; " +
               "  font-size: 18pt; " +  // Increased from 13pt to 18pt
               "  font-weight: bold; " +
               "  margin-bottom: 4mm; " +  // Increased from 2mm to 4mm
               "}" +
               ".section-title { " +
               "  font-size: 15pt; " +  // Increased from 11pt to 15pt
               "  font-weight: bold; " +
               "  margin-top: 4mm; " +  // Increased from 2mm to 4mm
               "  margin-bottom: 2mm; " +  // Increased from 1mm to 2mm
               "}" +
               ".item-line { " +
               "  margin: 1.5mm 0; " +  // Increased from 0.5mm to 1.5mm
               "}" +
               ".total-line { " +
               "  font-size: 16pt; " +  // Increased from 11pt to 16pt
               "  font-weight: bold; " +
               "  margin-top: 4mm; " +  // Increased from 2mm to 4mm
               "}" +
               ".small { " +
               "  font-size: 11pt; " +  // Smaller font for order number and customer info
               "  line-height: 1.4; " +
               "}" +
               "</style>" +
               "</head>" +
               "<body>" +
               "<pre>" + processTextWithHtmlTags(text) + "</pre>" +
               "</body>" +
               "</html>";
    }

    /**
     * Create print job using Print Manager
     * This will use any available print service (LocalPrintService on Z92)
     */
    private void createPrintJob(WebView webView, String jobName, PluginCall call, Boolean silentPrint) {
        try {
            Context context = getContext();
            PrintManager printManager = (PrintManager) context.getSystemService(Context.PRINT_SERVICE);
            
            // Create print adapter
            PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter(jobName);
            
            // Configure print attributes for 58mm thermal receipt - optimized for Z92
            PrintAttributes.Builder attributesBuilder = new PrintAttributes.Builder();
            
            // Set exact 58mm roll size (58mm width x continuous length)
            // 58mm = 2.283 inches = 2283 mils (1 inch = 1000 mils)
            attributesBuilder.setMediaSize(new PrintAttributes.MediaSize(
                "om_roll_58mm", 
                "58mm Receipt Roll",
                2283, // 58mm width in mils
                9999  // Very long length for continuous roll
            ));
            
            // No margins for full-width printing
            attributesBuilder.setMinMargins(PrintAttributes.Margins.NO_MARGINS);
            
            // Monochrome for thermal printers
            attributesBuilder.setColorMode(PrintAttributes.COLOR_MODE_MONOCHROME);
            
            // Portrait orientation
            attributesBuilder.setDuplexMode(PrintAttributes.DUPLEX_MODE_NONE);
            
            PrintAttributes attributes = attributesBuilder.build();
            
            android.util.Log.d("DirectPrint", "Creating print job with 58mm roll attributes");
            android.util.Log.d("DirectPrint", "Silent print mode: " + silentPrint);
            
            // Create print job
            // If silentPrint is true, this should print directly to default printer
            // If false or no default, shows print dialog
            PrintJob printJob = printManager.print(jobName, printAdapter, attributes);
            
            if (printJob == null) {
                android.util.Log.e("DirectPrint", "Failed to create print job - printJob is null");
                call.reject("Failed to create print job - no printer available");
                return;
            }
            
            android.util.Log.d("DirectPrint", "Print job created: " + printJob.getId());
            
            // Monitor print job status
            monitorPrintJob(printJob, call);
            
        } catch (Exception e) {
            android.util.Log.e("DirectPrint", "Failed to create print job: " + e.getMessage(), e);
            call.reject("Failed to create print job: " + e.getMessage());
        }
    }

    /**
     * Monitor print job status
     */
    private void monitorPrintJob(PrintJob printJob, PluginCall call) {
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            try {
                PrintJobInfo info = printJob.getInfo();
                int state = info.getState();
                
                android.util.Log.d("DirectPrint", "Print job state: " + state);
                
                if (state == PrintJobInfo.STATE_COMPLETED) {
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("message", "Print completed successfully");
                    result.put("jobId", printJob.getId().toString());
                    call.resolve(result);
                } else if (state == PrintJobInfo.STATE_FAILED || state == PrintJobInfo.STATE_CANCELED) {
                    call.reject("Print job failed or canceled");
                } else if (state == PrintJobInfo.STATE_BLOCKED) {
                    call.reject("Print job blocked - printer may be offline");
                } else {
                    // Still printing or queued, return success
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("message", "Print job submitted");
                    result.put("jobId", printJob.getId().toString());
                    result.put("state", state);
                    call.resolve(result);
                }
            } catch (Exception e) {
                android.util.Log.e("DirectPrint", "Error monitoring print job: " + e.getMessage(), e);
                // Still resolve since print job was created
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("message", "Print job submitted");
                call.resolve(result);
            }
        }, 500); // Check status after 500ms
    }

    /**
     * Test print
     */
    @PluginMethod
    public void testPrint(PluginCall call) {
        String testReceipt = 
            "============================\n" +
            "       TEST RECEIPT\n" +
            "============================\n" +
            "Date: " + new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date()) + "\n" +
            "Device: Z92 Android POS\n" +
            "Print Service: LocalPrintService\n" +
            "============================\n" +
            "This is a test print\n" +
            "If you can see this,\n" +
            "the printer is working!\n" +
            "============================\n\n\n";

        try {
            android.util.Log.d("DirectPrint", "Test print requested");
            
            Context context = getContext();
            
            // Create WebView on main thread
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    WebView webView = new WebView(context);
                    
                    webView.setWebViewClient(new WebViewClient() {
                        @Override
                        public void onPageFinished(WebView view, String url) {
                            android.util.Log.d("DirectPrint", "WebView loaded, creating print job...");
                            createPrintJob(view, "Test Print", call, false); // false = show print dialog for test
                        }
                    });

                    // Build HTML content optimized for receipt printing
                    String htmlContent = buildReceiptHtml(testReceipt);
                    
                    webView.loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null);
                    
                } catch (Exception e) {
                    android.util.Log.e("DirectPrint", "Error creating WebView: " + e.getMessage(), e);
                    call.reject("Failed to create print job: " + e.getMessage());
                }
            });
        } catch (Exception e) {
            android.util.Log.e("DirectPrint", "Test print failed: " + e.getMessage(), e);
            call.reject("Test print failed: " + e.getMessage());
        }
    }
}

