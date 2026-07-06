export class BleManager {
  startDeviceScan() {}
  stopDeviceScan() {}
  connectToDevice() {
    return Promise.resolve({});
  }
  disconnectDevice() {
    return Promise.resolve({});
  }
  onStateChange() {
    return () => {};
  }
}
