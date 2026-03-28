import { Injectable } from '@angular/core';
import { ElectronDeviceInfo } from '../models/electron.model';

@Injectable({ providedIn: 'root' })
export class ElectronDeviceService {
  private _info: ElectronDeviceInfo | null = null;

  async init(): Promise<void> {
    const api = globalThis.window?.electronAPI;
    if (api) {
      this._info = await api.getDeviceInfo();
    }
  }

  get info(): ElectronDeviceInfo | null {
    return this._info;
  }
}
