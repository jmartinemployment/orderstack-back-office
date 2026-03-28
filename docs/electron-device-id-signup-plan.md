# Electron Device ID → Signup Transaction Plan

## Overview

Wire the physical device's BIOS UUID and MAC address from Electron through to the
backend signup transaction, which creates restaurant + team_member + device atomically
via Prisma `$transaction`. Any failure in any of the three rolls the entire operation back.

Device identity is delivered exclusively via HTTP headers (x-device-id, x-mac-address).
The backend signup handler reads from headers for the device record — no body fields
needed, no redundancy, no changes to SignupData.

---

## Phase 1 — Electron: Expose Device Identity to Renderer

Files changed: `electron/preload.ts` (new), `electron/main.ts`

### 1.1 Install systeminformation

systeminformation v5+ ships its own TypeScript declarations — no @types package needed.

```bash
npm install systeminformation
```

### 1.2 Create electron/preload.ts

contextBridge.exposeInMainWorld must be called synchronously during preload execution.
Expose a function that Angular calls and awaits — do not call exposeInMainWorld inside
a .then() callback or it will throw:

  contextBridge API can only be used from a preload script that is run synchronously

```ts
import { contextBridge } from 'electron';
import si from 'systeminformation';

async function getDeviceInfo() {
  const [system, nics, os] = await Promise.all([
    si.system(),
    si.networkInterfaces(),
    si.osInfo(),
  ]);

  const primaryNic = (Array.isArray(nics) ? nics : [nics])
    .find(n => !n.virtual && n.mac !== '00:00:00:00:00:00');

  return {
    biosUuid: system.uuid,
    macAddress: primaryNic?.mac ?? null,
    hostname: os.hostname,
    platform: process.platform,
  };
}

// exposeInMainWorld called synchronously — exposes a function, not a value
contextBridge.exposeInMainWorld('electronAPI', {
  getDeviceInfo: () => getDeviceInfo(),
});
```

### 1.3 Update electron/main.ts

Reference the compiled preload:

```ts
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  preload: path.join(__dirname, 'preload.js'),
},
```

### 1.4 tsconfig.electron.json

The existing `"include": ["electron/**/*.ts"]` already covers preload.ts — no change needed.

---

## Phase 2 — Angular: Type Declaration + Interceptor

Files changed: `src/app/models/electron.model.ts` (new), `src/app/interceptors/auth.interceptor.ts`,
`src/app/app.config.ts`

### 2.1 Declare the global type

New file `src/app/models/electron.model.ts`:

```ts
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
```

### 2.2 Load device info at app startup via APP_INITIALIZER

Device info must be resolved before any HTTP request fires. Use APP_INITIALIZER in
`app.config.ts` to call getDeviceInfo() once and cache the result in a simple service:

New file `src/app/services/electron-device.ts`:

```ts
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
```

In `app.config.ts`, add the initializer:

```ts
import { APP_INITIALIZER } from '@angular/core';
import { ElectronDeviceService } from './services/electron-device';

providers: [
  // existing providers...
  {
    provide: APP_INITIALIZER,
    useFactory: (svc: ElectronDeviceService) => () => svc.init(),
    deps: [ElectronDeviceService],
    multi: true,
  },
],
```

### 2.3 Update auth.interceptor.ts

Inject ElectronDeviceService and add x-device-id / x-mac-address headers on every
request. The backend uses these for routing, logging, and Socket.io targeting — not
just signup:

```ts
const deviceService = inject(ElectronDeviceService);
const deviceInfo = deviceService.info;

if (deviceInfo?.biosUuid) headers['x-device-id'] = deviceInfo.biosUuid;
if (deviceInfo?.macAddress) headers['x-mac-address'] = deviceInfo.macAddress;
```

---

## Phase 3 — Angular: Signup Flow

Files changed: `src/app/models/platform.model.ts`, `src/app/services/auth.ts`,
`src/app/features/auth/signup/signup.ts`

### 3.1 Update SignupData model

Make verifiedEmailToken optional — auth.ts always overrides it from the signal.
Removing it from the signup.ts call site is a TypeScript error if it stays required:

```ts
export interface SignupData {
  verifiedEmailToken?: string;  // was: string (required)
  // all other fields unchanged
}
```

No device fields added — device identity travels via headers only.

### 3.2 Update auth.ts submitSignup()

Add null guard for verifiedEmailToken — this is the root cause of 401s on page refresh.
No async keyword needed; the method uses subscribe() and stays synchronous:

```ts
submitSignup(data: SignupData): void {
  const token = this._verifiedEmailToken();
  if (!token) {
    this._error.set('Email verification required.');
    return;
  }

  const body = { ...data, verifiedEmailToken: token };

  // existing http.post call unchanged
}
```

### 3.3 Update signup.ts onCreateAccount()

Remove verifiedEmailToken: '' — auth.ts owns it via the signal:

```ts
this.authService.submitSignup({
  firstName: v.firstName,
  lastName: v.lastName,
  password: v.password,
  businessPhone: v.businessPhone,
  personalPhone: v.personalPhone,
  businessName: v.businessName,
  address: v.address,
  city: v.city,
  state: v.state,
  zip: v.zip,
  multipleLocations: this._multipleLocations(),
});
```

---

## Phase 4 — Backend: Transaction

File: `src/app/auth.routes.ts` in `Get-Order-Stack-Restaurant-Backend`

### 4.1 Zod signup schema

No new fields needed — device identity comes from headers, not the body.
Schema is unchanged from its current state.

### 4.2 Read device identity from headers

Above the transaction, extract the hardware identity from the request headers
(already being sent by the interceptor):

```ts
const biosUuid = req.headers['x-device-id'] as string | undefined;
const macAddress = req.headers['x-mac-address'] as string | undefined;
```

### 4.3 $transaction device create

Enrich the device record with BIOS UUID and MAC address from headers:

```ts
// Call 1 — Restaurant (unchanged)
const restaurant = await tx.restaurant.create({ ... });

// Call 2 — Team member (unchanged)
const member = await tx.teamMember.create({ ... });

// Call 3 — Device (enriched with hardware identity from headers)
const device = await tx.device.create({
  data: {
    restaurantId: restaurant.id,
    teamMemberId: member.id,
    deviceName: firstName ? `${firstName}'s Desktop` : "Owner's Desktop",
    deviceType: 'terminal',
    status: 'active',
    hardwareInfo: {
      platform: biosUuid ? 'Electron' : 'Browser',
      biosUuid: biosUuid ?? null,
      macAddress: macAddress ?? null,
      hostname: hostname ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      ip: req.ip ?? null,
    },
  },
});
```

### 4.4 Rollback guarantee

Prisma $transaction already guarantees atomicity — if any of the three creates throws,
Prisma rolls back all preceding creates automatically. No additional code needed.
The requirement is that all three creates use tx.* not prisma.*.

---

## Phase 5 — Verification Checklist

- [ ] window.electronAPI.getDeviceInfo() resolves in Angular (check DevTools console)
- [ ] x-device-id and x-mac-address headers appear on all outgoing requests (Network tab)
- [ ] APP_INITIALIZER completes before any request fires (no race condition)
- [ ] Signup with valid email verification creates all three records in the database
- [ ] Forced failure on device create rolls back restaurant and team_member records
- [ ] Signup from a browser (non-Electron) still works — headers absent, device fields null

---

## Data Flow Summary

```
systeminformation (Node.js in preload)
    |
    v
contextBridge.exposeInMainWorld({ getDeviceInfo: fn })   <- synchronous
    |
    v
APP_INITIALIZER calls getDeviceInfo() on startup         <- async, resolved before first request
    |
    v
ElectronDeviceService.info cached in memory
    |
    v
auth.interceptor.ts reads ElectronDeviceService
    --> x-device-id: <biosUuid>        (all requests)
    --> x-mac-address: <macAddress>    (all requests)
    |
    v
POST /api/auth/signup
    |
    v
Zod validation (body only, no new fields)
    |
    v
biosUuid = req.headers['x-device-id']
macAddress = req.headers['x-mac-address']
    |
    v
prisma.$transaction([
  restaurant.create   <-- fails: rollback all
  teamMember.create   <-- fails: rollback restaurant
  device.create       <-- fails: rollback restaurant + teamMember
])
    |
    v
All three created or none
```

---

## Issues Fixed from Review

| # | Severity | Fix applied |
|---|----------|-------------|
| 1 | Blocking | exposeInMainWorld called synchronously — exposes a function, not a value |
| 2 | Install break | Removed @types/systeminformation — package ships its own types |
| 3 | TypeScript error | verifiedEmailToken made optional in SignupData |
| 4 | Minor | submitSignup stays synchronous — no async/Promise<void> |
| 5 | Minor | z.string().uuid() removed — no Zod changes needed (headers only) |
| 6 | Redundancy | Body device fields removed — headers are the single delivery path |

---

## Notes

- BIOS UUID is hardware-bound and survives OS reinstalls (unlike node-machine-id on
  Windows/Linux which uses OS-level identifiers)
- MAC address provides network-layer identity for future local hub / offline communication
- x-device-id on every request enables the backend to route Socket.io events to specific
  physical devices throughout the entire app lifecycle — not just at signup
- Browser fallback: when electronAPI is undefined APP_INITIALIZER resolves immediately,
  headers are absent, and the backend device record is created with browser-only data
