import { Platform } from 'react-native';

// Safely require react-native-ble-plx to prevent crashes on unsupported platforms (like web/Expo Go)
let BleManager: any = null;
let isNativeBleSupported = false;

try {
  // Try to require the native BLE manager
  const BLE = require('react-native-ble-plx');
  BleManager = BLE.BleManager;
  isNativeBleSupported = true;
} catch (e) {
  console.log('Native Bluetooth Low Energy (BLE) not supported on this environment. Falling back to simulator mode.');
}

export interface BleDevice {
  id: string;
  name: string | null;
  rssi: number | null;
}

export type BleConnectionState = 'disconnected' | 'scanning' | 'connecting' | 'connected';

class BluetoothService {
  private manager: any = null;
  private onPointTriggeredCallback: (player: 1 | 2) => void = () => {};
  private onButtonPressCallback: (buttonId: string) => void = () => {};
  private onConnectionStateChanged: (state: BleConnectionState) => void = () => {};
  private connectionState: BleConnectionState = 'disconnected';
  private connectedDeviceId: string | null = null;
  private isSimulated: boolean = false;
  private webDevices: Map<string, any> = new Map();

  constructor() {
    // Lazy initialization of manager to prevent startup crashes
    if (Platform.OS === 'web') {
      this.isSimulated = false; // We can use Web Bluetooth
    } else if (!isNativeBleSupported || !BleManager) {
      this.isSimulated = true;
    }
  }

  // Helper to decode Base64 strings to ASCII or hex representation
  private decodeBase64(base64: string): string {
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      const lookup = new Uint8Array(256);
      for (let i = 0; i < chars.length; i++) {
        lookup[chars.charCodeAt(i)] = i;
      }
      let bufferLength = base64.length * 0.75;
      if (base64[base64.length - 1] === '=') {
        bufferLength--;
        if (base64[base64.length - 2] === '=') {
          bufferLength--;
        }
      }
      const bytes = new Uint8Array(bufferLength);
      let p = 0;
      for (let i = 0; i < base64.length; i += 4) {
        const base64code1 = lookup[base64.charCodeAt(i)];
        const base64code2 = lookup[base64.charCodeAt(i + 1)];
        const base64code3 = lookup[base64.charCodeAt(i + 2)];
        const base64code4 = lookup[base64.charCodeAt(i + 3)];
        bytes[p++] = (base64code1 << 2) | (base64code2 >> 4);
        if (p < bufferLength) {
          bytes[p++] = ((base64code2 & 15) << 4) | (base64code3 >> 2);
        }
        if (p < bufferLength) {
          bytes[p++] = ((base64code3 & 3) << 6) | (base64code4 & 63);
        }
      }
      if (bytes.length > 0) {
        // First try as direct number/string key (e.g. "1", "2")
        const ascii = String.fromCharCode.apply(null, Array.from(bytes)).trim();
        // If it's a readable alphanumeric character, return it.
        if (/^[a-zA-Z0-9]$/.test(ascii)) {
          return ascii;
        }
        // Fallback to the first byte as string (e.g. "1", "2")
        return String(bytes[0]);
      }
      return '';
    } catch (e) {
      console.log('Base64 decode error:', e);
      return '';
    }
  }

  private getManager() {
    if (this.isSimulated || Platform.OS === 'web') return null;
    if (!this.manager && isNativeBleSupported && BleManager) {
      try {
        this.manager = new BleManager();
      } catch (e) {
        console.log('Failed to instantiate native BleManager. Using simulation mode.', e);
        this.isSimulated = true;
      }
    }
    return this.manager;
  }

  // Check if native BLE is available
  public isBleSupported(): boolean {
    if (Platform.OS === 'web') {
      return typeof navigator !== 'undefined' && !!(navigator as any).bluetooth;
    }
    return isNativeBleSupported && !this.isSimulated && this.getManager() !== null;
  }

  // Register point trigger callback
  public onPointTriggered(callback: (player: 1 | 2) => void) {
    this.onPointTriggeredCallback = callback;
  }

  // Register button press callback
  public onButtonPress(callback: (buttonId: string) => void) {
    this.onButtonPressCallback = callback;
  }

  public getConnectionState(): BleConnectionState {
    return this.connectionState;
  }

  public getConnectedDeviceId(): string | null {
    return this.connectedDeviceId;
  }

  // Register connection state callback
  public onConnectionState(callback: (state: BleConnectionState) => void): () => void {
    this.onConnectionStateListeners.add(callback);
    callback(this.connectionState); // Emit current state immediately
    return () => {
      this.onConnectionStateListeners.delete(callback);
    };
  }

  private updateConnectionState(state: BleConnectionState) {
    this.connectionState = state;
    this.onConnectionStateListeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {
        console.warn('Error in BLE connection listener:', e);
      }
    });
  }

  // Start scanning for BLE devices
  public async startScan(onDeviceFound: (device: BleDevice) => void): Promise<void> {
    if (Platform.OS === 'web') {
      this.updateConnectionState('scanning');
      try {
        const navBluetooth = (navigator as any).bluetooth;
        if (!navBluetooth) {
          console.warn('Web Bluetooth not supported on this browser.');
          this.updateConnectionState('disconnected');
          return;
        }

        // Web Bluetooth requires user gesture and opens a browser dialog to choose 1 device
        const device = await navBluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            'battery_service',
            'device_information',
            'generic_access'
          ]
        });

        if (device) {
          this.webDevices.set(device.id, device);
          onDeviceFound({
            id: device.id,
            name: device.name || 'Dispositivo Bluetooth Web',
            rssi: null
          });
        }
        this.updateConnectionState('disconnected');
      } catch (e) {
        console.log('Web Bluetooth scan cancelled or failed:', e);
        this.updateConnectionState('disconnected');
      }
      return;
    }

    if (this.isSimulated) {
      this.updateConnectionState('scanning');
      // Simulate finding a few virtual devices
      setTimeout(() => {
        onDeviceFound({ id: 'VIRTUAL-01', name: 'Smart Tennis Button P1/P2', rssi: -60 });
        onDeviceFound({ id: 'VIRTUAL-02', name: 'Controle Remoto 9 Botões', rssi: -65 });
      }, 500);
      return;
    }

    try {
      this.updateConnectionState('scanning');
      
      // Request Bluetooth Permissions on Android
      if (Platform.OS === 'android') {
        const { PermissionsAndroid } = require('react-native');
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        
        const scanGranted = granted['android.permission.BLUETOOTH_SCAN'] === 'granted';
        const connectGranted = granted['android.permission.BLUETOOTH_CONNECT'] === 'granted';
        if (!scanGranted || !connectGranted) {
          console.warn('Bluetooth permissions denied');
          this.updateConnectionState('disconnected');
          return;
        }
      }

      const manager = this.getManager();
      if (!manager) {
        this.updateConnectionState('disconnected');
        return;
      }

      manager.startDeviceScan(null, null, (error: any, device: any) => {
        if (error) {
          console.error('BLE scan error:', error);
          this.updateConnectionState('disconnected');
          return;
        }
        if (device) {
          onDeviceFound({
            id: device.id,
            name: device.name || device.localName,
            rssi: device.rssi,
          });
        }
      });
    } catch (e) {
      console.error('Failed to start scan:', e);
      this.updateConnectionState('disconnected');
    }
  }

  // Stop scanning
  public stopScan(): void {
    if (this.isSimulated) {
      if (this.connectionState === 'scanning') {
        this.updateConnectionState('disconnected');
      }
      return;
    }
    
    const manager = this.getManager();
    if (manager) {
      manager.stopDeviceScan();
      if (this.connectionState === 'scanning') {
        this.updateConnectionState('disconnected');
      }
    }
  }

  // Connect to a device
  public async connect(deviceId: string): Promise<boolean> {
    this.updateConnectionState('connecting');

    if (Platform.OS === 'web') {
      const device = this.webDevices.get(deviceId);
      if (!device) {
        console.error('Web device not found in cache:', deviceId);
        this.updateConnectionState('disconnected');
        return false;
      }
      try {
        const server = await device.gatt.connect();
        this.connectedDeviceId = deviceId;
        this.updateConnectionState('connected');

        // Watch for disconnection
        device.addEventListener('gattserverdisconnected', () => {
          this.disconnect();
        });

        // Try to discover services and characteristics
        const services = await server.getPrimaryServices();
        for (const service of services) {
          try {
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
              if (char.properties.notify) {
                await char.startNotifications();
                char.addEventListener('characteristicvaluechanged', (event: any) => {
                  const valueBuffer = event.target.value;
                  // Read value
                  const bytes = new Uint8Array(valueBuffer.buffer);
                  let decoded = '';
                  if (bytes.length > 0) {
                    const ascii = String.fromCharCode.apply(null, Array.from(bytes)).trim();
                    if (/^[a-zA-Z0-9]$/.test(ascii)) {
                      decoded = ascii;
                    } else {
                      decoded = String(bytes[0]);
                    }
                  }
                  console.log(`Web BLE characteristic value changed: ${decoded}`);
                  if (decoded) {
                    this.onButtonPressCallback(decoded);
                  }
                });
              }
            }
          } catch (err) {
            // Some services might be restricted or throw error, ignore them
            console.log(`Could not read characteristics from service ${service.uuid}:`, err);
          }
        }
        return true;
      } catch (e) {
        console.error('Web Bluetooth connection failed:', e);
        this.updateConnectionState('disconnected');
        return false;
      }
    }

    if (this.isSimulated || deviceId.startsWith('VIRTUAL')) {
      return new Promise((resolve) => {
        setTimeout(() => {
          this.connectedDeviceId = deviceId;
          this.updateConnectionState('connected');
          resolve(true);
        }, 1000);
      });
    }

    try {
      const manager = this.getManager();
      if (!manager) {
        this.updateConnectionState('disconnected');
        return false;
      }
      this.stopScan();
      const connectedDevice = await manager.connectToDevice(deviceId);
      await connectedDevice.discoverAllServicesAndCharacteristics();
      
      this.connectedDeviceId = deviceId;
      this.updateConnectionState('connected');

      // Auto-discover and subscribe to all notifiable characteristics to capture remote button clicks
      const services = await connectedDevice.services();
      for (const service of services) {
        const characteristics = await service.characteristics();
        for (const characteristic of characteristics) {
          if (characteristic.isNotifiable) {
            characteristic.monitor((error: any, char: any) => {
              if (error) {
                console.warn('Monitor characteristic error:', error);
                return;
              }
              if (char && char.value) {
                const decoded = this.decodeBase64(char.value);
                console.log(`Received BLE button value on ${char.uuid}: ${char.value} -> ${decoded}`);
                if (decoded) {
                  this.onButtonPressCallback(decoded);
                }
              }
            });
          }
        }
      }

      // We will automatically listen for disconnects:
      manager.onDeviceDisconnected(deviceId, () => {
        this.disconnect();
      });

      return true;
    } catch (e) {
      console.error('BLE connection failed:', e);
      this.updateConnectionState('disconnected');
      return false;
    }
  }

  // Disconnect from device
  public async disconnect(): Promise<void> {
    if (Platform.OS === 'web') {
      if (this.connectedDeviceId) {
        const device = this.webDevices.get(this.connectedDeviceId);
        if (device && device.gatt.connected) {
          device.gatt.disconnect();
        }
      }
      this.connectedDeviceId = null;
      this.updateConnectionState('disconnected');
      return;
    }

    if (this.connectedDeviceId && !this.isSimulated && !this.connectedDeviceId.startsWith('VIRTUAL')) {
      try {
        const manager = this.getManager();
        if (manager) {
          await manager.cancelDeviceConnection(this.connectedDeviceId);
        }
      } catch (e) {
        console.error('BLE disconnection error:', e);
      }
    }
    this.connectedDeviceId = null;
    this.updateConnectionState('disconnected');
  }

  // Simulate a button press from a remote BLE clicker or Smartwatch
  public simulateButtonPress(buttonId: string) {
    if (this.connectionState === 'connected') {
      this.onButtonPressCallback(buttonId);
      
      // Fallback compatibility with old logic
      if (buttonId === '1') this.onPointTriggeredCallback(1);
      if (buttonId === '2') this.onPointTriggeredCallback(2);
    } else {
      console.log('Cannot trigger point: Bluetooth device is not connected.');
    }
  }

  // Helper to trigger points for Smartwatches (which communicate via API or events)
  public triggerWatchPoint(player: 1 | 2) {
    this.onPointTriggeredCallback(player);
    // Trigger as buttonId "1" or "2" for watch events
    this.onButtonPressCallback(String(player));
  }
}

export const bleService = new BluetoothService();
export default bleService;
