import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface Device {
  id: string;
  deviceName: string;
  deviceType: 'pos' | 'kds' | 'kiosk' | 'order_pad' | 'printer_station';
  status: 'active' | 'pending' | 'revoked';
  posMode: string | null;
  modeId: string | null;
  lastSeenAt: string | null;
}

interface DeviceMode {
  id: string;
  name: string;
}

interface PrinterProfile {
  id: string;
  name: string;
  isDefault: boolean;
}

interface DeviceHealthSummary {
  total: number;
  online: number;
  offline: number;
  byType: { type: string; count: number }[];
  staleDevices: { id: string; name: string; lastSeenAt: string }[];
}

// --- Pure function replicas ---

function activeDevices(devices: Device[]): Device[] {
  return devices.filter(d => d.status === 'active');
}

function pendingDevices(devices: Device[]): Device[] {
  return devices.filter(d => d.status === 'pending');
}

function isCurrentDevicePaired(currentDevice: Device | null): boolean {
  return currentDevice !== null && currentDevice.status === 'active';
}

function currentDevicePosMode(currentDevice: Device | null): string | null {
  return currentDevice?.posMode ?? null;
}

function currentDeviceMode(currentDevice: Device | null, modes: DeviceMode[]): DeviceMode | null {
  if (!currentDevice?.modeId) return null;
  return modes.find(m => m.id === currentDevice.modeId) ?? null;
}

function defaultPrinterProfile(profiles: PrinterProfile[]): PrinterProfile | null {
  return profiles.find(p => p.isDefault) ?? null;
}

function devicesByType(devices: Device[]): { type: string; count: number }[] {
  const types = ['pos', 'kds', 'kiosk', 'order_pad', 'printer_station'];
  return types.map(type => ({
    type,
    count: devices.filter(d => d.deviceType === type && d.status === 'active').length,
  }));
}

function computeDeviceHealth(devices: Device[], now: number): DeviceHealthSummary {
  const active = devices.filter(d => d.status === 'active');
  const staleThreshold = 60 * 60 * 1000; // 1 hour

  const staleDevices = active
    .filter(d => d.lastSeenAt !== null && (now - new Date(d.lastSeenAt).getTime()) > staleThreshold)
    .map(d => ({ id: d.id, name: d.deviceName, lastSeenAt: d.lastSeenAt! }));

  const online = active.filter(d =>
    d.lastSeenAt !== null && (now - new Date(d.lastSeenAt).getTime()) <= staleThreshold
  ).length;

  return {
    total: active.length,
    online,
    offline: active.length - online,
    byType: devicesByType(devices),
    staleDevices,
  };
}

// List mutations
function addDevice(devices: Device[], device: Device): Device[] {
  return [...devices, device];
}

function updateDeviceInList(devices: Device[], id: string, updated: Device): Device[] {
  return devices.map(d => d.id === id ? updated : d);
}

function revokeDeviceInList(devices: Device[], id: string): Device[] {
  return devices.map(d => d.id === id ? { ...d, status: 'revoked' as const } : d);
}

function addMode(modes: DeviceMode[], mode: DeviceMode): DeviceMode[] {
  return [...modes, mode];
}

function updateModeInList(modes: DeviceMode[], id: string, updated: DeviceMode): DeviceMode[] {
  return modes.map(m => m.id === id ? updated : m);
}

function deleteModeFromList(modes: DeviceMode[], id: string): DeviceMode[] {
  return modes.filter(m => m.id !== id);
}

// --- Tests ---

const now = Date.now();
const recentTime = new Date(now - 10 * 60 * 1000).toISOString(); // 10 min ago
const staleTime = new Date(now - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago

const devices: Device[] = [
  { id: 'd-1', deviceName: 'POS 1', deviceType: 'pos', status: 'active', posMode: 'server', modeId: 'm-1', lastSeenAt: recentTime },
  { id: 'd-2', deviceName: 'KDS 1', deviceType: 'kds', status: 'active', posMode: null, modeId: null, lastSeenAt: staleTime },
  { id: 'd-3', deviceName: 'Kiosk', deviceType: 'kiosk', status: 'pending', posMode: null, modeId: null, lastSeenAt: null },
  { id: 'd-4', deviceName: 'Register 1', deviceType: 'register', status: 'revoked', posMode: null, modeId: null, lastSeenAt: null },
];

describe('DeviceService — computed signals', () => {
  it('activeDevices filters active status', () => {
    expect(activeDevices(devices)).toHaveLength(2);
  });

  it('pendingDevices filters pending status', () => {
    expect(pendingDevices(devices)).toHaveLength(1);
    expect(pendingDevices(devices)[0].id).toBe('d-3');
  });

  it('isCurrentDevicePaired true for active device', () => {
    expect(isCurrentDevicePaired(devices[0])).toBe(true);
  });

  it('isCurrentDevicePaired false for pending device', () => {
    expect(isCurrentDevicePaired(devices[2])).toBe(false);
  });

  it('isCurrentDevicePaired false for null', () => {
    expect(isCurrentDevicePaired(null)).toBe(false);
  });

  it('currentDevicePosMode returns posMode', () => {
    expect(currentDevicePosMode(devices[0])).toBe('server');
  });

  it('currentDevicePosMode returns null for no posMode', () => {
    expect(currentDevicePosMode(devices[1])).toBeNull();
  });

  it('currentDevicePosMode returns null for null device', () => {
    expect(currentDevicePosMode(null)).toBeNull();
  });
});

describe('DeviceService — currentDeviceMode', () => {
  const modes: DeviceMode[] = [
    { id: 'm-1', name: 'Server Mode' },
    { id: 'm-2', name: 'Counter Mode' },
  ];

  it('finds matching mode', () => {
    expect(currentDeviceMode(devices[0], modes)?.name).toBe('Server Mode');
  });

  it('returns null when device has no modeId', () => {
    expect(currentDeviceMode(devices[1], modes)).toBeNull();
  });

  it('returns null for null device', () => {
    expect(currentDeviceMode(null, modes)).toBeNull();
  });

  it('returns null when mode not found', () => {
    const device: Device = { ...devices[0], modeId: 'm-999' };
    expect(currentDeviceMode(device, modes)).toBeNull();
  });
});

describe('DeviceService — defaultPrinterProfile', () => {
  it('finds default profile', () => {
    const profiles: PrinterProfile[] = [
      { id: 'p-1', name: 'Kitchen', isDefault: false },
      { id: 'p-2', name: 'Bar', isDefault: true },
    ];
    expect(defaultPrinterProfile(profiles)?.id).toBe('p-2');
  });

  it('returns null when no default', () => {
    const profiles: PrinterProfile[] = [
      { id: 'p-1', name: 'Kitchen', isDefault: false },
    ];
    expect(defaultPrinterProfile(profiles)).toBeNull();
  });

  it('returns null for empty list', () => {
    expect(defaultPrinterProfile([])).toBeNull();
  });
});

describe('DeviceService — devicesByType', () => {
  it('counts active devices per type', () => {
    const result = devicesByType(devices);
    const pos = result.find(r => r.type === 'pos');
    const kds = result.find(r => r.type === 'kds');
    const kiosk = result.find(r => r.type === 'kiosk');
    expect(pos?.count).toBe(1); // only d-1 is active POS
    expect(kds?.count).toBe(1);
    expect(kiosk?.count).toBe(0); // d-3 is pending, not active
  });
});

describe('DeviceService — deviceHealthSummary', () => {
  it('computes online/offline/stale', () => {
    const health = computeDeviceHealth(devices, now);
    expect(health.total).toBe(2); // only active
    expect(health.online).toBe(1); // d-1 is recent
    expect(health.offline).toBe(1); // d-2 is stale
    expect(health.staleDevices).toHaveLength(1);
    expect(health.staleDevices[0].id).toBe('d-2');
  });

  it('handles no active devices', () => {
    const health = computeDeviceHealth([], now);
    expect(health.total).toBe(0);
    expect(health.online).toBe(0);
    expect(health.offline).toBe(0);
    expect(health.staleDevices).toHaveLength(0);
  });
});

describe('DeviceService — list mutations', () => {
  it('addDevice appends', () => {
    const newDev: Device = { id: 'd-5', deviceName: 'New', deviceType: 'pos', status: 'pending', posMode: null, modeId: null, lastSeenAt: null };
    expect(addDevice(devices, newDev)).toHaveLength(5);
  });

  it('updateDeviceInList replaces matching', () => {
    const updated = { ...devices[0], deviceName: 'POS 1 Updated' };
    expect(updateDeviceInList(devices, 'd-1', updated)[0].deviceName).toBe('POS 1 Updated');
  });

  it('revokeDeviceInList sets status to revoked', () => {
    const result = revokeDeviceInList(devices, 'd-1');
    expect(result[0].status).toBe('revoked');
  });

  it('addMode appends', () => {
    const modes: DeviceMode[] = [{ id: 'm-1', name: 'A' }];
    expect(addMode(modes, { id: 'm-2', name: 'B' })).toHaveLength(2);
  });

  it('updateModeInList replaces matching', () => {
    const modes: DeviceMode[] = [{ id: 'm-1', name: 'A' }];
    expect(updateModeInList(modes, 'm-1', { id: 'm-1', name: 'Updated' })[0].name).toBe('Updated');
  });

  it('deleteModeFromList removes matching', () => {
    const modes: DeviceMode[] = [{ id: 'm-1', name: 'A' }, { id: 'm-2', name: 'B' }];
    expect(deleteModeFromList(modes, 'm-1')).toHaveLength(1);
  });
});
