export interface ElectronDeviceInfo {
  biosUuid: string;
  macAddress: string | null;
  hostname: string;
  platform: string;
}

export interface ElectronAPI {
  getDeviceInfo: () => Promise<ElectronDeviceInfo>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
