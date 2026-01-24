package fi.tirvankahvila.admin;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.Context;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Set;

@CapacitorPlugin(name = "PairedBluetoothHelper")
public class PairedBluetoothHelper extends Plugin {

    @PluginMethod
    public void getPairedDevices(PluginCall call) {
        try {
            BluetoothAdapter bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
            
            if (bluetoothAdapter == null) {
                call.reject("Bluetooth not supported on this device");
                return;
            }

            if (!bluetoothAdapter.isEnabled()) {
                call.reject("Bluetooth is not enabled");
                return;
            }

            Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
            JSArray devicesArray = new JSArray();

            for (BluetoothDevice device : pairedDevices) {
                JSObject deviceObj = new JSObject();
                deviceObj.put("name", device.getName());
                deviceObj.put("address", device.getAddress());
                deviceObj.put("type", device.getType());
                deviceObj.put("bondState", device.getBondState());
                devicesArray.put(deviceObj);
            }

            JSObject result = new JSObject();
            result.put("devices", devicesArray);
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Error getting paired devices: " + e.getMessage());
        }
    }
}
