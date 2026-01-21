package fi.tirvankahvila.admin;

import android.content.Context;
import android.print.PrintManager;
import android.print.PrintDocumentAdapter;
import android.print.PrintAttributes;
import android.print.PrintJob;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

/**
 * Plugin for Z92 built-in printer (BluetoothPrint)
 * Uses Android's native printing framework instead of BLE
 */
@CapacitorPlugin(name = "Z92Printer")
public class Z92PrinterPlugin extends Plugin {

    /**
     * Test if Z92 built-in printer is available
     */
    @PluginMethod
    public void isZ92PrinterAvailable(PluginCall call) {
        try {
            android.util.Log.d("Z92Printer", "isZ92PrinterAvailable called");
            
            Context context = getContext();
            android.util.Log.d("Z92Printer", "Context obtained: " + (context != null));
            
            PrintManager printManager = (PrintManager) context.getSystemService(Context.PRINT_SERVICE);
            android.util.Log.d("Z92Printer", "PrintManager obtained: " + (printManager != null));
            
            JSObject result = new JSObject();
            result.put("available", printManager != null);
            result.put("message", "Z92 built-in printer service available");
            
            android.util.Log.d("Z92Printer", "Returning available: " + (printManager != null));
            
            call.resolve(result);
        } catch (Exception e) {
            android.util.Log.e("Z92Printer", "Error checking printer availability: " + e.getMessage(), e);
            call.reject("Failed to check printer availability: " + e.getMessage());
        }
    }

    /**
     * Print text using Z92's built-in printer
     */
    @PluginMethod
    public void printText(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.isEmpty()) {
            call.reject("Text is required");
            return;
        }

        try {
            Context context = getContext();
            
            // Create a WebView to render the text for printing
            WebView webView = new WebView(context);
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    createPrintJob(view, text);
                }
            });

            // Build HTML content with proper formatting for receipt
            String htmlDocument = 
                "<html><body style='font-family: monospace; font-size: 12px;'>" +
                "<pre>" + text + "</pre>" +
                "</body></html>";

            webView.loadDataWithBaseURL(null, htmlDocument, "text/html", "UTF-8", null);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "Print job initiated");
            call.resolve(result);
            
        } catch (Exception e) {
            call.reject("Print failed: " + e.getMessage());
        }
    }

    /**
     * Create a print job using Android's print framework
     */
    private void createPrintJob(WebView webView, String documentName) {
        try {
            Context context = getContext();
            PrintManager printManager = (PrintManager) context.getSystemService(Context.PRINT_SERVICE);
            
            // Create a print adapter from the WebView
            PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter(documentName);
            
            // Configure print attributes for receipt (58mm thermal)
            PrintAttributes.Builder attributesBuilder = new PrintAttributes.Builder();
            attributesBuilder.setMediaSize(new PrintAttributes.MediaSize("receipt", "Receipt",
                    2283, 3000)); // 58mm width approximation
            attributesBuilder.setResolution(new PrintAttributes.Resolution("thermal", "Thermal", 203, 203));
            attributesBuilder.setMinMargins(PrintAttributes.Margins.NO_MARGINS);
            
            PrintAttributes attributes = attributesBuilder.build();
            
            // Create print job
            PrintJob printJob = printManager.print(documentName, printAdapter, attributes);
            
        } catch (Exception e) {
            android.util.Log.e("Z92Printer", "Failed to create print job: " + e.getMessage());
        }
    }

    /**
     * Test print - prints a test receipt
     */
    @PluginMethod
    public void testPrint(PluginCall call) {
        String testReceipt = 
            "================================\n" +
            "        TEST RECEIPT\n" +
            "================================\n" +
            "Date: " + new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date()) + "\n" +
            "Device: Z92 Android POS\n" +
            "Printer: BluetoothPrint\n" +
            "================================\n" +
            "This is a test print\n" +
            "If you can see this,\n" +
            "the printer is working!\n" +
            "================================\n";

        try {
            Context context = getContext();
            
            // Create a WebView to render the text for printing
            WebView webView = new WebView(context);
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    createPrintJob(view, "Test Receipt");
                }
            });

            // Build HTML content with proper formatting for receipt
            String htmlDocument = 
                "<html><body style='font-family: monospace; font-size: 12px;'>" +
                "<pre>" + testReceipt + "</pre>" +
                "</body></html>";

            webView.loadDataWithBaseURL(null, htmlDocument, "text/html", "UTF-8", null);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "Test print job initiated");
            call.resolve(result);
            
        } catch (Exception e) {
            call.reject("Test print failed: " + e.getMessage());
        }
    }
}

