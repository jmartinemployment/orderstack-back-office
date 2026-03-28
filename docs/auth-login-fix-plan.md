# Auth Login Fix Plan

**Date:** 2026-03-27
**Status:** PLAN ONLY — no code changes until this document is reviewed and approved

---

## Current Broken State

Login does not work. The server returns `{ emailVerificationRequired: true }` on every login
attempt and the frontend never navigates to the dashboard. This document traces every root
cause and defines the correct architectural fix, including a full redesign of the device
trust mechanism around BIOS UUID.

---

## Root Cause Analysis

### Root Cause 1: `workFromHome: true` hardcoded at signup

**File:** `Get-Order-Stack-Restaurant-Backend/src/app/auth.routes.ts`, line 285

The `workFromHome` boolean on `TeamMember` is an HR/scheduling field. It was never designed
as a device trust flag. During a prior session the login route was given a code path that
treats `workFromHome: true` as "user is outside the restaurant network, require email
verification on every login." Because signup hardcodes `workFromHome: true` for every new
owner, every owner hits the email verification path on their first login.

**Effect:** Login always returns `{ emailVerificationRequired: true }`.

---

### Root Cause 2: `restaurant.networkIp` is a Cloudflare edge IP, not a real IP

**File:** `Get-Order-Stack-Restaurant-Backend/src/app/auth.routes.ts`, line 267

```ts
networkIp: req.ip ?? null,
```

The backend runs on Render.com behind Cloudflare. `req.ip` returns the Cloudflare edge IP
(`162.158.79.24`), not the client's real IP. The IP comparison at login is therefore always
false — no real client IP will ever equal a Cloudflare edge IP. The entire IP restriction
mechanism is broken at the infrastructure level and cannot be fixed without moving away from
this architecture. IP-based device trust is the wrong mechanism entirely. It is being
replaced by BIOS UUID matching.

---

### Root Cause 3: `workFromHome` IP restriction fires before trusted device check

The first IP check (lines 462–471) blocks `workFromHome: false` users outside the network
before `loginUser()` is even called. The second IP check (lines 516–554) fires for
`workFromHome: true` users after a `trustedDevice` lookup — but since `workFromHome: true`
for everyone and `networkIp` is always a Cloudflare IP, everyone falls through to
`emailVerificationRequired: true`.

---

### Root Cause 4: WFH verification signals have no working completion path (frontend)

**File:** `src/app/services/auth.ts`, lines 70–75

Signals `_wfhVerificationRequired`, `_wfhMaskedEmail`, `_wfhLoginToken` were added this
session to separate login WFH verification from signup email verification. However:

- Not cleared in `logout()` or `handleSessionExpired()`
- `verifyMfaCode()` uses `_mfaSessionToken`, not `_wfhLoginToken` — WFH OTP has no
  working submission path
- The `mfa-challenge` component routes to this flow but calls the wrong verify endpoint

**Effect:** Even if backend sent `emailVerificationRequired`, entering the OTP would call
`/auth/mfa/verify` with `mfaToken: null` and fail.

---

### Root Cause 5: `mfa-challenge` `ngOnInit` redirect race

**File:** `src/app/features/auth/mfa-challenge/mfa-challenge.ts`, lines 30–34

Both `mfaRequired()` and `wfhVerificationRequired()` default to `false`. If the component
constructs before the signals update (route preloading), it redirects back to `/login`
immediately — which is why login appeared to "work" (200 response) but never navigated.

---

## The Correct Architecture: BIOS UUID Device Trust

IP addresses are being dropped entirely. The device trust mechanism is BIOS UUID — the
stable hardware identifier read by the Electron main process and sent as `x-device-id` on
every request by `authInterceptor`.

### Decision: `MfaTrustedDevice` is also being cleaned up

`MfaTrustedDevice` uses `ipAddress` as part of its unique constraint. With IP removed, this
table's unique key becomes `[teamMemberId, uaFingerprint]`. The UA fingerprint + IP trust
check in auth.routes.ts (lines 518–521) is also being removed since it is part of the
broken WFH IP flow.

---

## New Auth Flow

### Sign Up

1. User completes email verification → backend creates Restaurant + TeamMember + Device
2. Backend stores BIOS UUID in `Device.hardwareInfo.biosUuid` (already implemented —
   reads from `x-device-id` header at line 190 of auth.routes.ts)
3. Backend returns `{ token, user, restaurants, deviceId, deviceMfaExpiresAt }`
4. **NEW:** Frontend reads `ElectronDeviceService.info.biosUuid` and writes it to
   localStorage under key `DEVICE_UUID_KEY = 'registered_device_uuid'`
5. User lands on onboarding wizard

### Sign In

1. User submits email + password
2. Frontend reads `ElectronDeviceService.info?.biosUuid` (current hardware UUID)
3. Frontend reads `localStorage.getItem('registered_device_uuid')` (UUID from signup)
4. **UUID match = true** (same device that signed up)
   → Login request proceeds → backend authenticates credentials → returns token → Dashboard
5. **UUID match = false** (different device, or localStorage cleared)
   → Backend checks `workFromHome` for this user:
   - **`workFromHome = true`** → backend sends MFA email challenge → frontend shows
     `/mfa-challenge`
     - OTP verified = true → Dashboard
     - OTP verified = false → Not Authorized (stay on `/mfa-challenge` with error)
   - **`workFromHome = false`** → backend returns 403 Not Authorized → frontend shows
     error on login page

### UUID Comparison: Where It Happens

The comparison is a **backend decision** driven by the `x-device-id` header:
- Backend receives `x-device-id: <biosUuid>` on every request (including login) via
  `authInterceptor`
- Backend looks up Device record for this user where `hardwareInfo.biosUuid` matches
- Match found → trusted device → happy path
- No match → check `workFromHome` → MFA or 403

The localStorage UUID is a **frontend UX signal** — it lets the frontend know immediately
(before the backend responds) whether the user is on their registered device. It is written
once at signup and should persist indefinitely unless the user clears their browser data.
It is not a security gate — the backend is the authority.

---

## Files to Change

### File 1: `prisma/schema.prisma` (backend)

#### Change A — Remove `Restaurant.networkIp`

```prisma
// DELETE this line (line 39):
networkIp  String?  @map("network_ip")
```

#### Change B — Remove `UserSession.ipAddress`

```prisma
// BEFORE:
model UserSession {
  ...
  ipAddress  String?  @map("ip_address")
  ...
}

// AFTER: delete the ipAddress line
```

`req.ip` on Render returns the Cloudflare edge IP, not the real client IP. Every stored value
is a Cloudflare IP and is meaningless. The `/sessions` endpoint selects it for display — that
select must also be updated (see File 2 Change G).

#### Change C — Remove `MfaTrustedDevice.ipAddress` and update unique constraint

```prisma
// BEFORE:
model MfaTrustedDevice {
  id            String   @id @default(uuid())
  teamMemberId  String   @map("team_member_id")
  uaFingerprint String   @map("ua_fingerprint")
  ipAddress     String   @map("ip_address")
  deviceInfo    String?  @map("device_info")
  trustedAt     DateTime @default(now()) @map("trusted_at")
  expiresAt     DateTime @map("expires_at")
  teamMember    TeamMember @relation(fields: [teamMemberId], references: [id], onDelete: Cascade)
  @@unique([teamMemberId, uaFingerprint, ipAddress])
  @@map("mfa_trusted_devices")
}

// AFTER:
model MfaTrustedDevice {
  id            String   @id @default(uuid())
  teamMemberId  String   @map("team_member_id")
  uaFingerprint String   @map("ua_fingerprint")
  deviceInfo    String?  @map("device_info")
  trustedAt     DateTime @default(now()) @map("trusted_at")
  expiresAt     DateTime @map("expires_at")
  teamMember    TeamMember @relation(fields: [teamMemberId], references: [id], onDelete: Cascade)
  @@unique([teamMemberId, uaFingerprint])
  @@map("mfa_trusted_devices")
}
```

After schema changes: run `npx prisma migrate dev --name drop_ip_fields` and apply to
Supabase.

**Note:** Printer `ipAddress` fields (`printer.routes.ts`) are legitimate admin-entered
network addresses, not `req.ip` captures. Do NOT touch those.

---

### File 2: `Get-Order-Stack-Restaurant-Backend/src/app/auth.routes.ts`

#### Change A — Remove `workFromHome: true` from signup (line 285)

```ts
// BEFORE
workFromHome: true,

// AFTER
workFromHome: false,
```

New owners are on their registered device at signup. `workFromHome` defaults `false` and
is set by HR in the team member admin UI only when remote access is genuinely needed.

#### Change B — Remove `networkIp` from Restaurant creation at signup (line 267)

```ts
// DELETE this line:
networkIp: req.ip ?? null,
```

#### Change C — Remove `ipAddress` capture, `deviceInfoHeader`, and all IP-based pre-checks (lines 446–471)

Delete:
```ts
const ipAddress = req.ip || req.socket.remoteAddress || undefined;
const deviceInfoHeader = req.headers['x-device-info'] as string | undefined;
```
`deviceInfoHeader` has no remaining consumers after Change D removes the WFH block that
called `authService.computeUaFingerprint()`. TypeScript strict mode will warn on it.

Also delete the entire member pre-fetch + workFromHome IP block (lines 450–471). After
this, the login route starts directly with `loginUser()`.

#### Change D — Replace lines 499–554 entirely with UUID-based device check

Replace the entire block from line 499 (`// Resolve trusted device by BIOS UUID`) through
line 554 (closing `}` of the WFH if block) with the code below.

The original lines 499–512 had `mfaExpiresAt: { gt: new Date() }` in the device query —
a 30-day expiry on device trust. This is being dropped intentionally. BIOS UUID match
means the user is on their registered hardware; that trust should not expire on a timer.
Keeping the expiry would 403 an owner on their own machine after 30 days, which contradicts
the purpose of UUID registration.

The `trustedDevice` variable declared in the new code is still used by Change E below
for `deviceId` resolution — no downstream breakage.

Replace with:

```ts
// After loginUser() succeeds and mfaRequired check passes:
// Look up device by BIOS UUID
const biosUuid = req.headers['x-device-id'] as string | undefined;
let trustedDevice: { id: string } | null = null;

if (result.user && biosUuid) {
  trustedDevice = await prisma.device.findFirst({
    where: {
      teamMemberId: result.user.id,
      status: 'active',
      hardwareInfo: { path: ['biosUuid'], equals: biosUuid },
    },
    select: { id: true },
  });
}

// UUID not recognized — check workFromHome
if (!trustedDevice && result.user) {
  const member = await prisma.teamMember.findUnique({
    where: { id: result.user.id },
    select: { workFromHome: true, email: true, firstName: true },
  });

  if (!member?.workFromHome) {
    res.status(403).json({ error: 'Sign in is not authorized from this device. Contact your manager.' });
    return;
  }

  // workFromHome = true — send MFA challenge
  if (member.email) {
    await mfaService.sendOtp(result.user.id, member.email, member.firstName);
  }
  res.json({
    mfaRequired: true,
    mfaToken: result.token,
    maskedEmail: member.email ? mfaService.maskEmail(member.email) : undefined,
    user: { id: result.user.id },
  });
  return;
}
```

Note: this reuses the existing `mfaRequired` response shape and the existing
`/auth/mfa/verify` endpoint — no new endpoint needed.

#### Change E — Simplify `deviceId` resolution (lines 556–569)

The browser userAgent fallback block is dead code in the new architecture. The `deviceId`
resolution block is only reached when `trustedDevice` is not null (BIOS UUID matched) —
the function returns early with 403 or MFA challenge in every other case. Replace with:

```ts
// trustedDevice resolved by BIOS UUID above — always non-null at this point
const deviceId: string = trustedDevice.id;
```

#### Change F — Remove `ipAddress` from all `UserSession` creates

Three places create a `UserSession` with `ipAddress: req.ip`:
- Signup route (line 348)
- Password reset / token refresh route (line 1238)

Remove `ipAddress` from the `data` object in both. The column is being dropped.

#### Change G — Remove `ipAddress` from the `/sessions` select (line 761)

```ts
// BEFORE
select: { id: true, deviceInfo: true, ipAddress: true, createdAt: true, expiresAt: true }

// AFTER
select: { id: true, deviceInfo: true, createdAt: true, expiresAt: true }
```

---

### File 3: `src/app/services/auth.ts` (frontend)

#### Change A — Add `DEVICE_UUID_KEY` constant (top of file, with other storage keys)

```ts
// localStorage keys — non-sensitive display data only, persists across sessions
const MERCHANT_SLUG_KEY = 'selected_merchant_slug';
const MERCHANT_NAME_KEY = 'selected_merchant_name';
const MERCHANT_LOGO_KEY = 'selected_merchant_logo';
const MERCHANT_ADDRESS_KEY = 'selected_merchant_address';
const DEVICE_UUID_KEY = 'registered_device_uuid';   // ← ADD
```

#### Change B — Write UUID to localStorage in `submitSignup()` (after line 295)

In the `next` callback of `submitSignup()`, after setting `_deviceId` and
`_deviceMfaExpiresAt`, add:

```ts
// Store BIOS UUID so login can verify device identity on future sign-ins
const biosUuid = this.electronDeviceService.info?.biosUuid;
if (biosUuid) {
  localStorage.setItem(DEVICE_UUID_KEY, biosUuid);
}
```

`ElectronDeviceService` must be injected into `AuthService`:
```ts
private readonly electronDeviceService = inject(ElectronDeviceService);
```

#### Change C — Remove WFH signals (lines 70–75)

Delete:
```ts
// Login WFH verification state (separate from signup)
private readonly _wfhVerificationRequired = signal(false);
private readonly _wfhMaskedEmail = signal<string | null>(null);
private readonly _wfhLoginToken = signal<string | null>(null);
readonly wfhVerificationRequired = this._wfhVerificationRequired.asReadonly();
readonly wfhMaskedEmail = this._wfhMaskedEmail.asReadonly();
```

#### Change D — Remove `emailVerificationRequired` branch from login handler (lines 178–185)

Delete:
```ts
if (response.emailVerificationRequired) {
  this._wfhVerificationRequired.set(true);
  this._wfhMaskedEmail.set(response.maskedEmail ?? null);
  this._wfhLoginToken.set((response as { loginToken?: string }).loginToken ?? null);
  this._isLoading.set(false);
  this.router.navigate(['/mfa-challenge']);
  return;
}
```

The backend no longer returns `emailVerificationRequired`. UUID mismatch + `workFromHome: true`
now returns `mfaRequired: true` — the same shape as TOTP MFA — so the existing
`mfaRequired` handler and `/mfa-challenge` flow handle it without any new code.

#### ~~Change E — Clear UUID from localStorage on logout~~ — SKIPPED

`DEVICE_UUID_KEY` is NOT cleared on logout. This is a dedicated POS device; the owner
logs out and back in daily. The UUID represents registered hardware — that trust does not
expire because a shift ended. Clearing it would force an MFA challenge on every login on
the owner's own machine, which defeats the purpose of UUID registration.

---

### File 4: `src/app/features/auth/mfa-challenge/mfa-challenge.ts`

#### Change A — Revert `ngOnInit` to only check `mfaRequired()`

```ts
// BEFORE (this session — broken)
ngOnInit(): void {
  if (!this.authService.mfaRequired() && !this.authService.wfhVerificationRequired()) {
    this.router.navigate(['/login']);
  }
}

// AFTER
ngOnInit(): void {
  if (!this.authService.mfaRequired()) {
    this.router.navigate(['/login']);
  }
}
```

`wfhVerificationRequired` is being deleted. UUID mismatch + `workFromHome: true` now uses
the same `mfaRequired: true` response shape, so the existing `mfaRequired()` signal guard
covers the new flow automatically.

---

## Order of Execution

1. **Schema** — update `schema.prisma`: remove `Restaurant.networkIp`, remove
   `UserSession.ipAddress`, remove `MfaTrustedDevice.ipAddress`, update `@@unique` constraint
2. **Migration** — run `npx prisma migrate dev --name drop_ip_fields`, apply to Supabase
3. **Backend `auth.routes.ts`** — Changes A through G in order (signup first, then login)
4. **Deploy backend to Render** — verify login returns token with `deviceId` for Electron,
   and 403 for unknown device with `workFromHome: false`
5. **Frontend `auth.ts`** — Changes A through E
6. **Frontend `mfa-challenge.ts`** — Change A
7. **Test: Electron sign in on registered device** — expect Dashboard
8. **Test: Electron sign in, UUID cleared from localStorage** — expect MFA challenge
   (requires `workFromHome: true` on the test account)
9. **Test: signup flow** — verify localStorage `registered_device_uuid` is written
10. **Test: logout and sign back in** — verify behavior matches the localStorage-clear
    decision from Change E above

---

## What Is NOT Changing

- BIOS UUID storage in `Device.hardwareInfo.biosUuid` — already works, no change
- `authInterceptor` sending `x-device-id` header — already works, no change
- `ElectronDeviceService` IPC call and `APP_INITIALIZER` registration — already works,
  no change
- TOTP MFA enrollment and `mfaRequired` challenge flow — already works, no change
- Signup email verification (`_verificationSent`, `PendingVerification`) — already works,
  no change
- `workFromHome` field on `TeamMember` — stays, now used correctly as an HR-controlled
  remote access flag instead of being hardcoded

---

## What Was Already Fixed This Session (Do Not Undo)

- `electron/preload.ts` — systeminformation removed, IPC-only preload is correct
- `electron/main.ts` — `ipcMain.handle('get-device-info')` in main process is correct
- `src/index.html` + `electron/main.ts` CSP — `unsafe-inline` in script-src is correct
- `login.ts` — removed `Validators.minLength(12)` from password field (was wrong)
- `auth.ts` login `next` callback — made `async` and awaits `navigatePostAuth()` — keep this

---

## Post-Fix Verification

After all changes, the flows should behave as follows:

**Owner on their registered device (UUID match = true):**
1. App init → `ElectronDeviceService` fetches BIOS UUID via IPC
2. `authInterceptor` attaches `x-device-id: <biosUuid>` to login request
3. Backend finds Device record with matching `hardwareInfo.biosUuid`
4. Returns `{ token, user, restaurants, deviceId }`
5. Frontend navigates to Dashboard

**Owner on a new or different device (UUID match = false, `workFromHome = true`):**
1. `x-device-id` sent but no Device record matches
2. Backend sees `workFromHome: true` → sends MFA email OTP → returns `{ mfaRequired: true }`
3. Frontend navigates to `/mfa-challenge`
4. Owner enters OTP → verified → Dashboard

**Staff or owner on unregistered device (`workFromHome = false`):**
1. `x-device-id` sent but no Device record matches
2. Backend sees `workFromHome: false` → returns 403 Not Authorized
3. Frontend shows error on login page

**Browser (non-Electron, no BIOS UUID):**
1. No `x-device-id` header sent → `trustedDevice` is null
2. Backend checks `workFromHome`:
   - `workFromHome: false` → 403 Not Authorized
   - `workFromHome: true` → MFA challenge
3. Login never reaches `deviceId` resolution — function always returns early
